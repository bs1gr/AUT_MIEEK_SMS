"""SMS_Lite's shutdown cleanup must never delete a onedir install's own runtime.

In a onedir PyInstaller build sys._MEIPASS is the installed `_internal` folder, not a
temp extraction dir. Deleting it on shutdown (logout grace period / idle timeout) left
an install that exited with code 1 on every later launch — "works once, then never".
"""
import importlib
import os
import sys
import tempfile
from pathlib import Path

import pytest


@pytest.fixture
def lite_module():
    saved_env = dict(os.environ)
    try:
        mod = importlib.import_module("backend.lite_simple_entrypoint")
    finally:
        os.environ.clear()
        os.environ.update(saved_env)
    return mod


def _fake_frozen(monkeypatch, meipass: Path) -> None:
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "_MEIPASS", str(meipass), raising=False)


def test_onedir_internal_is_not_treated_as_onefile(lite_module, monkeypatch, tmp_path):
    _fake_frozen(monkeypatch, tmp_path / "SMS" / "_internal")
    assert lite_module._is_onefile_bundle() is False


def test_onefile_temp_extraction_is_detected(lite_module, monkeypatch):
    _fake_frozen(monkeypatch, Path(tempfile.gettempdir()) / "_MEI123456")
    assert lite_module._is_onefile_bundle() is True


def test_not_frozen_is_not_onefile(lite_module, monkeypatch):
    monkeypatch.delattr(sys, "frozen", raising=False)
    assert lite_module._is_onefile_bundle() is False


def test_cleanup_and_exit_keeps_onedir_runtime(lite_module, monkeypatch, tmp_path):
    internal = tmp_path / "SMS" / "_internal"
    internal.mkdir(parents=True)
    (internal / "python313.dll").write_bytes(b"x")
    (internal / "base_library.zip").write_bytes(b"x")
    _fake_frozen(monkeypatch, internal)

    def _no_exit(code):
        raise SystemExit(code)

    monkeypatch.setattr(lite_module.os, "_exit", _no_exit)
    with pytest.raises(SystemExit):
        lite_module._cleanup_and_exit()

    assert (internal / "python313.dll").exists()
    assert (internal / "base_library.zip").exists()
