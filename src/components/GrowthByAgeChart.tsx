import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AgeGrowthRow } from "../insights";
import { fmtInt } from "../format";

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 12,
};

/** Which labels count as "under-35" and get the accent colour. */
const HIGHLIGHT_LABELS = new Set(["Under 25", "25–34"]);

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
      aria-label="Net new people with hospital cover by age group since 2020 Q2. Under-35 groups account for the bulk of net growth."
    >
      <div className="chart-toolbar-row">
        <span className="muted" style={{ fontSize: "0.75rem" }}>
          Net new people with hospital cover, by age group
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 80, left: 8, bottom: 8 }}
        >
          <CartesianGrid stroke="var(--grid)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => fmtInt(v)}
            tick={{ fill: "var(--slate)", fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tick={{ fill: "var(--slate)", fontSize: 12 }}
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
            {chartData.map((row, i) => (
              <Cell
                key={i}
                fill={HIGHLIGHT_LABELS.has(row.label) ? "var(--mid-blue)" : "var(--mid-grey)"}
              />
            ))}
            <LabelList
              dataKey="netNew"
              position="right"
              formatter={(v: number | string) => {
                const n = typeof v === "number" ? v : Number(v);
                if (!Number.isFinite(n)) return "";
                return fmtInt(n);
              }}
              style={{ fill: "var(--ink)", fontSize: 11, fontWeight: 500 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="chart-source">
        Source: APRA Membership and Benefits (AgeCohort_HT). Note: Bars show net change in people
        with hospital cover since the stable-tier baseline (2020 Q2); under-35 groups are
        highlighted in Mid Blue.
      </p>
    </div>
  );
}
