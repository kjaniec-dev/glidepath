// Recharts color tokens referencing @kjaniec-dev/design CSS variables.
// SVG fill/stroke props support CSS vars natively in the browser DOM.
// Recharts Area fillOpacity is passed as a numeric prop — no rgba() needed.

export const ACCENT = "var(--kj-secondary)";        // teal line + bar fill
export const ACCENT_STRONG = "var(--kj-secondary-700)"; // median line (always readable)
export const MUTED = "var(--kj-muted-foreground)";
export const GRID = "var(--kj-border)";
export const BAND_FILL = "var(--kj-secondary)";     // used with fillOpacity={0.12 | 0.22}

// Gauge colours: match KJ semantic tokens.
export function gaugeColor(pct: number): string {
  if (pct >= 85) return "var(--kj-success)";
  if (pct >= 65) return "var(--kj-warning)";
  return "var(--kj-danger)";
}
