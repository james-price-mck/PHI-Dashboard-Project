import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtPct, shortQuarterLabel } from "../format";
import type { TierKey, TierQuarter } from "../types";

const TIER_META: { key: TierKey; label: string; color: string }[] = [
  { key: "gold", label: "Gold", color: "#afa96e" },
  { key: "silver", label: "Silver", color: "#7b868c" },
  { key: "bronze", label: "Bronze", color: "#9e3c21" },
  { key: "basic", label: "Basic", color: "#051c2c" },
  {
    key: "other",
    label: "Legacy (pre-reform, migrating out 2019–2020)",
    color: "#c9ccd1",
  },
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

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 12,
};

type Props = {
  data: TierQuarter[];
};

export function TierQuarterlyChart({ data }: Props) {
  const [mode, setMode] = useState<Mode>("share");
  const rows = useMemo(() => buildRows(data, mode), [data, mode]);
  const mandatoryLabel = rows.find((r) => r.quarter === "2020 Q2")?.quarter;
  const latest = data.at(-1);

  const latestShares = useMemo(() => {
    if (!latest) return [];
    return TIER_META.map((t) => ({
      label: t.label,
      share: latest.share[t.key],
    })).filter((x) => x.share != null && x.share > 0);
  }, [latest]);

  return (
    <div
      role="img"
      aria-label="Stacked hospital cover product tier mix over time, gold share falling and silver and bronze rising."
    >
      <div className="chart-toolbar-row">
        <span className="muted" style={{ fontSize: "0.75rem" }}>
          Hospital cover — product tier
        </span>
        <div className="segmented" role="group" aria-label="Tier chart mode">
          <button
            type="button"
            aria-pressed={mode === "share"}
            onClick={() => setMode("share")}
          >
            Share
          </button>
          <button
            type="button"
            aria-pressed={mode === "levels"}
            onClick={() => setMode("levels")}
          >
            People covered
          </button>
        </div>
      </div>

      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer>
          {mode === "share" ? (
            <AreaChart data={rows} margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="quarter" minTickGap={24} tick={{ fill: "var(--muted)", fontSize: 10 }} />
              <YAxis
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                domain={[0, 1]}
                tick={{ fill: "var(--muted)", fontSize: 10 }}
                width={40}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number | string) => {
                  if (typeof v !== "number" || !Number.isFinite(v)) return ["—"];
                  return [`${(v * 100).toFixed(1)}%`];
                }}
              />
              {mandatoryLabel && (
                <ReferenceLine
                  x={mandatoryLabel}
                  stroke="var(--chart-brick)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.45}
                  label={{
                    value: "Tiers mandatory (Apr 2020)",
                    position: "insideTopRight",
                    fill: "var(--muted)",
                    fontSize: 10,
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
                  fillOpacity={t.key === "other" ? 0.35 : 0.85}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="quarter" minTickGap={24} tick={{ fill: "var(--muted)", fontSize: 10 }} />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v.toLocaleString()
                }
                tick={{ fill: "var(--muted)", fontSize: 10 }}
                width={44}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number | string) => {
                  if (typeof v !== "number" || !Number.isFinite(v)) return ["—"];
                  return [v.toLocaleString("en-AU", { maximumFractionDigits: 0 })];
                }}
              />
              {mandatoryLabel && (
                <ReferenceLine
                  x={mandatoryLabel}
                  stroke="var(--chart-brick)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.45}
                  label={{
                    value: "Tiers mandatory (Apr 2020)",
                    position: "insideTopRight",
                    fill: "var(--muted)",
                    fontSize: 10,
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
      {mode === "share" && latestShares.length > 0 && (
        <div className="tier-latest-row" aria-hidden>
          <span>
            <strong>Latest quarter</strong> —{" "}
            {latestShares.map((s, i) => (
              <span key={s.label}>
                {i > 0 ? " · " : ""}
                {s.label.split("(")[0].trim()}{" "}
                <strong>{s.share != null ? `${fmtPct(s.share)}%` : "—"}</strong>
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
