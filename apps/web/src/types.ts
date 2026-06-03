// Mirrors apps/api schemas. The React client never re-implements the simulation;
// it only renders what POST /simulate returns.

export type GlidepathStyle = "linear" | "age_rule" | "constant";

export interface SimulateRequest {
  start_age: number;
  retirement_age: number;
  end_age: number;
  initial_balance: number;
  annual_contribution: number;
  contribution_real_growth: number;
  annual_spending: number;
  other_retirement_income: number;
  equity_mean: number;
  equity_vol: number;
  bond_mean: number;
  bond_vol: number;
  correlation: number;
  fee: number;
  infl_mean: number;
  infl_vol: number;
  glidepath_style: GlidepathStyle;
  start_equity: number;
  end_equity: number;
  rule_base: number;
  n_paths: number;
  seed: number;
}

export interface Bands {
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
}

export interface Summary {
  success_probability: number;
  median_terminal_real: number;
  p10_terminal_real: number;
  p90_terminal_real: number;
  median_depletion_age: number | null;
}

export interface Histogram {
  bin_edges: number[];
  counts: number[];
}

export interface SimulateResponse {
  ages: number[];
  equity_weights: number[];
  retirement_age: number;
  real: Bands;
  nominal: Bands;
  summary: Summary;
  terminal_real_hist: Histogram;
  n_paths: number;
  elapsed_ms: number;
}

export const DEFAULT_REQUEST: SimulateRequest = {
  start_age: 30,
  retirement_age: 65,
  end_age: 95,
  initial_balance: 50000,
  annual_contribution: 18000,
  contribution_real_growth: 0.01,
  annual_spending: 40000,
  other_retirement_income: 12000,
  equity_mean: 0.07,
  equity_vol: 0.17,
  bond_mean: 0.03,
  bond_vol: 0.06,
  correlation: 0.1,
  fee: 0.003,
  infl_mean: 0.025,
  infl_vol: 0.01,
  glidepath_style: "linear",
  start_equity: 0.9,
  end_equity: 0.4,
  rule_base: 110,
  n_paths: 10000,
  seed: 42,
};
