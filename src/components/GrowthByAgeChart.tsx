import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AgeGrowthRow } from "../insights";
import { fmtInt } from "../format";

const COLORS = [
  "var(--accent-2)",
  "var(--chart-blue-2)",
  "var(--ink)",
  "var(--chart-warm-grey)",
  "var(--chart-brick)",
];

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 12,
};

type Props = {
  rows: AgeGrowthRow[];
};

export function GrowthByAgeChart({ rows }: Props) {
  const chartData = rows.map((r) => ({
    ...r,
    label: r.label,
    display: `${fmtInt(r.netNew)} (${r.shareOfTotal.toFixed(0)}%)`,
  }));

  return (
    <div
      className="chart-panel"
      role="img"
      aria-label="Net new hospital cover persons by age group since twenty twenty quarter two."
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid stroke="var(--grid)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => fmtInt(v)}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number) => {
              const row = chartData.find((r) => r.netNew === v);
              if (!row) return [fmtInt(v), "Net new"];
              return [
                `${fmtInt(row.netNew)} net · ${row.shareOfTotal.toFixed(0)}% of positive growth`,
                "People covered",
              ];
            }}
          />
          <Bar dataKey="netNew" radius={[0, 2, 2, 0]} isAnimationActive={false}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
