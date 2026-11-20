"""Endpoints removed on the owner's decision of 2026-11-20 (plan todos 58 and 63).

Nothing in the application called any of them:

- the notification WebSocket (`/api/v1/notifications/ws`): its frontend client was used by
  nothing but its own test; the bell and the list fetch notifications over HTTP;
- `POST /api/v1/admin/restore-encrypted-backup`: the page restores through another path since
  #407;
- `GET /api/v1/admin/debug-processes`: listed what an old "stop the dev server" control would
  stop;
- `GET /api/v1/analytics/course/{id}/students-comparison`: read the grades once per student,
  and took a plain average that ignored the course's evaluation rules;
- `GET /api/v1/analytics/reports/templates`: answered without a sign-in; the pages use
  `/api/v1/custom-reports/templates`.
"""

from __future__ import annotations

import pytest
from starlette.routing import WebSocketRoute

from backend.main import app

REMOVED = [
    ("post", "/api/v1/admin/restore-encrypted-backup?backup_name=x"),
    ("get", "/api/v1/admin/debug-processes"),
    ("get", "/api/v1/analytics/course/1/students-comparison"),
    ("get", "/api/v1/analytics/reports/templates"),
]


@pytest.mark.parametrize(("method", "path"), REMOVED)
def test_the_removed_endpoint_is_not_found(client, method, path):
    assert getattr(client, method)(path).status_code == 404


def test_the_application_has_no_websocket_route():
    paths = [route.path for route in app.routes if isinstance(route, WebSocketRoute)]
    assert paths == []
