"""Tests for the core Monte Carlo engine: shapes, determinism, and sanity."""

from __future__ import annotations

import numpy as np
import pytest

from glidepath import (
    AssetAssumptions,
    Glidepath,
    InflationAssumptions,
    SimulationParams,
    simulate,
    summarize,
)


def test_shapes_and_alignment():
    params = SimulationParams(start_age=30, retirement_age=65, end_age=95, n_paths=500)
    res = simulate(params)
    n, cols = res.balances_nominal.shape
    assert n == 500
    assert cols == params.years + 1
    assert res.ages.shape == (cols,)
    assert res.equity_weights.shape == (cols,)
    assert res.ages[0] == 30 and res.ages[-1] == 95
    assert res.balances_real.shape == res.balances_nominal.shape


def test_determinism_with_seed():
    params = SimulationParams(seed=123, n_paths=300)
    a = simulate(params).balances_real
    b = simulate(params).balances_real
    np.testing.assert_array_equal(a, b)


def test_different_seeds_differ():
    a = simulate(SimulationParams(seed=1, n_paths=300)).balances_real
    b = simulate(SimulationParams(seed=2, n_paths=300)).balances_real
    assert not np.array_equal(a, b)


def test_initial_balance_respected():
    params = SimulationParams(initial_balance=12_345.0, n_paths=10)
    res = simulate(params)
    assert np.all(res.balances_nominal[:, 0] == 12_345.0)


def test_no_volatility_is_deterministic_growth():
    """Zero vol + zero inflation + constant allocation => identical paths."""
    params = SimulationParams(
        n_paths=50,
        initial_balance=10_000.0,
        annual_contribution=0.0,
        annual_spending=0.0,
        other_retirement_income=0.0,
        contribution_real_growth=0.0,
        assets=AssetAssumptions(equity_mean=0.05, equity_vol=0.0, bond_vol=0.0, fee=0.0),
        inflation=InflationAssumptions(mean=0.0, vol=0.0),
        glidepath=Glidepath(style="constant", start_equity=1.0),
    )
    res = simulate(params)
    # All paths equal, and growth is exactly compound 5%.
    assert np.allclose(res.balances_nominal, res.balances_nominal[0])
    expected_final = 10_000.0 * (1.05**params.years)
    assert res.balances_nominal[0, -1] == pytest.approx(expected_final, rel=1e-9)


def test_ruin_is_absorbing():
    """Heavy spending with tiny pot should deplete and stay at zero."""
    params = SimulationParams(
        start_age=64,
        retirement_age=65,
        end_age=95,
        initial_balance=1_000.0,
        annual_contribution=0.0,
        annual_spending=50_000.0,
        other_retirement_income=0.0,
        n_paths=100,
    )
    res = simulate(params)
    # Once a path is zero, every later column must remain zero.
    bal = res.balances_nominal
    for path in bal:
        zero_idx = np.argmax(path <= 0.0) if np.any(path <= 0.0) else None
        if zero_idx is not None:
            assert np.all(path[zero_idx:] == 0.0)
    assert summarize(res).success_probability < 0.5


def test_summary_fields_present():
    res = simulate(SimulationParams(n_paths=400))
    s = summarize(res)
    assert 0.0 <= s.success_probability <= 1.0
    assert s.median_terminal_real >= 0.0
    assert s.p10_terminal_real <= s.p90_terminal_real
