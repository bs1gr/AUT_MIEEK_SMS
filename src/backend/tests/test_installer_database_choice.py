"""The database chosen in the installer's wizard reaches the application.

The wizard of the Docker edition asks which database to use (this PC's own, or a PostgreSQL
server) and writes the answer to ``<installation folder>\\.env`` (``SMS_Installer.iss``,
``WritePostgresEnv``). ``DOCKER.ps1`` works with ``<installation folder>\\config\\.env`` and
never read the other file: a new installation ran on its own SQLite database whatever the
wizard was told. Read from the two scripts on 18 November 2026, while the installation guide
was written; no installation was made to see it.

``Sync-InstallerDatabaseChoice`` in ``DOCKER.ps1`` carries the choice over. It is taken out of
the script here and run on a folder of two files; Docker is not involved.

- A new installation gets the wizard's choice.
- An installation that already runs keeps its database, and is told when the wizard's file
  names another: its records are where it runs.
"""

import json
import shutil
import subprocess
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh") or ""
pytestmark = pytest.mark.skipif(not PWSH, reason="pwsh is required")

REPO_ROOT = Path(__file__).resolve().parents[3]
DOCKER_PS1 = REPO_ROOT / "infra" / "scripts" / "dev" / "DOCKER.ps1"

# What DOCKER.ps1 makes of config\.env.example at a first start.
CONFIG = """VERSION=v1.18.74
SECRET_KEY=generated-by-the-first-start-0123456789abcdef
DEFAULT_ADMIN_EMAIL=admin@example.com
SMS_DEPLOYMENT_MODE=single
SMS_DATABASE_PROFILE=local
DATABASE_ENGINE=sqlite
DATABASE_URL=sqlite:////data/student_management.db
# POSTGRES_HOST=postgres
POSTGRES_PORT=5432
"""

# What the wizard writes for "PostgreSQL server".
WIZARD_POSTGRES = """SECRET_KEY=change-me-the-template's
SMS_DEPLOYMENT_MODE=single
SMS_DATABASE_PROFILE=remote
DATABASE_ENGINE=postgresql
POSTGRES_HOST=nas.example
POSTGRES_PORT=55433
POSTGRES_DB=school
POSTGRES_USER=sms
POSTGRES_PASSWORD=p@ss word=1
POSTGRES_SSLMODE=prefer
DATABASE_URL=postgresql://sms:p%40ss%20word%3D1@nas.example:55433/school?sslmode=prefer
"""

WIZARD_SQLITE = """SMS_DEPLOYMENT_MODE=single
SMS_DATABASE_PROFILE=local
DATABASE_ENGINE=sqlite
DATABASE_URL=sqlite:////data/student_management.db
"""

RUNNER = r"""
param([string]$Script, [string]$Installer, [string]$Config, [string]$Fresh)
$ErrorActionPreference = 'Stop'
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Script, [ref]$null, [ref]$null)
$function = $ast.Find({ param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Sync-InstallerDatabaseChoice'
}, $true)
if (-not $function) { throw 'Sync-InstallerDatabaseChoice is not in DOCKER.ps1' }
Invoke-Expression $function.Extent.Text
$result = Sync-InstallerDatabaseChoice -InstallerEnvPath $Installer -ConfigEnvPath $Config -FreshInstallation:($Fresh -eq 'yes')
$result | ConvertTo-Json -Compress
"""


def _sync(folder: Path, wizard: str | None, config: str | None, fresh: bool) -> tuple[dict, dict[str, str]]:
    """Runs the function on a folder as an installation has it. Returns its answer and what
    config\\.env holds afterwards (its settings, comments left out)."""
    installer_env = folder / ".env"
    config_env = folder / "config" / ".env"
    config_env.parent.mkdir(parents=True, exist_ok=True)
    if wizard is not None:
        installer_env.write_text(wizard, encoding="utf-8")
    if config is not None:
        config_env.write_text(config, encoding="utf-8")
    runner = folder / "run.ps1"
    runner.write_text(RUNNER, encoding="utf-8")

    done = subprocess.run(
        [
            PWSH,
            "-NoProfile",
            "-File",
            str(runner),
            str(DOCKER_PS1),
            str(installer_env),
            str(config_env),
            "yes" if fresh else "no",
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
    )
    assert done.returncode == 0, done.stdout + done.stderr
    settings: dict[str, str] = {}
    if config_env.exists():
        for line in config_env.read_text(encoding="utf-8-sig").splitlines():
            if line.strip() and not line.lstrip().startswith("#") and "=" in line:
                name, value = line.split("=", 1)
                settings[name.strip()] = value.strip()
    return json.loads(done.stdout.strip().splitlines()[-1]), settings


def test_a_new_installation_gets_the_postgresql_server_the_wizard_was_told(tmp_path: Path):
    answer, settings = _sync(tmp_path, WIZARD_POSTGRES, CONFIG, fresh=True)

    assert answer["Outcome"] == "applied"
    assert "nas.example:55433/school" in answer["Chosen"]
    assert settings["DATABASE_ENGINE"] == "postgresql"
    assert settings["SMS_DATABASE_PROFILE"] == "remote"
    assert settings["POSTGRES_HOST"] == "nas.example"  # the template had the line as a comment
    assert settings["POSTGRES_PORT"] == "55433"
    assert settings["POSTGRES_PASSWORD"] == "p@ss word=1"  # as written, "=" and all
    assert settings["DATABASE_URL"].startswith("postgresql://sms:p%40ss%20word%3D1@nas.example:55433/school")
    # What the first start generated stays: the wizard's file holds the template's placeholder.
    assert settings["SECRET_KEY"] == "generated-by-the-first-start-0123456789abcdef"
    assert settings["DEFAULT_ADMIN_EMAIL"] == "admin@example.com"


def test_a_new_installation_on_its_own_database_is_left_as_the_first_start_made_it(tmp_path: Path):
    answer, settings = _sync(tmp_path, WIZARD_SQLITE, CONFIG, fresh=True)

    assert answer["Outcome"] == "same"
    assert settings["DATABASE_ENGINE"] == "sqlite"
    assert (tmp_path / "config" / ".env").read_text(encoding="utf-8") == CONFIG


def test_an_installation_that_runs_keeps_its_database_and_is_told(tmp_path: Path):
    """The case of every installation made before: the wizard's file may name PostgreSQL while
    the installation has run on its own database since. Its records are there."""
    answer, settings = _sync(tmp_path, WIZARD_POSTGRES, CONFIG, fresh=False)

    assert answer["Outcome"] == "differs"
    assert "nas.example" in answer["Chosen"] and "SQLite" in answer["Running"]
    assert settings["DATABASE_ENGINE"] == "sqlite"
    assert (tmp_path / "config" / ".env").read_text(encoding="utf-8") == CONFIG


def test_the_same_server_in_both_files_is_the_same_choice_whatever_the_password(tmp_path: Path):
    config = WIZARD_POSTGRES.replace("POSTGRES_PASSWORD=p@ss word=1", "POSTGRES_PASSWORD=changed-since")

    answer, settings = _sync(tmp_path, WIZARD_POSTGRES, config, fresh=False)

    assert answer["Outcome"] == "same"
    assert settings["POSTGRES_PASSWORD"] == "changed-since"


@pytest.mark.parametrize(
    "wizard",
    [None, "SECRET_KEY=x\n", "DATABASE_ENGINE=oracle\n"],
    ids=["no file of the wizard", "a file without a database", "an engine it does not know"],
)
def test_without_a_choice_it_can_read_nothing_is_changed(tmp_path: Path, wizard):
    answer, _settings = _sync(tmp_path, wizard, CONFIG, fresh=True)

    assert answer["Outcome"] == "none"
    assert (tmp_path / "config" / ".env").read_text(encoding="utf-8") == CONFIG


def test_without_a_config_file_nothing_is_made(tmp_path: Path):
    answer, _settings = _sync(tmp_path, WIZARD_POSTGRES, None, fresh=True)

    assert answer["Outcome"] == "none"
    assert not (tmp_path / "config" / ".env").exists()


def test_the_script_calls_it_for_an_installed_copy_only():
    text = DOCKER_PS1.read_text(encoding="utf-8-sig")
    call = text.index("$wizard = Sync-InstallerDatabaseChoice")

    # Inside Initialize-EnvironmentFiles, after config\.env is made, and only in the layout an
    # installer leaves (in the repository a .env beside the script is somebody's own file).
    assert text.index("function Initialize-EnvironmentFiles") < call
    guard = text.rfind("if ($_isInstalledLayout)", 0, call)
    assert guard != -1 and call - guard < 200
    assert "-FreshInstallation:(-not $rootEnvExistedBefore)" in text[call : call + 300]


def test_the_wizard_reads_the_settings_the_installation_runs_on():
    """On an update the wizard's database page showed what its own file of an earlier run said,
    which could be a database the installation never used."""
    script = (REPO_ROOT / "infra" / "installer" / "windows" / "SMS_Installer.iss").read_text(encoding="utf-8-sig")
    start = script.index("// What an installation runs on is in config\\.env")
    block = script[start : start + 600]

    assert "EnvPath := AddBackslash(InstallDir) + 'config\\.env';" in block
    assert block.index("'config\\.env'") < block.index("AddBackslash(InstallDir) + '.env'")


# --- the questions the wizard and the uninstaller ask ---------------------------------------------

INSTALLER_DIR = REPO_ROOT / "infra" / "installer" / "windows"


def _installer_texts() -> tuple[str, dict[str, str], dict[str, str]]:
    import re

    script = (INSTALLER_DIR / "SMS_Installer.iss").read_text(encoding="utf-8-sig")
    english = dict(re.findall(r"(?m)^english\.(\w+)=(.*)$", script))
    greek_file = (INSTALLER_DIR / "Greek.isl").read_text(encoding="utf-8-sig")
    custom = greek_file[greek_file.index("[CustomMessages]") :]
    greek = dict(re.findall(r"(?m)^(\w+)=(.*)$", custom))
    return script, english, greek


def test_the_uninstaller_says_what_it_deletes_and_that_the_database_is_not_among_it():
    """It asked "Do you want to delete all user data?" and listed "Database (data folder)". The
    database of the Docker edition is in a Docker volume or on a PostgreSQL server, and the one
    of SMS Lite in the user's AppData: YES deleted neither."""
    script, english, greek = _installer_texts()

    assert "Database (data folder)' +" not in script  # the line of the old list, in the code
    assert "MsgBox(CustomMessage('UninstallDeleteData'), mbConfirmation, MB_YESNO)" in script
    for text in (english["UninstallDeleteData"], greek["UninstallDeleteData"]):
        assert "sms_data" in text and r"AppData\Local\SMS_Native_Lite_Simple" in text
    assert "does not delete the database" in english["UninstallDeleteData"]
    assert "Δεν διαγράφεται η ίδια η βάση" in greek["UninstallDeleteData"]


def test_every_text_the_code_asks_for_is_there_in_both_languages():
    """The wizard's question about an installation that is already there was English text in
    the code, although the wizard runs in Greek too."""
    import re

    script, english, greek = _installer_texts()
    asked = set(re.findall(r"CustomMessage\('(\w+)'\)", script))

    assert {"ExistingSameVersionPrompt", "ExistingUpgradePrompt", "UninstallDeleteData"} <= asked
    assert "is already installed at:' +" not in script
    assert sorted(asked - set(english)) == []
    assert sorted(asked - set(greek)) == []
    # The same places for the version and the folder in both languages.
    for name in ("ExistingSameVersionPrompt", "ExistingUpgradePrompt"):
        assert sorted(re.findall(r"%\d", english[name])) == sorted(re.findall(r"%\d", greek[name])), name
