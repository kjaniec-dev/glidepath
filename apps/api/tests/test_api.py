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
