"""The names given to psutil are names the installed psutil knows.

psutil 6 renamed the process attribute `connections` to `net_connections`, and psutil 7 (the
version in requirements.txt) refuses the old name with "invalid attr name". Two places still
used it, and both swallowed the error:

- SMS Lite's last resort at startup, when port 8000 is held by something that does not answer
  its shutdown request: nothing was ever stopped, and Lite went on to fail on the busy port.
- `GET /admin/debug-processes`: every call answered "Process diagnostics unavailable".
"""

from __future__ import annotations

import ast
import importlib
import logging
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import psutil
import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def _attribute_lists():
    """Every list of names passed to psutil.process_iter(...) or Process.as_dict(...) in the
    backend's own code, as (file:line, [names])."""
    found = []
    for folder, subfolders, files in os.walk(BACKEND_ROOT):
        subfolders[:] = [s for s in subfolders if s not in {"tests", "venv", "__pycache__"} and not s.startswith(".")]
        for name in files:
            if not name.endswith(".py"):
                continue
            path = Path(folder) / name
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                    continue
                if node.func.attr not in {"process_iter", "as_dict"}:
                    continue
                candidates = list(node.args[:1]) + [k.value for k in node.keywords if k.arg == "attrs"]
                for candidate in candidates:
                    if isinstance(candidate, (ast.List, ast.Tuple)) and all(
                        isinstance(e, ast.Constant) and isinstance(e.value, str) for e in candidate.elts
                    ):
                        found.append(
                            (
                                f"{path.relative_to(BACKEND_ROOT).as_posix()}:{node.lineno}",
                                [e.value for e in candidate.elts],
                            )
                        )
    return found


def test_every_attribute_name_given_to_psutil_exists():
    lists = _attribute_lists()
    assert len(lists) >= 4, "the scan no longer finds the calls"

    known = set(psutil.Process().as_dict().keys())
    unknown = [f"{where}: {name}" for where, names in lists for name in names if name not in known]

    assert unknown == []


@pytest.fixture
def lite_module():
    saved_env = dict(os.environ)
    try:
        mod = importlib.import_module("backend.lite_simple_entrypoint")
    finally:
        os.environ.clear()
        os.environ.update(saved_env)
    return mod


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def _listening(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.settimeout(0.5)
        return probe.connect_ex(("127.0.0.1", port)) == 0


def test_lite_stops_the_process_that_holds_its_port(lite_module):
    """A process of this test's own listens on a free port, as a hung older instance would on
    8000. The function finds it by the port and stops it, and nothing else."""
    port = _free_port()
    holder = subprocess.Popen(
        [
            sys.executable,
            "-c",
            "import os, socket, time\n"
            "s = socket.socket()\n"
            f"s.bind(('127.0.0.1', {port}))\n"
            "s.listen()\n"
            "print(os.getpid(), flush=True)\n"
            "time.sleep(120)\n",
        ],
        stdout=subprocess.PIPE,
    )
    try:
        assert holder.stdout is not None
        # Its own PID, as it reports it: on Windows a virtual environment's python.exe is a
        # launcher, and the interpreter that holds the port is a child of the process started.
        listener_pid = int(holder.stdout.readline().strip())
        assert _listening(port)

        stopped = lite_module._stop_whatever_listens_on(port)

        assert stopped == [listener_pid]
        holder.wait(timeout=15)
        assert not psutil.pid_exists(listener_pid)
        assert not _listening(port)
    finally:
        if holder.poll() is None:
            holder.kill()
            holder.wait(timeout=15)
        if holder.stdout is not None:
            holder.stdout.close()


def test_lite_stops_nothing_when_the_port_is_free(lite_module):
    port = _free_port()

    assert lite_module._stop_whatever_listens_on(port) == []


def test_lite_never_stops_itself(lite_module):
    """The test process itself listens on the port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as own:
        own.bind(("127.0.0.1", 0))
        own.listen()
        port = own.getsockname()[1]

        assert lite_module._stop_whatever_listens_on(port) == []

    time.sleep(0)  # still running


def test_the_process_diagnostics_endpoint_answers(client, caplog):
    with caplog.at_level(logging.ERROR, logger="backend.admin_routes"):
        response = client.get("/api/v1/admin/debug-processes")

    assert response.status_code == 200, response.text
    body = response.json()
    assert "error" not in body
    assert body["backend_process"]["pid"] == os.getpid()
    assert [r for r in caplog.records if r.name == "backend.admin_routes"] == []
