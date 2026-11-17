"""The release flow asks for a build-only Docker run of the commit it tags, and waits for it.

Plan todo 48. CI builds Dockerfile.fullstack for amd64 on every push; the cloud host is arm64
and builds its image after the tag. DOCKER_BUILD_CHECK.ps1 dispatches docker-publish.yml with
dry_run=true for HEAD (both platforms, nothing is published) and reports how it ended, and
RELEASE_READY.ps1 makes the tag only after it passed.

The check script is run under pwsh on a scratch repository with a bare "origin", with a fake
`gh` that keeps the workflow runs in a JSON file. The fake titles a dispatched run with the
run-name read from the real docker-publish.yml, so a title changed in the workflow alone makes
the script lose its own run here. Publish-ReleaseTag and Invoke-DockerBuildCheck are taken from
RELEASE_READY.ps1 itself.
"""

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh") or ""
GIT = shutil.which("git") or ""
pytestmark = pytest.mark.skipif(not (PWSH and GIT), reason="pwsh and git are required")

REPO_ROOT = Path(__file__).resolve().parents[3]
CHECK_SCRIPT = REPO_ROOT / "infra" / "scripts" / "release" / "DOCKER_BUILD_CHECK.ps1"
RELEASE_READY = REPO_ROOT / "infra" / "scripts" / "release" / "RELEASE_READY.ps1"
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "docker-publish.yml"

VERSION = "1.18.73"
TAG = f"v{VERSION}"
BOTH = "linux/amd64,linux/arm64"
OTHER_COMMIT = "0123456789abcdef0123456789abcdef01234567"
FAILED_BUILD = [
    {
        "name": "build-and-publish",
        "steps": [
            {"name": "Checkout", "conclusion": "success"},
            {"name": "Build Docker image (pushed unless dry_run)", "conclusion": "failure"},
        ],
    }
]

# The real script, with `gh` replaced by a function that keeps its runs in a JSON file.
CHECK_HARNESS = r"""
param([string]$Script, [string]$Repo, [string]$StateFile, [string]$ArgsFile)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$global:FakeStateFile = $StateFile

function gh {
    $words = @($args | ForEach-Object { "$_" })
    $state = Get-Content -LiteralPath $global:FakeStateFile -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable
    $state.calls = @($state.calls) + ($words -join ' ')
    $exitCode = 0
    $output = $null
    $verb = "$($words[0]) $($words[1])"
    if ($verb -eq 'run list') {
        if ($state.listExit -ne 0) { $exitCode = $state.listExit }
        else {
            # As GitHub does: the runs of that commit when one is named, every run otherwise.
            # Telling the runs of a commit apart is the script's job.
            $at = [array]::IndexOf($words, '--commit')
            $listed = if ($at -lt 0) { @($state.runs) } else { @($state.runs | Where-Object { $_.headSha -eq $words[$at + 1] }) }
            $output = ConvertTo-Json -InputObject $listed -Depth 6 -Compress
        }
    }
    elseif ($verb -eq 'workflow run') {
        if ($state.dispatchExit -ne 0) { $exitCode = $state.dispatchExit }
        else {
            $fields = @{}
            for ($i = 0; $i -lt $words.Count; $i++) {
                if ($words[$i] -eq '-f') { $name, $value = $words[$i + 1] -split '=', 2; $fields[$name] = $value }
            }
            $kind = if ($fields.dry_run -eq 'true') { $state.dryRunKind } else { $state.publishKind }
            $id = [long]$state.nextId
            $state.nextId = $id + 1
            $state.runs = @($state.runs) + @{
                databaseId   = $id
                displayTitle = $state.titleTemplate.Replace('{kind}', $kind).Replace('{tag}', $fields.tag).Replace('{platforms}', $fields.platforms)
                headSha      = $state.dispatchBuilds
                status       = 'queued'
                conclusion   = ''
                url          = "https://github.invalid/runs/$id"
            }
            $state.dispatched = @($state.dispatched) + @{
                workflow = $words[2]
                ref      = $words[[array]::IndexOf($words, '--ref') + 1]
                fields   = $fields
            }
            $output = 'Created workflow_dispatch event'
        }
    }
    elseif ($verb -eq 'run view') {
        # Each look moves the run one step along the scripted list; the last step stays.
        $steps = @($state.progress)
        $step = $steps[[Math]::Min([int]$state.looks, $steps.Count - 1)]
        $state.looks = [int]$state.looks + 1
        if ($step -eq 'error') { $exitCode = 1 }
        else {
            $status, $conclusion = $step -split ':'
            $run = $state.runs | Where-Object { "$($_.databaseId)" -eq $words[2] } | Select-Object -First 1
            $run.status = $status
            $run.conclusion = "$conclusion"
            $output = ConvertTo-Json -Depth 6 -Compress -InputObject @{
                status = $status; conclusion = "$conclusion"; url = $run.url; jobs = @($state.jobs)
            }
        }
    }
    else { throw "the fake gh does not know: $($words -join ' ')" }
    ConvertTo-Json -InputObject $state -Depth 8 | Set-Content -LiteralPath $global:FakeStateFile -Encoding utf8
    $global:LASTEXITCODE = $exitCode
    if ($null -ne $output) { $output }
}

$scriptArgs = Get-Content -LiteralPath $ArgsFile -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable
& $Script @scriptArgs -RepoRoot $Repo
exit $LASTEXITCODE
"""

# Publish-ReleaseTag from RELEASE_READY.ps1, with the check replaced by a recorded answer.
TAG_HARNESS = r"""
param([string]$Script, [string]$Repo, [string]$Version, [string]$CheckAnswer, [string]$CallsFile, [switch]$SkipDockerCheck)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$tokens = $null; $parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Script, [ref]$tokens, [ref]$parseErrors)
$def = $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $true) |
    Where-Object { $_.Name -eq 'Publish-ReleaseTag' } | Select-Object -First 1
if (-not $def) { throw 'Publish-ReleaseTag was not found in RELEASE_READY.ps1' }
. ([scriptblock]::Create($def.Extent.Text))

function Invoke-DockerBuildCheck {
    param([string]$Version, [switch]$Wait)
    Add-Content -LiteralPath $CallsFile -Value "version=$Version wait=$($Wait.IsPresent)"
    return ($CheckAnswer -eq 'pass')
}

Set-Location -LiteralPath $Repo
Publish-ReleaseTag -Version $Version -SkipDockerCheck:$SkipDockerCheck
exit 0
"""

# Invoke-DockerBuildCheck from RELEASE_READY.ps1, in front of a stand-in check script.
GATE_HARNESS = r"""
param([string]$Script, [string]$Root, [string]$Version, [string]$ResultFile, [switch]$Wait)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$tokens = $null; $parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Script, [ref]$tokens, [ref]$parseErrors)
$def = $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $true) |
    Where-Object { $_.Name -eq 'Invoke-DockerBuildCheck' } | Select-Object -First 1
if (-not $def) { throw 'Invoke-DockerBuildCheck was not found in RELEASE_READY.ps1' }
. ([scriptblock]::Create($def.Extent.Text))

$PROJECT_ROOT = $Root
$answer = Invoke-DockerBuildCheck -Version $Version -Wait:$Wait
ConvertTo-Json -InputObject @{ type = $answer.GetType().Name; value = $answer } | Set-Content -LiteralPath $ResultFile -Encoding utf8
"""

STAND_IN_CHECK = r"""
param([string]$Version, [switch]$NoWait)
Add-Content -LiteralPath $env:STAND_IN_CALLS -Value "version=$Version nowait=$($NoWait.IsPresent)"
'a line the check leaves on the pipeline'
Write-Host 'progress of the check'
exit ([int]$env:STAND_IN_EXIT)
"""


def _git(cwd: Path, *args: str) -> str:
    done = subprocess.run(
        [GIT, "-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    return done.stdout.strip()


def _pwsh(script: Path, *args: str, env: dict[str, str] | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        [PWSH, "-NoProfile", "-NonInteractive", "-File", str(script), *args],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=180,
        env=env,
    )


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    """A repository on `main` whose one commit (VERSION = the tag) is pushed to a bare origin."""
    origin = tmp_path / "origin.git"
    work = tmp_path / "work"
    _git(tmp_path, "init", "--quiet", "--bare", "-b", "main", str(origin))
    _git(tmp_path, "init", "--quiet", "-b", "main", str(work))
    (work / "VERSION").write_text(f"{TAG}\n", encoding="utf-8")
    _git(work, "add", "VERSION")
    _git(work, "commit", "--quiet", "-m", "release commit")
    _git(work, "remote", "add", "origin", str(origin))
    _git(work, "push", "--quiet", "origin", "main")
    return work


def _commit(work: Path, text: str) -> None:
    (work / "note.txt").write_text(text, encoding="utf-8")
    _git(work, "add", "note.txt")
    _git(work, "commit", "--quiet", "-m", text)


def _run_name() -> tuple[str, str, str]:
    """docker-publish.yml's run-name as a template, and its two kinds of run."""
    line = re.search(r'^run-name:\s*"(.+)"\s*$', WORKFLOW.read_text(encoding="utf-8"), re.MULTILINE)
    assert line, "docker-publish.yml has no run-name"
    name = line.group(1)
    kinds = re.search(r"\$\{\{\s*inputs\.dry_run\s*&&\s*'([^']+)'\s*\|\|\s*'([^']+)'\s*\}\}", name)
    assert kinds, f"the run-name does not tell a build-only run from a publish: {name}"
    template = name.replace(kinds.group(0), "{kind}")
    template = re.sub(r"\$\{\{\s*inputs\.tag\s*\}\}", "{tag}", template)
    template = re.sub(r"\$\{\{\s*inputs\.platforms\s*\}\}", "{platforms}", template)
    assert "{tag}" in template and "{platforms}" in template and "${{" not in template, name
    return template, kinds.group(1), kinds.group(2)


def _title(platforms: str = BOTH, tag: str = TAG, publish: bool = False) -> str:
    template, dry_run_kind, publish_kind = _run_name()
    return template.format(kind=publish_kind if publish else dry_run_kind, tag=tag, platforms=platforms)


def _run(
    run_id: int, sha: str, status: str = "completed", conclusion: str = "success", title: str | None = None
) -> dict:
    return {
        "databaseId": run_id,
        "displayTitle": title or _title(),
        "headSha": sha,
        "status": status,
        "conclusion": conclusion,
        "url": f"https://github.invalid/runs/{run_id}",
    }


def _check(tmp_path: Path, repo: Path, *, runs=(), progress=("in_progress", "completed:success"), **options):
    """Run DOCKER_BUILD_CHECK.ps1 on the repository; return (exit code, output, the fake's state)."""
    template, dry_run_kind, publish_kind = _run_name()
    state = {
        "titleTemplate": template,
        "dryRunKind": dry_run_kind,
        "publishKind": publish_kind,
        "runs": list(runs),
        "nextId": 500,
        "dispatchBuilds": options.pop("dispatch_builds", _git(repo, "rev-parse", "HEAD")),
        "progress": list(progress),
        "looks": 0,
        "jobs": options.pop("jobs", []),
        "listExit": 0,
        "dispatchExit": options.pop("dispatch_exit", 0),
        "calls": [],
        "dispatched": [],
    }
    # No waiting: the fake answers at once, so a run that is not there at the first look never comes.
    arguments = {"Version": VERSION, "PollSeconds": 0, "AppearSeconds": 0, **options}
    harness = tmp_path / "check_harness.ps1"
    harness.write_text(CHECK_HARNESS, encoding="utf-8")
    state_file = tmp_path / "gh_state.json"
    state_file.write_text(json.dumps(state), encoding="utf-8")
    args_file = tmp_path / "check_args.json"
    args_file.write_text(json.dumps(arguments), encoding="utf-8")
    done = _pwsh(
        harness,
        "-Script",
        str(CHECK_SCRIPT),
        "-Repo",
        str(repo),
        "-StateFile",
        str(state_file),
        "-ArgsFile",
        str(args_file),
    )
    return done.returncode, done.stdout + done.stderr, json.loads(state_file.read_text(encoding="utf-8-sig"))


# --- DOCKER_BUILD_CHECK.ps1 ---------------------------------------------------------------


def test_with_no_run_for_the_commit_one_is_dispatched_and_waited_for(tmp_path, repo):
    exit_code, output, state = _check(tmp_path, repo, progress=["in_progress", "in_progress", "completed:success"])

    assert exit_code == 0, output
    assert state["dispatched"] == [
        {"workflow": "docker-publish.yml", "ref": "main", "fields": {"tag": TAG, "dry_run": "true", "platforms": BOTH}}
    ]
    assert state["looks"] == 3
    assert "The image builds from" in output and "https://github.invalid/runs/500" in output


def test_a_run_of_this_commit_that_already_succeeded_is_the_answer(tmp_path, repo):
    sha = _git(repo, "rev-parse", "HEAD")

    exit_code, output, state = _check(tmp_path, repo, runs=[_run(41, sha)])

    assert exit_code == 0, output
    assert state["dispatched"] == []
    assert state["looks"] == 0
    assert "already succeeded: https://github.invalid/runs/41" in output


@pytest.mark.parametrize(
    "other",
    ["another commit", "one platform only", "a publish", "another release"],
)
def test_a_success_that_is_not_this_check_does_not_count(tmp_path, repo, other):
    sha = _git(repo, "rev-parse", "HEAD")
    earlier = {
        "another commit": _run(41, OTHER_COMMIT),
        "one platform only": _run(41, sha, title=_title(platforms="linux/amd64")),
        "a publish": _run(41, sha, title=_title(publish=True)),
        "another release": _run(41, sha, title=_title(tag="v1.18.72")),
    }[other]

    exit_code, output, state = _check(tmp_path, repo, runs=[earlier])

    assert exit_code == 0, output
    assert len(state["dispatched"]) == 1
    assert "https://github.invalid/runs/500" in output


def test_a_run_under_way_is_waited_for_and_not_doubled(tmp_path, repo):
    sha = _git(repo, "rev-parse", "HEAD")

    exit_code, output, state = _check(tmp_path, repo, runs=[_run(41, sha, status="in_progress", conclusion="")])

    assert exit_code == 0, output
    assert state["dispatched"] == []
    assert "under way: https://github.invalid/runs/41" in output
    assert "run view 41" in " ".join(state["calls"])


def test_a_build_that_fails_fails_the_check_and_names_the_step(tmp_path, repo):
    exit_code, output, state = _check(tmp_path, repo, progress=["in_progress", "completed:failure"], jobs=FAILED_BUILD)

    assert exit_code == 1, output
    assert "Failed step: build-and-publish / Build Docker image (pushed unless dry_run)" in output
    assert "NOT PASSED: The build-only run ended with 'failure': https://github.invalid/runs/500" in output
    assert len(state["dispatched"]) == 1


def test_after_a_run_that_failed_another_is_started(tmp_path, repo):
    sha = _git(repo, "rev-parse", "HEAD")

    exit_code, output, state = _check(tmp_path, repo, runs=[_run(41, sha, conclusion="failure")])

    assert exit_code == 0, output
    assert "ended with 'failure'; starting another" in output
    assert len(state["dispatched"]) == 1
    assert "run view 500" in " ".join(state["calls"])


def test_a_commit_that_is_not_pushed_is_refused_before_anything_is_asked(tmp_path, repo):
    _commit(repo, "not pushed")

    exit_code, output, state = _check(tmp_path, repo)

    assert exit_code == 1, output
    assert "is not what origin/main points at" in output and "Push first" in output
    assert state["calls"] == []


def test_a_branch_that_origin_does_not_have_is_refused(tmp_path, repo):
    _git(repo, "checkout", "--quiet", "-b", "local-only")

    exit_code, output, state = _check(tmp_path, repo)

    assert exit_code == 1, output
    assert "is not what origin/local-only points at (no such branch)" in output
    assert state["calls"] == []


def test_a_detached_head_is_refused(tmp_path, repo):
    _git(repo, "checkout", "--quiet", "--detach")

    exit_code, output, state = _check(tmp_path, repo)

    assert exit_code == 1, output
    assert "HEAD is detached" in output
    assert state["calls"] == []


def test_the_run_is_dispatched_on_the_branch_that_is_checked_out(tmp_path, repo):
    _git(repo, "checkout", "--quiet", "-b", "ci/some-branch")
    _commit(repo, "on the branch")
    _git(repo, "push", "--quiet", "origin", "ci/some-branch")

    exit_code, output, state = _check(tmp_path, repo)

    assert exit_code == 0, output
    assert [d["ref"] for d in state["dispatched"]] == ["ci/some-branch"]


def test_nowait_starts_the_run_and_returns(tmp_path, repo):
    exit_code, output, state = _check(tmp_path, repo, NoWait=True)

    assert exit_code == 0, output
    assert len(state["dispatched"]) == 1
    assert state["looks"] == 0
    assert "Started: https://github.invalid/runs/500" in output
    assert "Not waiting (-NoWait)" in output and f"-Version {VERSION}" in output
    assert "-Platforms" not in output


def test_nowait_names_the_command_that_reads_the_result_of_this_run(tmp_path, repo):
    # Without the platform, the command it names would ask for a run of both platforms.
    exit_code, output, _ = _check(tmp_path, repo, NoWait=True, Platforms="linux/arm64")

    assert exit_code == 0, output
    assert f"before the tag: DOCKER_BUILD_CHECK.ps1 -Version {VERSION} -Platforms 'linux/arm64'" in output


def test_a_run_that_does_not_finish_in_time_fails_the_check(tmp_path, repo):
    exit_code, output, _ = _check(tmp_path, repo, progress=["in_progress"], TimeoutMinutes=0)

    assert exit_code == 1, output
    assert "The run is still 'in_progress' after 0 minutes: https://github.invalid/runs/500" in output


def test_a_look_that_fails_is_not_the_build_failing(tmp_path, repo):
    exit_code, output, state = _check(tmp_path, repo, progress=["error", "error", "in_progress", "completed:success"])

    assert exit_code == 0, output
    assert state["looks"] == 4


def test_looks_that_keep_failing_fail_the_check(tmp_path, repo):
    exit_code, output, state = _check(tmp_path, repo, progress=["error"])

    assert exit_code == 1, output
    assert "gh run view failed five times in a row" in output
    assert state["looks"] == 5


def test_a_dispatch_that_github_refuses_fails_the_check(tmp_path, repo):
    exit_code, output, state = _check(tmp_path, repo, dispatch_exit=1)

    assert exit_code == 1, output
    assert "gh workflow run failed (exit 1)" in output
    assert state["looks"] == 0


def test_a_run_that_built_another_commit_is_not_taken_for_this_one(tmp_path, repo):
    # The branch moved on GitHub between the question and the dispatch.
    exit_code, output, state = _check(tmp_path, repo, dispatch_builds=OTHER_COMMIT)

    assert exit_code == 1, output
    assert "did not show up for commit" in output and "it built another commit" in output
    assert state["looks"] == 0


@pytest.mark.parametrize(
    ("options", "message"),
    [
        ({"Version": "2.0.0"}, "Version '2.0.0' is not in the 1.x.x format"),
        ({"Version": "v11.18.73"}, "Version 'v11.18.73' is not in the 1.x.x format"),
        ({"Platforms": "linux/riscv64"}, "Platforms must be linux/amd64, linux/arm64 or both"),
    ],
)
def test_a_wrong_version_or_platform_is_refused_before_anything_is_asked(tmp_path, repo, options, message):
    exit_code, output, state = _check(tmp_path, repo, **options)

    assert exit_code == 1, output
    assert message in output
    assert state["calls"] == []


@pytest.mark.parametrize(
    ("asked", "sent"),
    [
        ("linux/arm64,linux/amd64", BOTH),
        (["linux/arm64", "linux/amd64"], BOTH),
        ("linux/arm64", "linux/arm64"),
    ],
)
def test_platforms_are_sent_the_way_the_workflow_lists_them(tmp_path, repo, asked, sent):
    exit_code, output, state = _check(tmp_path, repo, Version=TAG, Platforms=asked)

    assert exit_code == 0, output
    assert state["dispatched"][0]["fields"] == {"tag": TAG, "dry_run": "true", "platforms": sent}


# --- RELEASE_READY.ps1: the tag waits for the check -----------------------------------------


def _publish_tag(tmp_path: Path, repo: Path, answer: str, *extra: str):
    harness = tmp_path / "tag_harness.ps1"
    harness.write_text(TAG_HARNESS, encoding="utf-8")
    calls_file = tmp_path / "check_calls.txt"
    done = _pwsh(
        harness,
        "-Script",
        str(RELEASE_READY),
        "-Repo",
        str(repo),
        "-Version",
        VERSION,
        "-CheckAnswer",
        answer,
        "-CallsFile",
        str(calls_file),
        *extra,
    )
    calls = calls_file.read_text(encoding="utf-8-sig").split("\n") if calls_file.exists() else []
    return done.returncode, done.stdout + done.stderr, [line.strip() for line in calls if line.strip()]


def _tags(repo: Path) -> tuple[str, str]:
    return _git(repo, "tag", "-l"), _git(repo, "ls-remote", "--tags", "origin")


def test_the_tag_is_made_after_the_check_passed(tmp_path, repo):
    exit_code, output, calls = _publish_tag(tmp_path, repo, "pass")

    assert exit_code == 0, output
    assert calls == [f"version={VERSION} wait=True"]
    local, remote = _tags(repo)
    assert local == TAG
    assert remote == f"{_git(repo, 'rev-parse', 'HEAD')}\trefs/tags/{TAG}"


def test_no_tag_is_made_when_the_check_did_not_pass(tmp_path, repo):
    exit_code, output, calls = _publish_tag(tmp_path, repo, "fail")

    assert exit_code == 1, output
    assert calls == [f"version={VERSION} wait=True"]
    assert "The Docker image build check did not pass - refusing to tag." in output
    assert _tags(repo) == ("", "")


def test_skipdockercheck_tags_without_asking(tmp_path, repo):
    exit_code, output, calls = _publish_tag(tmp_path, repo, "fail", "-SkipDockerCheck")

    assert exit_code == 0, output
    assert calls == []
    assert "Docker image build check skipped (-SkipDockerCheck)" in output
    assert _tags(repo)[0] == TAG


def test_a_commit_the_older_guards_refuse_is_never_sent_to_the_check(tmp_path, repo):
    _commit(repo, "not pushed")

    exit_code, output, calls = _publish_tag(tmp_path, repo, "pass")

    assert exit_code == 1, output
    assert "refusing to tag an unpushed commit" in output
    assert calls == []
    assert _tags(repo) == ("", "")


def _gate(tmp_path: Path, monkeypatch, *, stand_in_exit: int | None, wait: bool):
    root = tmp_path / "project"
    calls_file = tmp_path / "stand_in_calls.txt"
    if stand_in_exit is not None:
        script = root / "infra" / "scripts" / "release" / "DOCKER_BUILD_CHECK.ps1"
        script.parent.mkdir(parents=True)
        script.write_text(STAND_IN_CHECK, encoding="utf-8")
        monkeypatch.setenv("STAND_IN_EXIT", str(stand_in_exit))
    else:
        root.mkdir()
    monkeypatch.setenv("STAND_IN_CALLS", str(calls_file))
    harness = tmp_path / "gate_harness.ps1"
    harness.write_text(GATE_HARNESS, encoding="utf-8")
    result_file = tmp_path / "gate_result.json"
    arguments = [
        "-Script",
        str(RELEASE_READY),
        "-Root",
        str(root),
        "-Version",
        VERSION,
        "-ResultFile",
        str(result_file),
    ]
    done = _pwsh(harness, *arguments, *(["-Wait"] if wait else []))
    assert done.returncode == 0, done.stdout + done.stderr
    calls = calls_file.read_text(encoding="utf-8-sig").strip() if calls_file.exists() else ""
    return json.loads(result_file.read_text(encoding="utf-8-sig")), calls


@pytest.mark.parametrize(
    ("stand_in_exit", "wait", "answer", "call"),
    [
        (0, True, True, f"version={VERSION} nowait=False"),
        (1, True, False, f"version={VERSION} nowait=False"),
        (0, False, True, f"version={VERSION} nowait=True"),
        (1, False, False, f"version={VERSION} nowait=True"),
        (None, True, False, ""),
    ],
)
def test_the_release_script_answers_with_the_check_s_exit_code(
    tmp_path, monkeypatch, stand_in_exit, wait, answer, call
):
    result, calls = _gate(tmp_path, monkeypatch, stand_in_exit=stand_in_exit, wait=wait)

    # A Boolean: what the check prints must not turn the answer into an array (always true).
    assert result == {"type": "Boolean", "value": answer}
    assert calls == call


def test_the_release_script_starts_the_check_when_it_does_not_tag():
    """Without -TagRelease the run is started on the pushed commit; -SkipDockerCheck stops both."""
    text = RELEASE_READY.read_text(encoding="utf-8")
    flow = text[text.index("$dockerCheckStarted = $false") :]
    tagging = flow.index("Publish-ReleaseTag -Version $ReleaseVersion -SkipDockerCheck:$SkipDockerCheck")
    skipping = flow.index("} elseif ($SkipDockerCheck) {")
    starting = flow.index("$dockerCheckStarted = Invoke-DockerBuildCheck -Version $ReleaseVersion")

    assert tagging < skipping < starting
    assert "git push origin main" not in flow, "the check has to come after the last push"
