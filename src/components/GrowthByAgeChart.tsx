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
 * Bar shape with variable thickness keyed linearly to each cohort's share of
 * the 25-plus adult population (latest quarter). Recharts passes the default
 * y/height for the category slot; we redraw the rectangle centred on the
 * slot with a thickness proportional to populationShare25Plus, so bar
 * thickness is a faithful visual cue for "how big is this cohort".
 */
function makeVariableThicknessShape(maxPopulationShare: number) {
  return function VariableThicknessBar(
    props: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      fill?: string;
      payload?: CoverageDeltaRow & { populationShare25Plus?: number };
    },
  ) {
    const { x = 0, y = 0, width = 0, height = 0, fill, payload } = props;
    const share = payload?.populationShare25Plus ?? 0;
    // Linear scale of population share against the largest cohort; the
    // largest cohort fills 90% of the slot, everything else is proportional.
    // A 6 px minimum keeps tiny cohorts visible without lying about size.
    const ratio = maxPopulationShare > 0 ? share / maxPopulationShare : 0;
    const thickness = Math.max(6, height * 0.9 * ratio);
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
  const decisionRows = rows.filter(
    (r) => r.decisionMaker && r.coverageDeltaPp != null,
  );
  const totalDecisionPopulation = decisionRows.reduce(
    (s, r) => s + (r.populationNow || 0),
    0,
  );
  // Each cohort's share of the 25+ decision-age population at the latest
  // quarter, in [0, 1]. Used linearly for bar thickness, and shown verbatim
  // in the tooltip so readers can verify the visual encoding.
  const chartData = decisionRows.map((r) => ({
    ...r,
    coverageDeltaPp: r.coverageDeltaPp as number,
    populationShare25Plus:
      totalDecisionPopulation > 0 ? r.populationNow / totalDecisionPopulation : 0,
  }));

  const under25 = rows.find((r) => r.label === "Under 25");
  const decisionTotalNetNew = chartData.reduce((s, r) => s + r.netNew, 0);
  const maxPopulationShare = chartData.reduce(
    (m, r) => Math.max(m, r.populationShare25Plus),
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
  const baselineYear = baselineLabel.slice(0, 4);
  const latestYear = latestLabel.slice(0, 4);

  return (
    <div
      className="chart-panel"
      role="img"
      aria-label={`Change in hospital-cover coverage rate by age cohort, ${baselineLabel.slice(0, 4)} to ${latestLabel.slice(0, 4)}. Bar length is change in percentage points of the cohort's population; bar thickness is the cohort's share of the 25-plus adult population. 30–34 and 60–64 are the only decision-age cohorts whose coverage rate has fallen.`}
    >
      <div className="chart-toolbar-row">
        <span className="chart-title">
          Change in coverage rate by age cohort, {baselineYear} to {latestYear}
        </span>
        <span className="chart-daterange">
          Bar thickness = cohort share of 25+ adults
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
                  item: { payload?: CoverageDeltaRow & { populationShare25Plus?: number } },
                ) => {
                  const r = item?.payload;
                  if (!r) return ["—", ""];
                  const ratePart =
                    r.coverageRateThen != null && r.coverageRateNow != null
                      ? `${(r.coverageRateThen * 100).toFixed(1)}% → ${(r.coverageRateNow * 100).toFixed(1)}% of cohort`
                      : "";
                  const sharePart =
                    r.populationShare25Plus != null
                      ? `${(r.populationShare25Plus * 100).toFixed(0)}% of 25+ adults`
                      : "";
                  return [
                    `${fmtSignedPp(r.coverageDeltaPp)} · ${fmtNetNew(r.netNew)} insured lives · ${ratePart} · ${sharePart}`,
                    r.label,
                  ];
                }}
                labelFormatter={() => ""}
              />
              <Bar
                dataKey="coverageDeltaPp"
                isAnimationActive={false}
                shape={makeVariableThicknessShape(maxPopulationShare)}
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
            Net new insured lives since {baselineYear}
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
        Note: Bar length is the change in hospital-cover coverage rate within each cohort
        (percentage points of the cohort's own population). Bar thickness is proportional to the
        cohort's share of the 25-plus adult population at the latest quarter. Net new insured
        lives are shown in the side panel.
        {under25 != null && Number.isFinite(under25.netNew)
          ? ` Under-25s (typically dependants on a family policy, not independent decision-makers) are excluded; they contributed ${fmtNetNew(under25.netNew)} net new insured lives over the same window.`
          : ""}
      </p>
    </div>
  );
}
