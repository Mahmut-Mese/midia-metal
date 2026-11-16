"""Exercise the forced-command boundary without SSH or private account details."""

import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
from types import SimpleNamespace
import sys
import tempfile
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location("qa_ssh_gate", Path(__file__).with_name("ssh-gate.py"))
gate = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = gate
SPEC.loader.exec_module(gate)

COMMIT = "a" * 40
RELEASE = f"qa-{COMMIT[:12]}-12345-1"
ARCHIVE = b"a transport fixture; the trusted deployment controller verifies the tar contents"
DIGEST = hashlib.sha256(ARCHIVE).hexdigest()


def command(action="qa-upload", release=RELEASE, commit=COMMIT, digest=DIGEST):
    return gate.parse_command(f"{action} {release} {commit} {digest}")


class CommandTests(unittest.TestCase):
    def test_accepts_only_the_three_documented_operations(self):
        self.assertEqual(gate.parse_command("qa-status"), gate.Command("qa-status"))
        self.assertEqual(command(), gate.Command("qa-upload", RELEASE, COMMIT, DIGEST))
        self.assertEqual(command("qa-deploy").action, "qa-deploy")

    def test_refuses_shells_paths_control_characters_and_other_protocols(self):
        valid = f"qa-upload {RELEASE} {COMMIT} {DIGEST}"
        commands = [
            None, "", "sh", "bash -c id", "scp -t incoming", "rsync --server . .",
            "qa-status x", "qa-status\n", " qa-status", "qa-status; id", "qa-status && id",
            valid + "; id", valid + "\n", valid + " extra", valid.replace(" ", "\t", 1),
            valid.replace(" ", "  ", 1), valid.replace(RELEASE, "../" + RELEASE),
            valid.replace(RELEASE, "/tmp/" + RELEASE), valid.replace(RELEASE, "$(id)"),
            valid.replace(RELEASE, RELEASE + "/../../other"),
            valid.replace(COMMIT, "b" * 40), valid.replace(DIGEST, "0" * 63),
            valid.replace(DIGEST, "A" * 64), "qa-upload " + "x" * 600,
        ]
        for original in commands:
            with self.subTest(original=original), self.assertRaises(ValueError):
                gate.parse_command(original)

    def test_rejects_malformed_before_context_load_or_any_operation(self):
        for original in ["rm -rf /", "qa-status\n", "qa-upload ../../etc x y"]:
            with self.subTest(original=original), patch.dict(os.environ, {"SSH_ORIGINAL_COMMAND": original}), \
                    patch.object(sys, "argv", ["ssh-gate.py"]), \
                    patch.object(gate, "load_context") as load_context, \
                    patch.object(gate, "upload") as upload, \
                    patch.object(gate, "deploy") as deploy, \
                    contextlib.redirect_stderr(io.StringIO()) as error:
                self.assertEqual(gate.main(), 1)
                self.assertEqual(error.getvalue(), "QA command refused.\n")
                load_context.assert_not_called()
                upload.assert_not_called()
                deploy.assert_not_called()


class SandboxTestCase(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="qa-gate-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve() / ".midia-qa"
        self.root.mkdir(mode=0o700)
        (self.root / "control").mkdir(mode=0o700)
        (self.root / "shared").mkdir(mode=0o700)
        self.context = gate.Context(self.root, {}, "fixture-user", str(self.root.parent))


class FilesystemTests(SandboxTestCase):
    def upload(self, body=ARCHIVE, upload_command=None):
        return gate.upload(self.context, upload_command or command(), io.BytesIO(body))

    def test_valid_upload_is_private_atomic_and_idempotent_without_overwriting(self):
        result = self.upload()
        self.assertFalse(result["reused"])
        archive = self.root / "incoming" / (RELEASE + ".tar.gz")
        self.assertEqual(archive.read_bytes(), ARCHIVE)
        self.assertEqual(archive.stat().st_mode & 0o777, 0o600)
        inode, changed = archive.stat().st_ino, archive.stat().st_mtime_ns
        self.assertTrue(self.upload()["reused"])
        self.assertEqual((archive.stat().st_ino, archive.stat().st_mtime_ns), (inode, changed))
        self.assertEqual(list((self.root / "incoming").glob("*.partial")), [])

    def test_wrong_checksum_and_truncated_retry_never_publish_or_replace(self):
        with self.assertRaisesRegex(ValueError, "checksum"):
            self.upload(b"wrong bytes")
        archive = self.root / "incoming" / (RELEASE + ".tar.gz")
        self.assertFalse(archive.exists())
        self.assertEqual(list((self.root / "incoming").glob("*.partial")), [])
        self.upload()
        with self.assertRaisesRegex(ValueError, "checksum"):
            self.upload(b"truncated")
        self.assertEqual(archive.read_bytes(), ARCHIVE)
        with self.assertRaisesRegex(ValueError, "already exists"):
            self.upload(upload_command=command(digest="0" * 64))
        self.assertEqual(archive.read_bytes(), ARCHIVE)

    def test_oversize_or_empty_upload_is_removed_without_publication(self):
        for content in [b"", b"abcd"]:
            with self.subTest(content=content), patch.object(gate, "MAX_UPLOAD_BYTES", 3), self.assertRaises(ValueError):
                self.upload(content)
            self.assertEqual(list((self.root / "incoming").glob("*.partial")), [])
            self.assertFalse((self.root / "incoming" / (RELEASE + ".tar.gz")).exists())

    def test_incoming_symlink_is_rejected_before_writing_outside_root(self):
        other = self.root.parent / "other-app"
        other.mkdir()
        (self.root / "incoming").symlink_to(other, target_is_directory=True)
        with self.assertRaises(ValueError):
            self.upload()
        self.assertEqual(list(other.iterdir()), [])

    def test_archive_symlink_never_reads_or_overwrites_another_file(self):
        incoming = self.root / "incoming"
        incoming.mkdir(mode=0o700)
        private = self.root.parent / "private-file"
        private.write_bytes(ARCHIVE)
        (incoming / (RELEASE + ".tar.gz")).symlink_to(private)
        with self.assertRaises(OSError):
            self.upload()
        self.assertEqual(private.read_bytes(), ARCHIVE)

    def test_atomic_publication_observes_the_complete_checked_archive(self):
        original_rename = os.rename
        seen = []

        def inspect_rename(source, destination, **kwargs):
            self.assertTrue(source.endswith(".partial"))
            self.assertEqual(destination, RELEASE + ".tar.gz")
            self.assertEqual((self.root / "incoming" / source).read_bytes(), ARCHIVE)
            self.assertFalse((self.root / "incoming" / destination).exists())
            seen.append(destination)
            return original_rename(source, destination, **kwargs)

        with patch.object(gate.os, "rename", side_effect=inspect_rename):
            self.upload()
        self.assertEqual(seen, [RELEASE + ".tar.gz"])

    def test_deploy_uses_only_the_trusted_controller_and_fixed_argument_list(self):
        self.upload()
        controller = self.root / "control/remote-release.py"
        controller.write_text("# fixture controller\n")
        with patch.dict(os.environ, {"PYTHONPATH": "/other", "LD_PRELOAD": "/evil"}), \
                patch.object(gate.subprocess, "run") as run:
            gate.deploy(self.context, command("qa-deploy"))
        args, kwargs = run.call_args
        self.assertEqual(args[0], [
            sys.executable, "-E", str(controller), str(self.root / "shared/target.json"),
            str(self.root / "incoming" / (RELEASE + ".tar.gz")), RELEASE, COMMIT, DIGEST,
        ])
        self.assertTrue(kwargs["check"])
        self.assertEqual(kwargs["stdin"], gate.subprocess.DEVNULL)
        self.assertNotIn("shell", kwargs)
        self.assertNotIn("PYTHONPATH", kwargs["env"])
        self.assertNotIn("LD_PRELOAD", kwargs["env"])

    def test_deploy_refuses_wrong_hash_and_symlinked_controller(self):
        self.upload()
        with patch.object(gate.subprocess, "run") as run:
            with self.assertRaisesRegex(ValueError, "checksum"):
                gate.deploy(self.context, command("qa-deploy", digest="0" * 64))
            run.assert_not_called()
        elsewhere = self.root.parent / "controller.py"
        elsewhere.write_text("# not the trusted controller\n")
        (self.root / "control/remote-release.py").symlink_to(elsewhere)
        with patch.object(gate.subprocess, "run") as run:
            with self.assertRaises(ValueError):
                gate.deploy(self.context, command("qa-deploy"))
            run.assert_not_called()

    def activate(self, manifest=None):
        release = self.root / "releases" / RELEASE
        release.mkdir(parents=True)
        (release / "release.json").write_text(json.dumps(manifest or {
            "repository": gate.target.REPOSITORY, "branch": "qa", "commit": COMMIT,
            "token": "never-output-this", "files": {"private-name": "hash"},
        }))
        (self.root / "current").symlink_to("releases/" + RELEASE, target_is_directory=True)
        return release

    def test_status_is_sanitized_and_handles_no_active_release(self):
        self.assertEqual(gate.status(self.context), {"status": "uninitialized", "release": None, "commit": None})
        self.activate()
        self.assertEqual(gate.status(self.context), {"status": "ok", "release": RELEASE, "commit": COMMIT})

    def test_status_refuses_escaping_symlinks_and_wrong_provenance(self):
        current = self.root / "current"
        for link in ["../other-app", "/tmp/other-app", "releases/../../other-app"]:
            with self.subTest(link=link):
                current.symlink_to(link)
                with self.assertRaises(ValueError):
                    gate.status(self.context)
                current.unlink()
        release = self.activate({"repository": gate.target.REPOSITORY, "branch": "content", "commit": COMMIT})
        with self.assertRaisesRegex(ValueError, "provenance"):
            gate.status(self.context)
        (release / "release.json").write_text(json.dumps({"repository": gate.target.REPOSITORY, "branch": "qa", "commit": "b" * 40}))
        with self.assertRaisesRegex(ValueError, "identity"):
            gate.status(self.context)


class ContextTests(SandboxTestCase):
    # Use only synthetic details. validate_target already has dedicated account/hash
    # tests; these tests verify that the gate invokes it and binds filesystem + user.
    def fixture(self):
        script = self.root / "control/ssh-gate.py"
        script.write_text("# trusted fixture\n")
        configuration = {"root": str(self.root), "ssh": {"user": "fixture-user"}}
        (self.root / "shared/target.json").write_text(json.dumps(configuration))
        account = SimpleNamespace(pw_name="fixture-user", pw_dir=str(self.root.parent))
        return script, configuration, account

    def test_context_invokes_target_validation_and_checks_real_user(self):
        script, configuration, account = self.fixture()
        with patch.object(gate.target, "validate_target", return_value=configuration) as validate, \
                patch.object(gate.getpass, "getuser", return_value=account.pw_name), \
                patch.object(gate.pwd, "getpwuid", return_value=account):
            self.assertEqual(gate.load_context(script).root, self.root)
            validate.assert_called_once_with(configuration)
        account.pw_name = "another-user"
        with patch.object(gate.target, "validate_target", return_value=configuration), \
                patch.object(gate.getpass, "getuser", return_value="fixture-user"), \
                patch.object(gate.pwd, "getpwuid", return_value=account), self.assertRaisesRegex(ValueError, "account"):
            gate.load_context(script)

    def test_context_refuses_wrong_root_and_symlinked_private_target(self):
        script, configuration, account = self.fixture()
        configuration["root"] = str(self.root.parent / "other-app")
        with patch.object(gate.target, "validate_target", return_value=configuration), \
                patch.object(gate.getpass, "getuser", return_value=account.pw_name), \
                patch.object(gate.pwd, "getpwuid", return_value=account), self.assertRaisesRegex(ValueError, "root"):
            gate.load_context(script)
        target_file = self.root / "shared/target.json"
        elsewhere = self.root.parent / "target.json"
        target_file.rename(elsewhere)
        target_file.symlink_to(elsewhere)
        with self.assertRaises(OSError):
            gate.load_context(script)

    def test_context_does_not_bypass_a_rejected_account_hash(self):
        script, _, _ = self.fixture()
        with patch.object(gate.target, "validate_target", side_effect=ValueError("Target is not the approved Hostinger account")) as validate:
            with self.assertRaisesRegex(ValueError, "approved Hostinger account"):
                gate.load_context(script)
            validate.assert_called_once()
        self.assertFalse((self.root / "incoming").exists())


if __name__ == "__main__":
    unittest.main()
