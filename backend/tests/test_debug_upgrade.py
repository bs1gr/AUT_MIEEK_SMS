import importlib
import pytest
import alembic.command as alcmd


def test_debug_upgrade_invokes_upgrade(monkeypatch):
    calls = {"called": False, "rev": None}

    def fake_upgrade(cfg, rev):
        calls["called"] = True
        calls["rev"] = rev
        # cfg should be an alembic Config-like object, but we don't need to inspect it
        return None

    # Patch alembic.command.upgrade before importing the module-under-test
    monkeypatch.setattr(alcmd, "upgrade", fake_upgrade)

    # Importing the module executes the upgrade
    mod = importlib.import_module("backend.debug_upgrade")
    importlib.reload(mod)

    assert calls["called"] is True
    assert calls["rev"] == "head"


def test_debug_upgrade_raises(monkeypatch):
    def boom(cfg, rev):
        raise RuntimeError("upgrade failed from test")

    # Ensure import will execute the failing path
    import alembic.command as alcmd
    monkeypatch.setattr(alcmd, "upgrade", boom)

    import importlib
    with pytest.raises(RuntimeError):
        importlib.reload(importlib.import_module("backend.debug_upgrade"))
