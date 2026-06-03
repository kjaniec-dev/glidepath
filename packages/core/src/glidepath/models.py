"""Parameter and result models for the Monte Carlo retirement engine.

Everything here is plain ``dataclasses`` so the core stays free of web/UI
dependencies and can be reused 1:1 by a CLI, a Streamlit app, or a FastAPI
service. All monetary inputs are expressed in *today's money* (real terms);
the engine inflates them internally and reports both nominal and real paths.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Literal

import numpy as np

GlidepathStyle = Literal["linear", "age_rule", "constant", "custom"]


@dataclass(frozen=True, slots=True)
class AssetAssumptions:
    """Capital-market assumptions for a simple two-asset (equity/bonds) world.

    Returns are *nominal arithmetic* annual returns. Defaults are deliberately
    generic, long-run-ish numbers — not advice, just a sane starting point.
    """

    equity_mean: float = 0.07
    equity_vol: float = 0.17
    bond_mean: float = 0.03
    bond_vol: float = 0.06
    # Equity/bond correlation. Mild positive is a reasonable generic default.
    correlation: float = 0.10
    # Annual all-in cost drag (TER + platform), subtracted from portfolio return.
    fee: float = 0.003

    def __post_init__(self) -> None:
        if not -1.0 <= self.correlation <= 1.0:
            raise ValueError("correlation must be in [-1, 1]")
        for name in ("equity_vol", "bond_vol", "fee"):
            if getattr(self, name) < 0:
                raise ValueError(f"{name} must be non-negative")


@dataclass(frozen=True, slots=True)
class InflationAssumptions:
    """Stochastic CPI assumptions used to inflate cashflows and deflate paths."""

    mean: float = 0.025
    vol: float = 0.01

    def __post_init__(self) -> None:
        if self.vol < 0:
            raise ValueError("inflation vol must be non-negative")


@dataclass(frozen=True, slots=True)
class Glidepath:
    """Equity-weight schedule over the lifecycle (bonds = 1 - equity).

    The name of the whole project: how the equity share *glides* down as the
    saver approaches and enters retirement. ``resolve`` turns the chosen style
    into a per-year equity-weight array.
    """

    style: GlidepathStyle = "linear"
    start_equity: float = 0.90
    end_equity: float = 0.40
    # For the "age_rule" style: equity = (rule_base - age), clamped to bounds.
    rule_base: float = 110.0
    min_equity: float = 0.20
    max_equity: float = 1.0
    # For the "custom" style: explicit per-year weights (len must match years+1).
    custom_weights: tuple[float, ...] | None = None

    def resolve(self, start_age: int, end_age: int) -> np.ndarray:
        """Return equity weights for each age boundary from start to end inclusive."""
        ages = np.arange(start_age, end_age + 1)
        n = ages.size

        if self.style == "constant":
            weights = np.full(n, self.start_equity, dtype=float)
        elif self.style == "linear":
            weights = np.linspace(self.start_equity, self.end_equity, n)
        elif self.style == "age_rule":
            weights = (self.rule_base - ages) / 100.0
        elif self.style == "custom":
            if self.custom_weights is None or len(self.custom_weights) != n:
                raise ValueError(
                    f"custom_weights must have length {n} (got "
                    f"{None if self.custom_weights is None else len(self.custom_weights)})"
                )
            weights = np.asarray(self.custom_weights, dtype=float)
        else:  # pragma: no cover - guarded by Literal typing
            raise ValueError(f"unknown glidepath style: {self.style}")

        return np.clip(weights, self.min_equity, self.max_equity)


@dataclass(frozen=True, slots=True)
class SimulationParams:
    """Full specification of one Monte Carlo retirement projection.

    Ages drive the timeline. Money is in today's terms. Accumulation runs from
    ``start_age`` until ``retirement_age``; decumulation from ``retirement_age``
    until ``end_age``.
    """

    start_age: int = 30
    retirement_age: int = 65
    end_age: int = 95

    initial_balance: float = 50_000.0
    # Yearly contribution during accumulation, in today's money.
    annual_contribution: float = 18_000.0
    # Real growth of contributions on top of inflation (e.g. raises). 0 = tracks CPI.
    contribution_real_growth: float = 0.01
    # Yearly spending withdrawn during retirement, in today's money.
    annual_spending: float = 40_000.0
    # Flat yearly income offsetting spending in retirement (e.g. state pension), today's money.
    other_retirement_income: float = 12_000.0

    assets: AssetAssumptions = field(default_factory=AssetAssumptions)
    inflation: InflationAssumptions = field(default_factory=InflationAssumptions)
    glidepath: Glidepath = field(default_factory=Glidepath)

    n_paths: int = 10_000
    seed: int | None = 42

    def __post_init__(self) -> None:
        if not self.start_age < self.retirement_age <= self.end_age:
            raise ValueError("require start_age < retirement_age <= end_age")
        if self.n_paths < 1:
            raise ValueError("n_paths must be >= 1")
        if self.initial_balance < 0:
            raise ValueError("initial_balance must be non-negative")

    @property
    def years(self) -> int:
        """Number of simulated years (timeline has ``years + 1`` age boundaries)."""
        return self.end_age - self.start_age

    def with_(self, **changes) -> "SimulationParams":
        """Return a copy with the given top-level fields replaced."""
        return replace(self, **changes)


@dataclass(slots=True)
class SimulationResult:
    """Output of a projection: full path arrays plus convenience summaries.

    ``balances_*`` have shape ``(n_paths, years + 1)`` and are aligned with
    ``ages``. Real balances are expressed in today's money.
    """

    ages: np.ndarray
    equity_weights: np.ndarray  # (years + 1,)
    balances_nominal: np.ndarray  # (n_paths, years + 1)
    balances_real: np.ndarray  # (n_paths, years + 1)
    params: SimulationParams

    @property
    def retirement_index(self) -> int:
        return self.params.retirement_age - self.params.start_age
