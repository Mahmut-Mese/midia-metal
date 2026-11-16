"""GitHub runner client: the dedicated key can upload/deploy only QA releases."""

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

from target import validate_run, validate_target


def require(name):
    value = os.environ.get(name, "")
    if not value:
        raise ValueError(f"Required QA deployment configuration is missing: {name}")
    return value


def write_private(path, value):
    with path.open("x", encoding="utf-8") as destination:
        os.chmod(path, 0o600)
        destination.write(value.rstrip() + "\n")


def main():
    if len(sys.argv) != 2:
        raise ValueError("Expected one QA release archive")
    release = validate_run(require("GITHUB_REPOSITORY"), require("GITHUB_REF"),
                           require("GITHUB_EVENT_NAME"), require("GITHUB_SHA"),
                           require("GITHUB_RUN_ID"), require("GITHUB_RUN_ATTEMPT"))
    target = validate_target(json.loads(require("QA_DEPLOY_TARGET")))
    commit = require("GITHUB_SHA")
    archive = Path(sys.argv[1]).resolve(strict=True)
    spec = importlib.util.spec_from_file_location("qa_verify_package", Path(__file__).with_name("verify-package.py"))
    verifier = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(verifier)
    verifier.verify_archive(archive, commit, checksum_path=Path(str(archive) + ".sha256"))
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    # Keep account metadata out of Actions logs, as well as credential values.
    for value in (target["ssh"]["host"], target["ssh"]["user"], target["root"],
                  target["database"]["name"], target["database"]["user"]):
        print("::add-mask::" + value, flush=True)
    with tempfile.TemporaryDirectory(prefix="midia-qa-ssh-") as temporary:
        key = Path(temporary) / "deploy-key"
        known = Path(temporary) / "known_hosts"
        write_private(key, require("QA_SSH_PRIVATE_KEY"))
        write_private(known, require("QA_SSH_KNOWN_HOSTS"))
        ssh = ["ssh", "-i", str(key), "-p", str(target["ssh"]["port"]),
               "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes", "-o", "StrictHostKeyChecking=yes",
               "-o", "UserKnownHostsFile=" + str(known), "-o", "GlobalKnownHostsFile=/dev/null",
               "-o", "ConnectTimeout=15", "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=3",
               target["ssh"]["user"] + "@" + target["ssh"]["host"]]
        child_env = {key: value for key, value in os.environ.items()
                     if key not in {"SSH_AUTH_SOCK", "QA_SSH_PRIVATE_KEY", "QA_SSH_KNOWN_HOSTS", "QA_DEPLOY_TARGET"}}
        with archive.open("rb") as source:
            subprocess.run(ssh + [f"qa-upload {release} {commit} {digest}"],
                           stdin=source, env=child_env, check=True, timeout=300)
        subprocess.run(ssh + [f"qa-deploy {release} {commit} {digest}"],
                       env=child_env, check=True, timeout=900)
        result = subprocess.run(ssh + ["qa-status"], env=child_env, check=True,
                                capture_output=True, text=True, timeout=30)
        status = json.loads(result.stdout)
        if status.get("release") != release or status.get("commit") != commit:
            raise ValueError("The server did not confirm the expected active QA release")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as destination:
            destination.write(f"Deployed QA commit `{commit}` as `{release}`.\n\n"
                              "Verified website: https://test.midiametal.com/\n")
    print(f"QA deployment verified: {release} ({commit})")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError, json.JSONDecodeError) as error:
        # No credential values or remote command arguments are included in errors.
        print(f"QA deployment stopped: {type(error).__name__}. See the preceding QA check output.", file=sys.stderr)
        raise SystemExit(1)
