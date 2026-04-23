import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtMonthYear, shortQuarterLabel } from "../format";
import {
  computeCoverageRateSeriesByBand,
  computeLhc31Shortfall,
} from "../insights";
import type { AgeCoverageQuarter } from "../types";

type Props = {
  ageQuarters: AgeCoverageQuarter[];
  latestQuarter: string;
  /**
   * Baseline quarter for the "shortfall vs held rate" counterfactual.
   * For the LHC-31 story we use the earliest quarter in the age series
   * (pre-reform), because the 30-34 coverage drop happened across the
   * full reform-through-premium-shock arc, not just since 2020 Q2.
   */
  baselineQuarter: string;
};

const BANDS = ["25-29", "30-34", "35-39"] as const;

type BandMeta = { label: string; color: string; strokeWidth: number };

/**
 * Both 25–29 and 30–34 are highlighted to contrast the two sides of the story:
 *   - 25–29 (Age-Based Discount in force) — the AYD is working.
 *   - 30–34 (ABD tapers, LHC loading activates) — coverage is falling.
 * 35–39 sits in the background as stable-cohort context.
 */
const BAND_META: Record<(typeof BANDS)[number], BandMeta> = {
  "25-29": { label: "25–29 (ABD eligible)", color: "var(--sky)", strokeWidth: 2.4 },
  "30-34": { label: "30–34 (LHC applies)", color: "var(--mid-blue)", strokeWidth: 2.6 },
  "35-39": { label: "35–39 (reference)", color: "var(--mid-grey)", strokeWidth: 1.6 },
};

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 12,
};

type StatCardProps = {
  label: string;
  rangeLabel: string;
  deltaPp: number | null;
  valueColor: string;
};

function StatCard({ label, rangeLabel, deltaPp, valueColor }: StatCardProps) {
  return (
    <div>
      <div
        style={{
          fontSize: "0.7rem",
          color: "var(--slate)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "1.2rem",
          fontWeight: 600,
          color: "var(--ink)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {rangeLabel}
      </div>
      <div
        style={{
          fontSize: "0.8rem",
          color: valueColor,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {deltaPp != null
          ? `${deltaPp >= 0 ? "+" : ""}${deltaPp.toFixed(1)} pts`
          : "—"}
      </div>
    </div>
  );
}

export function Lhc31AgePanel({ ageQuarters, latestQuarter, baselineQuarter }: Props) {
  const chartRows = useMemo(() => {
    const series = computeCoverageRateSeriesByBand(ageQuarters, [...BANDS]);
    return series.map((r) => ({
      quarter: r.quarter,
      label: shortQuarterLabel(r.quarter),
      "25-29": r.rates["25-29"],
      "30-34": r.rates["30-34"],
      "35-39": r.rates["35-39"],
    }));
  }, [ageQuarters]);

  // One X-axis tick per calendar year, not per quarter.
  const yearTicks = useMemo(() => {
    const seen = new Set<string>();
    const ticks: string[] = [];
    for (const r of chartRows) {
      const y = r.label.slice(0, 4);
      if (!seen.has(y)) {
        seen.add(y);
        ticks.push(r.label);
      }
    }
    return ticks;
  }, [chartRows]);

  const shortfallRows = useMemo(
    () =>
      computeLhc31Shortfall(
        ageQuarters,
        baselineQuarter,
        latestQuarter,
        [...BANDS],
      ),
    [ageQuarters, baselineQuarter, latestQuarter],
  );

  const row25_29 = shortfallRows.find((r) => r.band === "25-29");
  const row30_34 = shortfallRows.find((r) => r.band === "30-34");
  const first = chartRows[0];
  const last = chartRows.at(-1);
  const baselineLabel = shortQuarterLabel(baselineQuarter);
  const baselineYear = baselineLabel.slice(0, 4);

  function rangeLabel(then: number | null | undefined, now: number | null | undefined): string {
    if (then == null || now == null) return "—";
    return `${(then * 100).toFixed(1)}% → ${(now * 100).toFixed(1)}%`;
  }

  return (
    <div className="chart-panel" style={{ marginTop: 12 }} role="region" aria-label="Hospital-cover rate by age band, 25 to 29 rising under the Age-Based Discount, 30 to 34 falling despite the Lifetime Health Cover loading.">
      <div className="chart-toolbar-row">
        <span className="chart-title">
          Hospital-cover rate by age band, 25 to 39
        </span>
        {first && last && (
          <span className="chart-daterange">
            {first.label.slice(0, 4)} to {last.label.slice(0, 4)}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 420px", minWidth: 0, height: 280 }}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartRows} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="label"
                ticks={yearTicks}
                tickFormatter={(l: string) => (l ? l.slice(0, 4) : "")}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
                domain={[0.2, 0.5]}
                width={42}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number | string, name: string) => {
                  if (typeof v !== "number" || !Number.isFinite(v)) return ["—", name];
                  return [`${(v * 100).toFixed(1)}%`, name];
                }}
                labelFormatter={(_l, p) => {
                  const r = p?.[0]?.payload as { quarter?: string } | undefined;
                  return r?.quarter
                    ? `Coverage rate, ${fmtMonthYear(r.quarter)}`
                    : "";
                }}
              />
              <ReferenceLine
                x={baselineLabel}
                stroke="var(--slate)"
                strokeDasharray="3 3"
                strokeOpacity={0.6}
                label={{
                  value: "Baseline",
                  position: "top",
                  fill: "var(--slate)",
                  fontSize: 10,
                }}
              />
              {/* Reference band first, then the two insight bands on top. */}
              <Line
                type="monotone"
                dataKey="35-39"
                name={BAND_META["35-39"].label}
                stroke={BAND_META["35-39"].color}
                strokeWidth={BAND_META["35-39"].strokeWidth}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="25-29"
                name={BAND_META["25-29"].label}
                stroke={BAND_META["25-29"].color}
                strokeWidth={BAND_META["25-29"].strokeWidth}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="30-34"
                name={BAND_META["30-34"].label}
                stroke={BAND_META["30-34"].color}
                strokeWidth={BAND_META["30-34"].strokeWidth}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div
          style={{
            flex: "0 1 240px",
            minWidth: 220,
            display: "flex",
            flexDirection: "column",
            gap: 12,
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
            Coverage rate since {baselineYear}
          </div>
          <StatCard
            label="25–29 (ABD eligible)"
            rangeLabel={rangeLabel(row25_29?.coverageThen, row25_29?.coverageNow)}
            deltaPp={row25_29?.coverageDeltaPp ?? null}
            valueColor="var(--sky)"
          />
          <StatCard
            label="30–34 (LHC applies)"
            rangeLabel={rangeLabel(row30_34?.coverageThen, row30_34?.coverageNow)}
            deltaPp={row30_34?.coverageDeltaPp ?? null}
            valueColor="var(--mid-blue)"
          />
        </div>
      </div>
      <p className="chart-source">
        Source: APRA Membership and Benefits (AgeCohort_HT); ABS Estimated Resident Population.
      </p>
      <p className="chart-source" style={{ marginTop: 4 }}>
        Note: 35–39 is shown as a stable reference cohort.
      </p>
    </div>
  );
}
