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
import { shortQuarterLabel } from "../format";
import type { AgeCoverageQuarter } from "../types";

// ETL collapses APRA's 80/85/90/95 bands into "80+" to match ABS ERP_Q's highest band.
const BAND_ORDER = [
  "0-4",
  "5-9",
  "10-14",
  "15-19",
  "20-24",
  "25-29",
  "30-34",
  "35-39",
  "40-44",
  "45-49",
  "50-54",
  "55-59",
  "60-64",
  "65-69",
  "70-74",
  "75-79",
  "80+",
];

const GROUPS: { label: string; bands: string[]; color: string }[] = [
  { label: "Under 25", bands: ["0-4", "5-9", "10-14", "15-19", "20-24"], color: "#7a9abf" },
  { label: "25–34", bands: ["25-29", "30-34"], color: "#4b79a6" },
  { label: "35–49", bands: ["35-39", "40-44", "45-49"], color: "#2f5b84" },
  { label: "50–64", bands: ["50-54", "55-59", "60-64"], color: "#1f3d5c" },
  {
    label: "65 and over",
    bands: ["65-69", "70-74", "75-79", "80+"],
    color: "#9c3f3f",
  },
];

type GroupedPoint = {
  quarter: string;
  [groupLabel: string]: number | string | null;
};

function groupedCoverage(quarters: AgeCoverageQuarter[]): GroupedPoint[] {
  return quarters.map((q) => {
    const row: GroupedPoint = { quarter: shortQuarterLabel(q.quarter) };
    for (const g of GROUPS) {
      let insured = 0;
      let pop = 0;
      for (const b of g.bands) {
        const band = q.bands[b];
        if (band) {
          insured += band.insured_persons;
          pop += band.population;
        }
      }
      row[g.label] = pop > 0 ? insured / pop : null;
    }
    return row;
  });
}

function latestPerBand(quarters: AgeCoverageQuarter[]) {
  const last = quarters.at(-1);
  if (!last) return [];
  return BAND_ORDER.filter((b) => last.bands[b]).map((b) => ({
    band: b,
    rate: last.bands[b].coverage_rate,
  }));
}

export function AgeCoverageChart({ data }: { data: AgeCoverageQuarter[] }) {
  const [mode, setMode] = useState<"trend" | "latest">("trend");
  const trend = useMemo(() => groupedCoverage(data), [data]);
  const latest = useMemo(() => latestPerBand(data), [data]);
  const reformYear = "2019-04-01";
  const reformLabel = trend.find((t) => t.quarter.endsWith("Q2")) ? "Reforms" : null;

  return (
    <div>
      <div className="chart-toolbar" style={{ marginBottom: 12, display: "flex", gap: 12 }}>
        <label>
          <input
            type="radio"
            checked={mode === "trend"}
            onChange={() => setMode("trend")}
          />{" "}
          Trend by age group
        </label>
        <label>
          <input
            type="radio"
            checked={mode === "latest"}
            onChange={() => setMode("latest")}
          />{" "}
          Latest quarter, all bands
        </label>
      </div>

      <div style={{ width: "100%", height: 380 }}>
        <ResponsiveContainer>
          {mode === "trend" ? (
            <LineChart data={trend} margin={{ top: 8, right: 24, bottom: 16, left: 8 }}>
              <CartesianGrid stroke="#eceef2" vertical={false} />
              <XAxis dataKey="quarter" minTickGap={24} />
              <YAxis
                tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                domain={[0, 0.8]}
              />
              <Tooltip
                formatter={(v: number | string) => {
                  if (typeof v !== "number" || !Number.isFinite(v)) return ["—"];
                  return [`${(v * 100).toFixed(1)}%`];
                }}
              />
              <Legend />
              {reformLabel && (
                <ReferenceLine
                  x={shortQuarterLabel(reformYear)}
                  stroke="#b06868"
                  strokeDasharray="4 4"
                  label={{ value: "Tier reforms", position: "insideTop", fill: "#b06868", fontSize: 11 }}
                />
              )}
              {GROUPS.map((g) => (
                <Line
                  key={g.label}
                  type="monotone"
                  dataKey={g.label}
                  stroke={g.color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          ) : (
            <LineChart
              data={latest}
              margin={{ top: 8, right: 24, bottom: 16, left: 8 }}
              layout="horizontal"
            >
              <CartesianGrid stroke="#eceef2" vertical={false} />
              <XAxis dataKey="band" interval={0} angle={-40} textAnchor="end" height={60} />
              <YAxis
                tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                domain={[0, 0.9]}
              />
              <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#2f5b84"
                strokeWidth={2.5}
                dot={{ r: 3, stroke: "#2f5b84", fill: "#2f5b84" }}
                isAnimationActive={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
