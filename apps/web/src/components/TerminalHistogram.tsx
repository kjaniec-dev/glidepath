import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Histogram } from "../types";
import { fmtCompact, fmtCurrency } from "../api";
import { ACCENT, BAND_FILL, GRID, MUTED } from "../theme";

interface Props {
  hist: Histogram;
  medianReal: number;
  currency: string;
}

export default function TerminalHistogram({ hist, medianReal, currency }: Props) {
  const data = hist.counts.map((count, i) => ({
    center: (hist.bin_edges[i] + hist.bin_edges[i + 1]) / 2,
    count,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <XAxis
          dataKey="center"
          tickFormatter={fmtCompact}
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
        />
        <YAxis tick={{ fontSize: 12, fill: MUTED }} tickLine={false} axisLine={{ stroke: GRID }} width={40} />
        <Tooltip
          formatter={(v: number) => [`${v} paths`, "Count"]}
          labelFormatter={(c) => `≈ ${fmtCurrency(c as number, currency)}`}
          contentStyle={{
            borderRadius: "var(--kj-radius-md)",
            border: "1px solid var(--kj-border)",
            background: "var(--kj-card)",
            color: "var(--kj-card-foreground)",
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" fill={BAND_FILL} fillOpacity={0.6} isAnimationActive={false} />
        <ReferenceLine
          x={medianReal}
          stroke={ACCENT}
          strokeWidth={2}
          label={{ value: "median", fontSize: 11, fill: ACCENT, position: "top" }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
