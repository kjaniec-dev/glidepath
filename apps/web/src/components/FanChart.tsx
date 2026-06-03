import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Bands } from "../types";
import { fmtCompact, fmtCurrency } from "../api";
import { ACCENT, bandFill, GRID, MUTED } from "../theme";

interface Props {
  ages: number[];
  bands: Bands;
  retirementAge: number;
  currency: string;
}

interface Row {
  age: number;
  band90: [number, number];
  band50: [number, number];
  median: number;
}

export default function FanChart({ ages, bands, retirementAge, currency }: Props) {
  const data: Row[] = ages.map((age, i) => ({
    age,
    band90: [bands.p10[i], bands.p90[i]],
    band50: [bands.p25[i], bands.p75[i]],
    median: bands.p50[i],
  }));

  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <XAxis
          dataKey="age"
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          label={{ value: "Age", position: "insideBottom", offset: -2, fontSize: 12, fill: MUTED }}
        />
        <YAxis
          tickFormatter={fmtCompact}
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          width={48}
        />
        <Tooltip
          formatter={(value: number | [number, number], name) => {
            if (Array.isArray(value)) {
              return [`${fmtCurrency(value[0], currency)} – ${fmtCurrency(value[1], currency)}`, name];
            }
            return [fmtCurrency(value as number, currency), name];
          }}
          labelFormatter={(age) => `Age ${age}`}
          contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Area
          dataKey="band90"
          name="P10–P90"
          stroke="none"
          fill={bandFill(0.12)}
          isAnimationActive={false}
        />
        <Area
          dataKey="band50"
          name="P25–P75"
          stroke="none"
          fill={bandFill(0.24)}
          isAnimationActive={false}
        />
        <Line
          dataKey="median"
          name="Median"
          stroke={ACCENT}
          strokeWidth={3}
          dot={false}
          isAnimationActive={false}
        />
        <ReferenceLine
          x={retirementAge}
          stroke={MUTED}
          strokeDasharray="4 4"
          label={{ value: "retirement", fontSize: 11, fill: MUTED, position: "top" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
