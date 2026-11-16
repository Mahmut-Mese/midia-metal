#!/usr/bin/env python3
"""Restricted SSH transport for one QA site; never interpret a shell command."""

from contextlib import contextmanager
from dataclasses import dataclass
import fcntl
import getpass
import hashlib
import hmac
import json
import os
from pathlib import Path
import pwd
import re
import secrets
import stat
import subprocess
import sys

# A rejected command must not even create an import cache in the control directory.
sys.dont_write_bytecode = True
import target


MAX_UPLOAD_BYTES = 512 * 1024 * 1024
MAX_MANIFEST_BYTES = 16 * 1024 * 1024
BLOCK_BYTES = 1024 * 1024
RELEASE_PATTERN = r"qa-([0-9a-f]{12})-([0-9]+)-([0-9]+)"
COMMAND_PATTERN = re.compile(
    rf"(qa-upload|qa-deploy) ({RELEASE_PATTERN}) ([0-9a-f]{{40}}) ([0-9a-f]{{64}})",
    re.ASCII,
)


@dataclass(frozen=True)
class Command:
    action: str
    release: str = ""
    commit: str = ""
    digest: str = ""


@dataclass(frozen=True)
class Context:
    root: Path
    configuration: dict
    user: str
    home: str


def validate_release(release, commit):
    match = re.fullmatch(RELEASE_PATTERN, release, re.ASCII)
    if (len(release) > 128 or not match or
            not re.fullmatch(r"[0-9a-f]{40}", commit, re.ASCII) or match[1] != commit[:12]):
        raise ValueError("Invalid QA release identity")


def parse_command(original):
    # Exact ASCII spaces, no quoting/escaping/control characters or trailing input.
    if not isinstance(original, str) or len(original) > 512:
        raise ValueError("Invalid QA command")
    if original == "qa-status":
        return Command("qa-status")
    match = COMMAND_PATTERN.fullmatch(original)
    if not match:
        raise ValueError("Invalid QA command")
    action, release, _, _, _, commit, digest = match.groups()
    validate_release(release, commit)
    return Command(action, release, commit, digest)


def require_owned(metadata, directory=False):
    expected_type = stat.S_ISDIR if directory else stat.S_ISREG
    if (not expected_type(metadata.st_mode) or metadata.st_uid != os.geteuid()
            or metadata.st_mode & 0o022):
        raise ValueError("Untrusted QA filesystem entry")


def require_directory(path):
    if path.resolve(strict=True) != path:
        raise ValueError("Noncanonical QA directory")
    require_owned(path.lstat(), directory=True)


def read_trusted_file(path, maximum):
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(descriptor, "rb") as source:
        metadata = os.fstat(source.fileno())
        require_owned(metadata)
        if metadata.st_size > maximum:
            raise ValueError("QA metadata exceeds its size limit")
        content = source.read(maximum + 1)
        if len(content) > maximum:
            raise ValueError("QA metadata exceeds its size limit")
        return content


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate QA metadata field")
        result[key] = value
    return result


def load_context(script=None):
    script = Path(script if script is not None else __file__).absolute()
    root = script.parent.parent
    if script.name != "ssh-gate.py" or script.parent.name != "control":
        raise ValueError("Unexpected QA gate location")
    require_directory(root)
    require_directory(root / "control")
    require_directory(root / "shared")
    require_owned(script.lstat())
    configuration = target.validate_target(json.loads(
        read_trusted_file(root / "shared/target.json", 64 * 1024),
        object_pairs_hook=unique_object,
    ))
    account = pwd.getpwuid(os.geteuid())
    if (root != Path(configuration["root"]) or getpass.getuser() != configuration["ssh"]["user"]
            or account.pw_name != configuration["ssh"]["user"]):
        raise ValueError("QA account or root does not match the approved target")
    return Context(root, configuration, account.pw_name, account.pw_dir)


@contextmanager
def incoming_directory(context, create=False):
    path = context.root / "incoming"
    if create:
        path.mkdir(mode=0o700, exist_ok=True)
    require_directory(path)
    descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        require_owned(os.fstat(descriptor), directory=True)
        yield descriptor
    finally:
        os.close(descriptor)


@contextmanager
def upload_lock(directory):
    descriptor = os.open(".upload.lock", os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW,
                         0o600, dir_fd=directory)
    try:
        require_owned(os.fstat(descriptor))
        fcntl.flock(descriptor, fcntl.LOCK_EX)
        yield
    finally:
        os.close(descriptor)


def hash_stream(source, destination=None, maximum=None):
    maximum = MAX_UPLOAD_BYTES if maximum is None else maximum
    digest = hashlib.sha256()
    total = 0
    while True:
        block = source.read(min(BLOCK_BYTES, maximum - total + 1))
        if not block:
            break
        total += len(block)
        if total > maximum:
            raise ValueError("QA upload exceeds its size limit")
        digest.update(block)
        if destination is not None:
            destination.write(block)
    if total == 0:
        raise ValueError("Empty QA archive")
    return digest.hexdigest()


def archive_digest(directory, name):
    descriptor = os.open(name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=directory)
    with os.fdopen(descriptor, "rb") as source:
        metadata = os.fstat(source.fileno())
        require_owned(metadata)
        if metadata.st_size > MAX_UPLOAD_BYTES:
            raise ValueError("QA archive exceeds its size limit")
        return hash_stream(source)


def upload(context, command, source):
    name = command.release + ".tar.gz"
    with incoming_directory(context, create=True) as directory, upload_lock(directory):
        try:
            existing = archive_digest(directory, name)
        except FileNotFoundError:
            existing = None
        if existing is not None:
            if not hmac.compare_digest(existing, command.digest):
                raise ValueError("A different archive already exists for this release")
            if not hmac.compare_digest(hash_stream(source), command.digest):
                raise ValueError("QA upload checksum mismatch")
            return {"status": "uploaded", "release": command.release, "reused": True}

        partial = f".{command.release}.{secrets.token_hex(16)}.partial"
        descriptor = os.open(partial, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                             0o600, dir_fd=directory)
        try:
            with os.fdopen(descriptor, "wb") as destination:
                digest = hash_stream(source, destination)
                destination.flush()
                os.fsync(destination.fileno())
            if not hmac.compare_digest(digest, command.digest):
                raise ValueError("QA upload checksum mismatch")
            # The protocol lock serializes every publisher. Refuse an unexpected
            # target before the atomic rename; this transport never replaces one.
            try:
                os.stat(name, dir_fd=directory, follow_symlinks=False)
            except FileNotFoundError:
                pass
            else:
                raise ValueError("QA archive appeared during upload")
            os.rename(partial, name, src_dir_fd=directory, dst_dir_fd=directory)
            os.fsync(directory)
        finally:
            try:
                os.unlink(partial, dir_fd=directory)
            except FileNotFoundError:
                pass
    return {"status": "uploaded", "release": command.release, "reused": False}


def deploy(context, command):
    name = command.release + ".tar.gz"
    with incoming_directory(context) as directory:
        if not hmac.compare_digest(archive_digest(directory, name), command.digest):
            raise ValueError("QA archive checksum mismatch")
    controller = context.root / "control/remote-release.py"
    require_directory(controller.parent)
    require_owned(controller.lstat())
    environment = {
        "PATH": "/usr/local/bin:/usr/bin:/bin", "LANG": "C.UTF-8",
        "HOME": context.home, "USER": context.user, "LOGNAME": context.user,
    }
    subprocess.run([
        sys.executable, "-E", str(controller), str(context.root / "shared/target.json"),
        str(context.root / "incoming" / name), command.release, command.commit, command.digest,
    ], check=True, stdin=subprocess.DEVNULL, env=environment)


def status(context):
    current = context.root / "current"
    try:
        link = os.readlink(current)
    except FileNotFoundError:
        return {"status": "uninitialized", "release": None, "commit": None}
    match = re.fullmatch(rf"releases/({RELEASE_PATTERN})", link, re.ASCII)
    if not match:
        raise ValueError("Unexpected active QA release link")
    release = match[1]
    require_directory(context.root / "releases")
    directory = context.root / "releases" / release
    require_directory(directory)
    if current.resolve(strict=True) != directory:
        raise ValueError("Active QA release resolves outside the release directory")
    manifest = json.loads(read_trusted_file(directory / "release.json", MAX_MANIFEST_BYTES),
                          object_pairs_hook=unique_object)
    if (not isinstance(manifest, dict) or manifest.get("repository") != target.REPOSITORY
            or manifest.get("branch") != target.BRANCH):
        raise ValueError("Unexpected active QA release provenance")
    commit = manifest.get("commit", "")
    if not isinstance(commit, str):
        raise ValueError("Invalid active QA commit")
    validate_release(release, commit)
    return {"status": "ok", "release": release, "commit": commit}


def main():
    try:
        if len(sys.argv) != 1:
            raise ValueError("QA gate does not accept arguments")
        command = parse_command(os.environ.get("SSH_ORIGINAL_COMMAND"))
        context = load_context()
        if command.action == "qa-upload":
            result = upload(context, command, sys.stdin.buffer)
        elif command.action == "qa-deploy":
            deploy(context, command)
            return 0
        else:
            result = status(context)
        print(json.dumps(result, sort_keys=True))
        return 0
    except (ValueError, OSError, TypeError, KeyError, AttributeError, subprocess.SubprocessError):
        # Avoid echoing caller input, account paths, configuration or exception data.
        print("QA command refused.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
