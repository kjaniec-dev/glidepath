"""Glidepath FastAPI service — a single stateless ``POST /simulate`` endpoint.

The app holds no state and no database: params in, percentile arrays out. All
the maths lives in ``glidepath-core``; this module just adapts it to HTTP/JSON.
"""

from __future__ import annotations

import os
import time
from collections import defaultdict

import numpy as np
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from glidepath import percentile_bands, simulate, summarize, terminal_wealth

from .schemas import Bands, Histogram, SimulateRequest, SimulateResponse, Summary

app = FastAPI(
    title="Glidepath API",
    version="0.1.0",
    summary="Stateless Monte Carlo retirement projection.",
)

# Simple in-memory rate limiting: max 100 requests per minute per client IP.
RATE_LIMIT_REQUESTS = 100
RATE_LIMIT_WINDOW = 60  # seconds

# Maps client IP -> list of request timestamps
_request_history: dict[str, list[float]] = defaultdict(list)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Only rate limit the /simulate endpoint
    if request.url.path == "/simulate" and request.method == "POST":
        # Extract IP from X-Forwarded-For (Google Cloud Run load balancer proxy header)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        now = time.time()

        # Clean up timestamps older than the window
        history = _request_history[client_ip]
        history = [t for t in history if now - t < RATE_LIMIT_WINDOW]
        _request_history[client_ip] = history

        if len(history) >= RATE_LIMIT_REQUESTS:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Rate limit is 100 requests per minute."},
            )

        history.append(now)

    return await call_next(request)


# ALLOWED_ORIGINS defaults to your production subdomain.
_default_origins = "https://glidepath.kjaniec.dev"
_raw_origins = os.environ.get("ALLOWED_ORIGINS", _default_origins)
_origins: list[str] | str = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)




def _bands(balances: np.ndarray) -> Bands:
    b = percentile_bands(balances, (10, 25, 50, 75, 90))
    return Bands(
        p10=b[10].tolist(),
        p25=b[25].tolist(),
        p50=b[50].tolist(),
        p75=b[75].tolist(),
        p90=b[90].tolist(),
    )


def _terminal_histogram(values: np.ndarray, bins: int = 40) -> Histogram:
    counts, edges = np.histogram(values, bins=bins)
    return Histogram(bin_edges=edges.tolist(), counts=counts.tolist())


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/simulate", response_model=SimulateResponse)
def run_simulate(req: SimulateRequest) -> SimulateResponse:
    try:
        params = req.to_params()
    except ValueError as exc:
        # Core invariants (e.g. start < retirement <= end) -> client error.
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    start = time.perf_counter()
    result = simulate(params)
    elapsed_ms = (time.perf_counter() - start) * 1000.0

    s = summarize(result)
    return SimulateResponse(
        ages=result.ages.tolist(),
        equity_weights=result.equity_weights.tolist(),
        retirement_age=params.retirement_age,
        real=_bands(result.balances_real),
        nominal=_bands(result.balances_nominal),
        summary=Summary(
            success_probability=s.success_probability,
            median_terminal_real=s.median_terminal_real,
            p10_terminal_real=s.p10_terminal_real,
            p90_terminal_real=s.p90_terminal_real,
            median_depletion_age=s.median_depletion_age,
        ),
        terminal_real_hist=_terminal_histogram(terminal_wealth(result, real=True)),
        n_paths=params.n_paths,
        elapsed_ms=round(elapsed_ms, 2),
    )
