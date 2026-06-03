import type { SimulateRequest, SimulateResponse } from "./types";

// Empty string = relative paths (used in Docker behind nginx reverse proxy).
// Set VITE_API_URL=http://localhost:8000 for local dev without nginx.
const API_URL = import.meta.env.VITE_API_URL ?? "";

export async function simulate(req: SimulateRequest, signal?: AbortSignal): Promise<SimulateResponse> {
  const res = await fetch(`${API_URL}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(detail);
  }
  return res.json();
}

export const fmtCurrency = (v: number, currency = "zł "): string =>
  `${currency}${Math.round(v).toLocaleString("en-US")}`;

export const fmtPct = (v: number, digits = 0): string => `${(v * 100).toFixed(digits)}%`;

export const fmtCompact = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
  return `${Math.round(v)}`;
};
