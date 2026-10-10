import os
import stat

import pytest
from cryptography.fernet import Fernet

from run_local import load_qa_key


def test_qa_key_is_stable_and_private(tmp_path):
    directory = tmp_path / "var" / "qa"
    first = load_qa_key(directory)
    Fernet(first.encode())
    assert load_qa_key(directory) == first
    assert stat.S_IMODE(directory.stat().st_mode) == 0o700
    assert stat.S_IMODE((directory / "encryption.key").stat().st_mode) == 0o600


def test_directory_link_never_changes_external_target(tmp_path):
    target = tmp_path / "external"
    target.mkdir(mode=0o755)
    before = stat.S_IMODE(target.stat().st_mode)
    link = tmp_path / "linked"
    link.symlink_to(target, target_is_directory=True)
    with pytest.raises(ValueError):
        load_qa_key(link / "qa")
    assert stat.S_IMODE(target.stat().st_mode) == before
    assert not (target / "qa").exists()


def test_key_link_never_changes_or_reads_external_key(tmp_path):
    directory = tmp_path / "qa"
    directory.mkdir()
    target = tmp_path / "outside.key"
    target.write_bytes(Fernet.generate_key())
    os.chmod(target, 0o644)
    (directory / "encryption.key").symlink_to(target)
    with pytest.raises(OSError):
        load_qa_key(directory)
    assert stat.S_IMODE(target.stat().st_mode) == 0o644


def test_hardlinked_key_is_rejected_without_chmod(tmp_path):
    directory = tmp_path / "qa"
    directory.mkdir()
    target = tmp_path / "outside.key"
    target.write_bytes(Fernet.generate_key())
    os.chmod(target, 0o644)
    os.link(target, directory / "encryption.key")
    with pytest.raises(ValueError):
        load_qa_key(directory)
    assert stat.S_IMODE(target.stat().st_mode) == 0o644
