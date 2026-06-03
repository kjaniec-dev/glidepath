"""glidepath — a small, reusable Monte Carlo retirement-projection engine.

Public API::

    from glidepath import simulate, SimulationParams
    result = simulate(SimulationParams(start_age=30, retirement_age=65))
    print(summarize(result))
"""

from __future__ import annotations

from .engine import simulate
from .models import (
    AssetAssumptions,
    Glidepath,
    InflationAssumptions,
    SimulationParams,
    SimulationResult,
)
from .stats import (
    DEFAULT_PERCENTILES,
    Summary,
    depletion_ages,
    percentile_bands,
    success_probability,
    summarize,
    terminal_wealth,
)

__version__ = "0.1.0"

__all__ = [
    "simulate",
    "SimulationParams",
    "SimulationResult",
    "AssetAssumptions",
    "InflationAssumptions",
    "Glidepath",
    "DEFAULT_PERCENTILES",
    "Summary",
    "percentile_bands",
    "success_probability",
    "depletion_ages",
    "terminal_wealth",
    "summarize",
]
