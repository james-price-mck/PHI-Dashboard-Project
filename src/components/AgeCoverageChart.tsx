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
import { AGE_YOY_GROUPS, computeAgeYoyGrowthSeries } from "../insights";

const GROUP_META: Record<string, { label: string; color: string }> = {
  u35: { label: "Under 35", color: "var(--accent-2)" },
  m35_64: { label: "35–64", color: "var(--ink)" },
  o65: { label: "65 and over", color: "var(--chart-blue-3)" },
};

type ChartRow = {
  quarter: string;
  u35: number | null;
  m35_64: number | null;
  o65: number | null;
};

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
      .filter((r) => r.u35 != null || r.m35_64 != null || r.o65 != null)
      .map((r) => ({
        quarter: shortQuarterLabel(r.quarter),
        u35: r.u35,
        m35_64: r.m35_64,
        o65: r.o65,
      }));
  }, [data]);

  const last = chartData.at(-1);

  return (
    <div
      className="chart-panel chart-panel--tall"
      role="img"
      aria-label="Year on year growth in insured persons by broad age group. Under thirty fives consistently outpace older cohorts."
    >
      <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
        <div style={{ flex: "1 1 auto", minWidth: 0, height: 320 }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="quarter"
                minTickGap={24}
                tick={{ fill: "var(--muted)", fontSize: 10 }}
              />
              <YAxis
                tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                width={52}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number | string, name: string) => {
                  if (typeof v !== "number" || !Number.isFinite(v)) return ["—", name];
                  const sign = v >= 0 ? "+" : "";
                  return [`${sign}${(v * 100).toFixed(2)}%`, name];
                }}
                labelFormatter={(l: string) => `Year to ${l}`}
              />
              <ReferenceLine
                y={0}
                stroke="var(--chart-ink-muted)"
                strokeDasharray="3 3"
                strokeOpacity={0.7}
              />
              {AGE_YOY_GROUPS.map((g) => (
                <Line
                  key={g.key}
                  type="monotone"
                  dataKey={g.key}
                  name={GROUP_META[g.key].label}
                  stroke={GROUP_META[g.key].color}
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
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
              minWidth: 130,
              paddingTop: 12,
              paddingBottom: 8,
            }}
          >
            <div style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Latest YoY — {last.quarter}
            </div>
            {AGE_YOY_GROUPS.map((g) => {
              const v = last[g.key];
              const num = typeof v === "number" ? v : null;
              const meta = GROUP_META[g.key];
              return (
                <div key={g.key} style={{ fontSize: 12, lineHeight: 1.2 }}>
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
                      color: "var(--muted)",
                      fontVariantNumeric: "tabular-nums",
                      paddingLeft: 16,
                    }}
                  >
                    {num != null ? `${num >= 0 ? "+" : ""}${(num * 100).toFixed(2)}%` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
