"""Exercise the QA deployment boundary using synthetic account details only."""

import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import target


FAKE_USER = "u123456789"
FAKE_HOST = "192.0.2.10"
FAKE_SITE = f"/home/{FAKE_USER}/domains/test.midiametal.com"
FAKE_TARGET = {
    "repository": target.REPOSITORY,
    "branch": target.BRANCH,
    "url": target.URL,
    "ssh": {"host": FAKE_HOST, "port": 65002, "user": FAKE_USER},
    "root": FAKE_SITE + "/.midia-qa",
    "web_root": FAKE_SITE + "/public_html",
    "database": {
        "connection": "mysql",
        "host": "localhost",
        "port": 3306,
        "name": FAKE_USER + "_qa_database",
        "user": FAKE_USER + "_qa_user",
    },
}
FAKE_DIGEST = hashlib.sha256(f"{FAKE_HOST}:65002:{FAKE_USER}".encode()).hexdigest()


class ValidateTargetTests(unittest.TestCase):
    def setUp(self):
        self.fixture = copy.deepcopy(FAKE_TARGET)
        self.digest_patch = patch.object(target, "ACCOUNT_DIGEST", FAKE_DIGEST)
        self.digest_patch.start()
        self.addCleanup(self.digest_patch.stop)

    def test_accepts_only_the_synthetic_approved_fixture(self):
        self.assertIs(target.validate_target(self.fixture), self.fixture)

    def test_accepts_loopback_mysql_host(self):
        self.fixture["database"]["host"] = "127.0.0.1"
        self.assertIs(target.validate_target(self.fixture), self.fixture)

    def test_load_target_validates_the_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "target.json"
            path.write_text(json.dumps(self.fixture), encoding="utf-8")
            self.assertEqual(target.load_target(path), self.fixture)
            self.fixture["branch"] = "content"
            path.write_text(json.dumps(self.fixture), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "branch"):
                target.load_target(path)

    def test_rejects_non_object_target(self):
        for value in (None, [], "target"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                target.validate_target(value)

    def test_rejects_repository_branch_and_url_mismatches(self):
        mismatches = {
            "repository": ("someone-else/midia-metal", "Mahmut-Mese/another-site"),
            "branch": ("main", "content", "refs/heads/qa"),
            "url": ("https://example.invalid", "http://test.midiametal.com", target.URL + "/"),
        }
        for field, values in mismatches.items():
            for value in values:
                fixture = copy.deepcopy(self.fixture)
                fixture[field] = value
                with self.subTest(field=field, value=value), self.assertRaisesRegex(ValueError, field):
                    target.validate_target(fixture)

    def test_rejects_a_different_well_formed_host_or_account(self):
        for field, value in (("host", "198.51.100.20"), ("user", "u987654321")):
            fixture = copy.deepcopy(self.fixture)
            fixture["ssh"][field] = value
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "approved Hostinger account"):
                target.validate_target(fixture)

    def test_rejects_unbound_account_digest(self):
        with patch.object(target, "ACCOUNT_DIGEST", "0" * 64):
            with self.assertRaisesRegex(ValueError, "approved Hostinger account"):
                target.validate_target(self.fixture)

    def test_rejects_invalid_ssh_identity(self):
        mismatches = {
            "host": ("example.invalid", "192.0.2.999", "::1"),
            "port": (22, "65002"),
            "user": ("root", "u123;id", "u123/../../other"),
        }
        for field, values in mismatches.items():
            for value in values:
                fixture = copy.deepcopy(self.fixture)
                fixture["ssh"][field] = value
                with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                    target.validate_target(fixture)

    def test_rejects_traversal_noncanonical_and_wrong_domain_paths(self):
        for field in ("root", "web_root"):
            original = self.fixture[field]
            values = (
                original + "/../production",
                original + "/.",
                original + "/",
                original.replace("/domains/", "/domains//"),
                original.replace("test.midiametal.com", "example.invalid"),
                original.replace(FAKE_USER, "u987654321"),
                original.lstrip("/"),
            )
            for value in values:
                fixture = copy.deepcopy(self.fixture)
                fixture[field] = value
                with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                    target.validate_target(fixture)

    def test_rejects_off_account_or_non_qa_database_identities(self):
        for field in ("name", "user"):
            for value in ("u987654321_qa", FAKE_USER + "_production", "qa", FAKE_USER + "_qa;DROP"):
                fixture = copy.deepcopy(self.fixture)
                fixture["database"][field] = value
                with self.subTest(field=field, value=value), self.assertRaisesRegex(ValueError, "Database identity"):
                    target.validate_target(fixture)

    def test_rejects_unexpected_database_connections(self):
        mismatches = {
            "connection": ("sqlite", "pgsql"),
            "host": ("192.0.2.20", "mysql.example.invalid"),
            "port": (3307, "3306"),
        }
        for field, values in mismatches.items():
            for value in values:
                fixture = copy.deepcopy(self.fixture)
                fixture["database"][field] = value
                with self.subTest(field=field, value=value), self.assertRaisesRegex(ValueError, "database connection"):
                    target.validate_target(fixture)


class ValidateRunTests(unittest.TestCase):
    def setUp(self):
        self.context = {
            "repository": target.REPOSITORY,
            "ref": "refs/heads/qa",
            "event": "push",
            "commit": "0123456789abcdef0123456789abcdef01234567",
            "run_id": "123456",
            "attempt": "2",
        }

    def test_accepts_a_qa_push_and_identifies_its_release(self):
        self.assertEqual(target.validate_run(**self.context), "qa-0123456789ab-123456-2")

    def test_accepts_numeric_run_and_attempt_identifiers(self):
        self.context.update(run_id=123456, attempt=2)
        self.assertEqual(target.validate_run(**self.context), "qa-0123456789ab-123456-2")

    def test_rejects_wrong_repository_ref_and_event(self):
        mismatches = {
            "repository": ("someone-else/midia-metal", "Mahmut-Mese/another-site"),
            "ref": ("refs/heads/main", "refs/heads/content", "refs/tags/qa", "refs/pull/1/merge", "qa"),
            "event": ("pull_request", "pull_request_target", "workflow_dispatch"),
        }
        for field, values in mismatches.items():
            for value in values:
                context = {**self.context, field: value}
                with self.subTest(field=field, value=value), self.assertRaisesRegex(ValueError, "Only pushes"):
                    target.validate_run(**context)

    def test_rejects_invalid_commit_hashes(self):
        for value in ("", "a" * 39, "a" * 41, "g" * 40, "A" * 40, "a" * 40 + "\n", "HEAD"):
            context = {**self.context, "commit": value}
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "source commit"):
                target.validate_run(**context)

    def test_rejects_invalid_run_and_attempt_identifiers(self):
        for field in ("run_id", "attempt"):
            for value in ("", "../1", "1;id", -1, "1.5", "1\n"):
                context = {**self.context, field: value}
                with self.subTest(field=field, value=value), self.assertRaisesRegex(ValueError, "run identity"):
                    target.validate_run(**context)


if __name__ == "__main__":
    unittest.main()
