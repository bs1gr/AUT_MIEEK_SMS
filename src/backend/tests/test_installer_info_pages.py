"""The installer's two information pages say what the wizard does, for both editions.

The wizard shows one page before the files are copied and one after, the same two whichever
edition was chosen. Until November 2026 they were written for the Docker edition only: somebody
installing SMS Lite read that Docker Desktop was required and that "the installer will now set
up the SMS Docker container". The English pages were files written by hand and said
"v1.18.30" through 44 releases; the Greek ones were written at every build and said something
else ("the first start takes 5-10 minutes (container download)"). The last page of an SMS Lite
installation was English text in the wizard's code, and sent the reader to "the documentation"
for an administrator account that the wizard itself asks for.

Now one script writes the four pages (English and Greek) at every build, and these tests keep
what the pages say to the scripts they describe. Nobody ran the wizard for them: the pages'
sentences are checked against the text of the scripts, not against a screen.
"""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
INSTALLER_DIR = REPO_ROOT / "infra" / "installer" / "windows"
GENERATOR = REPO_ROOT / "infra" / "scripts" / "diagnostics" / "fix_greek_encoding_permanent.py"


def _generator():
    spec = importlib.util.spec_from_file_location("installer_info_pages", GENERATOR)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _text(lines) -> str:
    return "\n".join(text for text, _kind in lines)


def _installer_script() -> str:
    return (INSTALLER_DIR / "SMS_Installer.iss").read_text(encoding="utf-8-sig")


def _docker_script() -> str:
    return (REPO_ROOT / "infra" / "scripts" / "dev" / "DOCKER.ps1").read_text(encoding="utf-8-sig")


# --- the files -------------------------------------------------------------------------------


def test_the_four_pages_are_the_ones_the_installer_shows():
    """One page before and one after, per language: the names in [Languages] are the names the
    generator writes."""
    pages = _generator().PAGES
    languages = re.findall(
        r'(?m)^Name: "(\w+)";.*InfoBeforeFile: "([^"]+)"; InfoAfterFile: "([^"]+)"', _installer_script()
    )

    assert languages == [
        ("english", "installer_welcome.rtf", "installer_complete.rtf"),
        ("greek", "installer_welcome_el.rtf", "installer_complete_el.rtf"),
    ]
    assert sorted(pages) == sorted(name for _lang, before, after in languages for name in (before, after))


def test_the_tracked_pages_are_what_the_generator_writes():
    """A page edited by hand would be overwritten by the next build, and a version number bumped
    without the generator leaves the pages behind. Either way: run
    python infra/scripts/diagnostics/fix_greek_encoding_permanent.py"""
    generator = _generator()

    for name, (codepage, lines) in generator.PAGES.items():
        tracked = (INSTALLER_DIR / name).read_bytes().replace(b"\r\n", b"\n")
        assert tracked == generator.build_rtf(lines, codepage).encode("ascii"), name


def test_the_pages_are_plain_ascii_rtf_with_the_version_of_this_tree():
    generator = _generator()
    version = (REPO_ROOT / "VERSION").read_text(encoding="utf-8").strip()

    for name, (codepage, _lines) in generator.PAGES.items():
        raw = (INSTALLER_DIR / name).read_bytes()
        assert max(raw) < 127, name  # Greek letters are \'xx escapes: no byte for a code page to misread
        page = raw.decode("ascii")
        assert page.startswith(rf"{{\rtf1\ansi\ansicpg{codepage}\deff0"), name
        assert page.rstrip().endswith("}"), name
        assert version in page, name
        assert "v1.18.30" not in page or version == "v1.18.30", name
    assert generator.PAGES["installer_welcome_el.rtf"][0] == 1253
    assert generator.PAGES["installer_complete_el.rtf"][0] == 1253


def test_greek_letters_survive_the_way_into_the_page():
    generator = _generator()

    escaped = generator.rtf_escape("Έκδοση {a}\\b", 1253)
    assert escaped == r"\'b8\'ea\'e4\'ef\'f3\'e7 \{a\}\\b"
    back = re.sub(r"\\'([0-9a-f]{2})", lambda m: bytes([int(m.group(1), 16)]).decode("cp1253"), escaped)
    assert back == r"Έκδοση \{a\}\\b"


# --- what they say ---------------------------------------------------------------------------


def test_each_page_has_a_part_for_each_edition_in_both_languages():
    generator = _generator()

    for lines, docker, lite in (
        (generator.WELCOME_EN, "Docker Production Edition", "Native Lite Edition"),
        (generator.COMPLETE_EN, "Docker Production Edition", "Native Lite Edition"),
        (generator.WELCOME_EL, "Έκδοση Docker Production", "Lite Edition"),
        (generator.COMPLETE_EL, "Έκδοση Docker Production", "Lite Edition"),
    ):
        headings = [text for text, kind in lines if kind == generator.BOLD]
        assert docker in headings and lite in headings, headings
        assert headings.index(docker) < headings.index(lite)
    # The names are the ones the page "Installation Type" uses for the two choices.
    script = _installer_script()
    assert "english.InstallDockerEdition=Docker Production Edition" in script
    assert "english.InstallLiteEdition=Native Lite Edition" in script
    greek = (INSTALLER_DIR / "Greek.isl").read_text(encoding="utf-8-sig")
    assert "InstallDockerEdition=Έκδοση Docker Production" in greek
    assert "InstallLiteEdition=Lite Edition" in greek
    assert "InstallationType=Τύπος Εγκατάστασης" in greek and "«Τύπος Εγκατάστασης»" in _text(generator.WELCOME_EL)


def test_the_two_languages_of_a_page_are_built_alike():
    """Line for line the same kind: a sentence added to one language and forgotten in the other
    shows here."""
    generator = _generator()

    for english, greek in (
        (generator.WELCOME_EN, generator.WELCOME_EL),
        (generator.COMPLETE_EN, generator.COMPLETE_EL),
    ):
        assert [kind for _text_, kind in english] == [kind for _text_, kind in greek]
        assert english[0][1] == generator.TITLE
        # What is not translated is the same in both: addresses, file and setting names, numbers.
        for pattern in (
            r"http://\S+",
            r"[A-Z_]{8,}",
            r"config\\\.env",
            r"C:\\Program Files\\SMS",
            r"\d+-\d+",
            r"\d+ GB",
        ):
            assert re.findall(pattern, _text(english)) == re.findall(pattern, _text(greek)), pattern


def test_sms_lite_is_not_told_that_it_needs_docker():
    generator = _generator()

    for lines, lite, without in (
        (generator.WELCOME_EN, "Native Lite Edition", "Docker is not needed"),
        (generator.WELCOME_EL, "Lite Edition", "Δεν χρειάζεται Docker"),
    ):
        texts = [text for text, _kind in lines]
        after_lite = texts[texts.index(lite) + 1 :]
        part = after_lite[: after_lite.index("")]
        assert any(without in text for text in part), part
        assert not any("Docker Desktop" in text for text in part), part


def test_the_page_after_the_files_says_what_the_wizard_does_next_for_docker():
    """The next page of a Docker installation runs run_docker_install.cmd: DOCKER.ps1 -Install
    -Silent -NoShortcut builds the image and returns. It starts nothing. The old page said
    "Docker container will be built and started"."""
    generator = _generator()
    english, greek = _text(generator.COMPLETE_EN), _text(generator.COMPLETE_EL)

    assert "builds the application's Docker image" in english and "does not start the application" in english
    assert "χτίζει το Docker image" in greek and "δεν ξεκινά την εφαρμογή" in greek
    assert "built and started" not in english

    script = _installer_script()
    # The build page comes after the page shown after the files (wpInfoAfter = wpInstalling + 1).
    assert "DockerBuildPage := CreateCustomPage(wpInstalling + 1," in script
    assert "Cmd := AddBackslash(InstallDir) + 'run_docker_install.cmd';" in script
    wrapper = (INSTALLER_DIR / "run_docker_install.cmd").read_text(encoding="utf-8")
    assert "DOCKER.ps1' -Install -Silent -NoShortcut" in wrapper
    docker = _docker_script()
    install = docker[docker.index("function Start-Installation {") : docker.index("function Start-Application {")]
    assert "Building Docker image" in install
    # In silent mode the function returns before the question that leads to a start.
    assert install.index("Silent mode: Installation complete.") < install.index(
        'Read-Host "Start application now? (Y/n)"'
    )
    assert "Start-Application" not in install[: install.index("Silent mode: Installation complete.")]


def test_how_to_start_and_where_to_sign_in_are_what_the_scripts_do():
    generator = _generator()
    english = _text(generator.COMPLETE_EN)
    docker = _docker_script()

    # "choose 1, START": the first line of the menu the shortcut opens.
    assert "choose 1, START" in english
    manager = (INSTALLER_DIR / "SMS_Manager" / "Program.cs").read_text(encoding="utf-8-sig")
    assert "1{RESET}) {BOLD}START{RESET} container and open web app" in manager
    assert re.search(
        r'(?m)^Name: "\{group\}\\\{#MyAppName\}"; Filename: "\{app\}\\\{#MyAppExeName\}"', _installer_script()
    )
    # The address.
    assert "http://localhost:8080" in english and re.search(r"(?m)^\$PORT = 8080$", docker)
    # The first administrator of a Docker installation.
    assert "DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD in the file config\\.env" in english
    assert "DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD from config\\.env" in docker
    # The folder.
    script = _installer_script()
    assert "C:\\Program Files\\SMS" in _text(generator.WELCOME_EN)
    assert "DefaultDirName={autopf}\\{#MyAppShortName}" in script and '#define MyAppShortName "SMS"' in script
    # SMS Lite: the wizard asks for the administrator of a new local database, and says so itself.
    assert "the administrator account you entered in this wizard" in english
    assert "english.LiteAdminIntro=Administrator account for the new local database." in script
    assert "english.LiteAdminExistingDb=This PC already has a local SMS Lite database." in script


def test_no_page_label_or_message_of_the_wizard_is_english_only():
    """About forty texts were English in the wizard's code, so a Greek wizard showed them in
    English: page titles, the labels of the two database pages, the Docker build page, message
    boxes and the uninstaller's question about the images. Now every one is a message of both
    languages."""
    script = _installer_script()
    code = script[script.index("[Code]") :]
    shown = re.compile(r"(Caption\s*:=|MsgBox\(|CreateCustomPage\()[^;]*'[A-Za-z][^']*[ a-z]")
    left = [
        line.strip()
        for line in code.splitlines()
        if shown.search(line) and "CustomMessage" not in line and not line.strip().startswith("//")
    ]
    assert left == []
    # The continuation lines of a page title or a message box, written as text.
    for gone in (
        "'Prerequisites Check'",
        "'Completing Installation'",
        "Do you want to remove Docker images?",
        "'Port:'",
        "Credentials loaded from file.'",
        "is missing.' +",
    ):
        assert gone not in code, gone


def test_the_placeholders_of_each_message_are_the_same_in_both_languages():
    script = _installer_script()
    english = dict(re.findall(r"(?m)^english\.(\w+)=(.*)$", script))
    greek_file = (INSTALLER_DIR / "Greek.isl").read_text(encoding="utf-8-sig")
    greek = dict(re.findall(r"(?m)^(\w+)=(.*)$", greek_file[greek_file.index("[CustomMessages]") :]))

    for name, text in english.items():
        assert name in greek, name
        assert sorted(re.findall(r"%\d", text)) == sorted(re.findall(r"%\d", greek[name])), name
        assert max(map(ord, text), default=0) < 127, name


def test_the_last_page_of_sms_lite_is_a_text_of_both_languages():
    script = _installer_script()
    english = dict(re.findall(r"(?m)^english\.(\w+)=(.*)$", script))
    greek_file = (INSTALLER_DIR / "Greek.isl").read_text(encoding="utf-8-sig")
    greek = dict(re.findall(r"(?m)^(\w+)=(.*)$", greek_file[greek_file.index("[CustomMessages]") :]))

    assert "WizardForm.FinishedLabel.Caption := CustomMessage('LiteFinishedText');" in script
    assert "Log in with admin account (see documentation)" not in script
    assert "Works without internet connection" not in script
    assert "the administrator account you entered in this wizard" in english["LiteFinishedText"]
    assert "τον λογαριασμό διαχειριστή που δώσατε σε αυτόν τον οδηγό" in greek["LiteFinishedText"]
    assert english["LiteFinishedText"].count("%n") == greek["LiteFinishedText"].count("%n")
    assert max(map(ord, english["LiteFinishedText"])) < 127  # the .iss has no BOM: English stays ASCII
