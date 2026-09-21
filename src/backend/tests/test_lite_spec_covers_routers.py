"""Every router the app registers must be listed in the SMS_Lite PyInstaller spec.

PyInstaller's collect_submodules('backend') does not reliably bundle the routers, so the spec
lists them by hand. A router registered in router_registry.py but missing from the spec loads
fine in development and in Docker, then fails only inside the frozen SMS_Lite exe - reported
as the misleading "No module named 'routers'".
"""

import re
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]


def test_every_registered_router_is_in_the_lite_spec():
    registry = (BACKEND / "router_registry.py").read_text(encoding="utf-8")
    spec = (BACKEND / "lite_simple_entrypoint.spec").read_text(encoding="utf-8")

    registered = set(re.findall(r'"(backend\.routers\.routers_\w+)"', registry))
    assert len(registered) > 20, "router_registry.py no longer lists routers this way; fix the test"

    missing = sorted(name for name in registered if f"'{name}'" not in spec)
    assert not missing, f"Add these to hiddenimports in lite_simple_entrypoint.spec: {missing}"
