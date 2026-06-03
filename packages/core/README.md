# glidepath-core

Framework-agnostic Monte Carlo retirement-projection engine (pure `numpy`).

It is the single source of truth for the simulation logic, reused 1:1 by the
Streamlit app (`apps/sim`) and — later — by a FastAPI service and a CLI
rebalancer. No web, UI, or tax dependencies live here, which keeps it safe to
open-source.

## What it models

- **Two-asset world** (equity / bonds) with correlated nominal returns.
- **Glidepath** — the equity weight that *glides* down over the lifecycle
  (linear, `age_rule`, constant, or fully custom).
- **Stochastic inflation** that inflates contributions/spending and deflates
  results back to today's money.
- **Accumulation** (contributions, optional real growth) and **decumulation**
  (spending offset by other income such as a state pension).
- **Sequence-of-returns risk** — it falls out naturally from path simulation;
  ruin is absorbing (a path that hits zero stays at zero).

All money inputs are in *today's money*. Results expose both nominal and real
(`balances_real`) path arrays of shape `(n_paths, years + 1)`.

## Usage

```python
from glidepath import simulate, summarize, percentile_bands, SimulationParams

result = simulate(SimulationParams(start_age=30, retirement_age=65, end_age=95))

print(summarize(result))               # headline metrics
bands = percentile_bands(result.balances_real)  # {10: curve, 25: curve, ...}
```

See the package docstrings in `src/glidepath/` for the full parameter set.
