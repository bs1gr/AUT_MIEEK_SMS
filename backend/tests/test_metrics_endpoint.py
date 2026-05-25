def test_metrics_endpoint_exposes_http_metrics(client):
    response = client.get("/")
    assert response.status_code == 200

    metrics_response = client.get("/metrics")
    assert metrics_response.status_code == 200

    body = metrics_response.text
    assert "sms_http_requests_total" in body
    assert "sms_http_request_duration_seconds" in body
    assert "sms_http_request_size_bytes" in body
    assert "sms_http_response_size_bytes" in body
    assert "sms_http_requests_inprogress" in body
