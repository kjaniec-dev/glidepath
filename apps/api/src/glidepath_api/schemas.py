"""Request/response models for the simulate endpoint.

These mirror the core ``SimulationParams`` as flat primitives so the React
client can post a simple JSON body. ``SimulateRequest.to_params`` is the single
mapping point into the core; core validation errors surface as HTTP 422.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from glidepath import (
    AssetAssumptions,
    Glidepath,
    InflationAssumptions,
    SimulationParams,
)

# Cap paths so a single request can't tie up the worker; the maths is cheap but
# JSON ser. of huge inputs is pointless — 50k paths is already overkill here.
MAX_PATHS = 50_000


class SimulateRequest(BaseModel):
    start_age: int = Field(30, ge=0, le=100)
    retirement_age: int = Field(65, ge=1, le=110)
    end_age: int = Field(95, ge=2, le=120)

    initial_balance: float = Field(50_000, ge=0)
    annual_contribution: float = Field(18_000, ge=0)
    contribution_real_growth: float = Field(0.01, ge=-0.1, le=0.1)
    annual_spending: float = Field(40_000, ge=0)
    other_retirement_income: float = Field(12_000, ge=0)

    equity_mean: float = Field(0.07, ge=-0.5, le=0.5)
    equity_vol: float = Field(0.17, ge=0.0, le=1.0)
    bond_mean: float = Field(0.03, ge=-0.5, le=0.5)
    bond_vol: float = Field(0.06, ge=0.0, le=1.0)
    correlation: float = Field(0.10, ge=-1.0, le=1.0)
    fee: float = Field(0.003, ge=0.0, le=0.1)

    infl_mean: float = Field(0.025, ge=-0.1, le=0.5)
    infl_vol: float = Field(0.01, ge=0.0, le=0.5)

    glidepath_style: Literal["linear", "age_rule", "constant"] = "linear"
    start_equity: float = Field(0.90, ge=0.0, le=1.0)
    end_equity: float = Field(0.40, ge=0.0, le=1.0)
    rule_base: float = Field(110.0, ge=80.0, le=140.0)

    n_paths: int = Field(10_000, ge=1, le=MAX_PATHS)
    seed: int | None = Field(42, ge=0)

    def to_params(self) -> SimulationParams:
        return SimulationParams(
            start_age=self.start_age,
            retirement_age=self.retirement_age,
            end_age=self.end_age,
            initial_balance=self.initial_balance,
            annual_contribution=self.annual_contribution,
            contribution_real_growth=self.contribution_real_growth,
            annual_spending=self.annual_spending,
            other_retirement_income=self.other_retirement_income,
            assets=AssetAssumptions(
                equity_mean=self.equity_mean,
                equity_vol=self.equity_vol,
                bond_mean=self.bond_mean,
                bond_vol=self.bond_vol,
                correlation=self.correlation,
                fee=self.fee,
            ),
            inflation=InflationAssumptions(mean=self.infl_mean, vol=self.infl_vol),
            glidepath=Glidepath(
                style=self.glidepath_style,
                start_equity=self.start_equity,
                end_equity=self.end_equity,
                rule_base=self.rule_base,
            ),
            n_paths=self.n_paths,
            seed=self.seed,
        )


class Bands(BaseModel):
    """Per-year percentile curves aligned with ``ages``."""

    p10: list[float]
    p25: list[float]
    p50: list[float]
    p75: list[float]
    p90: list[float]


class Summary(BaseModel):
    success_probability: float
    median_terminal_real: float
    p10_terminal_real: float
    p90_terminal_real: float
    median_depletion_age: float | None


class Histogram(BaseModel):
    bin_edges: list[float]
    counts: list[int]


class SimulateResponse(BaseModel):
    ages: list[int]
    equity_weights: list[float]
    retirement_age: int
    real: Bands
    nominal: Bands
    summary: Summary
    terminal_real_hist: Histogram
    n_paths: int
    elapsed_ms: float
