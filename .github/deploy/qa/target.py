"""Validate the private QA target before any network or filesystem mutation."""

import hashlib
import ipaddress
import json
import re
from pathlib import PurePosixPath

REPOSITORY = "Mahmut-Mese/midia-metal"
BRANCH = "qa"
URL = "https://test.midiametal.com"
# Binds the deployment to the approved account without publishing its SSH details.
ACCOUNT_DIGEST = "70c113afa3375d64751f2b41fc40fca6360c9688e29a8d64db9297ab818bb082"


def validate_target(target):
    if not isinstance(target, dict):
        raise ValueError("QA target must be an object")
    for field, expected in (("repository", REPOSITORY), ("branch", BRANCH), ("url", URL)):
        if target.get(field) != expected:
            raise ValueError(f"Unexpected QA {field}")
    ssh = target.get("ssh", {})
    user = ssh.get("user", "")
    if not re.fullmatch(r"u[0-9]+", user):
        raise ValueError("Invalid QA account")
    ipaddress.IPv4Address(ssh.get("host", ""))
    if ssh.get("port") != 65002:
        raise ValueError("Unexpected SSH port")
    identity = f"{ssh['host']}:{ssh['port']}:{user}"
    if hashlib.sha256(identity.encode()).hexdigest() != ACCOUNT_DIGEST:
        raise ValueError("Target is not the approved Hostinger account")
    site = f"/home/{user}/domains/test.midiametal.com"
    if target.get("root") != site + "/.midia-qa" or target.get("web_root") != site + "/public_html":
        raise ValueError("Target paths are outside the approved QA website")
    for field in ("root", "web_root"):
        if str(PurePosixPath(target[field])) != target[field] or ".." in PurePosixPath(target[field]).parts:
            raise ValueError("Noncanonical QA target path")
    db = target.get("database", {})
    if db.get("connection") != "mysql" or db.get("host") not in ("localhost", "127.0.0.1") or db.get("port") != 3306:
        raise ValueError("Unexpected QA database connection")
    for field in ("name", "user"):
        if not re.fullmatch(re.escape(user) + r"_[A-Za-z0-9_]*qa[A-Za-z0-9_]*", db.get(field, "")):
            raise ValueError("Database identity must be QA-specific and in the approved account")
    return target


def load_target(path):
    with open(path, encoding="utf-8") as source:
        return validate_target(json.load(source))


def validate_run(repository, ref, event, commit, run_id, attempt):
    if repository != REPOSITORY or ref != "refs/heads/qa" or event != "push":
        raise ValueError("Only pushes to this repository's qa branch can deploy")
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError("Invalid source commit")
    if not re.fullmatch(r"[0-9]+", str(run_id)) or not re.fullmatch(r"[0-9]+", str(attempt)):
        raise ValueError("Invalid workflow run identity")
    return f"qa-{commit[:12]}-{run_id}-{attempt}"
