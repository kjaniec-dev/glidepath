"""Tests for the glidepath allocation schedules."""

from __future__ import annotations

import numpy as np
import pytest

from glidepath import Glidepath


def test_linear_glides_down():
    gp = Glidepath(style="linear", start_equity=0.9, end_equity=0.4)
    w = gp.resolve(30, 95)
    assert w[0] == pytest.approx(0.9)
    assert w[-1] == pytest.approx(0.4)
    assert np.all(np.diff(w) <= 1e-12)  # monotonically non-increasing


def test_constant_is_flat():
    w = Glidepath(style="constant", start_equity=0.6).resolve(30, 95)
    assert np.allclose(w, 0.6)


def test_age_rule_clamped():
    gp = Glidepath(style="age_rule", rule_base=110, min_equity=0.2, max_equity=1.0)
    w = gp.resolve(30, 95)
    assert w.max() <= 1.0 and w.min() >= 0.2
    # At age 30 the raw rule is (110-30)/100 = 0.8.
    assert w[0] == pytest.approx(0.8)


def test_custom_length_validation():
    with pytest.raises(ValueError):
        Glidepath(style="custom", custom_weights=(0.5, 0.4)).resolve(30, 95)


def test_custom_weights_used():
    weights = tuple(np.linspace(0.8, 0.3, 66))
    w = Glidepath(style="custom", custom_weights=weights).resolve(30, 95)
    assert w.shape == (66,)
    assert w[0] == pytest.approx(0.8)
