import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, MetricCard, Switch, Drawer, Button, Skeleton, Spinner } from "@kjaniec-dev/ui";
import Controls from "./components/Controls";
import FanChart from "./components/FanChart";
import GlidepathChart from "./components/GlidepathChart";
import SuccessGauge from "./components/SuccessGauge";
import TerminalHistogram from "./components/TerminalHistogram";
import { simulate, fmtCurrency } from "./api";
import { DEFAULT_REQUEST, type SimulateRequest, type SimulateResponse } from "./types";
import { PRESET_MAP } from "./presets";
import { useTheme } from "./hooks/useTheme";

function clampTimeline(req: SimulateRequest): SimulateRequest {
  const retirement_age = Math.max(req.start_age + 1, Math.min(req.retirement_age, 75));
  const end_age = Math.max(retirement_age, Math.min(req.end_age, 105));
  return { ...req, retirement_age, end_age };
}

function deltaTrend(main: number, compare: number): "up" | "down" | undefined {
  if (Math.abs(main - compare) < 1e-9) return undefined;
  return main > compare ? "up" : "down";
}

function pctDelta(main: number, compare: number): string {
  const diff = Math.round((main - compare) * 100);
  return diff > 0 ? `+${diff}pp` : `${diff}pp`;
}

function ageDelta(main: number | null, compare: number | null): string | undefined {
  if (main === null || compare === null) return undefined;
  const diff = Math.round(main - compare);
  return diff > 0 ? `+${diff} yr` : `${diff} yr`;
}

export default function App() {
  const [req, setReq] = useState<SimulateRequest>(DEFAULT_REQUEST);
  const [res, setRes] = useState<SimulateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [compareLabel, setCompareLabel] = useState<string | null>(null);
  const [compareRes, setCompareRes] = useState<SimulateResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const [controlsOpen, setControlsOpen] = useState(false);

  const [real, setReal] = useState(true);
  const [currency, setCurrency] = useState("zł ");
  const reqId = useRef(0);
  const compareReqId = useRef(0);
  const { theme, toggle: toggleTheme } = useTheme();

  const onChange = (patch: Partial<SimulateRequest>) =>
    setReq((prev) => clampTimeline({ ...prev, ...patch }));

  const onLoadPreset = (presetReq: SimulateRequest) =>
    setReq(clampTimeline(presetReq));

  // Main scenario fetch (debounced)
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

  // Compare scenario fetch (fires immediately when preset label changes)
  useEffect(() => {
    if (!compareLabel) {
      setCompareRes(null);
      return;
    }
    const preset = PRESET_MAP.get(compareLabel);
    if (!preset) return;

    const id = ++compareReqId.current;
    const controller = new AbortController();
    setCompareLoading(true);
    (async () => {
      try {
        const data = await simulate(preset.req, controller.signal);
        if (id === compareReqId.current) setCompareRes(data);
      } catch {
        // ignore aborts / errors silently for compare
      } finally {
        if (id === compareReqId.current) setCompareLoading(false);
      }
    })();
    return () => controller.abort();
  }, [compareLabel]);

  const bands = useMemo(() => (res ? (real ? res.real : res.nominal) : null), [res, real]);
  const compareBands = useMemo(
    () => (compareRes ? (real ? compareRes.real : compareRes.nominal) : null),
    [compareRes, real],
  );

  const mainPct = res ? Math.round(res.summary.success_probability * 100) : null;
  const comparePct = compareRes ? Math.round(compareRes.summary.success_probability * 100) : null;

  return (
    <div className="layout">
      {loading && <div className="loading-bar" />}

      <Drawer
        open={controlsOpen}
        onClose={() => setControlsOpen(false)}
        title="Simulation Settings"
        description="Configure inputs for the Monte Carlo simulator. Changes apply after a short debounce."
        side="left"
        width="max-w-sm"
      >
        <Controls
          req={req}
          onChange={onChange}
          onLoadPreset={onLoadPreset}
          compareLabel={compareLabel}
          onCompareChange={(label) => {
            setCompareLabel(label);
            if (!label) setCompareRes(null);
          }}
        />
      </Drawer>

      <main className={`main ${loading && res ? "main-loading" : ""}`}>
        <div className="header">
          <div className="header-info">
            <h2>Retirement Monte Carlo</h2>
            <p>
              Thousands of randomized return &amp; inflation paths through your glidepath. The bands
              show the spread of outcomes; the middle line is the median. Everything is computed by a
              stateless Python <code>POST /simulate</code> — the front never re-implements the maths.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setControlsOpen(true)}
            style={{ flexShrink: 0 }}
            leadingIcon={
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            }
          >
            Configure
          </Button>
        </div>

        <div className="toolbar">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--kj-muted-foreground)", cursor: "pointer" }}>
            <Switch checked={real} onChange={(e) => setReal(e.target.checked)} />
            Today's money (real)
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--kj-muted-foreground)" }}>
            Currency
            <input
              type="text"
              value={currency}
              maxLength={4}
              style={{
                width: 56,
                padding: "4px 6px",
                border: "1px solid var(--kj-border)",
                borderRadius: "var(--kj-radius-sm)",
                background: "var(--kj-surface)",
                color: "var(--kj-foreground)",
                fontSize: 13,
                fontFamily: "var(--kj-font-sans)",
              }}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--kj-muted-foreground)", cursor: "pointer" }}>
            <Switch checked={theme === "dark"} onChange={toggleTheme} />
            Dark mode
          </label>

          {res && (
            <span className="runinfo" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {res.n_paths.toLocaleString("en-US")} paths · {res.elapsed_ms} ms
              {loading && <span className="inline-flex items-center text-primary"><Spinner size={12} style={{ marginRight: 4 }} /> updating…</span>}
              {compareLoading ? " · compare…" : ""}
            </span>
          )}
        </div>

        {error && (
          <div className="banner">
            API error: {error}. Is the FastAPI service running?
          </div>
        )}

        {res && bands && (
          <>
            {compareRes && compareLabel && (
              <div className="compare-badge">
                Comparing <strong>Scenario A</strong>{" "}
                <span style={{ color: "var(--kj-muted-foreground)" }}>vs</span>{" "}
                <strong style={{ color: "var(--kj-primary)" }}>{compareLabel}</strong>
                {" "}— dashed amber line on the fan chart shows the compare median.
                <button
                  onClick={() => { setCompareLabel(null); setCompareRes(null); }}
                  style={{
                    marginLeft: 12,
                    border: "none",
                    background: "none",
                    color: "var(--kj-muted-foreground)",
                    cursor: "pointer",
                    fontSize: 13,
                    padding: "0 2px",
                  }}
                  title="Clear comparison"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="metrics">
              <MetricCard
                title="Money lasts"
                value={`${mainPct}%`}
                {...(compareRes && comparePct !== null && mainPct !== null ? {
                  trend: `${pctDelta(mainPct / 100, comparePct / 100)} vs ${compareLabel}`,
                  trendDirection: deltaTrend(mainPct, comparePct) ?? "neutral",
                } : {})}
              />
              <MetricCard
                title="Median end wealth (real)"
                value={fmtCurrency(res.summary.median_terminal_real, currency)}
                {...(compareRes ? {
                  trend: `${fmtCurrency(
                    res.summary.median_terminal_real - compareRes.summary.median_terminal_real,
                    currency,
                  )} vs ${compareLabel}`,
                  trendDirection: deltaTrend(
                    res.summary.median_terminal_real,
                    compareRes.summary.median_terminal_real,
                  ) ?? "neutral",
                } : {})}
              />
              <MetricCard
                title="Pessimistic P10 (real)"
                value={fmtCurrency(res.summary.p10_terminal_real, currency)}
                {...(compareRes ? {
                  trend: `${fmtCurrency(
                    res.summary.p10_terminal_real - compareRes.summary.p10_terminal_real,
                    currency,
                  )} vs ${compareLabel}`,
                  trendDirection: deltaTrend(
                    res.summary.p10_terminal_real,
                    compareRes.summary.p10_terminal_real,
                  ) ?? "neutral",
                } : {})}
              />
              <MetricCard
                title="Median ruin age"
                value={
                  res.summary.median_depletion_age === null
                    ? "—"
                    : String(Math.round(res.summary.median_depletion_age))
                }
                {...(compareRes && ageDelta(
                  res.summary.median_depletion_age,
                  compareRes.summary.median_depletion_age,
                ) ? {
                  trend: `${ageDelta(res.summary.median_depletion_age, compareRes.summary.median_depletion_age)} vs ${compareLabel}`,
                  trendDirection: deltaTrend(
                    res.summary.median_depletion_age ?? Infinity,
                    compareRes.summary.median_depletion_age ?? Infinity,
                  ) ?? "neutral",
                } : {})}
              />
            </div>

            <div className="charts-grid">
              <Card>
                <CardContent>
                  <div className="chart-card-content">
                    <h3>Portfolio value — {real ? "real (today's money)" : "nominal"}</h3>
                    <p className="sub">
                      Median with P25–P75 and P10–P90 bands
                      {compareRes && compareLabel && (
                        <> · <span style={{ color: "var(--kj-primary)" }}>— — {compareLabel} median</span></>
                      )}
                    </p>
                    <FanChart
                      ages={res.ages}
                      bands={bands}
                      retirementAge={res.retirement_age}
                      currency={currency}
                      compareBands={compareBands ?? undefined}
                      compareAges={compareRes?.ages}
                      compareLabel={compareLabel ?? undefined}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="chart-card-content">
                    <h3>Probability money lasts</h3>
                    <p className="sub">Share of paths solvent through retirement</p>
                    <SuccessGauge probability={res.summary.success_probability} />
                    {compareRes && (
                      <p style={{ textAlign: "center", fontSize: 12, color: "var(--kj-muted-foreground)", marginTop: 4 }}>
                        <span style={{ color: "var(--kj-primary)" }}>{compareLabel}</span>
                        {": "}
                        {Math.round(compareRes.summary.success_probability * 100)}%
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="chart-card-content">
                    <h3>Glidepath — allocation over time</h3>
                    <p className="sub">Equity share gliding toward bonds</p>
                    <GlidepathChart ages={res.ages} equityWeights={res.equity_weights} retirementAge={res.retirement_age} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="chart-card-content">
                    <h3>Terminal wealth — real</h3>
                    <p className="sub">Distribution of end-of-horizon balances</p>
                    <TerminalHistogram hist={res.terminal_real_hist} medianReal={res.summary.median_terminal_real} currency={currency} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {loading && !res && (
          <div className="space-y-6" style={{ marginTop: 24 }}>
            <div className="metrics">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Skeleton variant="text" width="60%" height={12} />
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <Skeleton variant="text" width="45%" height={32} />
                  </div>
                </Card>
              ))}
            </div>
            <div className="charts-grid">
              <Card>
                <CardContent style={{ padding: "20px 24px" }}>
                  <Skeleton variant="text" width="30%" height={18} style={{ marginBottom: 6 }} />
                  <Skeleton variant="text" width="50%" height={14} style={{ marginBottom: 24 }} />
                  <Skeleton variant="rectangular" height={340} />
                </CardContent>
              </Card>
              <Card>
                <CardContent style={{ padding: "20px 24px" }}>
                  <Skeleton variant="text" width="45%" height={18} style={{ marginBottom: 6 }} />
                  <Skeleton variant="text" width="35%" height={14} style={{ marginBottom: 24 }} />
                  <Skeleton variant="rectangular" height={340} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {!res && !loading && !error && (
          <p style={{ color: "var(--kj-muted-foreground)" }}>Starting simulation…</p>
        )}

        <p className="footnote">
          Educational model, not financial advice. Two-asset (equity/bonds) world, normal annual
          returns, stochastic inflation, ruin is absorbing.{" "}
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--kj-muted-foreground)" }}
          >
            API docs ↗
          </a>
        </p>
      </main>
    </div>
  );
}
