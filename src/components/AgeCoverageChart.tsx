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
import { fmtPct, shortQuarterLabel } from "../format";
import type { AgeCoverageQuarter } from "../types";

const THREE_GROUPS: { key: string; label: string; bands: string[]; color: string }[] = [
  {
    key: "u35",
    label: "Under 35",
    bands: [
      "0-4",
      "5-9",
      "10-14",
      "15-19",
      "20-24",
      "25-29",
      "30-34",
    ],
    color: "var(--accent-2)",
  },
  {
    key: "m35_64",
    label: "35–64",
    bands: ["35-39", "40-44", "45-49", "50-54", "55-59", "60-64"],
    color: "var(--accent)",
  },
  {
    key: "o65",
    label: "65 and over",
    bands: ["65-69", "70-74", "75-79", "80+"],
    color: "var(--chart-brick)",
  },
];

type Row = Record<string, string | number | null>;

function aggregateTrend(quarters: AgeCoverageQuarter[]): Row[] {
  return quarters.map((q) => {
    const row: Row = { quarter: shortQuarterLabel(q.quarter) };
    for (const g of THREE_GROUPS) {
      let insured = 0;
      let pop = 0;
      for (const b of g.bands) {
        const band = q.bands[b];
        if (band) {
          insured += band.insured_persons;
          pop += band.population;
        }
      }
      row[g.key] = pop > 0 ? insured / pop : null;
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
  data: AgeCoverageQuarter[];
};

export function AgeCoverageChart({ data }: Props) {
  const trend = useMemo(() => aggregateTrend(data), [data]);
  const reformLabel = shortQuarterLabel("2019-04-01");
  const last = trend.at(-1);

  return (
    <div
      className="chart-panel chart-panel--tall"
      role="img"
      aria-label="Hospital cover rate by broad age group over time; under thirty five rises while older groups are flatter."
    >
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={trend} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="quarter" minTickGap={24} tick={{ fill: "var(--muted)", fontSize: 10 }} />
          <YAxis
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            domain={[0, 0.85]}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            width={44}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number | string) => {
              if (typeof v !== "number" || !Number.isFinite(v)) return ["—"];
              return [`${(v * 100).toFixed(1)}%`];
            }}
          />
          <ReferenceLine
            x={reformLabel}
            stroke="var(--chart-brick)"
            strokeDasharray="4 4"
            strokeOpacity={0.45}
            label={{
              value: "Tier reforms",
              position: "insideTopLeft",
              fill: "var(--muted)",
              fontSize: 10,
            }}
          />
          {THREE_GROUPS.map((g) => (
            <Line
              key={g.key}
              type="monotone"
              dataKey={g.key}
              name={g.label}
              stroke={g.color}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {last && (
        <div className="tier-latest-row" aria-hidden>
          <span>
            <strong>Latest</strong> —{" "}
            {THREE_GROUPS.map((g, i) => {
              const v = last[g.key];
              return (
                <span key={g.key}>
                  {i > 0 ? " · " : ""}
                  {g.label} <strong>{v != null && typeof v === "number" ? `${fmtPct(v)}%` : "—"}</strong>
                </span>
              );
            })}
          </span>
        </div>
      )}
    </div>
  );
}
