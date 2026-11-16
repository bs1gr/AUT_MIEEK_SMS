"""The Import/Export part of the API loads where the program folder cannot be written to.

Found on 2026-11-16 while checking the mail settings on a fresh SMS Lite build with a
read-only program folder (what an installed copy has): the export service created
"backend/exports" next to the code when it was imported. That raised, the whole router failed
to load, and its endpoints - the mail settings among them - answered 404. The released build
only hid this because the release check had run it once with a writable folder.
"""

from pathlib import Path

def test_exports_go_next_to_the_code_where_that_can_be_written(monkeypatch):
    from backend.services import async_export_service

    asked: list[str] = []
    monkeypatch.setattr(async_export_service, "_can_write_in", lambda folder: asked.append(folder) or True)

    folder = async_export_service.exports_folder()

    assert Path(folder).name == "exports" and Path(folder).resolve().parent.name == "backend"
    assert len(asked) == 1


def test_exports_fall_back_to_the_data_folder_when_the_program_folder_is_read_only(monkeypatch):
    from backend.services import async_export_service

    monkeypatch.setattr(
        async_export_service, "_can_write_in", lambda folder: Path(folder) == Path("data") / "exports"
    )

    assert Path(async_export_service.exports_folder()) == Path("data") / "exports"


def test_the_export_service_loads_even_when_nothing_can_be_written(monkeypatch, caplog):
    from backend.services import async_export_service

    monkeypatch.setattr(async_export_service, "_can_write_in", lambda folder: False)

    with caplog.at_level("WARNING", logger="backend.services.async_export_service"):
        service = async_export_service.AsyncExportService()  # used to raise PermissionError

    assert service.exports_dir
    assert any("No folder for export files" in r.getMessage() for r in caplog.records)


def test_a_folder_is_only_called_writable_after_a_real_write(tmp_path, monkeypatch):
    from backend.services import async_export_service

    assert async_export_service._can_write_in(str(tmp_path / "new" / "exports")) is True
    assert (tmp_path / "new" / "exports").is_dir()

    def denied(*_args, **_kwargs):
        raise PermissionError(5, "Access is denied")

    # The folder exists, and os.access() would say yes on Windows; the write is what counts.
    monkeypatch.setattr(async_export_service.tempfile, "TemporaryFile", denied)
    assert async_export_service._can_write_in(str(tmp_path / "new" / "exports")) is False
