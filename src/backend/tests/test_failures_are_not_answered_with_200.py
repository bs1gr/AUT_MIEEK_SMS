"""A request the server could not serve is answered with an error status, not with 200.

Until v1.18.75 four routers (search, custom reports, import/export, dashboards) answered a
refusal or a failure with HTTP 200 and `success: false` in the body (83 places). A page that
read only the status took the failure for an answer: the custom reports list became an object
that was not a list, and the download of a report that was not there saved the JSON of the
failure as a "PDF". The body is the same envelope as before (`success`, `error`, `meta`); only
the status changed, so a caller that reads `error.message` from the body is not affected.
"""

import pytest

from backend.schemas.response import error_json, error_status_for

NOT_THERE = [
    ("get", "/api/v1/import-export/imports/999999"),
    ("get", "/api/v1/import-export/exports/999999"),
    ("get", "/api/v1/custom-reports/templates/999999"),
    ("get", "/api/v1/dashboards/999999"),
]


@pytest.mark.parametrize(("method", "address"), NOT_THERE)
def test_something_that_is_not_there_is_404_with_the_same_envelope(client, admin_headers, method, address):
    response = getattr(client, method)(address, headers=admin_headers)

    assert response.status_code == 404, response.text
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "NOT_FOUND"
    assert body["error"]["message"]
    assert body["meta"]["request_id"]


def test_a_report_that_is_not_there_or_not_yours_is_403_as_the_endpoint_says(client, admin_headers):
    # The service answers "nothing" for both, and the endpoint calls that FORBIDDEN.
    response = client.get("/api/v1/custom-reports/999999", headers=admin_headers)

    assert response.status_code == 403, response.text
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_a_search_for_a_kind_that_does_not_exist_is_422(client, admin_headers):
    response = client.post("/api/v1/search/advanced", json={"entity": "nothing", "query": "x"}, headers=admin_headers)

    assert response.status_code == 422, response.text
    assert response.json()["error"]["code"] == "INVALID_ENTITY"


@pytest.mark.parametrize(
    ("code", "status"),
    [
        ("UNAUTHORIZED", 401),
        ("FORBIDDEN", 403),
        ("NOT_FOUND", 404),
        ("FILE_NOT_FOUND", 404),
        ("DUPLICATE_ERROR", 409),
        ("VALIDATION_ERROR", 422),
        ("INVALID_PAGINATION", 422),
        ("LIST_ERROR", 500),
        ("SEARCH_ERROR", 500),
        ("SOMETHING_NEW_ERROR", 500),
    ],
)
def test_every_error_code_has_a_status_of_400_or_more(code, status):
    assert error_status_for(code) == status


def test_error_json_has_the_envelope_and_an_overridable_status():
    answer = error_json("NOT_FOUND", "Gone", request_id="req-1", details={"id": 7}, status_code=410)

    assert answer.status_code == 410
    import json

    body = json.loads(answer.body)
    assert body["success"] is False
    assert body["data"] is None
    assert body["error"] == {"code": "NOT_FOUND", "message": "Gone", "details": {"id": 7}, "path": None}
    assert body["meta"]["request_id"] == "req-1"
