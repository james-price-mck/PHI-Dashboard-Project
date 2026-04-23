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
import type { NationalQuarter } from "../types";
import { fmtInt, fmtPct, shortQuarterLabel } from "../format";

type Mode = "share" | "levels";

type Row = {
  q: string;
  label: string;
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
  return data.map((d) => ({
    q: d.quarter,
    label: shortQuarterLabel(d.quarter),
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
  }));
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
  const rows = useMemo(() => buildRows(data), [data]);
  const refRow = rows.find((r) => r.q === METHODOLOGY_REF_QUARTER);
  const hospitalKey = mode === "share" ? "hospital_rate" : "hospital_persons";
  const extrasKey = mode === "share" ? "general_rate" : "general_persons";

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
        <span className="muted" style={{ fontSize: "0.75rem" }}>
          Hospital &amp; extras — {mode === "share" ? "share of population" : "people covered"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {first && last && (
            <span className="chart-daterange">
              {first.label} – {last.label}
            </span>
          )}
          <div className="segmented" role="group" aria-label="Chart metric">
            <button
              type="button"
              aria-pressed={mode === "share"}
              onClick={() => setMode("share")}
            >
              % of population
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
                interval={Math.max(0, Math.floor(rows.length / 8) - 1)}
                angle={-35}
                textAnchor="end"
                height={56}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
                minTickGap={24}
              />
              <YAxis
                yAxisId="share"
                hide={mode !== "share"}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
                domain={[0.3, 0.7]}
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
                  return r ? `Quarter ending ${shortQuarterLabel(r.q)}` : "";
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
                    value: "Sep 2023 — first APRA bundle under AASB 17 (membership unaffected)",
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
              Latest — {last.label}
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
        Source: APRA Private Health Insurance Membership Trends; ABS Estimated Resident Population
        (denominator). Note: Hospital cover and extras are separate series; a person can hold
        both, so the two lines are not additive.
      </p>
    </div>
  );
}
