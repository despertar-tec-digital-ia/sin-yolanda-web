"""Explicit local-only runner. Writes an ignored QA key; never reads GHL secrets."""

import os
from pathlib import Path
import stat

from cryptography.fernet import Fernet
import uvicorn

from sy_intake.app import create_app
from sy_intake.settings import Settings


def load_qa_key(directory: Path) -> str:
    # Reject links before any chmod/read, not after storage has already opened.
    for path in (directory, *directory.parents):
        try:
            mode = path.lstat().st_mode
        except FileNotFoundError:
            continue
        if not stat.S_ISDIR(mode) or stat.S_ISLNK(mode):
            raise ValueError("QA storage must use a dedicated real directory")
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(directory, 0o700)
    key_path = directory / "encryption.key"
    try:
        descriptor = os.open(key_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    except FileExistsError:
        descriptor = None
    if descriptor is not None:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(Fernet.generate_key())
    descriptor = os.open(key_path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(descriptor, "rb") as handle:
        info = os.fstat(handle.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
            raise ValueError("QA key must be a dedicated regular file")
        os.fchmod(handle.fileno(), 0o600)
        return handle.read(1024).decode("ascii")


def main():
    directory = Path(__file__).resolve().parent / "var" / "local-qa"
    key = load_qa_key(directory)
    settings = Settings(database_path=directory / "registrations.sqlite", encryption_key=key,
                        mode="local-qa", allowed_origins=("http://127.0.0.1:8798",))
    uvicorn.run(create_app(settings), host="127.0.0.1", port=8801, proxy_headers=False,
                access_log=False, log_level="warning")


if __name__ == "__main__":
    main()
