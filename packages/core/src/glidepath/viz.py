"""Plotly charts for a :class:`SimulationResult`.

Optional module — requires the ``viz`` extra (``pip install glidepath-core[viz]``).
Shared by the Streamlit app and the demo notebook so the "look" is defined once.

Each function returns a ``plotly.graph_objects.Figure`` you can ``.show()``,
embed in a notebook, or hand to ``st.plotly_chart``.
"""

from __future__ import annotations

import numpy as np

try:
    import plotly.graph_objects as go
except ModuleNotFoundError as exc:  # pragma: no cover - import-guard
    raise ModuleNotFoundError(
        "glidepath.viz requires plotly. Install with: pip install 'glidepath-core[viz]'"
    ) from exc

from .models import SimulationResult
from .stats import percentile_bands, summarize, terminal_wealth

# A calm, modern palette: teal accent on neutral grays.
_ACCENT = "#0f766e"
_ACCENT_FILL = "rgba(15, 118, 110, {a})"
_MUTED = "#94a3b8"
_GRID = "rgba(148, 163, 184, 0.22)"


def _layout(fig: go.Figure, title: str, height: int = 460) -> go.Figure:
    fig.update_layout(
        title=dict(text=title, x=0.01, xanchor="left", font=dict(size=18)),
        template="plotly_white",
        height=height,
        margin=dict(l=60, r=24, t=56, b=48),
        hovermode="x unified",
        font=dict(family="Inter, system-ui, sans-serif", size=13),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, x=0),
    )
    fig.update_xaxes(gridcolor=_GRID, zeroline=False)
    fig.update_yaxes(gridcolor=_GRID, zeroline=False)
    return fig


def _money_axis(fig: go.Figure, currency: str) -> go.Figure:
    fig.update_yaxes(tickprefix=currency, tickformat=",.0f")
    return fig


def fan_chart(
    result: SimulationResult,
    real: bool = True,
    currency: str = "",
) -> go.Figure:
    """Percentile fan: nested P10–P90 / P25–P75 bands around the median."""
    balances = result.balances_real if real else result.balances_nominal
    ages = result.ages
    bands = percentile_bands(balances, (10, 25, 50, 75, 90))

    fig = go.Figure()

    def _band(lo: int, hi: int, alpha: float, name: str) -> None:
        fig.add_trace(
            go.Scatter(
                x=np.r_[ages, ages[::-1]],
                y=np.r_[bands[hi], bands[lo][::-1]],
                fill="toself",
                fillcolor=_ACCENT_FILL.format(a=alpha),
                line=dict(color="rgba(0,0,0,0)"),
                hoverinfo="skip",
                name=name,
            )
        )

    _band(10, 90, 0.12, "P10–P90")
    _band(25, 75, 0.22, "P25–P75")

    fig.add_trace(
        go.Scatter(
            x=ages,
            y=bands[50],
            line=dict(color=_ACCENT, width=3),
            name="Median",
        )
    )

    # Retirement marker.
    fig.add_vline(
        x=result.params.retirement_age,
        line=dict(color=_MUTED, width=1.5, dash="dot"),
        annotation_text="retirement",
        annotation_position="top",
    )

    label = "real (today's money)" if real else "nominal"
    _layout(fig, f"Portfolio value — {label}")
    _money_axis(fig, currency)
    fig.update_xaxes(title_text="Age")
    fig.update_yaxes(title_text="Balance")
    return fig


def success_gauge(result: SimulationResult) -> go.Figure:
    """Gauge of the probability the money lasts through retirement."""
    prob = summarize(result).success_probability * 100.0
    color = _ACCENT if prob >= 85 else ("#d97706" if prob >= 65 else "#dc2626")
    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=prob,
            number=dict(suffix="%", font=dict(size=40)),
            gauge=dict(
                axis=dict(range=[0, 100], tickwidth=1, tickcolor=_MUTED),
                bar=dict(color=color, thickness=0.32),
                bgcolor="white",
                borderwidth=0,
                steps=[
                    dict(range=[0, 65], color="rgba(220,38,38,0.10)"),
                    dict(range=[65, 85], color="rgba(217,119,6,0.10)"),
                    dict(range=[85, 100], color="rgba(15,118,110,0.10)"),
                ],
            ),
        )
    )
    _layout(fig, "Probability money lasts", height=300)
    return fig


def terminal_histogram(
    result: SimulationResult,
    real: bool = True,
    currency: str = "",
) -> go.Figure:
    """Distribution of end-of-horizon wealth across paths."""
    term = terminal_wealth(result, real=real)
    fig = go.Figure(
        go.Histogram(
            x=term,
            nbinsx=60,
            marker=dict(color=_ACCENT_FILL.format(a=0.55), line=dict(width=0)),
            name="terminal wealth",
        )
    )
    median = float(np.median(term))
    fig.add_vline(
        x=median,
        line=dict(color=_ACCENT, width=2),
        annotation_text=f"median {currency}{median:,.0f}",
        annotation_position="top right",
    )
    label = "real" if real else "nominal"
    _layout(fig, f"Terminal wealth distribution — {label}", height=360)
    fig.update_xaxes(title_text="Balance at end age", tickprefix=currency, tickformat=",.0f")
    fig.update_yaxes(title_text="Paths")
    return fig


def glidepath_chart(result: SimulationResult) -> go.Figure:
    """The equity/bond allocation glide over the lifecycle."""
    ages = result.ages
    eq = result.equity_weights * 100.0
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=ages, y=eq, name="Equity %",
            line=dict(color=_ACCENT, width=3),
            fill="tozeroy", fillcolor=_ACCENT_FILL.format(a=0.10),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=ages, y=100.0 - eq, name="Bonds %",
            line=dict(color=_MUTED, width=2, dash="dot"),
        )
    )
    fig.add_vline(
        x=result.params.retirement_age,
        line=dict(color=_MUTED, width=1.5, dash="dot"),
        annotation_text="retirement",
        annotation_position="top",
    )
    _layout(fig, "Glidepath — allocation over time", height=340)
    fig.update_xaxes(title_text="Age")
    fig.update_yaxes(title_text="Allocation", ticksuffix="%", range=[0, 100])
    return fig
