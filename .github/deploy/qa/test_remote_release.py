"""Exercise remote lifecycle safety decisions using local synthetic fixtures."""

import copy
from email.message import Message
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("qa_remote_release", Path(__file__).with_name("remote-release.py"))
remote = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = remote
spec.loader.exec_module(remote)

COMMIT = "0123456789abcdef0123456789abcdef01234567"
DIGEST = "a" * 64
FIRST_NAME = "2026_01_01_000001_create_fixture_tables"
SECOND_NAME = "2026_01_02_000001_add_nullable_fixture_field"
FIRST_FILE = f"database/migrations/{FIRST_NAME}.php"
SECOND_FILE = f"database/migrations/{SECOND_NAME}.php"
FIRST_HASH = hashlib.sha256(b"synthetic first migration").hexdigest()
SECOND_HASH = hashlib.sha256(b"synthetic additive migration").hexdigest()


class ReleaseIdentityTests(unittest.TestCase):
    def test_accepts_bound_commit_run_and_attempt(self):
        remote.validate_release_identity(f"qa-{COMMIT[:12]}-123456-2", COMMIT, DIGEST)

    def test_rejects_mismatched_or_unsafe_release_identifiers(self):
        values = (
            "qa-ffffffffffff-123456-2", f"content-{COMMIT[:12]}-123456-2",
            f"qa-{COMMIT[:12]}-123456-x", f"qa-{COMMIT[:12]}-../1-2",
            f"qa-{COMMIT[:12]}-123456-2\n", "../release", "", None,
        )
        for release in values:
            with self.subTest(release=release), self.assertRaises(ValueError):
                remote.validate_release_identity(release, COMMIT, DIGEST)

    def test_rejects_invalid_source_and_archive_hashes(self):
        release = f"qa-{COMMIT[:12]}-123456-2"
        for commit in ("a" * 39, "a" * 41, "g" * 40, "A" * 40, None):
            with self.subTest(commit=commit), self.assertRaises(ValueError):
                remote.validate_release_identity(release, commit, DIGEST)
        for digest in ("a" * 63, "a" * 65, "g" * 64, "A" * 64, None):
            with self.subTest(digest=digest), self.assertRaises(ValueError):
                remote.validate_release_identity(release, COMMIT, digest)


class MigrationDecisionTests(unittest.TestCase):
    def setUp(self):
        self.pending = [
            {"name": FIRST_NAME, "file": FIRST_FILE, "sha256": FIRST_HASH},
            {"name": SECOND_NAME, "file": SECOND_FILE, "sha256": SECOND_HASH},
        ]
        self.initial = {
            "schema_version": 1,
            "table_count": 0,
            "empty_database": True,
            "migrations_table_exists": False,
            "applied_migrations": [],
            "pending_migrations": copy.deepcopy(self.pending),
            "bootstrap_version": None,
            "bootstrap_completed": False,
        }
        self.policy = {
            "schema_version": 1,
            "initial_bootstrap": {
                "require_empty_database": True,
                "migrations": {FIRST_FILE: FIRST_HASH, SECOND_FILE: SECOND_HASH},
            },
            "backwards_compatible": {},
        }
        self.manifest = {"files": {"backend/" + FIRST_FILE: FIRST_HASH, "backend/" + SECOND_FILE: SECOND_HASH}}
        self.previous = {"files": {"backend/" + FIRST_FILE: FIRST_HASH}}
        self.populated = {
            **copy.deepcopy(self.initial),
            "table_count": 4,
            "empty_database": False,
            "migrations_table_exists": True,
            "applied_migrations": [FIRST_NAME],
            "pending_migrations": [copy.deepcopy(self.pending[1])],
            "bootstrap_version": "1",
            "bootstrap_completed": True,
        }

    def declare_additive(self, **overrides):
        declaration = {"sha256": SECOND_HASH, "rationale": "Adds only a nullable fixture field; previous queries remain valid."}
        declaration.update(overrides)
        self.policy["backwards_compatible"][SECOND_FILE] = declaration

    def test_empty_database_accepts_only_exact_initial_baseline(self):
        result = remote.migration_decision(self.initial, self.policy, self.manifest)
        self.assertTrue(result["initial"])
        self.assertFalse(result["schema_compatible"])
        self.assertEqual(len(result["pending"]), 2)

    def test_initial_bootstrap_rejects_missing_extra_or_changed_baseline(self):
        for change in ("missing", "extra", "changed", "disabled"):
            with self.subTest(change=change):
                policy = copy.deepcopy(self.policy)
                migrations = policy["initial_bootstrap"]["migrations"]
                if change == "missing":
                    del migrations[FIRST_FILE]
                elif change == "extra":
                    migrations["database/migrations/2026_01_03_extra.php"] = "f" * 64
                elif change == "changed":
                    migrations[FIRST_FILE] = "f" * 64
                else:
                    policy["initial_bootstrap"]["require_empty_database"] = False
                with self.assertRaises(ValueError):
                    remote.migration_decision(self.initial, policy, self.manifest)

    def test_initial_bootstrap_rejects_marker_applied_table_or_previous_release(self):
        for field, value in (("bootstrap_completed", True), ("applied_migrations", [FIRST_NAME]),
                             ("migrations_table_exists", True)):
            with self.subTest(field=field):
                state = {**self.initial, field: value}
                with self.assertRaises(ValueError):
                    remote.migration_decision(state, self.policy, self.manifest)
        with self.assertRaises(ValueError):
            remote.migration_decision(self.initial, self.policy, self.manifest, self.previous)

    def test_populated_database_cannot_use_initial_baseline(self):
        with self.assertRaises(ValueError):
            remote.migration_decision(self.populated, self.policy, self.manifest, self.previous)

    def test_populated_unmarked_database_requires_manual_recovery(self):
        self.declare_additive()
        state = {**self.populated, "bootstrap_completed": False, "bootstrap_version": None}
        with self.assertRaises(ValueError):
            remote.migration_decision(state, self.policy, self.manifest, self.previous)

    def test_approved_additive_migration_is_compatible(self):
        self.declare_additive()
        result = remote.migration_decision(self.populated, self.policy, self.manifest, self.previous)
        self.assertFalse(result["initial"])
        self.assertTrue(result["schema_compatible"])
        self.assertEqual(len(result["pending"]), 1)

    def test_additive_declaration_requires_correct_hash_and_explanation(self):
        declarations = (
            {"sha256": "f" * 64, "rationale": "Synthetic explanation"},
            {"sha256": SECOND_HASH, "rationale": "   "},
            {"sha256": SECOND_HASH},
            {"rationale": "Synthetic explanation"},
        )
        for declaration in declarations:
            with self.subTest(declaration=declaration):
                policy = copy.deepcopy(self.policy)
                policy["backwards_compatible"][SECOND_FILE] = declaration
                with self.assertRaises(ValueError):
                    remote.migration_decision(self.populated, policy, self.manifest, self.previous)

    def test_no_pending_migrations_is_compatible(self):
        state = {**self.populated, "pending_migrations": []}
        result = remote.migration_decision(state, self.policy, self.previous, self.previous)
        self.assertFalse(result["initial"])
        self.assertTrue(result["schema_compatible"])
        self.assertEqual(result["pending"], [])

    def test_rejects_rewritten_or_removed_applied_migrations(self):
        self.declare_additive()
        for change in ("rewrite", "delete"):
            with self.subTest(change=change):
                manifest = copy.deepcopy(self.manifest)
                if change == "rewrite":
                    manifest["files"]["backend/" + FIRST_FILE] = "f" * 64
                else:
                    del manifest["files"]["backend/" + FIRST_FILE]
                with self.assertRaises(ValueError):
                    remote.migration_decision(self.populated, self.policy, manifest, self.previous)

    def test_rejects_applied_migration_missing_from_new_release(self):
        self.declare_additive()
        state = {**self.populated, "applied_migrations": ["2026_01_01_unknown_migration"]}
        with self.assertRaises(ValueError):
            remote.migration_decision(state, self.policy, self.manifest, self.previous)

    def test_rejects_pending_file_hash_mismatch_or_missing_file(self):
        for change in ("hash", "missing"):
            with self.subTest(change=change):
                manifest = copy.deepcopy(self.manifest)
                if change == "hash":
                    manifest["files"]["backend/" + SECOND_FILE] = "f" * 64
                else:
                    del manifest["files"]["backend/" + SECOND_FILE]
                with self.assertRaises(ValueError):
                    remote.migration_decision(self.initial, self.policy, manifest)

    def test_rejects_inconsistent_database_state(self):
        changes = (
            ("schema_version", 2), ("table_count", -1), ("table_count", "0"),
            ("table_count", False), ("table_count", 3), ("empty_database", False),
            ("empty_database", "true"),
        )
        for field, value in changes:
            with self.subTest(field=field, value=value):
                state = {**self.initial, field: value}
                with self.assertRaises(ValueError):
                    remote.migration_decision(state, self.policy, self.manifest)
        policy = {**self.policy, "schema_version": 2}
        with self.assertRaises(ValueError):
            remote.migration_decision(self.initial, policy, self.manifest)

    def test_rejects_malformed_or_duplicate_migration_history(self):
        changes = (
            ("applied_migrations", None),
            ("applied_migrations", [FIRST_NAME, FIRST_NAME]),
            ("applied_migrations", ["../unexpected"]),
            ("pending_migrations", None),
            ("pending_migrations", ["not an object"]),
            ("pending_migrations", [self.pending[1], self.pending[1]]),
            ("pending_migrations", [{**self.pending[1], "file": "../unexpected.php"}]),
            ("pending_migrations", [{**self.pending[1], "name": FIRST_NAME}]),
        )
        self.declare_additive()
        for field, value in changes:
            with self.subTest(field=field, value=value):
                state = {**self.populated, field: value}
                with self.assertRaises(ValueError):
                    remote.migration_decision(state, self.policy, self.manifest, self.previous)

    def test_rejects_inconsistent_bootstrap_marker(self):
        for state in (
            {**self.initial, "bootstrap_version": "1"},
            {**self.populated, "bootstrap_version": None},
            {**self.populated, "bootstrap_version": "2"},
        ):
            with self.subTest(state=state), self.assertRaises(ValueError):
                remote.migration_decision(state, self.policy, self.manifest)


class ProvisionMarkerTests(unittest.TestCase):
    def setUp(self):
        self.target = {"repository": "Mahmut-Mese/midia-metal", "branch": "qa", "url": "https://test.midiametal.com"}
        self.marker = {
            **self.target, "account_digest": "c" * 64, "routing": "node-php-v1",
        }
        digest_patch = patch.object(remote, "ACCOUNT_DIGEST", "c" * 64)
        digest_patch.start()
        self.addCleanup(digest_patch.stop)

    def test_accepts_bound_synthetic_marker(self):
        remote.validate_provisioned(self.marker, self.target)

    def test_rejects_marker_identity_or_routing_mismatch(self):
        for field, value in (("repository", "someone-else/midia-metal"), ("branch", "content"),
                             ("url", "https://example.invalid"), ("account_digest", "d" * 64),
                             ("routing", "unmanaged")):
            with self.subTest(field=field), self.assertRaises(ValueError):
                remote.validate_provisioned({**self.marker, field: value}, self.target)

    def test_rejects_missing_or_non_object_marker(self):
        for marker in (None, [], "", {}):
            with self.subTest(marker=marker), self.assertRaises(ValueError):
                remote.validate_provisioned(marker, self.target)


class VerifiedExtractionTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.archive = self.directory / "fixture.tar.gz"
        self.destination = self.directory / "release"
        self.files = {
            "frontend/dist/server/entry.mjs": b"synthetic frontend",
            "frontend/server.mjs": b"synthetic server",
            "backend/artisan": b"synthetic artisan",
            "backend/vendor/autoload.php": b"synthetic autoload",
            ".github/deploy/qa/verify-backend.php": b"synthetic backend verifier",
            ".github/deploy/qa/remote-release.py": b"synthetic lifecycle",
        }
        self.manifest = {
            "repository": "Mahmut-Mese/midia-metal", "branch": "qa", "commit": COMMIT,
            "files": {name: hashlib.sha256(data).hexdigest() for name, data in self.files.items()},
        }

    def write_archive(self, files=None, extras=(), manifest=None):
        files = self.files if files is None else files
        manifest = self.manifest if manifest is None else manifest
        with tarfile.open(self.archive, "w:gz") as bundle:
            for name, data in files.items():
                info = tarfile.TarInfo(name)
                info.size = len(data)
                bundle.addfile(info, io.BytesIO(data))
            for info, data in extras:
                info.size = len(data)
                bundle.addfile(info, io.BytesIO(data) if info.isreg() else None)
            data = json.dumps(manifest).encode()
            info = tarfile.TarInfo("release.json")
            info.size = len(data)
            bundle.addfile(info, io.BytesIO(data))

    def test_extracts_only_verified_files(self):
        self.write_archive()
        remote.extract_verified_archive(self.archive, self.destination, self.manifest)
        for name, content in self.files.items():
            self.assertEqual((self.destination / name).read_bytes(), content)
        files = {p.relative_to(self.destination).as_posix() for p in self.destination.rglob("*") if p.is_file()}
        self.assertEqual(files, set(self.files) | {"release.json"})

    def test_refuses_existing_destination(self):
        self.write_archive()
        self.destination.mkdir()
        sentinel = self.destination / "keep.txt"
        sentinel.write_text("keep", encoding="utf-8")
        with self.assertRaises((ValueError, FileExistsError)):
            remote.extract_verified_archive(self.archive, self.destination, self.manifest)
        self.assertEqual(sentinel.read_text(), "keep")

    def test_refuses_destination_symlink(self):
        self.write_archive()
        outside = self.directory / "outside"
        outside.mkdir()
        self.destination.symlink_to(outside, target_is_directory=True)
        with self.assertRaises((ValueError, FileExistsError)):
            remote.extract_verified_archive(self.archive, self.destination, self.manifest)
        self.assertEqual(list(outside.iterdir()), [])

    def test_rejects_tampered_contents(self):
        files = {**self.files, "backend/artisan": b"changed synthetic contents"}
        self.write_archive(files=files)
        with self.assertRaises(ValueError):
            remote.extract_verified_archive(self.archive, self.destination, self.manifest)

    def test_rejects_extra_missing_and_duplicate_members(self):
        for kind in ("extra", "missing", "duplicate"):
            with self.subTest(kind=kind):
                destination = self.directory / kind
                files = dict(self.files)
                extras = []
                if kind == "missing":
                    del files["backend/artisan"]
                else:
                    name = "frontend/unlisted.txt" if kind == "extra" else "backend/artisan"
                    extras = [(tarfile.TarInfo(name), b"synthetic")]
                self.write_archive(files=files, extras=extras)
                with self.assertRaises(ValueError):
                    remote.extract_verified_archive(self.archive, destination, self.manifest)

    def test_rejects_traversal_and_archive_links(self):
        for kind in ("traversal", "symlink", "hardlink"):
            with self.subTest(kind=kind):
                name = "../outside.txt" if kind == "traversal" else "frontend/linked"
                info = tarfile.TarInfo(name)
                if kind != "traversal":
                    info.type = tarfile.SYMTYPE if kind == "symlink" else tarfile.LNKTYPE
                    info.linkname = "../outside.txt"
                self.write_archive(extras=[(info, b"synthetic" if kind == "traversal" else b"")])
                with self.assertRaises(ValueError):
                    remote.extract_verified_archive(self.archive, self.directory / kind, self.manifest)
                self.assertFalse((self.directory / "outside.txt").exists())

    def test_rejects_manifest_identity_mismatch(self):
        wrong = {**self.manifest, "branch": "content"}
        self.write_archive(manifest=wrong)
        with self.assertRaises(ValueError):
            remote.extract_verified_archive(self.archive, self.destination, self.manifest)


class RollbackTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve() / "qa"
        self.root.mkdir(mode=0o700)
        (self.root / "releases").mkdir(mode=0o700)
        self.own_relative = f"releases/qa-{COMMIT[:12]}-123456-2"
        self.previous_relative = f"releases/qa-{COMMIT[:12]}-123455-1"
        for relative in (self.own_relative, self.previous_relative):
            (self.root / relative / "frontend/tmp").mkdir(parents=True, mode=0o700)
        self.previous = {"relative": self.previous_relative, "path": self.root / self.previous_relative}
        (self.root / "current").symlink_to(self.own_relative, target_is_directory=True)
        self.sentinel = self.root / "synthetic-database-sentinel"
        self.sentinel.write_text("database must remain untouched", encoding="utf-8")
        for name in ("run_command", "backup_database"):
            blocker = patch.object(remote, name, side_effect=AssertionError("Rollback must not run database commands"))
            blocker.start()
            self.addCleanup(blocker.stop)
        workers = patch.object(remote, "stop_stale_qa_workers", return_value=0)
        self.cleanup_workers = workers.start()
        self.addCleanup(workers.stop)

    def test_restores_only_a_known_previous_release(self):
        result = remote.rollback_current(self.root, self.own_relative, self.previous, True)
        self.assertEqual(result, "previous_release_restored")
        self.assertEqual((self.root / "current").readlink().as_posix(), self.previous_relative)
        self.assertTrue((self.previous["path"] / "frontend/tmp/restart.txt").is_file())
        self.assertEqual(self.sentinel.read_text(), "database must remain untouched")
        self.cleanup_workers.assert_called_once_with(self.root, self.previous["path"])

    def test_first_failure_removes_only_its_own_current_link(self):
        result = remote.rollback_current(self.root, self.own_relative, None, False)
        self.assertEqual(result, "first_release_removed")
        self.assertFalse((self.root / "current").exists())
        self.assertFalse((self.root / "current").is_symlink())
        self.assertTrue((self.root / self.own_relative).is_dir())
        self.assertEqual(self.sentinel.read_text(), "database must remain untouched")
        self.cleanup_workers.assert_called_once_with(self.root)

    def test_preserves_a_current_link_changed_by_another_operation(self):
        (self.root / "current").unlink()
        (self.root / "current").symlink_to(self.previous_relative, target_is_directory=True)
        result = remote.rollback_current(self.root, self.own_relative, None, False)
        self.assertEqual(result, "current_changed_no_action")
        self.assertEqual((self.root / "current").readlink().as_posix(), self.previous_relative)
        self.assertFalse((self.previous["path"] / "frontend/tmp/restart.txt").exists())
        self.cleanup_workers.assert_not_called()

    def test_preserves_an_unrelated_regular_current_file(self):
        (self.root / "current").unlink()
        (self.root / "current").write_text("unrelated sentinel", encoding="utf-8")
        result = remote.rollback_current(self.root, self.own_relative, self.previous, True)
        self.assertEqual(result, "current_changed_no_action")
        self.assertEqual((self.root / "current").read_text(), "unrelated sentinel")
        self.cleanup_workers.assert_not_called()

    def test_refuses_automatic_rollback_to_an_incompatible_schema(self):
        result = remote.rollback_current(self.root, self.own_relative, self.previous, False)
        self.assertEqual(result, "manual_recovery_required")
        self.assertEqual((self.root / "current").readlink().as_posix(), self.own_relative)
        self.assertEqual(self.sentinel.read_text(), "database must remain untouched")
        self.cleanup_workers.assert_not_called()

    def test_rejects_previous_release_path_replaced_by_a_symlink(self):
        original = self.previous["path"]
        moved = self.root / "moved-previous"
        original.rename(moved)
        original.symlink_to(moved, target_is_directory=True)
        with self.assertRaises(ValueError):
            remote.rollback_current(self.root, self.own_relative, self.previous, True)
        self.assertEqual((self.root / "current").readlink().as_posix(), self.own_relative)


class PrivateRuntimeConfigurationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name).resolve()
        self.home = self.directory / "synthetic-home"
        self.home.mkdir(mode=0o700)
        self.target = {"database": {"host": "localhost", "port": 3306,
                                    "user": "u123456789_qa_user", "name": "u123456789_qa_database"}}
        account = patch.object(remote.pwd, "getpwuid", return_value=SimpleNamespace(pw_dir=str(self.home)))
        account.start()
        self.addCleanup(account.stop)

    def private_file(self, name, text):
        path = self.directory / name
        path.write_text(text, encoding="utf-8")
        path.chmod(0o600)
        return path

    def mysql_defaults(self, **overrides):
        values = {"host": "localhost", "port": "3306", "user": "u123456789_qa_user",
                  "password": '"synthetic-only-dump-secret"'}
        values.update(overrides)
        return self.private_file("mysql.cnf", "[client]\n" + "\n".join(f"{key}={value}" for key, value in values.items()) + "\n")

    def test_accepts_only_private_mysql_defaults_bound_to_target(self):
        remote.validate_mysql_defaults(self.mysql_defaults(), self.target)

    def test_rejects_mysql_identity_mismatch_and_unknown_options(self):
        for overrides in ({"host": "198.51.100.20"}, {"port": "3307"}, {"user": "u987654321_qa_user"},
                          {"password": '""'}, {"init-command": "synthetic disallowed option"}, {"database": "other"}):
            with self.subTest(overrides=overrides), self.assertRaises(ValueError):
                remote.validate_mysql_defaults(self.mysql_defaults(**overrides), self.target)

    def test_rejects_mysql_defaults_with_other_sections(self):
        for extra in ("[mysqldump]\nuser=other\n", "[DEFAULT]\nhost=localhost\n"):
            path = self.mysql_defaults()
            with path.open("a", encoding="utf-8") as destination:
                destination.write(extra)
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                remote.validate_mysql_defaults(path, self.target)

    def test_rejects_nonprivate_or_symlinked_mysql_defaults(self):
        path = self.mysql_defaults()
        path.chmod(0o644)
        with self.assertRaises(ValueError):
            remote.validate_mysql_defaults(path, self.target)
        path.chmod(0o600)
        link = self.directory / "linked.cnf"
        link.symlink_to(path)
        with self.assertRaises(ValueError):
            remote.validate_mysql_defaults(link, self.target)

    def test_rejects_user_defaults_that_can_override_database_identity(self):
        path = self.mysql_defaults()
        for name in (".my.cnf", ".mylogin.cnf"):
            override = self.home / name
            override.write_text("synthetic override", encoding="utf-8")
            with self.subTest(name=name), self.assertRaises(ValueError):
                remote.validate_mysql_defaults(path, self.target)
            override.unlink()

    def bootstrap_file(self, email="qa-admin@example.invalid", credential="Synthetic-Only-Strong-Admin-42!"):
        return self.private_file("qa-bootstrap.env", f"QA_BOOTSTRAP_ADMIN_EMAIL={email}\nQA_BOOTSTRAP_ADMIN_PASSWORD={credential}\n")

    def test_accepts_unique_synthetic_bootstrap_credentials(self):
        result = remote.bootstrap_environment(self.bootstrap_file(), {"PATH": "/synthetic/bin"})
        self.assertEqual(result["QA_BOOTSTRAP_ADMIN_EMAIL"], "qa-admin@example.invalid")
        self.assertEqual(result["QA_BOOTSTRAP_ADMIN_PASSWORD"], "Synthetic-Only-Strong-Admin-42!")
        self.assertEqual(result["PATH"], "/synthetic/bin")

    def test_rejects_weak_bootstrap_credentials_before_migration(self):
        for credential in ("short", "a" * 30, "This-Contains-Password-123!", "aB" * 37, "é" * 37):
            with self.subTest(credential=credential), self.assertRaises(ValueError):
                remote.bootstrap_environment(self.bootstrap_file(credential=credential), {})

    def test_rejects_default_or_invalid_bootstrap_admin_emails(self):
        for email in ("admin@midiametal.com", "asd@asd.com", "invalid", "" ):
            with self.subTest(email=email), self.assertRaises(ValueError):
                remote.bootstrap_environment(self.bootstrap_file(email=email), {})

    def test_rejects_extra_or_missing_bootstrap_configuration(self):
        for text in ("QA_BOOTSTRAP_ADMIN_EMAIL=qa@example.invalid\n",
                     "QA_BOOTSTRAP_ADMIN_EMAIL=qa@example.invalid\nUNEXPECTED=synthetic\n",
                     "QA_BOOTSTRAP_ADMIN_EMAIL=qa@example.invalid\nQA_BOOTSTRAP_ADMIN_EMAIL=second@example.invalid\n"):
            with self.subTest(text=text), self.assertRaises(ValueError):
                remote.bootstrap_environment(self.private_file("qa-bootstrap.env", text), {})

class SmokeCheckTests(unittest.TestCase):
    def setUp(self):
        self.release = f"qa-{COMMIT[:12]}-123456-2"
        self.responses = {
            "/_qa/health": (200, "application/json", json.dumps({"status": "ok", "release": self.release, "commit": COMMIT}).encode()),
            "/api/health": (200, "application/json", b'{"status":"ok","database":true}'),
            "/services": (200, "text/html", b"<html>synthetic services</html>"),
            "/shop": (200, "text/html", b"<html>synthetic shop</html>"),
            "/sanctum/csrf-cookie": (204, "text/plain", b""),
            "/images/canopy.jpg": (200, "image/jpeg", b"\xff\xd8\xffsynthetic-jpeg\xff\xd9"),
            "/api/v1/products": (200, "application/json", b'[{"id":1,"pdf_download_enabled":true}]'),
            "/api/v1/products/1/pdf": (200, "application/pdf", b"%PDF-1.4 synthetic fixture"),
        }
        self.missing_identity = set()
        self.image_identity = {}
        self.requests = []

    def open_response(self, request, timeout):
        path = remote.urllib.parse.urlsplit(request.full_url).path
        self.requests.append(path)
        status, content_type, body = self.responses[path]
        response = io.BytesIO(body)
        response.status = status
        response.headers = Message()
        response.headers["Content-Type"] = content_type
        if path == "/images/canopy.jpg":
            for name, value in self.image_identity.items():
                response.headers[name] = value
        elif path not in self.missing_identity:
            response.headers["X-Midia-Release"] = self.release
            response.headers["X-Midia-Commit"] = COMMIT
        if path == "/sanctum/csrf-cookie":
            response.headers["Set-Cookie"] = "XSRF-TOKEN=synthetic; Path=/; Secure"
        return response

    def run_smoke(self):
        clock = [0.0]
        opener = SimpleNamespace(open=self.open_response)
        with patch.object(remote.urllib.request, "build_opener", return_value=opener), \
                patch.object(remote.time, "monotonic", side_effect=lambda: clock[0]), \
                patch.object(remote.time, "sleep", side_effect=lambda seconds: clock.__setitem__(0, clock[0] + seconds)):
            return remote.smoke_checks({"url": "https://test.midiametal.com"}, self.release, COMMIT, timeout=1)

    def test_accepts_unversioned_static_jpeg_when_dynamic_checks_match(self):
        result = self.run_smoke()
        self.assertEqual(result, {"frontend": True, "database": True, "content": True,
                                  "csrf": True, "image": True, "pdf": True})
        self.assertEqual(set(self.requests), set(self.responses))

    def test_dynamic_frontend_api_and_pdf_still_require_release_identity(self):
        for path in ("/_qa/health", "/api/health", "/api/v1/products/1/pdf"):
            self.missing_identity = {path}
            self.requests = []
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.run_smoke()
            self.assertIn(path, self.requests)

    def test_rejects_nonimage_payload_with_image_content_type(self):
        self.responses["/images/canopy.jpg"] = (200, "image/jpeg", b"<html>not an image</html>")
        with self.assertRaises(ValueError):
            self.run_smoke()

    def test_rejects_incomplete_or_wrong_static_release_headers(self):
        for headers in ({"X-Midia-Release": self.release},
                        {"X-Midia-Release": "qa-wrong-release", "X-Midia-Commit": COMMIT}):
            self.image_identity = headers
            with self.subTest(headers=headers), self.assertRaises(ValueError):
                self.run_smoke()


class StaleQaWorkerTests(unittest.TestCase):
    def test_worker_identity_and_keep_release_boundaries(self):
        root = Path("/synthetic/qa")
        release = root / f"releases/qa-{COMMIT[:12]}-123456-1"
        node = Path("/synthetic/node22/node")
        identity = {"uid": 12345, "cwd": str(release / "frontend"),
                    "argv0": "lsnode:" + str(release / "frontend/server.mjs"), "executable": str(node)}
        self.assertTrue(remote.is_stale_qa_worker(identity, root, None, 12345, node))
        self.assertFalse(remote.is_stale_qa_worker(identity, root, release, 12345, node))
        self.assertTrue(remote.is_stale_qa_worker(identity, root, root / "releases/qa-ffffffffffff-9-1", 12345, node))
        cases = (
            ("uid", 54321), ("uid", True), ("argv0", "node"), ("argv0", "python"),
            ("executable", "/synthetic/node20/node"),
            ("cwd", "/synthetic/other-site/releases/qa-0123456789ab-123456-1/frontend"),
            ("cwd", str(release / "backend")), ("cwd", str(release / "frontend") + "/"),
            ("cwd", str(root / "current/frontend")),
        )
        for field, value in cases:
            with self.subTest(field=field, value=value):
                self.assertFalse(remote.is_stale_qa_worker({**identity, field: value}, root, None, 12345, node))

    def test_pidfd_scan_signals_only_matching_stale_worker_and_closes_descriptors(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary).resolve()
            root, proc, node_directory = directory / "qa", directory / "proc", directory / "node22"
            proc.mkdir()
            node_directory.mkdir()
            node = node_directory / "node"
            node.write_text("synthetic executable", encoding="utf-8")
            stale = root / f"releases/qa-{COMMIT[:12]}-123456-1"
            keep = root / f"releases/qa-{COMMIT[:12]}-123456-2"
            for pid, cwd, argv0 in ((101, stale / "frontend", "lsnode:" + str(stale / "frontend/server.mjs")),
                                    (102, keep / "frontend", "lsnode:" + str(keep / "frontend/server.mjs")),
                                    (103, directory / "unrelated", "lsnode:/unrelated/server.mjs")):
                process = proc / str(pid)
                process.mkdir()
                (process / "cmdline").write_bytes(argv0.encode() + b"\0")
                (process / "cwd").symlink_to(cwd, target_is_directory=True)
                (process / "exe").symlink_to(node)
            opened = set()
            closed = []
            original_readlink = remote.os.readlink

            def open_pidfd(pid, flags):
                opened.add(pid)
                return pid + 1000

            def read_metadata(path):
                if Path(path).parent.parent == proc:
                    self.assertIn(int(Path(path).parent.name), opened)
                return original_readlink(path)

            with patch.object(remote, "require_pidfd_signals"), \
                    patch.object(remote, "NODE_DIRECTORY", node_directory), \
                    patch.object(remote.os, "pidfd_open", side_effect=open_pidfd, create=True), \
                    patch.object(remote.os, "readlink", side_effect=read_metadata), \
                    patch.object(remote.os, "close", side_effect=closed.append), \
                    patch.object(remote.signal, "pidfd_send_signal", create=True) as signal_worker:
                self.assertEqual(remote.stop_stale_qa_workers(root, keep, proc_root=proc), 1)
                signal_worker.assert_called_once_with(1101, remote.signal.SIGTERM, None, 0)
            self.assertEqual(set(closed), {1101, 1102, 1103})
            self.assertEqual(len(closed), 3)


if __name__ == "__main__":
    unittest.main()
