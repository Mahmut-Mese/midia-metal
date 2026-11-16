"""Read-only verification of a QA release archive before upload or extraction."""

import argparse
import hashlib
import hmac
import json
from pathlib import Path, PurePosixPath
import re
import tarfile

from target import BRANCH, REPOSITORY


REQUIRED_FILES = frozenset({
    "frontend/dist/server/entry.mjs",
    "frontend/server.mjs",
    "backend/artisan",
    "backend/vendor/autoload.php",
    ".github/deploy/qa/verify-backend.php",
    ".github/deploy/qa/remote-release.py",
})
SCAFFOLD_DIRECTORIES = frozenset({"frontend", "backend", ".github", ".github/deploy", ".github/deploy/qa"})
RUNTIME_PREFIXES = (
    "backend/storage/", "backend/bootstrap/cache/", "backend/public/storage/",
    "backend/public/uploads/", "frontend/node_modules/", "frontend/.astro/",
)
MAX_MANIFEST_BYTES = 16 * 1024 * 1024


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_member_path(name, is_directory=False):
    if not isinstance(name, str) or not name or "\\" in name or any(ord(char) < 32 for char in name):
        raise ValueError("Invalid archive member path")
    # A single directory terminator is permitted, but aliases such as // or /./ are not.
    if is_directory and name.endswith("/"):
        name = name[:-1]
    path = PurePosixPath(name)
    if not name or path.is_absolute() or ".." in path.parts or str(path) != name:
        raise ValueError("Noncanonical archive member path")
    if name == "release.json":
        if is_directory:
            raise ValueError("Release manifest must be a regular file")
        return name
    allowed = name.startswith(("frontend/", "backend/", ".github/deploy/qa/"))
    if not allowed and not (is_directory and name in SCAFFOLD_DIRECTORIES):
        raise ValueError("Archive member is outside the release layout")
    for part in path.parts:
        lower = part.lower()
        if (lower.startswith(".env") or lower == "target.json" or
                lower in {".git", "__pycache__"} or ".sqlite" in lower or
                lower.endswith((".sql", ".sql.gz", ".sql.bz2", ".dump", ".dump.gz", ".db", ".log", ".pyc", ".local"))):
            raise ValueError("Archive contains private or runtime state")
    if name.startswith(RUNTIME_PREFIXES):
        raise ValueError("Archive contains runtime contents")
    if not is_directory and name + "/" in RUNTIME_PREFIXES:
        raise ValueError("Archive contains a runtime path as a file")
    return name


def _unique_json_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Release manifest contains duplicate keys")
        result[key] = value
    return result


def _verify_checksum(path, checksum_path):
    try:
        content = Path(checksum_path).read_text(encoding="ascii").rstrip("\n")
    except (OSError, UnicodeError) as error:
        raise ValueError("Cannot read the archive checksum") from error
    match = re.fullmatch(r"([0-9a-f]{64})[ \t]+\*?([^\r\n]+)", content)
    if not match or match[2] != path.name:
        raise ValueError("Invalid archive checksum record")
    try:
        actual_digest = sha256_file(path)
    except OSError as error:
        raise ValueError("Cannot read the QA release archive") from error
    if not hmac.compare_digest(actual_digest, match[1]):
        raise ValueError("Archive checksum mismatch")


def verify_archive(path, commit, checksum_path=None):
    """Return the validated manifest; never extract archive members.

    A checksum path can be supplied explicitly. Otherwise the packager's adjacent
    ``<archive>.sha256`` file is checked whenever it is present.
    """
    if not isinstance(commit, str) or not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError("Invalid expected source commit")
    path = Path(path)
    adjacent_checksum = Path(str(path) + ".sha256")
    if checksum_path is not None:
        _verify_checksum(path, checksum_path)
    elif adjacent_checksum.exists():
        _verify_checksum(path, adjacent_checksum)

    names = set()
    file_hashes = {}
    manifest_bytes = None
    try:
        with tarfile.open(path, "r:gz") as archive:
            for member in archive:
                if member.type not in (tarfile.REGTYPE, tarfile.AREGTYPE, tarfile.DIRTYPE) or member.sparse is not None:
                    raise ValueError("Archive contains a link or special file")
                if member.mode & 0o7000:
                    raise ValueError("Archive contains special permission bits")
                name = validate_member_path(member.name, member.isdir())
                if name in names:
                    raise ValueError("Archive contains duplicate members")
                names.add(name)
                if member.isdir():
                    if member.size != 0:
                        raise ValueError("Archive directory contains unexpected payload")
                    continue
                if member.size < 0:
                    raise ValueError("Archive contains an invalid file size")
                source = archive.extractfile(member)
                if source is None:
                    raise ValueError("Cannot read an archive file")
                with source:
                    if name == "release.json":
                        if member.size > MAX_MANIFEST_BYTES:
                            raise ValueError("Release manifest exceeds the size limit")
                        manifest_bytes = source.read()
                    else:
                        digest = hashlib.sha256()
                        for block in iter(lambda: source.read(1024 * 1024), b""):
                            digest.update(block)
                        file_hashes[name] = digest.hexdigest()
    except (OSError, tarfile.TarError, EOFError) as error:
        raise ValueError("Cannot read the QA release archive") from error

    # Detect file/directory collisions even when an ancestor directory was omitted.
    all_files = set(file_hashes)
    if manifest_bytes is not None:
        all_files.add("release.json")
    for name in names:
        if any(str(parent) in all_files for parent in PurePosixPath(name).parents):
            raise ValueError("Archive contains a file used as a directory")

    if manifest_bytes is None:
        raise ValueError("Release manifest is missing")
    try:
        manifest = json.loads(manifest_bytes, object_pairs_hook=_unique_json_object)
    except (json.JSONDecodeError, UnicodeError) as error:
        raise ValueError("Release manifest is not valid JSON") from error
    if not isinstance(manifest, dict):
        raise ValueError("Release manifest must be an object")
    if manifest.get("repository") != REPOSITORY or manifest.get("branch") != BRANCH or manifest.get("commit") != commit:
        raise ValueError("Release identity does not match the approved QA source")
    expected_files = manifest.get("files")
    if not isinstance(expected_files, dict):
        raise ValueError("Release manifest file hashes are missing")
    for name, digest in expected_files.items():
        validate_member_path(name)
        if name == "release.json" or not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ValueError("Invalid release manifest file hash")
    if set(expected_files) != set(file_hashes):
        raise ValueError("Archive files do not exactly match the release manifest")
    if not REQUIRED_FILES.issubset(file_hashes):
        raise ValueError("Archive is missing required runtime files")
    for name, digest in file_hashes.items():
        if not hmac.compare_digest(digest, expected_files[name]):
            raise ValueError("Archive file hash mismatch")
    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("archive")
    parser.add_argument("commit")
    parser.add_argument("--checksum")
    args = parser.parse_args()
    try:
        manifest = verify_archive(args.archive, args.commit, args.checksum)
        digest = sha256_file(args.archive)
    except OSError as error:
        raise SystemExit("Cannot read the QA release archive") from error
    except ValueError as error:
        raise SystemExit(f"QA archive verification failed: {error}") from error
    print(f"Verified QA archive: {len(manifest['files'])} files; SHA256 {digest}")


if __name__ == "__main__":
    main()
