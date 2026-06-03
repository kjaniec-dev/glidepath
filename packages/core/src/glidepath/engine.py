"""The Monte Carlo projection engine.

Vectorised over paths; loops only over the (few dozen) years. A 10k-path,
65-year run is tens of milliseconds — Python here is for clean, reusable code,
not raw speed.

Convention: cashflows happen at the *start* of each year, then the (post-fee)
market return is applied to the resulting balance::

    balance_next = max(balance + cashflow, 0) * (1 + portfolio_return - fee)

A path that hits zero stays at zero (ruin is absorbing).
"""

from __future__ import annotations

import numpy as np

from .models import SimulationParams, SimulationResult
from .returns import draw_asset_returns, draw_inflation


def _real_cashflows(params: SimulationParams) -> np.ndarray:
    """Per-year cashflow in *today's money* (positive adds, negative withdraws)."""
    years = params.years
    ages = params.start_age + np.arange(years)
    accumulating = ages < params.retirement_age

    contributions = params.annual_contribution * (
        (1.0 + params.contribution_real_growth) ** np.arange(years)
    )
    # During retirement: other income offsets spending; net is usually a withdrawal.
    net_retirement = params.other_retirement_income - params.annual_spending

    return np.where(accumulating, contributions, net_retirement)


def simulate(params: SimulationParams) -> SimulationResult:
    """Run a Monte Carlo retirement projection and return full path arrays."""
    rng = np.random.default_rng(params.seed)
    n, years = params.n_paths, params.years

    equity, bonds = draw_asset_returns(params.assets, n, years, rng)
    inflation = draw_inflation(params.inflation, n, years, rng)

    # Price index at each age boundary (start of year): index[:, 0] == 1.
    price_index = np.ones((n, years + 1))
    np.cumprod(1.0 + inflation, axis=1, out=price_index[:, 1:])

    equity_weights = params.glidepath.resolve(params.start_age, params.end_age)

    real_cf = _real_cashflows(params)  # (years,)
    nominal_cf = real_cf[None, :] * price_index[:, :years]

    balances = np.empty((n, years + 1))
    balances[:, 0] = params.initial_balance
    fee = params.assets.fee

    for t in range(years):
        w = equity_weights[t]
        port_return = w * equity[:, t] + (1.0 - w) * bonds[:, t] - fee
        growth = np.maximum(1.0 + port_return, 0.0)
        after_cf = np.maximum(balances[:, t] + nominal_cf[:, t], 0.0)
        balances[:, t + 1] = after_cf * growth

    balances_real = balances / price_index

    return SimulationResult(
        ages=np.arange(params.start_age, params.end_age + 1),
        equity_weights=equity_weights,
        balances_nominal=balances,
        balances_real=balances_real,
        params=params,
    )
