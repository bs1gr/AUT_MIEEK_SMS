"""The installer's own code reads and writes the uninstall entry that Inno Setup creates.

Found on 2026-11-21 (plan todo 65) in the setup log of a real install on the dev PC: Inno
registers an installation under ``...\\Uninstall\\{B5A1E2F3-...}}_is1``, because in the AppId of
[Setup] ``{{`` stands for ``{`` while ``}}`` stays ``}}``. The script's code used
``{#MyAppId}_is1``, with one brace: a key Inno never wrote. Its lookups found nothing, and the step
that renames ``unins000.exe`` wrote the new name into that other key (in HKLM and HKCU), so
Settings > Apps kept running a file that no longer existed.

The same day the uninstaller was found to delete the ``.env`` files even when the answer to
"delete this installation's data folders?" was No, which promises to keep the settings.

Read from the script: an installer built from it, installed over an existing installation, is
what proves the registry side (the next release's update of the Docker test install).
"""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
ISS = (REPO_ROOT / "infra" / "installer" / "windows" / "SMS_Installer.iss").read_text(encoding="utf-8")
UNINSTALL = "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\"


def _section(name: str) -> str:
    match = re.search(rf"^\[{name}\][ \t]*$(.*?)(?=^\[[A-Za-z]+\][ \t]*$|\Z)", ISS, re.M | re.S)
    assert match, f"no [{name}] section"
    return match.group(1)


def _define(name: str) -> str:
    match = re.search(rf'^#define {name} "([^"]*)"', ISS, re.M)
    assert match, f"no #define {name}"
    return match.group(1)


def _key_inno_registers() -> str:
    app_id = re.search(r"^AppId=(.+)$", _section("Setup"), re.M)
    assert app_id
    # In a [Setup] value "{{" is an escaped "{"; "}}" is no escape and stays as it is.
    return UNINSTALL + app_id.group(1).strip().replace("{{", "{") + "_is1"


CODE = _section("Code")


def test_the_code_names_the_key_inno_registers():
    assert _key_inno_registers().endswith("}}_is1")  # as the setup log of 2026-11-21 shows
    assert _define("MyAppUninstallKey") == _key_inno_registers()


def test_every_uninstall_key_in_the_code_is_that_key():
    assert "{#MyAppId}_is1" not in ISS
    # Every key is named through the defines, so none can drift from them.
    assert UNINSTALL not in CODE
    assert CODE.count("'{#MyAppUninstallKey}'") >= 10


def test_nothing_is_written_to_hkcu():
    # An administrative install has its entry in HKLM only.
    assert "RegWriteStringValue(HKCU" not in CODE


def test_the_old_two_value_key_goes_only_when_it_is_not_an_entry():
    assert _define("MyAppStubUninstallKey") == _key_inno_registers().replace("}}_is1", "}_is1")
    assert "RegValueExists(RootKey, '{#MyAppStubUninstallKey}', 'DisplayName')" in CODE
    assert "RemoveStubUninstallKey(HKLM);" in CODE and "RemoveStubUninstallKey(HKCU);" in CODE


def test_no_keeps_the_settings_and_yes_deletes_them():
    entries = [line for line in _section("UninstallDelete").splitlines() if line.strip().startswith("Type:")]
    assert not [line for line in entries if ".env" in line or "lang.txt" in line]
    # Yes still deletes them, in InitializeUninstall
    for env in ("{app}\\.env", "{app}\\backend\\.env", "{app}\\frontend\\.env"):
        assert f"DeleteFile(ExpandConstant('{env}'));" in CODE
    assert "DelTree(ExpandConstant('{app}\\config'), True, True, True);" in CODE
