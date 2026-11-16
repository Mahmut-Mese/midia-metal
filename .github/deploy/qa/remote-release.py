"""Account-pinned QA release lifecycle. Never resets or restores a database."""

import argparse
import configparser
from datetime import datetime, timezone
import fcntl
import gzip
import hashlib
import hmac
import importlib.util
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import signal
import stat
import subprocess
import tarfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

from target import ACCOUNT_DIGEST, BRANCH, REPOSITORY, URL, load_target


HASH = re.compile(r"[0-9a-f]{64}")
COMMIT = re.compile(r"[0-9a-f]{40}")
MIGRATION = re.compile(r"[A-Za-z0-9_]+")
NODE_DIRECTORY = Path("/opt/alt/alt-nodejs22/root/bin")


class DeploymentFailure(RuntimeError):
    """A credential-free deployment stage and diagnostic suitable for CI."""


class ReleaseCommandError(ValueError):
    """Only fixed operation labels and numeric exit codes, never command output."""


def validate_release_identity(release_id, commit, digest):
    if not isinstance(commit, str) or not COMMIT.fullmatch(commit):
        raise ValueError("Invalid QA source commit")
    if not isinstance(digest, str) or not HASH.fullmatch(digest):
        raise ValueError("Invalid QA archive digest")
    if (not isinstance(release_id, str) or len(release_id) > 128 or
            not re.fullmatch(r"qa-" + commit[:12] + r"-[0-9]+-[0-9]+", release_id)):
        raise ValueError("Release identity is not bound to the QA commit and workflow run")
    return release_id


def validate_provisioned(marker, target):
    if not isinstance(marker, dict):
        raise ValueError("QA provisioning marker is missing")
    for key in ("repository", "branch", "url"):
        if marker.get(key) != target[key]:
            raise ValueError("QA provisioning identity does not match")
    if marker.get("account_digest") != ACCOUNT_DIGEST or marker.get("routing") != "node-php-v1":
        raise ValueError("QA account routing has not been provisioned")


def _file_hashes(manifest):
    if not isinstance(manifest, dict) or not isinstance(manifest.get("files"), dict):
        raise ValueError("Release file inventory is missing")
    files = manifest["files"]
    for name, digest in files.items():
        if not isinstance(name, str) or not isinstance(digest, str) or not HASH.fullmatch(digest):
            raise ValueError("Release file inventory is invalid")
    return files


def migration_decision(state, policy, new_manifest, previous_manifest=None):
    if not isinstance(state, dict) or type(state.get("schema_version")) is not int or state["schema_version"] != 1:
        raise ValueError("Unsupported QA database state")
    table_count = state.get("table_count")
    if type(table_count) is not int or table_count < 0:
        raise ValueError("Invalid QA table count")
    for key in ("empty_database", "migrations_table_exists", "bootstrap_completed"):
        if type(state.get(key)) is not bool:
            raise ValueError("Invalid QA database state flags")
    if state["empty_database"] != (table_count == 0):
        raise ValueError("Inconsistent QA empty database state")
    if state.get("bootstrap_version") != ("1" if state["bootstrap_completed"] else None):
        raise ValueError("Inconsistent QA bootstrap marker")
    applied = state.get("applied_migrations")
    pending = state.get("pending_migrations")
    if (not isinstance(applied, list) or not isinstance(pending, list) or
            any(not isinstance(name, str) or not MIGRATION.fullmatch(name) for name in applied) or
            len(applied) != len(set(applied))):
        raise ValueError("Invalid QA migration history")
    if applied and not state["migrations_table_exists"]:
        raise ValueError("QA migration history has no table")
    files = _file_hashes(new_manifest)
    previous_files = _file_hashes(previous_manifest) if previous_manifest is not None else None
    for name in applied:
        file = f"backend/database/migrations/{name}.php"
        if file not in files:
            raise ValueError("An applied migration was removed from the release")
        if previous_files is not None and previous_files.get(file) != files[file]:
            raise ValueError("An applied migration was rewritten or is absent from the previous release")
    pending_hashes = {}
    for migration in pending:
        if not isinstance(migration, dict):
            raise ValueError("Invalid pending QA migration")
        name, file, digest = (migration.get(key) for key in ("name", "file", "sha256"))
        if (not isinstance(name, str) or not MIGRATION.fullmatch(name) or
                file != f"database/migrations/{name}.php" or name in applied or file in pending_hashes or
                not isinstance(digest, str) or not HASH.fullmatch(digest) or files.get("backend/" + file) != digest):
            raise ValueError("Pending migration does not match the immutable release")
        pending_hashes[file] = digest
    if (not isinstance(policy, dict) or type(policy.get("schema_version")) is not int or
            policy["schema_version"] != 1 or not isinstance(policy.get("initial_bootstrap"), dict) or
            policy["initial_bootstrap"].get("require_empty_database") is not True or
            not isinstance(policy["initial_bootstrap"].get("migrations"), dict) or
            not isinstance(policy.get("backwards_compatible"), dict)):
        raise ValueError("Invalid QA migration policy")
    initial = table_count == 0
    if initial:
        if previous_manifest is not None or applied or state["migrations_table_exists"] or state["bootstrap_completed"]:
            raise ValueError("Initial migration policy requires a genuinely new QA database")
        if pending_hashes != policy["initial_bootstrap"]["migrations"] or not pending_hashes:
            raise ValueError("Initial QA migrations differ from the reviewed bootstrap baseline")
    else:
        if not state["bootstrap_completed"] or not state["migrations_table_exists"]:
            raise ValueError("An existing unbootstrapped QA database requires manual recovery")
        for file, digest in pending_hashes.items():
            declaration = policy["backwards_compatible"].get(file)
            if (not isinstance(declaration, dict) or declaration.get("sha256") != digest or
                    not isinstance(declaration.get("rationale"), str) or not declaration["rationale"].strip()):
                raise ValueError("Pending migration lacks an exact reviewed backwards-compatible declaration")
    return {"initial": initial, "schema_compatible": not initial, "pending": list(pending)}


def package_verifier():
    path = Path(__file__).resolve().with_name("verify-package.py")
    spec = importlib.util.spec_from_file_location("qa_package_verifier", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def extract_verified_archive(archive_path, destination, manifest):
    """Recheck all bytes, then extract without tar's link or metadata handling."""
    destination = Path(destination)
    if destination.exists() or destination.is_symlink():
        raise ValueError("QA release destination already exists")
    verifier = package_verifier()
    # The controller checks the outer checksum; this second validation also binds
    # the exact member bytes used for extraction to the already approved manifest.
    verified = verifier.verify_archive(archive_path, manifest.get("commit"))
    if verified != manifest:
        raise ValueError("QA archive manifest changed before extraction")
    destination.mkdir(mode=0o750)
    seen, extracted = set(), set()
    with tarfile.open(archive_path, "r:gz") as archive:
        for member in archive:
            if member.type not in (tarfile.REGTYPE, tarfile.AREGTYPE, tarfile.DIRTYPE) or member.sparse is not None:
                raise ValueError("QA archive contains an unsafe member")
            name = verifier.validate_member_path(member.name, member.isdir())
            if name in seen or member.mode & 0o7000:
                raise ValueError("QA archive contains duplicate members or unsafe permissions")
            seen.add(name)
            path = destination / name
            if member.isdir():
                path.mkdir(mode=0o755, parents=True, exist_ok=True)
                continue
            path.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
            source = archive.extractfile(member)
            if source is None:
                raise ValueError("Cannot read a QA archive member")
            digest = hashlib.sha256()
            with source, path.open("xb") as output:
                for chunk in iter(lambda: source.read(1024 * 1024), b""):
                    digest.update(chunk)
                    output.write(chunk)
            path.chmod(0o755 if member.mode & 0o111 else 0o644)
            if name == "release.json":
                if json.loads(path.read_text(encoding="utf-8")) != manifest:
                    raise ValueError("QA manifest changed during extraction")
            elif manifest["files"].get(name) != digest.hexdigest():
                raise ValueError("QA file changed during extraction")
            extracted.add(name)
    if extracted != set(manifest["files"]) | {"release.json"}:
        raise ValueError("Extracted files differ from the QA manifest")
    return destination


def require_owned_path(path, *, directory=False, private=False):
    path = Path(path)
    info = path.lstat()
    if path.is_symlink() or path.resolve(strict=True) != path:
        raise ValueError("A QA control path is not an exact physical path")
    expected_type = stat.S_ISDIR if directory else stat.S_ISREG
    if not expected_type(info.st_mode) or info.st_uid != os.geteuid() or info.st_mode & 0o022:
        raise ValueError("A QA control path has unsafe ownership or permissions")
    if private and info.st_mode & 0o077:
        raise ValueError("A private QA control file is accessible to another account")
    return path


def ensure_owned_directory(path):
    path = Path(path)
    if not path.exists() and not path.is_symlink():
        path.mkdir(mode=0o700)
    return require_owned_path(path, directory=True)


def read_json(path):
    path = require_owned_path(path)
    if path.stat().st_size > 16 * 1024 * 1024:
        raise ValueError("QA metadata exceeds the size limit")
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def write_json_atomic(path, value):
    path = Path(path)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            json.dump(value, output, sort_keys=True, indent=2)
            output.write("\n")
            output.flush()
            os.fsync(output.fileno())
        if path.exists() or path.is_symlink():
            require_owned_path(path)
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def run_command(arguments, *, cwd=None, env=None, timeout=120, operation="release command"):
    try:
        result = subprocess.run(arguments, cwd=cwd, env=env, check=False, timeout=timeout,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise ReleaseCommandError("QA " + operation + " could not finish (missing executable or timeout)") from error
    if result.returncode:
        # Command output may contain connection details. Never forward it to CI.
        raise ReleaseCommandError("QA " + operation + " failed with exit code " + str(result.returncode))
    return result.stdout


def require_pidfd_signals():
    if not callable(getattr(os, "pidfd_open", None)) or not callable(getattr(signal, "pidfd_send_signal", None)):
        raise ValueError("QA worker management requires Linux pidfd support")
    try:
        descriptor = os.pidfd_open(os.getpid(), 0)
    except OSError:
        raise ValueError("QA worker management requires working Linux pidfds") from None
    else:
        os.close(descriptor)


def is_stale_qa_worker(identity, root, keep_release, expected_uid, node_executable):
    """Match only this site's physical Passenger Node release processes."""
    if not isinstance(identity, dict) or type(identity.get("uid")) is not int or identity["uid"] != expected_uid:
        return False
    argv0 = identity.get("argv0")
    if not isinstance(argv0, str) or not argv0.startswith("lsnode:") or identity.get("executable") != str(node_executable):
        return False
    cwd = identity.get("cwd")
    if not isinstance(cwd, str) or not re.fullmatch(
            re.escape(str(Path(root) / "releases")) + r"/qa-[0-9a-f]{12}-[0-9]+-[0-9]+/frontend", cwd):
        return False
    return keep_release is None or cwd != str(Path(keep_release) / "frontend")


def stop_stale_qa_workers(root, keep_release=None, *, proc_root=Path("/proc")):
    """Signal through pidfds only, after checking metadata for the opened PID."""
    require_pidfd_signals()
    node_executable = (NODE_DIRECTORY / "node").resolve(strict=True)
    stopped = 0
    deadline = time.monotonic() + 10
    for process in Path(proc_root).iterdir():
        if time.monotonic() >= deadline:
            raise ValueError("QA worker scan exceeded its bounded time limit")
        if not process.name.isdecimal():
            continue
        descriptor = None
        try:
            # Open first: even if this numeric PID is recycled while metadata is
            # read, a signal through this descriptor cannot hit the replacement.
            descriptor = os.pidfd_open(int(process.name), 0)
            uid = process.stat().st_uid
            if uid != os.geteuid():
                continue
            with (process / "cmdline").open("rb") as command:
                argv0 = command.read(4096).split(b"\0", 1)[0].decode("utf-8", errors="replace")
            identity = {"uid": uid, "cwd": os.readlink(process / "cwd"), "argv0": argv0,
                        "executable": os.readlink(process / "exe")}
            if is_stale_qa_worker(identity, root, keep_release, os.geteuid(), node_executable):
                signal.pidfd_send_signal(descriptor, signal.SIGTERM, None, 0)
                stopped += 1
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            # Other users' processes and workers which already exited are benign.
            continue
        finally:
            if descriptor is not None:
                os.close(descriptor)
    return stopped


def runtime_environment():
    require_pidfd_signals()
    php = shutil.which("php")
    node = NODE_DIRECTORY / "node"
    npm = NODE_DIRECTORY / "npm"
    if not php or not node.is_file() or not npm.exists():
        raise ValueError("The required QA runtimes are unavailable")
    version = run_command([php, "-r", "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;"], timeout=15).decode().strip()
    if version != "8.3" or not run_command([str(node), "--version"], timeout=15).decode().startswith("v22."):
        raise ValueError("QA requires PHP 8.3 and Node 22")
    extensions = json.loads(run_command([php, "-r", "echo json_encode(get_loaded_extensions());"], timeout=15))
    if not {"pdo_mysql", "mbstring", "gd", "fileinfo", "bcmath", "dom", "openssl"}.issubset(set(extensions)):
        raise ValueError("Required QA PHP extensions are unavailable")
    environment = os.environ.copy()
    environment["PATH"] = str(NODE_DIRECTORY) + os.pathsep + environment.get("PATH", "")
    environment["NODE_ENV"] = "production"
    return php, str(node), str(npm), environment


def previous_release(root):
    current = root / "current"
    if not current.exists() and not current.is_symlink():
        return None
    if not current.is_symlink():
        raise ValueError("QA current is not a managed symlink")
    relative = os.readlink(current)
    if not re.fullmatch(r"releases/qa-[0-9a-f]{12}-[0-9]+-[0-9]+", relative):
        raise ValueError("QA current points outside managed releases")
    path = require_owned_path(root / relative, directory=True)
    manifest = read_json(path / "release.json")
    if manifest.get("repository") != REPOSITORY or manifest.get("branch") != BRANCH:
        raise ValueError("The previous release has an unexpected source")
    validate_release_identity(path.name, manifest.get("commit"), "0" * 64)
    files = _file_hashes(manifest)
    for required in ("frontend/server.mjs", "backend/public/index.php"):
        if required not in files:
            raise ValueError("The previous release is incomplete")
    # Check restorable entrypoints and immutable migration history on disk too.
    verifier = package_verifier()
    for relative_file, digest in files.items():
        if relative_file in ("frontend/server.mjs", "backend/public/index.php") or relative_file.startswith("backend/database/migrations/"):
            file = require_owned_path(path / relative_file)
            if verifier.sha256_file(file) != digest:
                raise ValueError("The previous release was modified after deployment")
    return {"relative": relative, "path": path, "manifest": manifest}


def stage_runtime(release, shared, target, release_id, commit, php, node, npm, environment):
    backend, frontend = release / "backend", release / "frontend"
    require_owned_path(shared / "backend.env", private=True)
    require_owned_path(shared / "storage", directory=True)
    for relative in (".env", "storage"):
        destination = backend / relative
        if destination.exists() or destination.is_symlink():
            # Only an empty archive scaffold may be replaced by the shared link.
            if relative == "storage" and destination.is_dir() and not destination.is_symlink() and not any(destination.iterdir()):
                destination.rmdir()
            else:
                raise ValueError("The release unexpectedly contains backend runtime state")
        destination.symlink_to(shared / ("backend.env" if relative == ".env" else "storage"), target_is_directory=relative == "storage")
    ensure_owned_directory(backend / "bootstrap" / "cache")
    ensure_owned_directory(frontend / "tmp")
    # Uploaded media lives in shared storage, never in an immutable archive.
    storage_link = backend / "public" / "storage"
    if storage_link.exists() or storage_link.is_symlink():
        raise ValueError("The release unexpectedly contains public storage")
    storage_link.symlink_to(shared / "storage" / "app" / "public", target_is_directory=True)
    frontend_env = "\n".join((
        "API_BACKEND_URL=" + target["url"], "NODE_ENV=production", "MIDIA_RUNTIME_AUTOSTART=enabled",
        "MIDIA_RELEASE=" + release_id, "MIDIA_COMMIT=" + commit, "HOST=127.0.0.1", "",
    ))
    descriptor = os.open(frontend / ".env", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as output:
        output.write(frontend_env)
    run_command([npm, "ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
                cwd=frontend, env=environment, timeout=600, operation="production npm install")
    run_command([node, "--check", "server.mjs"], cwd=frontend, env=environment, timeout=30, operation="Node syntax check")
    run_command([node, "--input-type=module", "-e",
                 "import('sharp').then(({default:s})=>s({create:{width:1,height:1,channels:3,background:'#fff'}}).png().toBuffer())"],
                cwd=frontend, env=environment, timeout=30, operation="native image runtime check")
    run_command([php, "vendor/composer/platform_check.php"], cwd=backend, env=environment, timeout=30, operation="Composer platform check")


def inspect_database(control, backend, target_file, php, environment):
    output = run_command([php, str(control / "database-state.php"), str(backend), str(target_file)],
                         cwd=backend, env=environment, timeout=60, operation="read-only database inventory")
    return json.loads(output)


def validate_mysql_defaults(path, target):
    require_owned_path(path, private=True)
    parser = configparser.ConfigParser(interpolation=None, strict=True)
    with path.open(encoding="utf-8") as source:
        parser.read_file(source)
    if parser.defaults() or parser.sections() != ["client"] or set(parser["client"]) != {"host", "port", "user", "password"}:
        raise ValueError("QA dump defaults contain unreviewed options")
    options = {}
    for key, value in parser["client"].items():
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        options[key] = value
    if (options["host"] != target["database"]["host"] or options["port"] != str(target["database"]["port"]) or
            options["user"] != target["database"]["user"] or not options["password"]):
        raise ValueError("QA dump defaults do not match the dedicated database identity")
    # --defaults-extra-file follows system defaults but precedes per-user files.
    # Do not let a pre-existing user login path silently override this QA target.
    home_directory = Path(pwd.getpwuid(os.geteuid()).pw_dir)
    if any((home_directory / name).exists() for name in (".my.cnf", ".mylogin.cnf")):
        raise ValueError("Unreviewed per-user MySQL defaults prevent an isolated QA backup")


def backup_database(root, shared, target, release_id, environment):
    defaults = shared / "mysql.cnf"
    validate_mysql_defaults(defaults, target)
    binary = shutil.which("mysqldump")
    if not binary:
        raise ValueError("QA mysqldump is unavailable")
    backups = ensure_owned_directory(root / "backups")
    final = backups / (release_id + ".sql.gz")
    if final.exists() or final.is_symlink():
        raise ValueError("A QA backup already exists for this release")
    nonce = uuid.uuid4().hex
    raw = backups / ("." + release_id + "." + nonce + ".sql.tmp")
    compressed = backups / ("." + release_id + "." + nonce + ".gz.tmp")
    try:
        descriptor = os.open(raw, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "wb") as output:
            result = subprocess.run([
                binary, "--defaults-extra-file=" + str(defaults), "--single-transaction", "--quick",
                "--skip-lock-tables", "--no-tablespaces", "--routines", "--events", "--triggers", "--hex-blob",
                "--databases", target["database"]["name"],
            ], env=environment, stdout=output, stderr=subprocess.PIPE, timeout=600, check=False)
            output.flush()
            os.fsync(output.fileno())
        if result.returncode or raw.stat().st_size == 0:
            raise ValueError("QA database backup failed")
        descriptor = os.open(compressed, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with raw.open("rb") as source, os.fdopen(descriptor, "wb") as output:
            with gzip.GzipFile(fileobj=output, mode="wb", mtime=0) as zipped:
                shutil.copyfileobj(source, zipped, length=1024 * 1024)
            output.flush()
            os.fsync(output.fileno())
        count, prefix = 0, b""
        with gzip.open(compressed, "rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                count += len(chunk)
                if len(prefix) < 4 * 1024 * 1024:
                    prefix += chunk
        expected_use = ("USE `" + target["database"]["name"] + "`;").encode()
        if count != raw.stat().st_size or count == 0 or expected_use not in prefix:
            raise ValueError("The compressed QA backup did not validate")
        os.replace(compressed, final)
        return final
    finally:
        # These are unique temporary files created by this invocation, never a glob.
        for temporary in (raw, compressed):
            if temporary.exists() and not temporary.is_symlink():
                temporary.unlink()


def bootstrap_environment(path, environment):
    require_owned_path(path, private=True)
    values = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator or key not in {"QA_BOOTSTRAP_ADMIN_EMAIL", "QA_BOOTSTRAP_ADMIN_PASSWORD"} or key in values:
            raise ValueError("Invalid private QA bootstrap environment")
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        if not value or "\x00" in value:
            raise ValueError("QA bootstrap credentials are missing")
        values[key] = value
    if set(values) != {"QA_BOOTSTRAP_ADMIN_EMAIL", "QA_BOOTSTRAP_ADMIN_PASSWORD"}:
        raise ValueError("QA bootstrap credentials are incomplete")
    email, password = values["QA_BOOTSTRAP_ADMIN_EMAIL"].strip(), values["QA_BOOTSTRAP_ADMIN_PASSWORD"]
    if (not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) or len(email.encode()) > 255 or
            email.lower() in {"admin@midiametal.com", "asd@asd.com"} or
            not 20 <= len(password.encode()) <= 72 or len(set(password)) == 1 or "password" in password.lower()):
        raise ValueError("QA bootstrap requires a unique administrator email and a strong 20-72 byte password")
    values["QA_BOOTSTRAP_ADMIN_EMAIL"] = email
    return {**environment, **values}


def current_points_to(root, relative):
    current = root / "current"
    return current.is_symlink() and os.readlink(current) == relative


def replace_current(root, relative):
    temporary = root / (".current-" + uuid.uuid4().hex)
    try:
        temporary.symlink_to(relative, target_is_directory=True)
        os.replace(temporary, root / "current")
    finally:
        if temporary.is_symlink():
            temporary.unlink()


def restart_release(path):
    directory = require_owned_path(path / "frontend" / "tmp", directory=True)
    restart = directory / "restart.txt"
    if restart.exists() or restart.is_symlink():
        require_owned_path(restart)
    restart.touch(mode=0o600)


def rollback_current(root, own_relative, previous, schema_compatible):
    if not current_points_to(root, own_relative):
        return "current_changed_no_action"
    if previous is None:
        (root / "current").unlink()
        stop_stale_qa_workers(root)
        return "first_release_removed"
    if not schema_compatible:
        return "manual_recovery_required"
    require_owned_path(previous["path"], directory=True)
    replace_current(root, previous["relative"])
    restart_release(previous["path"])
    stop_stale_qa_workers(root, previous["path"])
    return "previous_release_restored"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        return None


def smoke_checks(target, release_id, commit, *, timeout=60):
    deadline = time.monotonic() + timeout
    opener = urllib.request.build_opener(NoRedirect)
    nonce = uuid.uuid4().hex

    def request(path, *, expected_status=200, limit=2 * 1024 * 1024, require_release_identity=True):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise ValueError("QA HTTP verification timed out")
        separator = "&" if "?" in path else "?"
        url = target["url"] + path + separator + urllib.parse.urlencode({"qa_release": release_id, "qa_check": nonce})
        req = urllib.request.Request(url, headers={"Cache-Control": "no-cache", "User-Agent": "Midia-QA-Release-Check"})
        with opener.open(req, timeout=min(8, remaining)) as response:
            if response.status != expected_status:
                raise ValueError("Unexpected QA HTTP status")
            headers = response.headers
            has_release_identity = headers.get("X-Midia-Release") is not None or headers.get("X-Midia-Commit") is not None
            if require_release_identity or has_release_identity:
                if headers.get("X-Midia-Release") != release_id or headers.get("X-Midia-Commit") != commit:
                    raise ValueError("QA HTTP response identifies a different release")
            return headers, response.read(limit)

    last_failure = "HTTP checks did not finish"
    while time.monotonic() < deadline:
        try:
            _, frontend_body = request("/_qa/health", limit=65536)
            frontend = json.loads(frontend_body)
            if frontend.get("status") != "ok" or frontend.get("release") != release_id or frontend.get("commit") != commit:
                raise ValueError("QA frontend health is not ready")
            _, api_body = request("/api/health", limit=65536)
            api = json.loads(api_body)
            if api.get("status") != "ok" or api.get("database") is not True:
                raise ValueError("QA backend database is not healthy")
            for route in ("/services", "/shop"):
                _, body = request(route)
                if b"<html" not in body.lower():
                    raise ValueError("QA content page was not rendered")
            csrf, _ = request("/sanctum/csrf-cookie", expected_status=204, limit=1024)
            if not any("XSRF-TOKEN=" in cookie for cookie in csrf.get_all("Set-Cookie", [])):
                raise ValueError("QA CSRF cookie was not issued")
            # Hostinger can serve static images directly from its CDN without app
            # headers. Dynamic pages/API/PDF responses must still identify this release.
            image_headers, image_body = request("/images/canopy.jpg", limit=32, require_release_identity=False)
            image_signature = (image_body.startswith((b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n", b"GIF87a", b"GIF89a")) or
                               (image_body.startswith(b"RIFF") and image_body[8:12] == b"WEBP"))
            if not image_headers.get("Content-Type", "").lower().startswith("image/") or not image_signature:
                raise ValueError("QA sample image is unavailable")
            _, products_body = request("/api/v1/products?per_page=1")
            products = json.loads(products_body)
            products = products.get("data", []) if isinstance(products, dict) else products
            if not isinstance(products, list):
                raise ValueError("QA product listing is invalid")
            product = next((item for item in products if isinstance(item, dict) and item.get("id") and item.get("pdf_download_enabled", True)), None)
            pdf_verified = False
            if product:
                pdf_headers, pdf_body = request("/api/v1/products/" + urllib.parse.quote(str(product["id"]), safe="") + "/pdf", limit=32)
                if "application/pdf" not in pdf_headers.get("Content-Type", "").lower() or not pdf_body.startswith(b"%PDF-"):
                    raise ValueError("QA product PDF is unavailable")
                pdf_verified = True
            return {"frontend": True, "database": True, "content": True, "csrf": True, "image": True, "pdf": pdf_verified}
        except (urllib.error.URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as error:
            if type(error) is ValueError:
                last_failure = str(error)
            elif isinstance(error, urllib.error.HTTPError):
                last_failure = "HTTP status " + str(error.code)
            elif isinstance(error, json.JSONDecodeError):
                last_failure = "A QA endpoint returned invalid JSON"
            else:
                last_failure = "The QA HTTPS request could not finish"
            remaining = deadline - time.monotonic()
            if remaining > 0:
                time.sleep(min(2, remaining))
    raise ValueError("QA release failed bounded HTTP verification: " + last_failure)


def deploy(target_file, archive, release_id, commit, digest):
    validate_release_identity(release_id, commit, digest)
    target_file, archive = Path(target_file), Path(archive)
    target = load_target(require_owned_path(target_file, private=True))
    root = require_owned_path(Path(target["root"]), directory=True)
    shared = require_owned_path(root / "shared", directory=True)
    control = require_owned_path(root / "control", directory=True)
    if target_file != shared / "target.json" or Path(__file__).resolve().parent != control:
        raise ValueError("QA controller or target path is outside trusted control storage")
    if pwd.getpwuid(os.geteuid()).pw_name != target["ssh"]["user"]:
        raise ValueError("QA controller is running as a different account")
    validate_provisioned(read_json(shared / "provisioned.json"), target)
    if archive != root / "incoming" / (release_id + ".tar.gz"):
        raise ValueError("QA archive is not in its exact incoming location")
    require_owned_path(root / "incoming", directory=True)
    require_owned_path(archive)
    require_owned_path(root / "releases", directory=True)
    for helper in ("target.py", "verify-package.py", "verify-backend.php", "database-state.php"):
        require_owned_path(control / helper)
    lock_path = root / "deploy.lock"
    descriptor = os.open(lock_path, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "a+") as lock:
        require_owned_path(lock_path, private=True)
        fcntl.flock(lock, fcntl.LOCK_EX)
        outcomes = ensure_owned_directory(shared / "deployments")
        outcome_file = outcomes / (release_id + ".json")
        if outcome_file.exists() or outcome_file.is_symlink():
            raise ValueError("This QA deployment attempt already has an outcome")
        outcome = {"repository": REPOSITORY, "branch": BRANCH, "url": URL, "release": release_id,
                   "commit": commit, "archive_sha256": digest, "status": "running", "stage": "verify_archive",
                   "started_at": datetime.now(timezone.utc).isoformat()}
        previous, decision, activation_attempted = None, None, False

        def stage(name):
            outcome["stage"] = name
            write_json_atomic(outcome_file, outcome)

        try:
            stage("verify_archive")
            verifier = package_verifier()
            if not hmac.compare_digest(verifier.sha256_file(archive), digest):
                raise ValueError("The incoming QA archive checksum is incorrect")
            manifest = verifier.verify_archive(archive, commit)
            previous = previous_release(root)
            outcome["previous_release"] = previous["relative"] if previous else None
            stage("stage_release")
            release = extract_verified_archive(archive, root / "releases" / release_id, manifest)
            stage("install_runtime")
            php, node, npm, environment = runtime_environment()
            environment["QA_DEPLOY_TARGET_FILE"] = str(target_file)
            stage_runtime(release, shared, target, release_id, commit, php, node, npm, environment)
            backend = release / "backend"
            stage("verify_backend")
            run_command([php, str(control / "verify-backend.php"), str(backend), str(target_file)],
                        cwd=backend, env=environment, timeout=60, operation="backend identity verification")
            stage("discover_backend_packages")
            run_command([php, "artisan", "package:discover", "--no-interaction", "--no-ansi"],
                        cwd=backend, env=environment, timeout=60, operation="Laravel package discovery")
            stage("review_migrations")
            state = inspect_database(control, backend, target_file, php, environment)
            policy = read_json(release / ".github" / "deploy" / "qa" / "migration-policy.json")
            decision = migration_decision(state, policy, manifest, previous["manifest"] if previous else None)
            outcome["initial_database"] = decision["initial"]
            outcome["schema_compatible"] = decision["schema_compatible"]
            outcome["pending_migrations"] = [item["name"] for item in decision["pending"]]
            # Validate first-use secrets before performing even an initial migration.
            stage("validate_bootstrap_credentials")
            bootstrap_env = bootstrap_environment(shared / "qa-bootstrap.env", environment) if decision["initial"] else None
            stage("backup_database")
            backup = backup_database(root, shared, target, release_id, environment)
            outcome["backup"] = backup.name
            stage("migrate_database")
            # Recheck effective identity immediately before the database mutation.
            run_command([php, str(control / "verify-backend.php"), str(backend), str(target_file)],
                        cwd=backend, env=environment, timeout=60, operation="pre-migration identity verification")
            run_command([php, "artisan", "migrate", "--force", "--no-interaction", "--no-ansi"],
                        cwd=backend, env=environment, timeout=300, operation="Laravel migrations")
            if decision["initial"]:
                stage("bootstrap_database")
                run_command([php, "artisan", "db:seed", "--class=Database\\Seeders\\QaBootstrapSeeder", "--force", "--no-interaction", "--no-ansi"],
                            cwd=backend, env=bootstrap_env, timeout=120, operation="one-time QA bootstrap")
            stage("cache_backend")
            for command in ("config:cache", "route:cache", "view:cache"):
                run_command([php, "artisan", command, "--no-interaction", "--no-ansi"],
                            cwd=backend, env=environment, timeout=120, operation="Laravel " + command)
            require_owned_path(backend / "bootstrap" / "cache" / "config.php").chmod(0o600)
            after = inspect_database(control, backend, target_file, php, environment)
            if after.get("pending_migrations") or after.get("bootstrap_completed") is not True:
                raise ValueError("QA database was not fully migrated and bootstrapped")
            stage("activate_release")
            if previous:
                if not current_points_to(root, previous["relative"]):
                    raise ValueError("The QA current release changed before activation")
            elif (root / "current").exists() or (root / "current").is_symlink():
                raise ValueError("A QA current release appeared before activation")
            activation_attempted = True
            replace_current(root, "releases/" + release_id)
            stage("restart_runtime")
            restart_release(release)
            outcome["stopped_stale_workers"] = stop_stale_qa_workers(root, release)
            stage("verify_http")
            outcome["checks"] = smoke_checks(target, release_id, commit)
            outcome["status"] = "success"
            outcome["stage"] = "complete"
            outcome["completed_at"] = datetime.now(timezone.utc).isoformat()
            write_json_atomic(outcome_file, outcome)
            return outcome
        except Exception as error:
            outcome["status"] = "failed"
            outcome["error_type"] = type(error).__name__
            # Only our fixed ValueError messages and command labels may be exposed.
            # Third-party exception text, child output and credentials stay suppressed.
            outcome["reason"] = str(error) if type(error) in (ValueError, ReleaseCommandError) else "A required local operation failed"
            if activation_attempted:
                try:
                    outcome["rollback"] = rollback_current(root, "releases/" + release_id, previous,
                                                            bool(decision and decision["schema_compatible"]))
                except Exception:
                    outcome["rollback"] = "rollback_failed_manual_recovery_required"
            outcome["database_restored"] = False
            outcome["completed_at"] = datetime.now(timezone.utc).isoformat()
            try:
                write_json_atomic(outcome_file, outcome)
            except Exception:
                # Preserve the useful stage even when the journal cannot be written.
                outcome["reason"] += "; the outcome file could not be updated"
            raise DeploymentFailure("QA deployment failed during " + outcome["stage"] + ": " + outcome["reason"] + "; no database rollback was performed") from None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("target")
    parser.add_argument("archive")
    parser.add_argument("release_id")
    parser.add_argument("commit")
    parser.add_argument("sha256")
    args = parser.parse_args()
    try:
        outcome = deploy(args.target, args.archive, args.release_id, args.commit, args.sha256)
    except DeploymentFailure as error:
        raise SystemExit(str(error)) from None
    except Exception:
        raise SystemExit("QA deployment preflight failed before staging. Check the pinned target, account/control paths, provision marker, archive location, and prior attempt outcome; no database rollback was performed.")
    print(json.dumps({"status": outcome["status"], "release": outcome["release"], "commit": outcome["commit"]}))


if __name__ == "__main__":
    main()
