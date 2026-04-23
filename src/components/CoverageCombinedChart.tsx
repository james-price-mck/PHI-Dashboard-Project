import { useMemo, useState } from "react";
import {
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
    // Prefer supplied share; fall back to insured/person denominator when share is absent.
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
  compact?: boolean;
};

export function CoverageCombinedChart({ data, compact }: Props) {
  const [mode, setMode] = useState<Mode>("share");
  const rows = useMemo(() => buildRows(data), [data]);
  const refRow = rows.find((r) => r.q === METHODOLOGY_REF_QUARTER);
  const height = compact ? 240 : 320;

  return (
    <div
      className={compact ? "chart-panel chart-panel--compact" : "chart-panel"}
      role="img"
      aria-label="Hospital cover and extras cover over time, share of population or people covered."
    >
      <div className="chart-toolbar-row">
        <span className="muted" style={{ fontSize: "0.75rem" }}>
          National trajectory
        </span>
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
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 8, right: 16, left: 4, bottom: compact ? 24 : 8 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis
            dataKey="label"
            interval={Math.max(0, Math.floor(rows.length / 8) - 1)}
            angle={compact ? 0 : -35}
            textAnchor={compact ? "middle" : "end"}
            height={compact ? 28 : 56}
            tick={{ fill: "var(--muted)", fontSize: 9 }}
            minTickGap={compact ? 8 : 24}
          />
          {mode === "share" ? (
            <YAxis
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              domain={[0, 0.7]}
              width={38}
            />
          ) : (
            <YAxis
              tickFormatter={(v) => (v / 1e6).toFixed(1) + "m"}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              width={40}
            />
          )}
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
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {mode === "share" ? (
            <>
              <Line
                type="monotone"
                dataKey="hospital_rate"
                name="Hospital cover"
                stroke="#2251ff"
                dot={false}
                strokeWidth={2.6}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="general_rate"
                name="Extras cover"
                stroke="#9e3c21"
                dot={false}
                strokeWidth={2.3}
                connectNulls
                isAnimationActive={false}
              />
            </>
          ) : (
            <>
              <Line
                type="monotone"
                dataKey="hospital_persons"
                name="Hospital cover"
                stroke="#2251ff"
                dot={false}
                strokeWidth={2.6}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="general_persons"
                name="Extras cover"
                stroke="#9e3c21"
                dot={false}
                strokeWidth={2.3}
                connectNulls
                isAnimationActive={false}
              />
            </>
          )}
          {refRow && (
            <ReferenceLine
              x={refRow.label}
              stroke="var(--chart-brick)"
              strokeDasharray="4 4"
              strokeOpacity={0.55}
              label={{
                value: "Jul 2023 — APRA AASB 17 (capital reporting; membership unaffected)",
                position: "top",
                fill: "var(--muted)",
                fontSize: 9,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
