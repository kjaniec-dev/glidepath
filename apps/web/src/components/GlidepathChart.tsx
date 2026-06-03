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
import { ACCENT, BAND_FILL, GRID, MUTED } from "../theme";

interface Props {
  ages: number[];
  equityWeights: number[];
  retirementAge: number;
}

export default function GlidepathChart({ ages, equityWeights, retirementAge }: Props) {
  const data = ages.map((age, i) => ({
    age,
    equity: +(equityWeights[i] * 100).toFixed(1),
    bonds: +((1 - equityWeights[i]) * 100).toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <XAxis dataKey="age" tick={{ fontSize: 12, fill: MUTED }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          width={42}
        />
        <Tooltip
          formatter={(v: number, name) => [`${v}%`, name]}
          labelFormatter={(age) => `Age ${age}`}
          contentStyle={{
            borderRadius: "var(--kj-radius-md)",
            border: "1px solid var(--kj-border)",
            background: "var(--kj-card)",
            color: "var(--kj-card-foreground)",
            fontSize: 12,
          }}
        />
        <Area
          dataKey="equity"
          name="Equity"
          stroke={ACCENT}
          strokeWidth={2.5}
          fill={BAND_FILL}
          fillOpacity={0.12}
          isAnimationActive={false}
        />
        <Line
          dataKey="bonds"
          name="Bonds"
          stroke={MUTED}
          strokeWidth={2}
          strokeDasharray="4 3"
          dot={false}
          isAnimationActive={false}
        />
        <ReferenceLine x={retirementAge} stroke={MUTED} strokeDasharray="4 4" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
