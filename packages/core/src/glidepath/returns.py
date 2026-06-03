"""Random return / inflation generation.

Kept separate from the engine so alternative generators (e.g. block bootstrap
from historical data) can be slotted in later without touching the path loop.
"""

from __future__ import annotations

import numpy as np

from .models import AssetAssumptions, InflationAssumptions


def draw_asset_returns(
    assets: AssetAssumptions,
    n_paths: int,
    years: int,
    rng: np.random.Generator,
) -> tuple[np.ndarray, np.ndarray]:
    """Draw correlated nominal equity & bond returns.

    Returns two arrays of shape ``(n_paths, years)``. Equity and bonds are
    drawn from a bivariate normal with the given means, vols and correlation
    (Cholesky factorisation of the covariance matrix).
    """
    means = np.array([assets.equity_mean, assets.bond_mean])
    cov = np.array(
        [
            [assets.equity_vol**2, assets.correlation * assets.equity_vol * assets.bond_vol],
            [assets.correlation * assets.equity_vol * assets.bond_vol, assets.bond_vol**2],
        ]
    )
    # (n_paths, years, 2). "svd" tolerates degenerate (e.g. zero-vol) covariances
    # that would make Cholesky fail; the perf difference is irrelevant at this scale.
    draws = rng.multivariate_normal(means, cov, size=(n_paths, years), method="svd")
    equity = draws[..., 0]
    bonds = draws[..., 1]
    return equity, bonds


def draw_inflation(
    inflation: InflationAssumptions,
    n_paths: int,
    years: int,
    rng: np.random.Generator,
) -> np.ndarray:
    """Draw annual inflation rates, shape ``(n_paths, years)``.

    Floored at -100% so the cumulative price index can never go non-positive.
    """
    infl = rng.normal(inflation.mean, inflation.vol, size=(n_paths, years))
    return np.maximum(infl, -0.999)
