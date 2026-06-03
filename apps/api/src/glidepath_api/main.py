"""Glidepath FastAPI service — a single stateless ``POST /simulate`` endpoint.

The app holds no state and no database: params in, percentile arrays out. All
the maths lives in ``glidepath-core``; this module just adapts it to HTTP/JSON.
"""

from __future__ import annotations

import time

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from glidepath import percentile_bands, simulate, summarize, terminal_wealth

from .schemas import Bands, Histogram, SimulateRequest, SimulateResponse, Summary

app = FastAPI(
    title="Glidepath API",
    version="0.1.0",
    summary="Stateless Monte Carlo retirement projection.",
)

# Permissive CORS: this is a public, read-only demo endpoint (no cookies/auth),
# consumed by the React client in dev (localhost) and on Netlify.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
