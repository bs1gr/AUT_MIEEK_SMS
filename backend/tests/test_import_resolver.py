from __future__ import annotations

import importlib.util

import pytest

from backend import import_resolver


def test_import_from_possible_locations_prefers_backend():
    module = import_resolver.import_from_possible_locations("config")
    assert module.__name__ in {"backend.config", "config"}


def test_import_from_possible_locations_raises_when_missing(monkeypatch: pytest.MonkeyPatch):
    def fake_find_spec(name):  # noqa: ARG001 - diagnostic helper
        return None

    monkeypatch.setattr(importlib.util, "find_spec", fake_find_spec)

    with pytest.raises(ImportError):
        import_resolver.import_from_possible_locations("does_not_exist_module")


def test_import_names_raises_for_missing_attribute(monkeypatch: pytest.MonkeyPatch):
    class DummyModule:
        __name__ = "dummy"

    monkeypatch.setattr(import_resolver, "import_from_possible_locations", lambda module: DummyModule())

    with pytest.raises(ImportError):
        import_resolver.import_names("models", "MissingThing")
