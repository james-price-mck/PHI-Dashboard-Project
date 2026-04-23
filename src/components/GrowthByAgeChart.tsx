import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
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

/** Highlight the insight cohort: 25–34 decision-makers. */
const HIGHLIGHT_LABEL = "25–34";

type Props = {
  rows: AgeGrowthRow[];
};

function fmtSignedPp(v: number | null | undefined, dp = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(dp)} pp`;
}

function fmtSharePct(v: number | null | undefined, dp = 0): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(dp)}%`;
}

export function GrowthByAgeChart({ rows }: Props) {
  // Decision-age cohorts only; Under-25 sits in the footnote as dependants context.
  const chartData = rows
    .filter((r) => r.decisionMaker && r.overIndexPp != null)
    .map((r) => ({
      label: r.label,
      overIndexPp: r.overIndexPp as number,
      growthSharePct: r.growthSharePct,
      populationSharePct: r.populationSharePct,
      netNew: r.netNew,
    }));

  const under25 = rows.find((r) => r.label === "Under 25");

  // Symmetric x-axis domain around zero for a clean signed bar chart.
  const maxAbs = chartData.reduce(
    (m, r) => Math.max(m, Math.abs(r.overIndexPp)),
    0,
  );
  const padded = Math.max(4, Math.ceil(maxAbs * 1.15));

  return (
    <div
      className="chart-panel"
      role="img"
      aria-label="Over- or under-indexing of each decision-age cohort in net growth of hospital cover, relative to its share of the 25-plus adult population."
    >
      <div className="chart-toolbar-row">
        <span className="chart-title">
          Share of net growth vs share of adult (25+) population, in percentage points
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
            domain={[-padded, padded]}
            tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v} pp`}
            tick={{ fill: "var(--slate)", fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tick={{ fill: "var(--slate)", fontSize: 12 }}
          />
          <ReferenceLine x={0} stroke="var(--slate)" strokeWidth={1} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number | string, _name: string) => {
              const n = typeof v === "number" ? v : Number(v);
              if (!Number.isFinite(n)) return ["—", ""];
              const row = chartData.find((r) => r.overIndexPp === n);
              if (!row) return [fmtSignedPp(n), ""];
              return [
                `${fmtSignedPp(row.overIndexPp)} · ${fmtSharePct(row.growthSharePct)} of growth vs ${fmtSharePct(row.populationSharePct)} of adults`,
                row.label,
              ];
            }}
            labelFormatter={() => ""}
          />
          <Bar dataKey="overIndexPp" radius={[0, 2, 2, 0]} isAnimationActive={false}>
            {chartData.map((row, i) => (
              <Cell
                key={i}
                fill={row.label === HIGHLIGHT_LABEL ? "var(--mid-blue)" : "var(--mid-grey)"}
              />
            ))}
            <LabelList
              dataKey="overIndexPp"
              position="right"
              formatter={(v: number | string) => {
                const n = typeof v === "number" ? v : Number(v);
                return fmtSignedPp(n);
              }}
              style={{ fill: "var(--ink)", fontSize: 11, fontWeight: 500 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="chart-source">
        Source: APRA Membership and Benefits (AgeCohort_HT); ABS Estimated Resident Population.
      </p>
      <p className="chart-source" style={{ marginTop: 4 }}>
        Note: Positive bars = cohort contributed a larger share of net new insured lives than its
        share of the 25+ adult population; negative = the reverse. 25–34 is the youngest
        decision-making cohort and is highlighted in Mid Blue.
        {under25 != null && Number.isFinite(under25.netNew)
          ? ` Under-25s (typically dependants on a family policy, not independent decision-makers) are excluded; they contributed ${fmtInt(under25.netNew)} net new insured lives over the same window.`
          : ""}
      </p>
    </div>
  );
}
