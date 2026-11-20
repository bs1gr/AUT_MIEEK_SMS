"""What every endpoint asks of its caller, read from the application's own route table.

    python -m backend.scripts.endpoint_requirements            # print the table
    python -m backend.scripts.endpoint_requirements --write    # refresh docs/admin/PERMISSION_MATRIX.md

The table is not written by hand because a hand-written one stops being true: the three
permission documents under docs/admin named, for most of a year, permissions and roles the code
did not have. The block between the two markers in docs/admin/PERMISSION_MATRIX.md is this
module's output, and src/backend/tests/test_permission_documents.py fails when the two differ.

Nothing is started and nothing is called: the requirements are read off the route objects (the
permission decorators of backend.rbac keep their keys in a closure, the dependencies of
backend.security.permissions and backend.routers.routers_auth likewise).
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any, Iterable, Iterator, NamedTuple

START_MARKER = "<!-- endpoint-requirements:start -->"
END_MARKER = "<!-- endpoint-requirements:end -->"
MATRIX_PATH = Path(__file__).resolve().parents[3] / "docs" / "admin" / "PERMISSION_MATRIX.md"

# Listed: the API and the Control API. Left out: the page and its files (/, /favicon.ico, ...) and
# the few addresses outside /api/v1 (/health, /metrics, /api/logs/...), some of which exist only
# with a setting; PERMISSION_MATRIX.md names those by hand.
LISTED_PREFIXES = ("/api/v1/", "/control/api/")

# A permission as the code and the documents write it: an area and an action, in code font.
KEY_IN_CODE_FONT = re.compile(r"`((?:[a-z][a-z_.]*|\*):[a-z_*]+)`")

SIGNED_IN = "signed in"
OPEN = "nothing"
CONTROL = "Control API rules"
CONTROL_SIGNED_IN = "Control API, signed-in administrator"

# Checks an endpoint makes in its own body, which no route object shows. Each was read in the
# code and tried against a running copy; the test fails if one of these endpoints disappears.
INSIDE: dict[tuple[str, str], str] = {
    (
        "POST",
        "/api/v1/search/advanced",
    ): "signed in, and `students:view`, `courses:view` or `grades:view` by the kind of record searched",
    ("GET", "/api/v1/permissions/users/{user_id}"): "signed in; another account's permissions need `users:view`",
    ("GET", "/api/v1/data-subject/students/{student_id}/export"): "`students:view` and role `admin`",
    ("DELETE", "/api/v1/data-subject/students/{student_id}"): "`students:delete` and role `admin`",
    ("GET", "/api/v1/students/{student_id}/health"): "`students:view` and role `admin`",
    ("PUT", "/api/v1/students/{student_id}/health"): "`students:edit` and role `admin`",
    ("POST", "/control/api/restart"): CONTROL,
}


class Endpoint(NamedTuple):
    method: str
    path: str
    asks: str
    permission_keys: tuple[str, ...]


def _effective_routes(app: Any) -> Iterator[tuple[str, Any]]:
    """Every route with its full path. FastAPI keeps included routers nested since 0.13x."""
    import fastapi.routing as fastapi_routing

    walker = getattr(fastapi_routing, "iter_route_contexts", None)
    if walker is None:
        for route in app.routes:
            yield str(getattr(route, "path", "")), route
        return
    for context in walker(app.routes):
        yield str(context.path), getattr(context, "_effective_route", None) or context.route


def _closure(function: Any) -> dict[str, Any]:
    code = getattr(function, "__code__", None)
    cells = getattr(function, "__closure__", None) or ()
    if code is None:
        return {}
    found: dict[str, Any] = {}
    for name, cell in zip(code.co_freevars, cells):
        try:
            found[name] = cell.cell_contents
        except ValueError:  # an empty cell
            continue
    return found


def _layers(function: Any) -> list[Any]:
    seen: list[Any] = []
    while function is not None and function not in seen:
        seen.append(function)
        function = getattr(function, "__wrapped__", None)
    return seen


def _dependency_calls(dependant: Any) -> list[Any]:
    calls: list[Any] = []
    for dependency in getattr(dependant, "dependencies", []) or []:
        if getattr(dependency, "call", None) is not None:
            calls.append(dependency.call)
        calls.extend(_dependency_calls(dependency))
    return calls


def _keys(text: Iterable[str]) -> str:
    return ", ".join(f"`{key}`" for key in text)


def _requirement(route: Any) -> tuple[str, tuple[str, ...]]:
    """The requirement in words, and the permission keys in it."""
    parts: list[str] = []
    keys: list[str] = []
    signed_in = False

    # The decorators of backend.rbac around the endpoint function.
    for layer in _layers(route.endpoint):
        facts = _closure(layer)
        if "permission_keys" not in facts:
            continue
        wanted = [str(key) for key in facts["permission_keys"]]
        keys.extend(wanted)
        if "allow_self_access" not in facts:  # require_all_permissions
            text = " and ".join(f"`{key}`" for key in wanted)
        else:
            text = " or ".join(f"`{key}`" for key in wanted)
            if facts.get("allow_self_access"):
                text += " (or the student's own record)"
        parts.append(text)

    # The dependencies.
    for call in _dependency_calls(getattr(route, "dependant", None)):
        module = getattr(call, "__module__", "") or ""
        name = getattr(call, "__qualname__", "") or ""
        facts = _closure(call)
        if module == "backend.control_auth" and name == "require_control_admin":
            parts.append(CONTROL)
        elif module == "backend.control_auth" and name == "require_signed_in_control_admin":
            parts.append(CONTROL_SIGNED_IN)
        elif module == "backend.routers.routers_auth" and name.endswith("require_role.<locals>._dep"):
            roles = [str(role) for role in facts.get("roles", ()) if role]
            if roles:
                parts.append("role " + " or ".join(f"`{role}`" for role in roles))
            else:
                signed_in = True
        elif module == "backend.security.permissions" and name.endswith(".<locals>._dep"):
            permission = facts.get("permission")
            if permission:
                keys.append(str(permission))
                text = f"`{permission}`"
                fallback = [str(role) for role in facts.get("fallback_roles", ())]
                if fallback:
                    text += " (or role " + " or ".join(f"`{role}`" for role in fallback) + ")"
                parts.append(text)
            else:
                signed_in = True
        elif module == "backend.security.current_user" and name in (
            "get_current_user",
            "require_auth_even_if_disabled",
        ):
            signed_in = True

    unique = list(dict.fromkeys(parts))
    if unique:
        return " + ".join(unique), tuple(dict.fromkeys(keys))
    return (SIGNED_IN if signed_in else OPEN), ()


def endpoints(app: Any) -> list[Endpoint]:
    """Every listed endpoint of ``app``, one entry per method, in a fixed order."""
    found: dict[tuple[str, str], Endpoint] = {}
    for path, route in _effective_routes(app):
        if not path.startswith(LISTED_PREFIXES):
            continue
        if not hasattr(route, "endpoint") or not hasattr(route, "dependant"):
            continue
        methods = sorted(set(getattr(route, "methods", None) or {"WEBSOCKET"}) - {"HEAD", "OPTIONS"})
        asks, keys = _requirement(route)
        for method in methods:
            inside = INSIDE.get((method, path))
            found[(path, method)] = Endpoint(method, path, inside or asks, keys)
    return [found[key] for key in sorted(found)]


def permission_keys_asked(app: Any) -> set[str]:
    """Every permission key an endpoint asks for, the ones checked inside a body included."""
    keys: set[str] = set()
    for endpoint in endpoints(app):
        keys.update(endpoint.permission_keys)
        keys.update(KEY_IN_CODE_FONT.findall(endpoint.asks))  # the ones named in INSIDE
    return keys


def _area(path: str) -> str:
    if path.startswith("/control/"):
        return "Control API (`/control/api`)"
    return "`/api/v1/" + path[len("/api/v1/") :].split("/", 1)[0] + "`"


def render(app: Any) -> str:
    """The Markdown block that stands between the two markers of PERMISSION_MATRIX.md."""
    listed = endpoints(app)
    groups: dict[str, list[Endpoint]] = {}
    for endpoint in listed:
        groups.setdefault(_area(endpoint.path), []).append(endpoint)

    lines = [f"{len(listed)} endpoints.", ""]
    for area in sorted(groups, key=lambda name: (name.startswith("Control"), name)):
        lines += [f"#### {area}", "", "| Request | Asks for |", "|---|---|"]
        for endpoint in groups[area]:
            lines.append(f"| `{endpoint.method} {endpoint.path}` | {endpoint.asks} |")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def block_in(document: str) -> str:
    """The text between the two markers of ``document``."""
    start = document.index(START_MARKER) + len(START_MARKER)
    end = document.index(END_MARKER)
    return document[start:end].strip("\n") + "\n"


def with_block(document: str, block: str) -> str:
    start = document.index(START_MARKER) + len(START_MARKER)
    end = document.index(END_MARKER)
    return document[:start] + "\n\n" + block + "\n" + document[end:]


def main(arguments: list[str]) -> int:
    from backend.main import app

    block = render(app)
    if "--write" in arguments:
        text = MATRIX_PATH.read_text(encoding="utf-8")
        MATRIX_PATH.write_text(with_block(text, block), encoding="utf-8", newline="\n")
        print(f"{MATRIX_PATH}: {len(endpoints(app))} endpoints written")
    else:
        sys.stdout.write(block)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
