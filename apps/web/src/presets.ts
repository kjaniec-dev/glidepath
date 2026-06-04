import { DEFAULT_REQUEST, type SimulateRequest } from "./types";

export interface Preset {
  label: string;
  description: string;
  req: SimulateRequest;
}

export const PRESETS: Preset[] = [
  {
    label: "Baseline",
    description: "30-year-old, €50k saved, linear glide 90→40%",
    req: DEFAULT_REQUEST,
  },
  {
    label: "Aggressive 30s",
    description: "High contribution, stay 90% equity throughout",
    req: {
      ...DEFAULT_REQUEST,
      start_age: 28,
      initial_balance: 25_000,
      annual_contribution: 24_000,
      contribution_real_growth: 0.02,
      annual_spending: 45_000,
      other_retirement_income: 8_000,
      glidepath_style: "constant",
      start_equity: 0.9,
      end_equity: 0.9,
    },
  },
  {
    label: "Conservative 50s",
    description: "Already 50, €300k, gentle glide 60→20%",
    req: {
      ...DEFAULT_REQUEST,
      start_age: 50,
      retirement_age: 65,
      end_age: 90,
      initial_balance: 300_000,
      annual_contribution: 10_000,
      contribution_real_growth: 0.0,
      annual_spending: 35_000,
      other_retirement_income: 15_000,
      glidepath_style: "linear",
      start_equity: 0.6,
      end_equity: 0.2,
    },
  },
  {
    label: "FIRE at 45",
    description: "Aggressive saving, retire 15 years early",
    req: {
      ...DEFAULT_REQUEST,
      start_age: 30,
      retirement_age: 45,
      end_age: 90,
      initial_balance: 80_000,
      annual_contribution: 42_000,
      contribution_real_growth: 0.02,
      annual_spending: 28_000,
      other_retirement_income: 0,
      glidepath_style: "linear",
      start_equity: 0.9,
      end_equity: 0.55,
    },
  },
  {
    label: "Pessimistic markets",
    description: "Lower returns, higher inflation, higher vol",
    req: {
      ...DEFAULT_REQUEST,
      equity_mean: 0.045,
      equity_vol: 0.22,
      bond_mean: 0.015,
      bond_vol: 0.08,
      infl_mean: 0.04,
      infl_vol: 0.02,
    },
  },
];

export const PRESET_MAP = new Map<string, Preset>(PRESETS.map((p) => [p.label, p]));
