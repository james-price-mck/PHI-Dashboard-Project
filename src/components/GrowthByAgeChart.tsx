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
import type { CoverageDeltaRow } from "../insights";
import { fmtInt, shortQuarterLabel } from "../format";

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 12,
};

/**
 * Cohorts whose coverage rate has fallen since baseline. These are the
 * insight cohorts and get the Mid Blue accent.
 */
const INSIGHT_LABELS = new Set(["30–34", "60–64"]);

type Props = {
  rows: CoverageDeltaRow[];
  baselineQuarter: string;
  latestQuarter: string;
};

function fmtSignedPp(v: number | null | undefined, dp = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(dp)} pts`;
}

function fmtNetNew(n: number): string {
  const s = n >= 0 ? "+" : "−";
  const abs = Math.abs(n);
  return `${s}${fmtInt(abs)}`;
}

/**
 * Bar shape with variable thickness keyed to √(netNewAbs). Recharts passes
 * the default y/height for the category slot; we redraw the rectangle
 * centred on the slot with a thickness derived from the bar's own datum so
 * each cohort's bar thickness encodes its absolute contribution to net new
 * insured lives.
 */
function makeVariableThicknessShape(maxNetNewAbs: number) {
  return function VariableThicknessBar(
    props: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      fill?: string;
      payload?: CoverageDeltaRow;
    },
  ) {
    const { x = 0, y = 0, width = 0, height = 0, fill, payload } = props;
    const netNewAbs = payload?.netNewAbs ?? 0;
    // √-scale so small cohorts stay legible; clamp to [30%, 90%] of the slot.
    const ratio =
      maxNetNewAbs > 0 ? Math.sqrt(netNewAbs / maxNetNewAbs) : 0;
    const thicknessPct = 0.3 + 0.6 * ratio;
    const thickness = Math.max(6, height * thicknessPct);
    const centreY = y + height / 2;
    // Negative bars come in with negative width (bar extends left from x).
    // Draw a left-aligned rectangle regardless of sign.
    const rectX = width >= 0 ? x : x + width;
    const rectW = Math.abs(width);
    return (
      <rect
        x={rectX}
        y={centreY - thickness / 2}
        width={rectW}
        height={thickness}
        fill={fill}
        rx={2}
        ry={2}
      />
    );
  };
}

export function GrowthByAgeChart({ rows, baselineQuarter, latestQuarter }: Props) {
  // Decision-age cohorts only; Under-25 sits in the footnote as dependants context.
  const chartData = rows
    .filter((r) => r.decisionMaker && r.coverageDeltaPp != null)
    .map((r) => ({
      ...r,
      coverageDeltaPp: r.coverageDeltaPp as number,
    }));

  const under25 = rows.find((r) => r.label === "Under 25");
  const decisionTotalNetNew = chartData.reduce((s, r) => s + r.netNew, 0);
  const maxNetNewAbs = chartData.reduce(
    (m, r) => Math.max(m, r.netNewAbs),
    0,
  );

  // Symmetric x-axis around zero so negatives and positives are comparable.
  const maxAbs = chartData.reduce(
    (m, r) => Math.max(m, Math.abs(r.coverageDeltaPp)),
    0,
  );
  const padded = Math.max(4, Math.ceil(maxAbs * 1.2));

  const baselineLabel = shortQuarterLabel(baselineQuarter);
  const latestLabel = shortQuarterLabel(latestQuarter);

  return (
    <div
      className="chart-panel"
      role="img"
      aria-label={`Change in hospital-cover coverage rate by age cohort, ${baselineLabel} to ${latestLabel}. Bar length is change in percentage points of the cohort's population; bar thickness is absolute net new insured lives. 30–34 and 60–64 are the only decision-age cohorts whose coverage rate has fallen.`}
    >
      <div className="chart-toolbar-row">
        <span className="chart-title">
          Change in coverage rate by age cohort, {baselineLabel} to {latestLabel}
        </span>
        <span className="chart-daterange">
          Bar width = net new insured lives
        </span>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 420px", minWidth: 0, height: 300 }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 72, left: 8, bottom: 8 }}
              barCategoryGap="18%"
            >
              <CartesianGrid stroke="var(--grid)" horizontal={false} />
              <XAxis
                type="number"
                domain={[-padded, padded]}
                tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v} pts`}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={92}
                tick={{ fill: "var(--slate)", fontSize: 12 }}
              />
              <ReferenceLine x={0} stroke="var(--slate)" strokeWidth={1} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(
                  _v: number | string,
                  _name: string,
                  item: { payload?: CoverageDeltaRow },
                ) => {
                  const r = item?.payload;
                  if (!r) return ["—", ""];
                  const ratePart =
                    r.coverageRateThen != null && r.coverageRateNow != null
                      ? `${(r.coverageRateThen * 100).toFixed(1)}% → ${(r.coverageRateNow * 100).toFixed(1)}% of cohort`
                      : "";
                  return [
                    `${fmtSignedPp(r.coverageDeltaPp)} · ${fmtNetNew(r.netNew)} insured lives · ${ratePart}`,
                    r.label,
                  ];
                }}
                labelFormatter={() => ""}
              />
              <Bar
                dataKey="coverageDeltaPp"
                isAnimationActive={false}
                shape={makeVariableThicknessShape(maxNetNewAbs)}
              >
                {chartData.map((row, i) => (
                  <Cell
                    key={i}
                    fill={INSIGHT_LABELS.has(row.label) ? "var(--mid-blue)" : "var(--mid-grey)"}
                  />
                ))}
                <LabelList
                  dataKey="coverageDeltaPp"
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
        </div>
        <div
          style={{
            flex: "0 1 200px",
            minWidth: 180,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingTop: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--slate)",
              fontWeight: 700,
            }}
          >
            Net new insured lives since {baselineLabel}
          </div>
          {chartData.map((r) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 8,
                borderBottom: "1px solid var(--rule)",
                paddingBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: INSIGHT_LABELS.has(r.label) ? "var(--mid-blue)" : "var(--slate)",
                  fontWeight: INSIGHT_LABELS.has(r.label) ? 600 : 500,
                }}
              >
                {r.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--ink)",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 600,
                }}
              >
                {fmtNetNew(r.netNew)}
              </span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 8,
              paddingTop: 2,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--slate)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 700,
              }}
            >
              Decision-age total
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--ink)",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 700,
              }}
            >
              {fmtNetNew(decisionTotalNetNew)}
            </span>
          </div>
        </div>
      </div>
      <p className="chart-source">
        Source: APRA Membership and Benefits (AgeCohort_HT); ABS Estimated Resident Population.
      </p>
      <p className="chart-source" style={{ marginTop: 4 }}>
        Note: Bar length shows the change in hospital-cover coverage rate within each cohort
        (percentage points of the cohort's own population). Bar thickness scales with absolute
        net new insured lives, so it also shows how much each cohort contributes to total growth.
        30–34 and 60–64 are the only decision-age cohorts whose coverage rate has fallen since
        {" "}{baselineLabel} — the 30–34 fall is explored further in the appendix (LHC and
        Age-Based Discount observations).
        {under25 != null && Number.isFinite(under25.netNew)
          ? ` Under-25s (typically dependants on a family policy, not independent decision-makers) are excluded; they contributed ${fmtNetNew(under25.netNew)} net new insured lives over the same window.`
          : ""}
      </p>
    </div>
  );
}
