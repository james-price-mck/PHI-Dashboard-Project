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
import { fmtInt, shortQuarterLabel } from "../format";
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

const BAND_META: Record<(typeof BANDS)[number], BandMeta> = {
  "25-29": { label: "25–29 (ABD discount)", color: "var(--mid-grey)", strokeWidth: 1.6 },
  "30-34": { label: "30–34 (LHC threshold)", color: "var(--mid-blue)", strokeWidth: 2.6 },
  "35-39": { label: "35–39", color: "var(--light-grey)", strokeWidth: 1.6 },
};

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 12,
};

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

  const row30_34 = shortfallRows.find((r) => r.band === "30-34");
  const first = chartRows[0];
  const last = chartRows.at(-1);
  const baselineLabel = shortQuarterLabel(baselineQuarter);

  return (
    <div className="chart-panel" style={{ marginTop: 12 }} role="region" aria-label="LHC-31 puzzle panel">
      <div className="chart-toolbar-row">
        <span className="chart-title">
          30–34 coverage fell despite LHC loading
        </span>
        {first && last && (
          <span className="chart-daterange">
            {first.label} – {last.label}
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
                    ? `Coverage rate · ${shortQuarterLabel(r.quarter)}`
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
              {/* Render supporting bands first; accent 30–34 on top. */}
              {(["25-29", "35-39"] as const).map((b) => (
                <Line
                  key={b}
                  type="monotone"
                  dataKey={b}
                  name={BAND_META[b].label}
                  stroke={BAND_META[b].color}
                  strokeWidth={BAND_META[b].strokeWidth}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
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
            30–34 band
          </div>
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
              Coverage rate (30–34)
            </div>
            <div
              style={{
                fontSize: "1.3rem",
                fontWeight: 600,
                color: "var(--ink)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row30_34?.coverageThen != null ? `${(row30_34.coverageThen * 100).toFixed(1)}%` : "—"}
              {" → "}
              {row30_34?.coverageNow != null ? `${(row30_34.coverageNow * 100).toFixed(1)}%` : "—"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--slate)" }}>
              {row30_34?.coverageDeltaPp != null
                ? `${row30_34.coverageDeltaPp >= 0 ? "+" : ""}${row30_34.coverageDeltaPp.toFixed(1)} pts since ${baselineLabel}`
                : ""}
            </div>
          </div>
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
              Shortfall vs baseline rate
            </div>
            <div
              style={{
                fontSize: "1.3rem",
                fontWeight: 600,
                color: "var(--mid-blue)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row30_34?.shortfallPersons != null
                ? `~${fmtInt(Math.round(row30_34.shortfallPersons / 1000) * 1000)} people`
                : "—"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--slate)" }}>
              30–34s missing from hospital cover if the {baselineLabel} rate had held.
            </div>
          </div>
        </div>
      </div>
      <p className="chart-source">
        Source: APRA Membership and Benefits (AgeCohort_HT); ABS Estimated Resident Population.
      </p>
      <p className="chart-source" style={{ marginTop: 4 }}>
        Note: 30–34 is the insight series (Mid Blue); 25–29 and 35–39 are supporting context.
        Shortfall counterfactual uses the {baselineLabel} coverage rate × latest population.
      </p>
    </div>
  );
}
