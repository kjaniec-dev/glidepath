"""Glidepath — interactive Monte Carlo retirement simulator (Streamlit).

A thin presentation layer over ``glidepath-core``: the sidebar collects
parameters, the core engine does the maths, and the shared ``glidepath.viz``
module draws the charts. Run with::

    uv run --package glidepath-sim streamlit run apps/sim/app.py
"""

from __future__ import annotations

import streamlit as st

from glidepath import (
    AssetAssumptions,
    Glidepath,
    InflationAssumptions,
    SimulationParams,
    simulate,
    summarize,
)
from glidepath import viz

st.set_page_config(page_title="Glidepath — retirement Monte Carlo", page_icon="📈", layout="wide")


@st.cache_data(show_spinner=False)
def run_simulation(payload: dict) -> dict:
    """Build params from primitives, simulate, and return picklable arrays.

    Cached on the primitive payload so dragging an unrelated slider doesn't
    trigger an avoidable re-run.
    """
    params = SimulationParams(
        start_age=payload["start_age"],
        retirement_age=payload["retirement_age"],
        end_age=payload["end_age"],
        initial_balance=payload["initial_balance"],
        annual_contribution=payload["annual_contribution"],
        contribution_real_growth=payload["contribution_real_growth"],
        annual_spending=payload["annual_spending"],
        other_retirement_income=payload["other_retirement_income"],
        assets=AssetAssumptions(
            equity_mean=payload["equity_mean"],
            equity_vol=payload["equity_vol"],
            bond_mean=payload["bond_mean"],
            bond_vol=payload["bond_vol"],
            correlation=payload["correlation"],
            fee=payload["fee"],
        ),
        inflation=InflationAssumptions(mean=payload["infl_mean"], vol=payload["infl_vol"]),
        glidepath=Glidepath(
            style=payload["gp_style"],
            start_equity=payload["start_equity"],
            end_equity=payload["end_equity"],
            rule_base=payload["rule_base"],
        ),
        n_paths=payload["n_paths"],
        seed=payload["seed"],
    )
    result = simulate(params)
    s = summarize(result)
    return {
        "result": result,
        "summary": s,
    }


def sidebar() -> dict:
    st.sidebar.title("Glidepath")
    st.sidebar.caption(
        "Generic Monte Carlo retirement projection. Wire it to your own ETF / IKZE "
        "numbers — no tax tooling, nothing account-specific baked in."
    )

    cur = st.sidebar.text_input("Currency symbol", value="zł ", max_chars=4)

    with st.sidebar.expander("Timeline & cashflows", expanded=True):
        start_age = st.slider("Current age", 18, 60, 30)
        retirement_age = st.slider("Retirement age", start_age + 1, 75, max(start_age + 1, 65))
        end_age = st.slider("Plan until age", retirement_age, 105, max(retirement_age, 95))
        initial_balance = st.number_input("Starting balance (today)", 0, 5_000_000, 50_000, step=5_000)
        annual_contribution = st.number_input(
            "Annual contribution (today)", 0, 500_000, 18_000, step=1_000
        )
        contribution_real_growth = st.slider(
            "Contribution real growth / yr", 0.0, 0.05, 0.01, 0.005, format="%.3f"
        )
        annual_spending = st.number_input(
            "Annual spending in retirement (today)", 0, 1_000_000, 40_000, step=1_000
        )
        other_retirement_income = st.number_input(
            "Other retirement income / yr (e.g. state pension, today)",
            0, 500_000, 12_000, step=1_000,
        )

    with st.sidebar.expander("Glidepath (allocation)", expanded=True):
        gp_style = st.selectbox("Style", ["linear", "age_rule", "constant"], index=0)
        start_equity = st.slider("Start equity %", 0, 100, 90) / 100.0
        end_equity = st.slider("End equity %", 0, 100, 40) / 100.0
        rule_base = st.slider("Age-rule base (equity = base − age)", 90, 130, 110)

    with st.sidebar.expander("Market assumptions (nominal)", expanded=False):
        equity_mean = st.slider("Equity return / yr", 0.0, 0.15, 0.07, 0.005, format="%.3f")
        equity_vol = st.slider("Equity volatility", 0.0, 0.35, 0.17, 0.01, format="%.2f")
        bond_mean = st.slider("Bond return / yr", 0.0, 0.10, 0.03, 0.005, format="%.3f")
        bond_vol = st.slider("Bond volatility", 0.0, 0.20, 0.06, 0.01, format="%.2f")
        correlation = st.slider("Equity/bond correlation", -1.0, 1.0, 0.10, 0.05)
        fee = st.slider("All-in annual fee (TER)", 0.0, 0.02, 0.003, 0.001, format="%.3f")

    with st.sidebar.expander("Inflation & simulation", expanded=False):
        infl_mean = st.slider("Inflation / yr", 0.0, 0.08, 0.025, 0.005, format="%.3f")
        infl_vol = st.slider("Inflation volatility", 0.0, 0.05, 0.01, 0.005, format="%.3f")
        n_paths = st.select_slider(
            "Monte Carlo paths", options=[1_000, 5_000, 10_000, 25_000, 50_000], value=10_000
        )
        seed = st.number_input("Random seed (blank-ish = 0 fixed)", 0, 10_000, 42)

    return {
        "currency": cur,
        "start_age": start_age,
        "retirement_age": retirement_age,
        "end_age": end_age,
        "initial_balance": initial_balance,
        "annual_contribution": annual_contribution,
        "contribution_real_growth": contribution_real_growth,
        "annual_spending": annual_spending,
        "other_retirement_income": other_retirement_income,
        "gp_style": gp_style,
        "start_equity": start_equity,
        "end_equity": end_equity,
        "rule_base": float(rule_base),
        "equity_mean": equity_mean,
        "equity_vol": equity_vol,
        "bond_mean": bond_mean,
        "bond_vol": bond_vol,
        "correlation": correlation,
        "fee": fee,
        "infl_mean": infl_mean,
        "infl_vol": infl_vol,
        "n_paths": int(n_paths),
        "seed": int(seed),
    }


def main() -> None:
    payload = sidebar()
    cur = payload["currency"]

    out = run_simulation({k: v for k, v in payload.items() if k != "currency"})
    result, s = out["result"], out["summary"]

    st.title("Retirement Monte Carlo")
    st.caption(
        "Thousands of randomized return / inflation paths through your glidepath. "
        "Bands show the spread; the median is the middle line. All values can be "
        "viewed in today's money (real) or nominal."
    )

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Money lasts", f"{s.success_probability * 100:.0f}%")
    c2.metric("Median end wealth (real)", f"{cur}{s.median_terminal_real:,.0f}")
    c3.metric("Pessimistic (P10, real)", f"{cur}{s.p10_terminal_real:,.0f}")
    c4.metric(
        "Median ruin age",
        "—" if s.median_depletion_age is None else f"{s.median_depletion_age:.0f}",
    )

    real = st.toggle("Show in today's money (real)", value=True)

    left, right = st.columns([2, 1])
    with left:
        st.plotly_chart(
            viz.fan_chart(result, real=real, currency=cur),
            use_container_width=True,
        )
    with right:
        st.plotly_chart(viz.success_gauge(result), use_container_width=True)

    left2, right2 = st.columns(2)
    with left2:
        st.plotly_chart(viz.glidepath_chart(result), use_container_width=True)
    with right2:
        st.plotly_chart(
            viz.terminal_histogram(result, real=real, currency=cur),
            use_container_width=True,
        )

    st.caption(
        "Educational model, not financial advice. Two-asset (equity/bonds) world, "
        "normal annual returns, stochastic inflation, ruin is absorbing."
    )


if __name__ == "__main__":
    main()
