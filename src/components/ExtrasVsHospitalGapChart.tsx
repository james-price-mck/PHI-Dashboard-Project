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
import { BASELINE_QUARTER, computeExtrasHospitalGapSeries } from "../insights";
import type { NationalQuarter } from "../types";

type Props = {
  national: NationalQuarter[];
};

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 12,
};

export function ExtrasVsHospitalGapChart({ national }: Props) {
  const rows = useMemo(() => {
    const series = computeExtrasHospitalGapSeries(national, BASELINE_QUARTER);
    return series
      .filter((r) => r.quarter >= BASELINE_QUARTER)
      .map((r) => ({
        quarter: r.quarter,
        label: shortQuarterLabel(r.quarter),
        hospitalPp: r.hospitalPp,
        extrasPp: r.extrasPp,
        gapPp: r.gapPp,
      }));
  }, [national]);

  const first = rows[0];
  const last = rows.at(-1);
  const baselineLabel = shortQuarterLabel(BASELINE_QUARTER);

  const yearTicks = useMemo(() => {
    const seen = new Set<string>();
    const ticks: string[] = [];
    for (const r of rows) {
      const y = r.label.slice(0, 4);
      if (!seen.has(y)) {
        seen.add(y);
        ticks.push(r.label);
      }
    }
    return ticks;
  }, [rows]);

  return (
    <div
      className="chart-panel chart-panel--tall"
      role="img"
      aria-label={`Cumulative percentage-point change in hospital-cover and extras-cover share of population since ${baselineLabel.slice(0, 4)}. Extras outpaces hospital.`}
    >
      <div className="chart-toolbar-row">
        <span className="chart-title">
          Change in coverage share since {baselineLabel.slice(0, 4)} (points of population)
        </span>
        {first && last && (
          <span className="chart-daterange">
            {first.label.slice(0, 4)} to {last.label.slice(0, 4)}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 420px", minWidth: 0, height: 320 }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={rows} margin={{ top: 16, right: 16, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="label"
                ticks={yearTicks}
                tickFormatter={(l: string) => (l ? l.slice(0, 4) : "")}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} pts`}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
                width={54}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(_l, p) => {
                  const r = p?.[0]?.payload as { quarter?: string } | undefined;
                  return r?.quarter ? fmtMonthYear(r.quarter) : "";
                }}
                formatter={(val: number | string, name: string) => {
                  if (typeof val !== "number" || !Number.isFinite(val)) return ["—", name];
                  const s = val >= 0 ? "+" : "";
                  return [`${s}${val.toFixed(2)} pts`, name];
                }}
              />
              <ReferenceLine
                y={0}
                stroke="var(--slate)"
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
              <Line
                type="monotone"
                dataKey="hospitalPp"
                name="Hospital cover (points of population)"
                stroke="var(--mid-grey)"
                strokeWidth={1.8}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="extrasPp"
                name="Extras cover (points of population)"
                stroke="var(--slate)"
                strokeWidth={1.8}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="gapPp"
                name="Gap (extras − hospital)"
                stroke="var(--mid-blue)"
                strokeWidth={2.6}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div
          style={{
            flex: "0 1 220px",
            minWidth: 200,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingTop: 12,
          }}
        >
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
              Affordability-proxy gap (extras − hospital)
            </div>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 600,
                color: "var(--mid-blue)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {last?.gapPp != null
                ? `${last.gapPp >= 0 ? "+" : ""}${last.gapPp.toFixed(2)} pts`
                : "—"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--slate)" }}>
              Extras minus hospital — widened monotonically since the baseline.
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
              Extras, change since {baselineLabel.slice(0, 4)}
            </div>
            <div
              style={{
                fontSize: "1.15rem",
                fontWeight: 600,
                color: "var(--slate)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {last?.extrasPp != null
                ? `${last.extrasPp >= 0 ? "+" : ""}${last.extrasPp.toFixed(2)} pts`
                : "—"}
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
              Hospital, change since {baselineLabel.slice(0, 4)}
            </div>
            <div
              style={{
                fontSize: "1.15rem",
                fontWeight: 600,
                color: "var(--mid-grey)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {last?.hospitalPp != null
                ? `${last.hospitalPp >= 0 ? "+" : ""}${last.hospitalPp.toFixed(2)} pts`
                : "—"}
            </div>
          </div>
        </div>
      </div>
      <p className="chart-source">
        Source: APRA Private Health Insurance Membership Trends; ABS Estimated Resident
        Population (denominator).
      </p>
      <p className="chart-source" style={{ marginTop: 4 }}>
        Note: Mid Blue line is the gap (extras − hospital); hospital and extras are plotted as
        supporting series in Slate and Mid Grey.
      </p>
    </div>
  );
}
