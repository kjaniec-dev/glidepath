import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Histogram } from "../types";
import { fmtCompact, fmtCurrency } from "../api";
import { bandFill, GRID, MUTED, ACCENT } from "../theme";

interface Props {
  hist: Histogram;
  medianReal: number;
  currency: string;
}

export default function TerminalHistogram({ hist, medianReal, currency }: Props) {
  const { bin_edges, counts } = hist;
  const data = counts.map((count, i) => ({
    center: (bin_edges[i] + bin_edges[i + 1]) / 2,
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
          contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Bar dataKey="count" fill={bandFill(0.55)} isAnimationActive={false} />
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
