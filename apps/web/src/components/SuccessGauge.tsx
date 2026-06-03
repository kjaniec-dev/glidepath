import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

interface Props {
  probability: number; // 0..1
}

function color(pct: number): string {
  if (pct >= 85) return "#0f766e";
  if (pct >= 65) return "#d97706";
  return "#dc2626";
}

export default function SuccessGauge({ probability }: Props) {
  const pct = Math.round(probability * 100);
  const data = [{ name: "success", value: pct }];

  return (
    <div style={{ position: "relative", width: "100%", height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="68%"
          outerRadius="100%"
          startAngle={180}
          endAngle={0}
          data={data}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background={{ fill: "rgba(148,163,184,0.18)" }}
            dataKey="value"
            cornerRadius={10}
            fill={color(pct)}
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 28,
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, color: color(pct), letterSpacing: "-0.02em" }}>
          {pct}%
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>money lasts</div>
      </div>
    </div>
  );
}
