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
  { key: "gold", label: "Gold", color: "var(--tier-gold)" },
  { key: "silver", label: "Silver", color: "var(--tier-silver)" },
  { key: "bronze", label: "Bronze", color: "var(--tier-bronze)" },
  { key: "basic", label: "Basic", color: "var(--tier-basic)" },
  {
    key: "other",
    label: "Legacy (pre-reform, migrating out 2019–2020)",
    color: "var(--tier-legacy)",
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
        <span className="chart-title">
          Hospital cover — product-tier mix
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {rows.length > 0 && (
            <span className="chart-daterange">
              {rows[0].quarter.slice(0, 4)} – {rows[rows.length - 1].quarter.slice(0, 4)}
            </span>
          )}
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
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
      <div style={{ flex: "1 1 auto", height: 400, minWidth: 0 }}>
        <ResponsiveContainer>
          {mode === "share" ? (
            <AreaChart data={rows} margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="quarter" minTickGap={24} tick={{ fill: "var(--slate)", fontSize: 11 }} />
              <YAxis
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                domain={[0, 1]}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
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
                  stroke="var(--muted)"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
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
                  strokeWidth={1.5}
                  fill={t.color}
                  fillOpacity={t.key === "other" ? 0.35 : 0.75}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="quarter" minTickGap={24} tick={{ fill: "var(--slate)", fontSize: 11 }} />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v.toLocaleString()
                }
                tick={{ fill: "var(--slate)", fontSize: 11 }}
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
                  stroke="var(--muted)"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
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
        <div
          className="tier-end-labels"
          aria-hidden
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 6,
            paddingTop: 8,
            paddingBottom: 24,
            minWidth: 92,
          }}
        >
          {latestShares
            .filter((s) => !s.label.startsWith("Legacy") || (s.share ?? 0) > 0.005)
            .map((s) => {
              const meta = TIER_META.find((t) => t.label === s.label);
              return (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    lineHeight: 1.15,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      background: meta?.color ?? "var(--muted)",
                      borderRadius: 2,
                      flex: "0 0 auto",
                    }}
                  />
                  <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                    {s.label.split("(")[0].trim()}
                  </span>
                  <span style={{ color: "var(--muted)", marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
                    {s.share != null ? `${fmtPct(s.share)}%` : "—"}
                  </span>
                </div>
              );
            })}
        </div>
      )}
      </div>
      <p className="chart-source">
        Source: Department of Health, Disability and Ageing — PHI Reform Data Quarterly Trends
        Report (HT by Product Tier).
      </p>
      <p className="chart-source" style={{ marginTop: 4 }}>
        Note: Legacy is the pre-reform product set tapering to zero over 2019–2020; the stable
        mix reads cleanly from 2020 Q2 onward.
      </p>
    </div>
  );
}
