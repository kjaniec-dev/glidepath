import {
  Area,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Bands } from "../types";
import { fmtCompact, fmtCurrency } from "../api";
import { ACCENT, BAND_FILL, COMPARE_COLOR, GRID, MUTED } from "../theme";

interface Props {
  ages: number[];
  bands: Bands;
  retirementAge: number;
  currency: string;
  /** Optional second scenario to overlay (just median, amber dashed line). */
  compareBands?: Bands;
  compareAges?: number[];
  compareLabel?: string;
}

export default function FanChart({
  ages,
  bands,
  retirementAge,
  currency,
  compareBands,
  compareAges,
  compareLabel = "Compare",
}: Props) {
  const compareByAge =
    compareAges && compareBands
      ? new Map(compareAges.map((a, i) => [a, compareBands.p50[i]]))
      : null;

  const data = ages.map((age, i) => ({
    age,
    band90: [bands.p10[i], bands.p90[i]] as [number, number],
    band50: [bands.p25[i], bands.p75[i]] as [number, number],
    median: bands.p50[i],
    compareMedian: compareByAge?.get(age) ?? null,
  }));

  const hasCompare = !!compareByAge;

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => {
            if (value === null || value === undefined) return [null, name];
            if (Array.isArray(value))
              return [`${fmtCurrency(value[0] as number, currency)} – ${fmtCurrency(value[1] as number, currency)}`, name];
            return [fmtCurrency(value as number, currency), name];
          }}
          labelFormatter={(age) => `Age ${age}`}
          contentStyle={{
            borderRadius: "var(--kj-radius-md)",
            border: "1px solid var(--kj-border)",
            background: "var(--kj-card)",
            color: "var(--kj-card-foreground)",
            fontSize: 12,
          }}
        />
        {hasCompare && (
          <Legend
            wrapperStyle={{ fontSize: 12, color: MUTED, paddingTop: 4 }}
            formatter={(value) => (
              <span style={{ color: value === "Median (A)" ? ACCENT : COMPARE_COLOR }}>{value}</span>
            )}
          />
        )}
        <Area
          dataKey="band90"
          name="P10–P90"
          stroke="none"
          fill={BAND_FILL}
          fillOpacity={0.12}
          isAnimationActive={false}
          legendType="none"
        />
        <Area
          dataKey="band50"
          name="P25–P75"
          stroke="none"
          fill={BAND_FILL}
          fillOpacity={0.24}
          isAnimationActive={false}
          legendType="none"
        />
        <Line
          dataKey="median"
          name={hasCompare ? "Median (A)" : "Median"}
          stroke={ACCENT}
          strokeWidth={3}
          dot={false}
          isAnimationActive={false}
        />
        {hasCompare && (
          <Line
            dataKey="compareMedian"
            name={`Median (${compareLabel})`}
            stroke={COMPARE_COLOR}
            strokeWidth={2.5}
            strokeDasharray="6 3"
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
        )}
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
