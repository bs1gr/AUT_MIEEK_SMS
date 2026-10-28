"""DOCKER.ps1 rewrites the Dockerfile's COPY paths for the installed layout.

The installer ships Dockerfile.fullstack as it is in the repo (COPY src/frontend/..., src/backend),
but installs the code as frontend/ and backend/ directly. v1.18.60 added a second source path to
one COPY line (src/frontend/package-lock.json) and the old rewrite only changed the first, so the
Docker edition's first build failed with "/src/frontend/package-lock.json: not found" (2026-10-28).

The pattern is taken from DOCKER.ps1 itself and applied under pwsh (it uses a .NET
variable-length lookbehind, which Python's re does not support).
"""

import shutil
import subprocess
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh")
pytestmark = pytest.mark.skipif(PWSH is None, reason="pwsh is not installed")

REPO = Path(__file__).resolve().parents[3]
DOCKER_PS1 = REPO / "infra" / "scripts" / "dev" / "DOCKER.ps1"
DOCKERFILE = REPO / "infra" / "docker" / "compose" / "Dockerfile.fullstack"

HARNESS = r"""
param([string]$DockerScript, [string]$InputFile, [string]$OutputFile)
$ErrorActionPreference = 'Stop'

$tokens = $null; $parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($DockerScript, [ref]$tokens, [ref]$parseErrors)
$assign = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.AssignmentStatementAst] -and
    $n.Left.Extent.Text -eq '$_installedCopyPathPattern' }, $true)
if (-not $assign) { throw 'Expected $_installedCopyPathPattern in DOCKER.ps1' }
. ([scriptblock]::Create($assign.Extent.Text))

((Get-Content $InputFile -Raw) -replace $_installedCopyPathPattern, '') | Set-Content $OutputFile -Encoding utf8 -NoNewline
"""


def _rewrite(tmp_path: Path, text: str) -> str:
    harness = tmp_path / "harness.ps1"
    harness.write_text(HARNESS, encoding="utf-8")
    src = tmp_path / "in.Dockerfile"
    src.write_text(text, encoding="utf-8")
    out = tmp_path / "out.Dockerfile"
    proc = subprocess.run(
        [
            PWSH,
            "-NoProfile",
            "-NonInteractive",
            "-File",
            str(harness),
            "-DockerScript",
            str(DOCKER_PS1),
            "-InputFile",
            str(src),
            "-OutputFile",
            str(out),
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    return out.read_text(encoding="utf-8-sig")


def _copy_sources(dockerfile: str) -> list[str]:
    sources = []
    for line in dockerfile.splitlines():
        parts = line.split()
        if not parts or parts[0] != "COPY" or any(p.startswith("--from=") for p in parts):
            continue
        sources += [p for p in parts[1:-1] if not p.startswith("--")]
    return sources


def _exists_in_installed_layout(source: str) -> bool:
    # Installed layout: frontend/ and backend/ at the root (src/ in the repo), everything else as is.
    if source.split("/")[0] in ("frontend", "backend"):
        return (REPO / "src" / source).exists()
    return (REPO / source).exists()


def test_every_copy_source_exists_in_the_installed_layout(tmp_path):
    patched = _rewrite(tmp_path, DOCKERFILE.read_text(encoding="utf-8"))
    sources = _copy_sources(patched)

    assert "frontend/package-lock.json" in sources
    assert not [s for s in sources if s.startswith("src/")]
    assert [s for s in sources if not _exists_in_installed_layout(s)] == []


def test_repairs_a_dockerfile_the_old_rewrite_half_patched(tmp_path):
    half = "FROM node AS fe\nCOPY frontend/package.json src/frontend/package-lock.json ./\nCOPY backend /app/backend\n"
    patched = _rewrite(tmp_path, half)

    assert "COPY frontend/package.json frontend/package-lock.json ./" in patched
    assert "COPY backend /app/backend" in patched


def test_leaves_non_copy_lines_and_other_src_paths_alone(tmp_path):
    text = "RUN ls src/frontend\nCOPY src/frontend/ .\nCOPY tools/src/backend /x\n"
    patched = _rewrite(tmp_path, text)

    assert patched == "RUN ls src/frontend\nCOPY frontend/ .\nCOPY tools/src/backend /x\n"
