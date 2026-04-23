import { useMemo, useState } from "react";
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
import { METHODOLOGY_REF_QUARTER } from "../constants";
import { BASELINE_QUARTER } from "../insights";
import type { NationalQuarter } from "../types";
import { fmtInt, fmtMonthYear, fmtPct, shortQuarterLabel } from "../format";

type Mode = "share" | "levels";

type Row = {
  q: string;
  label: string;
  year: number;
  quarterNum: number;
  hospital_rate: number | null;
  general_rate: number | null;
  hospital_persons: number | null;
  general_persons: number | null;
};

function normalizeShare(v: number | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n > 1 ? n / 100 : n;
}

function buildRows(data: NationalQuarter[]): Row[] {
  return data.map((d) => {
    const dt = new Date(d.quarter);
    const year = dt.getUTCFullYear();
    const quarterNum = Math.floor(dt.getUTCMonth() / 3) + 1;
    return {
      q: d.quarter,
      label: shortQuarterLabel(d.quarter),
      year,
      quarterNum,
      hospital_rate:
        normalizeShare(d.hospital_treatment.share_of_population) ??
        (d.hospital_treatment.insured_persons != null &&
        d.hospital_treatment.population_denominator
          ? d.hospital_treatment.insured_persons / d.hospital_treatment.population_denominator
          : null),
      general_rate:
        normalizeShare(d.general_treatment.share_of_population) ??
        (d.general_treatment.insured_persons != null &&
        d.general_treatment.population_denominator
          ? d.general_treatment.insured_persons / d.general_treatment.population_denominator
          : null),
      hospital_persons: d.hospital_treatment.insured_persons,
      general_persons: d.general_treatment.insured_persons,
    };
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
  data: NationalQuarter[];
};

export function CoverageCombinedChart({ data }: Props) {
  const [mode, setMode] = useState<Mode>("share");
  // Anchor the chart to the mandatory-tiers baseline (2020 Q2) so the view
  // lines up with every other figure on the page.
  const rows = useMemo(
    () =>
      buildRows(data).filter((r) => r.q >= BASELINE_QUARTER),
    [data],
  );
  const refRow = rows.find((r) => r.q === METHODOLOGY_REF_QUARTER);
  const hospitalKey = mode === "share" ? "hospital_rate" : "hospital_persons";
  const extrasKey = mode === "share" ? "general_rate" : "general_persons";

  // Year-only X-axis ticks: keep one tick per calendar year (first occurrence).
  const yearTicks = useMemo(() => {
    const seen = new Set<number>();
    const ticks: string[] = [];
    for (const r of rows) {
      if (!seen.has(r.year)) {
        seen.add(r.year);
        ticks.push(r.label);
      }
    }
    return ticks;
  }, [rows]);

  // Tight share-mode domain around where the data actually lives.
  const shareDomain = useMemo<[number, number]>(() => {
    const vals: number[] = [];
    for (const r of rows) {
      if (r.hospital_rate != null) vals.push(r.hospital_rate);
      if (r.general_rate != null) vals.push(r.general_rate);
    }
    if (vals.length === 0) return [0.3, 0.7];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    // Pad by 1.5 pp either side, then round to the nearest 1 pp.
    const pad = 0.015;
    const lo = Math.floor((min - pad) * 100) / 100;
    const hi = Math.ceil((max + pad) * 100) / 100;
    return [lo, hi];
  }, [rows]);

  const first = rows[0];
  const last = rows.at(-1);
  const latestHospital =
    mode === "share" ? last?.hospital_rate ?? null : last?.hospital_persons ?? null;
  const latestExtras =
    mode === "share" ? last?.general_rate ?? null : last?.general_persons ?? null;

  function fmtLatest(v: number | null): string {
    if (v == null) return "—";
    return mode === "share" ? `${fmtPct(v)}%` : `${(v / 1e6).toFixed(2)}m`;
  }

  return (
    <div
      className="chart-panel"
      role="img"
      aria-label="Hospital cover and extras cover over time, share of population or people covered."
    >
      <div className="chart-toolbar-row">
        <span className="chart-title">
          Hospital &amp; extras — {mode === "share" ? "share of population covered" : "people covered"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {first && last && (
            <span className="chart-daterange">
              {first.label.slice(0, 4)} to {last.label.slice(0, 4)}
            </span>
          )}
          <div className="segmented" role="group" aria-label="Chart metric">
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
              People (m)
            </button>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
        <div style={{ flex: "1 1 auto", minWidth: 0, height: 320 }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={rows} margin={{ top: 20, right: 16, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="label"
                ticks={yearTicks}
                tickFormatter={(l: string) => (l ? l.slice(0, 4) : "")}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--rule)" }}
                minTickGap={16}
                padding={{ left: 8, right: 8 }}
              />
              <YAxis
                yAxisId="share"
                hide={mode !== "share"}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
                domain={shareDomain}
                tickCount={6}
                width={40}
              />
              <YAxis
                yAxisId="levels"
                hide={mode !== "levels"}
                tickFormatter={(v) => (v / 1e6).toFixed(1) + "m"}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
                domain={["auto", "auto"]}
                width={44}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(val: number, name: string) => {
                  if (mode === "share") return [`${fmtPct(val)}% of population`, name];
                  return [`${fmtInt(val)} people covered`, name];
                }}
                labelFormatter={(_l, p) => {
                  const r = p?.[0]?.payload as Row | undefined;
                  return r ? fmtMonthYear(r.q) : "";
                }}
              />
              <Line
                yAxisId={mode === "share" ? "share" : "levels"}
                type="monotone"
                dataKey={extrasKey}
                name="Extras cover"
                stroke="var(--mid-grey)"
                dot={false}
                strokeWidth={1.8}
                strokeDasharray="6 4"
                connectNulls
                isAnimationActive={false}
              />
              <Line
                yAxisId={mode === "share" ? "share" : "levels"}
                type="monotone"
                dataKey={hospitalKey}
                name="Hospital cover"
                stroke="var(--mid-blue)"
                dot={false}
                strokeWidth={2.6}
                connectNulls
                isAnimationActive={false}
              />
              {refRow && (
                <ReferenceLine
                  yAxisId={mode === "share" ? "share" : "levels"}
                  x={refRow.label}
                  stroke="var(--slate)"
                  strokeDasharray="3 3"
                  strokeOpacity={0.55}
                  label={{
                    value: "Sep 2023, first APRA bundle under AASB 17 (membership unaffected)",
                    position: "top",
                    fill: "var(--slate)",
                    fontSize: 10,
                  }}
                />
              )}
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
              minWidth: 132,
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
              Latest, {fmtMonthYear(last.q)}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: "var(--mid-blue)",
                    borderRadius: 2,
                    display: "inline-block",
                    flex: "0 0 auto",
                  }}
                />
                <span style={{ color: "var(--ink)", fontWeight: 600 }}>Hospital</span>
              </div>
              <div
                style={{
                  color: "var(--slate)",
                  fontVariantNumeric: "tabular-nums",
                  paddingLeft: 16,
                }}
              >
                {fmtLatest(latestHospital)}
              </div>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: "var(--mid-grey)",
                    borderRadius: 2,
                    display: "inline-block",
                    flex: "0 0 auto",
                  }}
                />
                <span style={{ color: "var(--ink)", fontWeight: 600 }}>Extras</span>
              </div>
              <div
                style={{
                  color: "var(--slate)",
                  fontVariantNumeric: "tabular-nums",
                  paddingLeft: 16,
                }}
              >
                {fmtLatest(latestExtras)}
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="chart-source">
        Source: APRA Private Health Insurance Membership Trends; ABS Estimated Resident
        Population (denominator).
      </p>
      <p className="chart-source" style={{ marginTop: 4 }}>
        Note: Hospital cover and extras are separate series — a person can hold both, so the two
        lines are not additive.
      </p>
    </div>
  );
}
