"""Summary statistics over simulated paths: fan bands, success, terminal wealth."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .models import SimulationResult

DEFAULT_PERCENTILES: tuple[int, ...] = (10, 25, 50, 75, 90)


def percentile_bands(
    balances: np.ndarray,
    percentiles: tuple[int, ...] = DEFAULT_PERCENTILES,
) -> dict[int, np.ndarray]:
    """Map each percentile to its per-year balance curve (for fan charts)."""
    pct = np.percentile(balances, percentiles, axis=0)
    return {p: pct[i] for i, p in enumerate(percentiles)}


def success_probability(result: SimulationResult) -> float:
    """Fraction of paths that never run out of money before ``end_age``.

    A path "succeeds" if its real balance stays strictly positive across the
    whole retirement window (the demanding definition: surviving sequence risk,
    not just being solvent on the final day).
    """
    r = result.retirement_index
    retirement_balances = result.balances_real[:, r:]
    survived = np.all(retirement_balances > 0.0, axis=1)
    return float(np.mean(survived))


def depletion_ages(result: SimulationResult) -> np.ndarray:
    """For each path, the age at which money first hit zero (NaN if it never did)."""
    depleted = result.balances_real <= 0.0
    ages = result.ages
    out = np.full(result.balances_real.shape[0], np.nan)
    any_dep = depleted.any(axis=1)
    first_idx = depleted.argmax(axis=1)
    out[any_dep] = ages[first_idx[any_dep]]
    return out


def terminal_wealth(result: SimulationResult, real: bool = True) -> np.ndarray:
    """Distribution of end-of-horizon balances across paths."""
    balances = result.balances_real if real else result.balances_nominal
    return balances[:, -1]


@dataclass(slots=True)
class Summary:
    success_probability: float
    median_terminal_real: float
    p10_terminal_real: float
    p90_terminal_real: float
    median_depletion_age: float | None


def summarize(result: SimulationResult) -> Summary:
    """Compact headline metrics for a projection."""
    term = terminal_wealth(result, real=True)
    dep = depletion_ages(result)
    dep_valid = dep[~np.isnan(dep)]
    return Summary(
        success_probability=success_probability(result),
        median_terminal_real=float(np.median(term)),
        p10_terminal_real=float(np.percentile(term, 10)),
        p90_terminal_real=float(np.percentile(term, 90)),
        median_depletion_age=float(np.median(dep_valid)) if dep_valid.size else None,
    )
