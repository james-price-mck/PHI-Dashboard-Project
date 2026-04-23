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
import { shortQuarterLabel } from "../format";
import type { AgeCoverageQuarter } from "../types";
import {
  AGE_YOY_GROUPS,
  computeAgeYoyGrowthSeries,
  type AgeYoyCohortKey,
} from "../insights";

type GroupMeta = { label: string; color: string; strokeWidth: number };

/**
 * Single-highlight palette: 65+ is the insight series (the growth engine),
 * shown in Mid Blue. Other decision-age cohorts are supporting context in
 * graded greys (Slate > Mid Grey > Light Grey) so overlapping lines remain
 * distinguishable.
 */
const GROUP_META: Record<AgeYoyCohortKey, GroupMeta> = {
  under25: { label: "Under 25 (dependants)", color: "var(--light-grey)", strokeWidth: 1.25 },
  a25_34: { label: "25–34", color: "var(--slate)", strokeWidth: 1.5 },
  a35_49: { label: "35–49", color: "var(--mid-grey)", strokeWidth: 1.5 },
  a50_64: { label: "50–64", color: "var(--light-grey)", strokeWidth: 1.5 },
  o65: { label: "65 and over", color: "var(--mid-blue)", strokeWidth: 2.6 },
};

/** Cohorts shown on the chart (Under-25 is excluded and referenced in the footnote). */
const VISIBLE_KEYS: AgeYoyCohortKey[] = ["a25_34", "a35_49", "a50_64", "o65"];

type ChartRow = { quarter: string } & { [K in AgeYoyCohortKey]: number | null };

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 12,
};

type Props = {
  data: AgeCoverageQuarter[];
};

export function AgeCoverageChart({ data }: Props) {
  const chartData: ChartRow[] = useMemo(() => {
    const series = computeAgeYoyGrowthSeries(data);
    return series
      .filter((r) => VISIBLE_KEYS.some((k) => r[k] != null))
      .map((r) => {
        const out = { quarter: shortQuarterLabel(r.quarter) } as ChartRow;
        for (const g of AGE_YOY_GROUPS) {
          out[g.key] = r[g.key];
        }
        return out;
      });
  }, [data]);

  const first = chartData[0];
  const last = chartData.at(-1);

  return (
    <div
      className="chart-panel chart-panel--tall"
      role="img"
      aria-label="Trailing four-quarter year-on-year growth in people with hospital cover, by decision-age cohort. The 65-and-over cohort has grown consistently faster than younger decision-age cohorts."
    >
      <div className="chart-toolbar-row">
        <span className="chart-title">
          YoY growth in people with hospital cover, by decision-age cohort
        </span>
        {first && last && (
          <span className="chart-daterange">
            {first.quarter} – {last.quarter}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
        <div style={{ flex: "1 1 auto", minWidth: 0, height: 320 }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="quarter"
                minTickGap={24}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
              />
              <YAxis
                tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
                width={52}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number | string, name: string) => {
                  if (typeof v !== "number" || !Number.isFinite(v)) return ["—", name];
                  const sign = v >= 0 ? "+" : "";
                  return [`${sign}${(v * 100).toFixed(1)}%`, name];
                }}
                labelFormatter={(l: string) => `Year to ${l}`}
              />
              <ReferenceLine
                y={0}
                stroke="var(--slate)"
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
              {/* Render supporting series first so the accent (65+) sits on top. */}
              {VISIBLE_KEYS.filter((k) => k !== "o65").map((k) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  name={GROUP_META[k].label}
                  stroke={GROUP_META[k].color}
                  strokeWidth={GROUP_META[k].strokeWidth}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
              <Line
                type="monotone"
                dataKey="o65"
                name={GROUP_META.o65.label}
                stroke={GROUP_META.o65.color}
                strokeWidth={GROUP_META.o65.strokeWidth}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {last && (
          <div
            aria-hidden
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 8,
              minWidth: 140,
              paddingTop: 12,
              paddingBottom: 8,
            }}
          >
            <div
              style={{
                color: "var(--slate)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            >
              Latest YoY — {last.quarter}
            </div>
            {VISIBLE_KEYS.map((k) => {
              const v = last[k];
              const num = typeof v === "number" ? v : null;
              const meta = GROUP_META[k];
              return (
                <div key={k} style={{ fontSize: 12, lineHeight: 1.2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        background: meta.color,
                        borderRadius: 2,
                        display: "inline-block",
                        flex: "0 0 auto",
                      }}
                    />
                    <span style={{ color: "var(--ink)", fontWeight: 600 }}>{meta.label}</span>
                  </div>
                  <div
                    style={{
                      color: "var(--slate)",
                      fontVariantNumeric: "tabular-nums",
                      paddingLeft: 16,
                    }}
                  >
                    {num != null ? `${num >= 0 ? "+" : ""}${(num * 100).toFixed(1)}%` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="chart-source">
        Source: APRA Membership and Benefits (AgeCohort_HT); ABS Estimated Resident Population.
      </p>
      <p className="chart-source" style={{ marginTop: 4 }}>
        Note: Trailing-four-quarter year-on-year growth in people with hospital cover by
        decision-age cohort. 65-and-over is highlighted in Mid Blue; younger decision-age
        cohorts are shown in muted greys. Under-25s (dependants on family policies) are
        excluded from the chart; their series tracks household formation rather than
        independent buying decisions. Dashed Slate line is the zero-growth baseline.
      </p>
    </div>
  );
}
