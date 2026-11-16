"""Check release source selection without installing packages or contacting a host."""

import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("qa_package_release", Path(__file__).with_name("package-release.py"))
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)


class PackageSourceTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.base = Path(temporary.name)
        self.root = self.base / "source"
        self.root.mkdir()
        self.stage = self.base / "stage"
        self.tracked = {}

    def add(self, relative, content="synthetic fixture", tracked=True, mode="100644"):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        if tracked:
            self.tracked[relative] = mode
        return path

    def backend_manifests(self):
        for relative in package.BACKEND_MANIFESTS:
            self.add(relative)

    def create_git_tree_fixture(self):
        # A Git tree is sufficient for diff validation; no commits are created.
        subprocess.run(["git", "init", "--quiet", str(self.root)], check=True, capture_output=True)
        self.add("source.txt", "checked contents\n", tracked=False)
        self.add(".gitignore", ".env\n", tracked=False)
        subprocess.run(["git", "add", "source.txt", ".gitignore"], cwd=self.root, check=True, capture_output=True)
        return subprocess.check_output(["git", "write-tree"], cwd=self.root, text=True).strip()

    def test_clean_source_permits_untracked_build_and_private_runtime_files(self):
        tree = self.create_git_tree_fixture()
        self.add("dist/generated.js", "build output", tracked=False)
        self.add(".env", "SYNTHETIC=private", tracked=False)
        package.require_committed_source(self.root, tree)

    def test_rejects_worktree_mutation_after_checked_revision(self):
        tree = self.create_git_tree_fixture()
        (self.root / "source.txt").write_text("unverified changed contents\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "differs from the checked commit"):
            package.require_committed_source(self.root, tree)

    def test_rejects_staged_source_not_in_checked_revision(self):
        tree = self.create_git_tree_fixture()
        self.add("extra.php", "new unverified source", tracked=False)
        subprocess.run(["git", "add", "extra.php"], cwd=self.root, check=True, capture_output=True)
        with self.assertRaisesRegex(ValueError, "differs from the checked commit"):
            package.require_committed_source(self.root, tree)

    def test_git_revision_verification_fails_closed(self):
        self.create_git_tree_fixture()
        with self.assertRaisesRegex(ValueError, "Cannot verify"):
            package.require_committed_source(self.root, "nonexistent-revision")

    def test_backend_copies_only_selected_tracked_source(self):
        self.backend_manifests()
        self.add("backend/app/Example.php")
        self.add("backend/database/migrations/001_example.php")
        self.add("backend/public/images/catalogue.svg")
        excluded = (
            "backend/.env",
            "backend/app/.env.production",
            "backend/database/database.sqlite",
            "backend/database/database.sqlite-wal",
            "backend/database/local-backup.sql",
            "backend/bootstrap/cache/config.php",
            "backend/public/storage/private-upload.txt",
            "backend/resources/debug.log",
            "backend/tests/Feature/ExampleTest.php",
        )
        for relative in excluded:
            self.add(relative)
        self.add("backend/app/untracked-secret.txt", tracked=False)
        self.add("backend/public/uploads/local-upload.jpg", tracked=False)

        package.copy_backend(self.root, self.stage, self.tracked)

        copied = {path.relative_to(self.stage).as_posix() for path in self.stage.rglob("*") if path.is_file()}
        expected = {name.removeprefix("backend/") for name in package.BACKEND_MANIFESTS}
        expected.update({"app/Example.php", "database/migrations/001_example.php", "public/images/catalogue.svg"})
        self.assertEqual(copied, expected)

    def test_missing_required_backend_manifest_fails(self):
        self.add("backend/app/Example.php")
        with self.assertRaisesRegex(ValueError, "Required backend"):
            package.copy_backend(self.root, self.stage, self.tracked)

    def test_private_target_is_excluded_even_if_tracked(self):
        prefix = package.DEPLOY_PREFIX
        self.add(prefix + "server.mjs")
        self.add(prefix + "target.example.json", '{"example": true}')
        self.add(prefix + "target.json", '{"private": "synthetic"}')
        self.add(prefix + ".env", "SYNTHETIC=private")
        self.add(prefix + "__pycache__/target.pyc")
        self.add(prefix + "untracked-key", tracked=False)

        package.copy_deployment(self.root, self.stage, self.tracked)

        copied = {path.relative_to(self.stage).as_posix() for path in self.stage.rglob("*") if path.is_file()}
        self.assertEqual(copied, {"server.mjs", "target.example.json"})

    def test_rejects_tracked_symlink_mode(self):
        relative = "backend/app/linked.php"
        self.add(relative, mode="120000")
        with self.assertRaisesRegex(ValueError, "tracked regular file"):
            package.copy_tracked_file(self.root, relative, self.stage / "linked.php", self.tracked)
        self.assertFalse(self.stage.exists())

    def test_rejects_worktree_symlink_before_copying_target_contents(self):
        outside = self.base / "synthetic-private-file"
        outside.write_text("never copy this fixture", encoding="utf-8")
        relative = "backend/app/linked.php"
        source = self.root / relative
        source.parent.mkdir(parents=True)
        source.symlink_to(outside)
        self.tracked[relative] = "100644"
        with self.assertRaisesRegex(ValueError, "source symlink"):
            package.copy_tracked_file(self.root, relative, self.stage / "linked.php", self.tracked)
        self.assertFalse(self.stage.exists())

    def test_rejects_symlinked_parent_directory(self):
        outside = self.base / "outside"
        outside.mkdir()
        (outside / "example.php").write_text("synthetic", encoding="utf-8")
        (self.root / "backend").mkdir()
        (self.root / "backend/app").symlink_to(outside, target_is_directory=True)
        relative = "backend/app/example.php"
        self.tracked[relative] = "100644"
        with self.assertRaisesRegex(ValueError, "source symlink"):
            package.copy_tracked_file(self.root, relative, self.stage / "example.php", self.tracked)
        self.assertFalse(self.stage.exists())

    def test_generated_dist_copies_regular_build_files(self):
        self.add("dist/client/index.html", "<h1>QA fixture</h1>", tracked=False)
        self.add("dist/server/entry.mjs", "export {};", tracked=False)
        package.copy_generated_dist(self.root / "dist", self.stage)
        self.assertEqual((self.stage / "client/index.html").read_text(), "<h1>QA fixture</h1>")
        self.assertTrue((self.stage / "server/entry.mjs").is_file())

    def test_generated_dist_rejects_symlinked_files_and_directories(self):
        for directory_link in (False, True):
            with self.subTest(directory_link=directory_link):
                dist = self.root / str(directory_link)
                dist.mkdir()
                outside = self.base / f"outside-{directory_link}"
                if directory_link:
                    outside.mkdir()
                else:
                    outside.write_text("synthetic", encoding="utf-8")
                (dist / "linked").symlink_to(outside, target_is_directory=directory_link)
                with self.assertRaisesRegex(ValueError, "source symlink"):
                    package.copy_generated_dist(dist, self.stage)
                self.assertFalse(self.stage.exists())

    def test_generated_dist_rejects_symlinked_root(self):
        actual = self.root / "actual"
        actual.mkdir()
        (self.root / "dist").symlink_to(actual, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "source symlink"):
            package.copy_generated_dist(self.root / "dist", self.stage)

    def test_generated_dist_rejects_private_runtime_files(self):
        for index, relative in enumerate((".env.production", "server/target.json", "database.sqlite", "cache/session")):
            with self.subTest(relative=relative):
                source = self.root / f"dist-{index}"
                file = source / relative
                file.parent.mkdir(parents=True)
                file.write_text("synthetic private data", encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "private/runtime file"):
                    package.copy_generated_dist(source, self.stage)
                self.assertFalse(self.stage.exists())

    def test_git_index_listing_preserves_modes(self):
        listing = "100644 " + "a" * 40 + " 0\tbackend/app/Example.php\0"
        listing += "120000 " + "b" * 40 + " 0\tbackend/app/linked.php\0"
        with patch.object(package.subprocess, "check_output", return_value=listing):
            self.assertEqual(package.tracked_files(self.root), {
                "backend/app/Example.php": "100644", "backend/app/linked.php": "120000",
            })

    def test_git_index_listing_rejects_unmerged_entries(self):
        listing = "100644 " + "a" * 40 + " 2\tbackend/app/Example.php\0"
        with patch.object(package.subprocess, "check_output", return_value=listing):
            with self.assertRaisesRegex(ValueError, "unresolved Git index"):
                package.tracked_files(self.root)


if __name__ == "__main__":
    unittest.main()
