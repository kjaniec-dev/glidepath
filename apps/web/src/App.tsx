import { useEffect, useMemo, useRef, useState } from "react";
import Controls from "./components/Controls";
import FanChart from "./components/FanChart";
import GlidepathChart from "./components/GlidepathChart";
import SuccessGauge from "./components/SuccessGauge";
import TerminalHistogram from "./components/TerminalHistogram";
import { simulate, fmtCurrency } from "./api";
import { DEFAULT_REQUEST, type SimulateRequest, type SimulateResponse } from "./types";

function clampTimeline(req: SimulateRequest): SimulateRequest {
  const retirement_age = Math.max(req.start_age + 1, Math.min(req.retirement_age, 75));
  const end_age = Math.max(retirement_age, Math.min(req.end_age, 105));
  return { ...req, retirement_age, end_age };
}

export default function App() {
  const [req, setReq] = useState<SimulateRequest>(DEFAULT_REQUEST);
  const [res, setRes] = useState<SimulateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [real, setReal] = useState(true);
  const [currency, setCurrency] = useState("zł ");
  const reqId = useRef(0);

  const onChange = (patch: Partial<SimulateRequest>) =>
    setReq((prev) => clampTimeline({ ...prev, ...patch }));

  useEffect(() => {
    const id = ++reqId.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await simulate(req, controller.signal);
        if (id === reqId.current) {
          setRes(data);
          setError(null);
        }
      } catch (e) {
        if (id === reqId.current && !(e instanceof DOMException && e.name === "AbortError")) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [req]);

  const bands = useMemo(() => (res ? (real ? res.real : res.nominal) : null), [res, real]);

  return (
    <div className="layout">
      <Controls req={req} onChange={onChange} />

      <main className="main">
        <div className="header">
          <h2>Retirement Monte Carlo</h2>
          <p>
            Thousands of randomized return &amp; inflation paths through your glidepath. The bands
            show the spread of outcomes; the middle line is the median. Everything is computed by a
            stateless Python <code>POST /simulate</code> — the front never re-implements the maths.
          </p>
        </div>

        <div className="toolbar">
          <label className="toggle">
            <input type="checkbox" checked={real} onChange={(e) => setReal(e.target.checked)} />
            Show in today&apos;s money (real)
          </label>
          <label className="toggle">
            Currency
            <input
              type="text"
              value={currency}
              maxLength={4}
              style={{ width: 56, padding: "4px 6px" }}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </label>
          {res && (
            <span className="runinfo">
              {res.n_paths.toLocaleString("en-US")} paths · {res.elapsed_ms} ms
              {loading ? " · updating…" : ""}
            </span>
          )}
        </div>

        {error && <div className="banner">API error: {error}. Is the FastAPI service running?</div>}

        {res && bands && (
          <>
            <div className="metrics">
              <div className="metric">
                <div className="k">Money lasts</div>
                <div className="v">{Math.round(res.summary.success_probability * 100)}%</div>
              </div>
              <div className="metric">
                <div className="k">Median end wealth (real)</div>
                <div className="v">{fmtCurrency(res.summary.median_terminal_real, currency)}</div>
              </div>
              <div className="metric">
                <div className="k">Pessimistic (P10, real)</div>
                <div className="v">{fmtCurrency(res.summary.p10_terminal_real, currency)}</div>
              </div>
              <div className="metric">
                <div className="k">Median ruin age</div>
                <div className="v">
                  {res.summary.median_depletion_age === null
                    ? "—"
                    : Math.round(res.summary.median_depletion_age)}
                </div>
              </div>
            </div>

            <div className="grid">
              <div className="card">
                <h3>Portfolio value — {real ? "real (today's money)" : "nominal"}</h3>
                <p className="sub">Median with P25–P75 and P10–P90 bands</p>
                <FanChart
                  ages={res.ages}
                  bands={bands}
                  retirementAge={res.retirement_age}
                  currency={currency}
                />
              </div>
              <div className="card">
                <h3>Probability money lasts</h3>
                <p className="sub">Share of paths solvent through retirement</p>
                <SuccessGauge probability={res.summary.success_probability} />
              </div>
              <div className="card">
                <h3>Glidepath — allocation over time</h3>
                <p className="sub">Equity share gliding toward bonds</p>
                <GlidepathChart
                  ages={res.ages}
                  equityWeights={res.equity_weights}
                  retirementAge={res.retirement_age}
                />
              </div>
              <div className="card">
                <h3>Terminal wealth — real</h3>
                <p className="sub">Distribution of end-of-horizon balances</p>
                <TerminalHistogram
                  hist={res.terminal_real_hist}
                  medianReal={res.summary.median_terminal_real}
                  currency={currency}
                />
              </div>
            </div>
          </>
        )}

        {!res && !error && <p style={{ color: "#64748b" }}>Running first simulation…</p>}

        <p className="footnote">
          Educational model, not financial advice. Two-asset (equity/bonds) world, normal annual
          returns, stochastic inflation, ruin is absorbing.
        </p>
      </main>
    </div>
  );
}
