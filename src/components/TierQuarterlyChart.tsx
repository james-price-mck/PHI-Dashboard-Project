import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { shortQuarterLabel } from "../format";
import type { TierKey, TierQuarter } from "../types";

// Muted McKinsey-style palette: gold warm, silver cool, bronze earthy, basic darker,
// legacy greyed out so it recedes once the post-reform picture stabilises in 2020-Q2.
const TIER_META: { key: TierKey; label: string; color: string }[] = [
  { key: "gold", label: "Gold", color: "#b89430" },
  { key: "silver", label: "Silver", color: "#7a8fa4" },
  { key: "bronze", label: "Bronze", color: "#a16b3f" },
  { key: "basic", label: "Basic", color: "#4a5661" },
  { key: "other", label: "Legacy (pre-reform)", color: "#c9ccd1" },
];

type Mode = "share" | "levels";

type Row = {
  quarter: string;
  total: number | null;
} & Partial<Record<string, number | null>>;

function buildRows(data: TierQuarter[], mode: Mode): Row[] {
  return data.map((d) => {
    const row: Row = { quarter: shortQuarterLabel(d.quarter), total: d.total_insured_persons };
    for (const t of TIER_META) {
      const raw = mode === "share" ? d.share[t.key] : d.insured_persons[t.key];
      row[t.label] = raw;
    }
    return row;
  });
}

export function TierQuarterlyChart({ data }: { data: TierQuarter[] }) {
  const [mode, setMode] = useState<Mode>("share");
  const rows = useMemo(() => buildRows(data, mode), [data, mode]);
  // Legacy reaches zero from 2020-Q2; mark the line so readers know the stable window.
  const mandatoryLabel = rows.find((r) => r.quarter === "2020 Q2")?.quarter;

  return (
    <div>
      <div className="chart-toolbar" style={{ marginBottom: 12, display: "flex", gap: 16 }}>
        <label>
          <input
            type="radio"
            checked={mode === "share"}
            onChange={() => setMode("share")}
          />{" "}
          Share of insured persons
        </label>
        <label>
          <input
            type="radio"
            checked={mode === "levels"}
            onChange={() => setMode("levels")}
          />{" "}
          Insured persons (levels)
        </label>
      </div>

      <div style={{ width: "100%", height: 420 }}>
        <ResponsiveContainer>
          {mode === "share" ? (
            <AreaChart data={rows} margin={{ top: 8, right: 24, bottom: 16, left: 8 }}>
              <CartesianGrid stroke="#eceef2" vertical={false} />
              <XAxis dataKey="quarter" minTickGap={24} />
              <YAxis
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                domain={[0, 1]}
              />
              <Tooltip
                formatter={(v: number | string) => {
                  if (typeof v !== "number" || !Number.isFinite(v)) return ["—"];
                  return [`${(v * 100).toFixed(1)}%`];
                }}
              />
              <Legend />
              {mandatoryLabel && (
                <ReferenceLine
                  x={mandatoryLabel}
                  stroke="#b06868"
                  strokeDasharray="4 4"
                  label={{
                    value: "Tiers mandatory",
                    position: "insideTopRight",
                    fill: "#b06868",
                    fontSize: 11,
                  }}
                />
              )}
              {TIER_META.map((t) => (
                <Area
                  key={t.key}
                  type="monotone"
                  dataKey={t.label}
                  stackId="1"
                  stroke={t.color}
                  fill={t.color}
                  fillOpacity={t.key === "other" ? 0.55 : 0.8}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={rows} margin={{ top: 8, right: 24, bottom: 16, left: 8 }}>
              <CartesianGrid stroke="#eceef2" vertical={false} />
              <XAxis dataKey="quarter" minTickGap={24} />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v.toLocaleString()
                }
              />
              <Tooltip
                formatter={(v: number | string) => {
                  if (typeof v !== "number" || !Number.isFinite(v)) return ["—"];
                  return [v.toLocaleString("en-AU", { maximumFractionDigits: 0 })];
                }}
              />
              <Legend />
              {mandatoryLabel && (
                <ReferenceLine
                  x={mandatoryLabel}
                  stroke="#b06868"
                  strokeDasharray="4 4"
                  label={{
                    value: "Tiers mandatory",
                    position: "insideTopRight",
                    fill: "#b06868",
                    fontSize: 11,
                  }}
                />
              )}
              {TIER_META.map((t) => (
                <Line
                  key={t.key}
                  type="monotone"
                  dataKey={t.label}
                  stroke={t.color}
                  strokeWidth={t.key === "other" ? 1.5 : 2.5}
                  strokeDasharray={t.key === "other" ? "4 4" : undefined}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
