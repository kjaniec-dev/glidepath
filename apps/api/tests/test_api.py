"""Endpoint tests for the simulate API using FastAPI's TestClient."""

from __future__ import annotations

from fastapi.testclient import TestClient

from glidepath_api import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_simulate_defaults_shape():
    r = client.post("/simulate", json={"n_paths": 2000})
    assert r.status_code == 200
    data = r.json()
    n_ages = len(data["ages"])
    assert n_ages == data["ages"][-1] - data["ages"][0] + 1
    for key in ("p10", "p25", "p50", "p75", "p90"):
        assert len(data["real"][key]) == n_ages
        assert len(data["nominal"][key]) == n_ages
    assert len(data["equity_weights"]) == n_ages
    assert 0.0 <= data["summary"]["success_probability"] <= 1.0
    assert len(data["terminal_real_hist"]["counts"]) == 40
    assert len(data["terminal_real_hist"]["bin_edges"]) == 41
    assert data["n_paths"] == 2000


def test_percentiles_are_ordered():
    r = client.post("/simulate", json={"n_paths": 3000, "seed": 7})
    real = r.json()["real"]
    for i in range(len(real["p50"])):
        assert real["p10"][i] <= real["p50"][i] <= real["p90"][i]


def test_invalid_timeline_is_422():
    # retirement_age > end_age violates a core invariant.
    r = client.post("/simulate", json={"start_age": 30, "retirement_age": 80, "end_age": 70})
    assert r.status_code == 422


def test_out_of_range_field_is_422():
    # n_paths above the cap is rejected by pydantic before reaching the core.
    r = client.post("/simulate", json={"n_paths": 10_000_000})
    assert r.status_code == 422


def test_rate_limiter_and_cors():
    from glidepath_api import main as api_main
    
    # Save original values
    orig_requests = api_main.RATE_LIMIT_REQUESTS
    orig_origins = api_main._origins
    
    try:
        # Mock rate limit and allowed origins for testing
        api_main.RATE_LIMIT_REQUESTS = 3
        api_main._origins = ["https://glidepath.kjaniec.dev"]
        
        # Clear request history to start fresh
        api_main._request_history.clear()
        
        # Make requests from the allowed origin
        headers = {"Origin": "https://glidepath.kjaniec.dev"}
        
        # First 3 requests should succeed (200 OK)
        for _ in range(3):
            r = client.post("/simulate", json={"n_paths": 10}, headers=headers)
            assert r.status_code == 200
            assert r.headers.get("access-control-allow-origin") == "https://glidepath.kjaniec.dev"
            
        # The 4th request should fail with 429
        r = client.post("/simulate", json={"n_paths": 10}, headers=headers)
        assert r.status_code == 429
        # Critically, check that CORS headers are still present on the 429 response
        assert r.headers.get("access-control-allow-origin") == "https://glidepath.kjaniec.dev"
        assert r.json() == {"detail": "Too many requests. Rate limit is 100 requests per minute."}
        
        # Request from an unauthorized origin should not have the Access-Control-Allow-Origin header
        r = client.post("/simulate", json={"n_paths": 10}, headers={"Origin": "https://malicious.com"})
        assert r.headers.get("access-control-allow-origin") is None
        
    finally:
        # Restore original values
        api_main.RATE_LIMIT_REQUESTS = orig_requests
        api_main._origins = orig_origins
        api_main._request_history.clear()

