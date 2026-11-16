"""Security-boundary tests using tiny synthetic release archives only."""

import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest


spec = importlib.util.spec_from_file_location("qa_verify_package", Path(__file__).with_name("verify-package.py"))
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)

COMMIT = "0123456789abcdef0123456789abcdef01234567"


class VerifyPackageTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.counter = 0
        self.files = {name: f"synthetic fixture: {name}\n".encode() for name in verifier.REQUIRED_FILES}

    def manifest(self, files=None):
        files = self.files if files is None else files
        return {
            "repository": verifier.REPOSITORY,
            "branch": verifier.BRANCH,
            "commit": COMMIT,
            "files": {name: hashlib.sha256(data).hexdigest() for name, data in files.items()},
        }

    def archive(self, files=None, manifest=None, extras=(), raw_manifest=None, include_manifest=True):
        files = self.files if files is None else files
        manifest = self.manifest(files) if manifest is None else manifest
        self.counter += 1
        path = self.directory / f"release-{self.counter}.tar.gz"
        with tarfile.open(path, "w:gz", format=tarfile.PAX_FORMAT) as bundle:
            for name in ("frontend", "backend", ".github", ".github/deploy", ".github/deploy/qa", "backend/bootstrap/cache"):
                info = tarfile.TarInfo(name)
                info.type = tarfile.DIRTYPE
                bundle.addfile(info)
            for name, data in files.items():
                info = tarfile.TarInfo(name)
                info.size = len(data)
                bundle.addfile(info, io.BytesIO(data))
            for info, data in extras:
                info.size = len(data)
                bundle.addfile(info, io.BytesIO(data) if info.isreg() else None)
            if include_manifest:
                data = json.dumps(manifest).encode() if raw_manifest is None else raw_manifest
                info = tarfile.TarInfo("release.json")
                info.size = len(data)
                bundle.addfile(info, io.BytesIO(data))
        return path

    def checksum(self, archive, digest=None, filename=None, path=None):
        path = Path(str(archive) + ".sha256") if path is None else path
        digest = verifier.sha256_file(archive) if digest is None else digest
        filename = archive.name if filename is None else filename
        path.write_text(f"{digest}  {filename}\n", encoding="ascii")
        return path

    def test_valid_archive_returns_manifest_without_extracting(self):
        archive = self.archive()
        before = set(self.directory.iterdir())
        self.assertEqual(verifier.verify_archive(archive, COMMIT), self.manifest())
        self.assertEqual(set(self.directory.iterdir()), before)

    def test_adjacent_and_explicit_checksums_are_verified(self):
        archive = self.archive()
        self.checksum(archive)
        self.assertEqual(verifier.verify_archive(archive, COMMIT), self.manifest())
        second = self.archive()
        checksum = self.checksum(second, path=self.directory / "explicit.sha256")
        self.assertEqual(verifier.verify_archive(second, COMMIT, checksum), self.manifest())

    def test_rejects_checksum_mismatch(self):
        archive = self.archive()
        self.checksum(archive, digest="0" * 64)
        with self.assertRaisesRegex(ValueError, "checksum mismatch"):
            verifier.verify_archive(archive, COMMIT)

    def test_rejects_checksum_wrong_filename_and_malformed_records(self):
        for filename in ("other.tar.gz", "../release.tar.gz", "release.tar.gz\nextra"):
            with self.subTest(filename=filename):
                archive = self.archive()
                self.checksum(archive, filename=filename)
                with self.assertRaisesRegex(ValueError, "checksum record"):
                    verifier.verify_archive(archive, COMMIT)
        archive = self.archive()
        self.checksum(archive, digest="not-a-hash")
        with self.assertRaisesRegex(ValueError, "checksum record"):
            verifier.verify_archive(archive, COMMIT)

    def test_rejects_missing_explicit_checksum(self):
        with self.assertRaisesRegex(ValueError, "checksum"):
            verifier.verify_archive(self.archive(), COMMIT, self.directory / "missing.sha256")

    def test_rejects_tampered_file_contents(self):
        files = dict(self.files)
        files["backend/artisan"] = b"tampered fixture"
        archive = self.archive(files=files, manifest=self.manifest())
        with self.assertRaisesRegex(ValueError, "file hash mismatch"):
            verifier.verify_archive(archive, COMMIT)

    def test_rejects_unlisted_or_missing_archive_files(self):
        extra = tarfile.TarInfo("frontend/unlisted.txt")
        archive = self.archive(extras=[(extra, b"unlisted fixture")])
        with self.assertRaisesRegex(ValueError, "exactly match"):
            verifier.verify_archive(archive, COMMIT)
        files = dict(self.files)
        del files["backend/artisan"]
        archive = self.archive(files=files, manifest=self.manifest())
        with self.assertRaisesRegex(ValueError, "exactly match"):
            verifier.verify_archive(archive, COMMIT)

    def test_required_runtime_files_remain_mandatory(self):
        for name in verifier.REQUIRED_FILES:
            with self.subTest(name=name):
                files = dict(self.files)
                del files[name]
                archive = self.archive(files=files)
                with self.assertRaisesRegex(ValueError, "required runtime files"):
                    verifier.verify_archive(archive, COMMIT)

    def test_rejects_unsafe_paths(self):
        names = (
            "frontend/../outside.txt", "/frontend/absolute.txt", "frontend\\backslash.txt",
            "frontend//alias.txt", "./frontend/dot.txt", "frontend/./dot.txt",
            ".github/workflows/other.yml", "outside/file.txt", "frontend",
        )
        for name in names:
            with self.subTest(name=name):
                info = tarfile.TarInfo(name)
                archive = self.archive(extras=[(info, b"synthetic")])
                with self.assertRaises(ValueError):
                    verifier.verify_archive(archive, COMMIT)

    def test_rejects_links_devices_and_fifos(self):
        for kind in (tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.CHRTYPE, tarfile.BLKTYPE, tarfile.FIFOTYPE):
            with self.subTest(kind=kind):
                info = tarfile.TarInfo("frontend/special")
                info.type = kind
                info.linkname = "backend/artisan"
                archive = self.archive(extras=[(info, b"")])
                with self.assertRaisesRegex(ValueError, "link or special file"):
                    verifier.verify_archive(archive, COMMIT)

    def test_rejects_traversal_in_pax_path_metadata(self):
        info = tarfile.TarInfo("frontend/safe-looking.txt")
        info.pax_headers = {"path": "frontend/../../outside.txt"}
        archive = self.archive(extras=[(info, b"synthetic")])
        with self.assertRaisesRegex(ValueError, "Noncanonical"):
            verifier.verify_archive(archive, COMMIT)

    def test_rejects_duplicate_members(self):
        info = tarfile.TarInfo("backend/artisan")
        archive = self.archive(extras=[(info, self.files["backend/artisan"])])
        with self.assertRaisesRegex(ValueError, "duplicate members"):
            verifier.verify_archive(archive, COMMIT)

    def test_rejects_file_as_parent_directory(self):
        files = {**self.files, "frontend/dist": b"file in directory position"}
        archive = self.archive(files=files)
        with self.assertRaisesRegex(ValueError, "file used as a directory"):
            verifier.verify_archive(archive, COMMIT)

    def test_rejects_private_and_runtime_files_even_if_manifested(self):
        names = (
            "backend/.env", "backend/.env.production", "frontend/.ENV", ".github/deploy/qa/target.json",
            "backend/database/database.sqlite-wal", "backend/database/dump.sql.gz",
            "backend/database/backup.dump", "backend/storage/app/private.txt",
            "backend/bootstrap/cache/config.php", "backend/public/storage/upload.jpg",
            "backend/public/uploads/private.txt", "frontend/node_modules/package/index.js",
            ".github/deploy/qa/__pycache__/target.pyc", "backend/.git/config",
        )
        for name in names:
            with self.subTest(name=name):
                archive = self.archive(files={**self.files, name: b"synthetic private fixture"})
                with self.assertRaisesRegex(ValueError, "private|runtime"):
                    verifier.verify_archive(archive, COMMIT)

    def test_rejects_wrong_release_identity(self):
        for field, value in (("repository", "someone-else/midia-metal"), ("branch", "content"), ("commit", "f" * 40)):
            with self.subTest(field=field):
                manifest = self.manifest()
                manifest[field] = value
                with self.assertRaisesRegex(ValueError, "identity"):
                    verifier.verify_archive(self.archive(manifest=manifest), COMMIT)

    def test_rejects_invalid_expected_commit(self):
        for commit in ("HEAD", "a" * 39, "G" * 40, None):
            with self.subTest(commit=commit), self.assertRaisesRegex(ValueError, "expected source commit"):
                verifier.verify_archive(self.archive(), commit)

    def test_rejects_missing_or_invalid_manifest(self):
        with self.assertRaisesRegex(ValueError, "manifest is missing"):
            verifier.verify_archive(self.archive(include_manifest=False), COMMIT)
        for content in (b"not JSON", b"[]", b'{"branch":"qa","branch":"content"}'):
            with self.subTest(content=content), self.assertRaises(ValueError):
                verifier.verify_archive(self.archive(raw_manifest=content), COMMIT)

    def test_rejects_invalid_manifest_hashes_or_self_reference(self):
        for value in ("", "a" * 63, "G" * 64, 123):
            with self.subTest(value=value):
                manifest = self.manifest()
                manifest["files"]["backend/artisan"] = value
                with self.assertRaisesRegex(ValueError, "file hash"):
                    verifier.verify_archive(self.archive(manifest=manifest), COMMIT)
        manifest = self.manifest()
        manifest["files"]["release.json"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "file hash"):
            verifier.verify_archive(self.archive(manifest=manifest), COMMIT)

    def test_rejects_special_permission_bits(self):
        info = tarfile.TarInfo("frontend/special-permissions")
        info.mode = 0o4755
        archive = self.archive(extras=[(info, b"synthetic")])
        with self.assertRaisesRegex(ValueError, "permission bits"):
            verifier.verify_archive(archive, COMMIT)

    def test_rejects_invalid_tar_data(self):
        archive = self.directory / "invalid.tar.gz"
        archive.write_bytes(b"not an archive")
        with self.assertRaisesRegex(ValueError, "Cannot read"):
            verifier.verify_archive(archive, COMMIT)


if __name__ == "__main__":
    unittest.main()
