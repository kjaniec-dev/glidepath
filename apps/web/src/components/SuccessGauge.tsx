import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { gaugeColor } from "../theme";

interface Props {
  probability: number;
}

export default function SuccessGauge({ probability }: Props) {
  const pct = Math.round(probability * 100);
  const color = gaugeColor(pct);
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
            background={{ fill: "var(--kj-muted)" }}
            dataKey="value"
            cornerRadius={10}
            fill={color}
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
        <div style={{ fontSize: 40, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{pct}%</div>
        <div style={{ fontSize: 12, color: "var(--kj-muted-foreground)" }}>money lasts</div>
      </div>
    </div>
  );
}
