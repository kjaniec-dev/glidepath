import { Field, Input, Label, Select, Slider, sliderThumbCSS } from "@kjaniec-dev/ui";
import type { GlidepathStyle, SimulateRequest } from "../types";

// Inject slider thumb styles once (replaces the hand-rolled accent-color approach).
if (typeof document !== "undefined") {
  const id = "kj-slider-thumb-css";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.textContent = sliderThumbCSS;
    document.head.appendChild(s);
  }
}

interface Props {
  req: SimulateRequest;
  onChange: (patch: Partial<SimulateRequest>) => void;
}

function SliderField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const { label, value, min, max, step, display, onChange } = props;
  return (
    <div className="field-row">
      <div className="field-label">
        <span>{label}</span>
        <span className="val">{display ? display(value) : value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function NumberField(props: {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const { label, value, step = 1000, onChange } = props;
  return (
    <Field className="field-row">
      <Label className="field-label">{label}</Label>
      <Input
        type="number"
        value={value}
        step={step}
        min={0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </Field>
  );
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export default function Controls({ req, onChange }: Props) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="dot" />
        <h1>Glidepath</h1>
      </div>
      <p className="tagline">
        Generic Monte Carlo retirement projection. Plug in your own ETF / IKZE numbers — nothing
        account-specific or tax-related baked in.
      </p>

      <fieldset className="group">
        <legend>Timeline &amp; cashflows</legend>
        <SliderField label="Current age" value={req.start_age} min={18} max={60} step={1} onChange={(v) => onChange({ start_age: v })} />
        <SliderField label="Retirement age" value={req.retirement_age} min={req.start_age + 1} max={75} step={1} onChange={(v) => onChange({ retirement_age: v })} />
        <SliderField label="Plan until age" value={req.end_age} min={req.retirement_age} max={105} step={1} onChange={(v) => onChange({ end_age: v })} />
        <NumberField label="Starting balance (today)" value={req.initial_balance} step={5000} onChange={(v) => onChange({ initial_balance: v })} />
        <NumberField label="Annual contribution (today)" value={req.annual_contribution} onChange={(v) => onChange({ annual_contribution: v })} />
        <SliderField label="Contribution real growth / yr" value={req.contribution_real_growth} min={0} max={0.05} step={0.005} display={pct} onChange={(v) => onChange({ contribution_real_growth: v })} />
        <NumberField label="Annual spending in retirement (today)" value={req.annual_spending} onChange={(v) => onChange({ annual_spending: v })} />
        <NumberField label="Other retirement income / yr (today)" value={req.other_retirement_income} onChange={(v) => onChange({ other_retirement_income: v })} />
      </fieldset>

      <fieldset className="group">
        <legend>Glidepath (allocation)</legend>
        <Field className="field-row">
          <Label className="field-label">Style</Label>
          <Select
            value={req.glidepath_style}
            onChange={(e) => onChange({ glidepath_style: e.target.value as GlidepathStyle })}
          >
            <option value="linear">linear</option>
            <option value="age_rule">age_rule</option>
            <option value="constant">constant</option>
          </Select>
        </Field>
        <SliderField label="Start equity" value={req.start_equity} min={0} max={1} step={0.05} display={pct} onChange={(v) => onChange({ start_equity: v })} />
        <SliderField label="End equity" value={req.end_equity} min={0} max={1} step={0.05} display={pct} onChange={(v) => onChange({ end_equity: v })} />
        <SliderField label="Age-rule base (equity = base − age)" value={req.rule_base} min={90} max={130} step={1} onChange={(v) => onChange({ rule_base: v })} />
      </fieldset>

      <fieldset className="group">
        <legend>Market assumptions (nominal)</legend>
        <SliderField label="Equity return / yr" value={req.equity_mean} min={0} max={0.15} step={0.005} display={pct} onChange={(v) => onChange({ equity_mean: v })} />
        <SliderField label="Equity volatility" value={req.equity_vol} min={0} max={0.35} step={0.01} display={pct} onChange={(v) => onChange({ equity_vol: v })} />
        <SliderField label="Bond return / yr" value={req.bond_mean} min={0} max={0.1} step={0.005} display={pct} onChange={(v) => onChange({ bond_mean: v })} />
        <SliderField label="Bond volatility" value={req.bond_vol} min={0} max={0.2} step={0.01} display={pct} onChange={(v) => onChange({ bond_vol: v })} />
        <SliderField label="Equity/bond correlation" value={req.correlation} min={-1} max={1} step={0.05} display={(v) => v.toFixed(2)} onChange={(v) => onChange({ correlation: v })} />
        <SliderField label="All-in annual fee (TER)" value={req.fee} min={0} max={0.02} step={0.001} display={pct} onChange={(v) => onChange({ fee: v })} />
      </fieldset>

      <fieldset className="group">
        <legend>Inflation &amp; simulation</legend>
        <SliderField label="Inflation / yr" value={req.infl_mean} min={0} max={0.08} step={0.005} display={pct} onChange={(v) => onChange({ infl_mean: v })} />
        <SliderField label="Inflation volatility" value={req.infl_vol} min={0} max={0.05} step={0.005} display={pct} onChange={(v) => onChange({ infl_vol: v })} />
        <Field className="field-row">
          <Label className="field-label">Monte Carlo paths</Label>
          <Select value={req.n_paths} onChange={(e) => onChange({ n_paths: parseInt(e.target.value, 10) })}>
            {[1000, 5000, 10000, 25000, 50000].map((n) => (
              <option key={n} value={n}>{n.toLocaleString("en-US")}</option>
            ))}
          </Select>
        </Field>
        <SliderField label="Random seed" value={req.seed} min={0} max={1000} step={1} onChange={(v) => onChange({ seed: v })} />
      </fieldset>
    </aside>
  );
}
