"""Package only the validated build and backend; never package local runtime data."""

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile
import tempfile

from target import REPOSITORY, BRANCH


BACKEND_PREFIXES = tuple(f"backend/{name}/" for name in
                         ("app", "bootstrap", "config", "database", "public", "resources", "routes"))
BACKEND_MANIFESTS = {"backend/artisan", "backend/composer.json", "backend/composer.lock"}
DEPLOY_PREFIX = ".github/deploy/qa/"


def require_committed_source(root, commit):
    """Bind packaged working-tree inputs to the already checked source revision."""
    result = subprocess.run(
        ["git", "diff", "--quiet", "--no-ext-diff", "--no-textconv", commit, "--"],
        cwd=root, capture_output=True, check=False,
    )
    if result.returncode == 1:
        raise ValueError("Tracked release source differs from the checked commit")
    if result.returncode != 0:
        raise ValueError("Cannot verify the release source revision")


def excluded_runtime_path(relative):
    """Exclude private target state even if it was accidentally added to Git."""
    parts = PurePosixPath(relative).parts
    return any(part in {"storage", "cache", "__pycache__", ".git"} or
               part == "target.json" or part.startswith(".env") or
               ".sqlite" in part or part.endswith((".sql", ".log", ".pyc", ".local"))
               for part in parts)


def tracked_files(root):
    """Keep file modes so a tracked symlink cannot be silently dereferenced."""
    listing = subprocess.check_output(["git", "ls-files", "--stage", "-z"], cwd=root, text=True)
    result = {}
    for entry in listing.split("\0"):
        if not entry:
            continue
        metadata, relative = entry.split("\t", 1)
        mode, _, stage = metadata.split()
        if stage != "0":
            raise ValueError("Cannot package an unresolved Git index")
        result[relative] = mode
    return result


def reject_symlinks(path):
    """Scan before copying, including directory links and the root itself."""
    if path.is_symlink():
        raise ValueError(f"Unexpected source symlink: {path}")
    for directory, directories, files in os.walk(path, followlinks=False):
        for name in directories + files:
            candidate = Path(directory) / name
            if candidate.is_symlink():
                raise ValueError(f"Unexpected source symlink: {candidate}")


def copy_tracked_file(root, relative, destination, tracked):
    if tracked.get(relative) not in {"100644", "100755"}:
        raise ValueError(f"Release source is not a tracked regular file: {relative}")
    parts = PurePosixPath(relative).parts
    if not parts or PurePosixPath(relative).is_absolute() or ".." in parts:
        raise ValueError("Invalid release source path")
    source = root
    for part in parts:
        source = source / part
        if source.is_symlink():
            raise ValueError(f"Unexpected source symlink: {relative}")
    if not source.is_file():
        raise ValueError(f"Release source is not a regular file: {relative}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def copy_backend(root, destination, tracked):
    for relative in sorted(tracked):
        allowed = relative in BACKEND_MANIFESTS or relative.startswith(BACKEND_PREFIXES)
        if allowed and not excluded_runtime_path(relative):
            copy_tracked_file(root, relative, destination / relative.removeprefix("backend/"), tracked)
    for relative in BACKEND_MANIFESTS:
        if not (destination / relative.removeprefix("backend/")).is_file():
            raise ValueError(f"Required backend release source is missing: {relative}")


def copy_deployment(root, destination, tracked):
    for relative in sorted(tracked):
        if relative.startswith(DEPLOY_PREFIX) and not excluded_runtime_path(relative):
            copy_tracked_file(root, relative, destination / relative.removeprefix(DEPLOY_PREFIX), tracked)


def copy_generated_dist(source, destination):
    reject_symlinks(source)
    if not source.is_dir():
        raise ValueError("Generated frontend dist directory is missing")
    for path in source.rglob("*"):
        if excluded_runtime_path(path.relative_to(source).as_posix()):
            raise ValueError(f"Unexpected private/runtime file in frontend build: {path.relative_to(source)}")
    shutil.copytree(source, destination, symlinks=True)
    reject_symlinks(destination)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--commit", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[3]
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    if head != args.commit:
        raise SystemExit("Cannot package a different commit")
    require_committed_source(root, head)
    tracked = tracked_files(root)
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="midia-qa-package-") as temporary:
        stage = Path(temporary)
        frontend = stage / "frontend"
        frontend.mkdir()
        copy_generated_dist(root / "dist", frontend / "dist")
        for name in ("package.json", "package-lock.json"):
            copy_tracked_file(root, name, frontend / name, tracked)
        copy_tracked_file(root, DEPLOY_PREFIX + "server.mjs", frontend / "server.mjs", tracked)
        backend = stage / "backend"
        backend.mkdir()
        copy_backend(root, backend, tracked)
        (backend / "bootstrap/cache").mkdir(parents=True, exist_ok=True)
        # Install the exact production lockfile into the immutable staging tree.
        subprocess.run(["composer", "install", "--no-dev", "--no-scripts", "--no-interaction",
                        "--prefer-dist", "--optimize-autoloader"], cwd=backend, check=True)
        deployment = stage / ".github/deploy/qa"
        copy_deployment(root, deployment, tracked)
        files = {}
        for path in sorted(stage.rglob("*")):
            if path.is_symlink():
                raise SystemExit(f"Unexpected symlink in release: {path.relative_to(stage)}")
            if path.is_file():
                files[str(path.relative_to(stage))] = hashlib.sha256(path.read_bytes()).hexdigest()
        manifest = {"repository": REPOSITORY, "branch": BRANCH, "commit": head,
                    "run_url": os.environ.get("GITHUB_SERVER_URL", "https://github.com") + "/" + REPOSITORY +
                    "/actions/runs/" + os.environ.get("GITHUB_RUN_ID", "local"), "files": files}
        (stage / "release.json").write_text(json.dumps(manifest, sort_keys=True, indent=2) + "\n")
        archive = output / "qa-release.tar.gz"
        with tarfile.open(archive, "w:gz", format=tarfile.PAX_FORMAT) as bundle:
            for name in ("frontend", "backend", ".github", "release.json"):
                bundle.add(stage / name, arcname=name)
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        (output / "qa-release.tar.gz.sha256").write_text(digest + "  qa-release.tar.gz\n")
        shutil.copy2(stage / "release.json", output / "release.json")
        print(f"Packaged validated QA commit {head}; SHA256 {digest}")


if __name__ == "__main__":
    main()
