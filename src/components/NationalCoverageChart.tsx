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
import type { NationalQuarter } from "../types";
import { fmtPct, shortQuarterLabel } from "../format";

type Row = {
  q: string;
  label: string;
  hospital_rate: number | null;
  general_rate: number | null;
};

function buildRows(data: NationalQuarter[]): Row[] {
  return data.map((d) => ({
    q: d.quarter,
    label: shortQuarterLabel(d.quarter),
    hospital_rate: d.hospital_treatment.share_of_population,
    general_rate: d.general_treatment.share_of_population,
  }));
}

/** First row at/after this quarter end used as visible break for the Jul 2023 APRA change. */
export const METHODOLOGY_REF_QUARTER = "2023-09-30";

export function NationalCoverageChart({ data }: { data: NationalQuarter[] }) {
  const rows = buildRows(data);
  const refRow = rows.find((r) => r.q === METHODOLOGY_REF_QUARTER);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis
          dataKey="label"
          interval={Math.max(0, Math.floor(rows.length / 8) - 1)}
          angle={-40}
          textAnchor="end"
          height={64}
          tick={{ fill: "var(--muted)", fontSize: 10 }}
        />
        <YAxis
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          domain={[0, 0.65]}
        />
        <Tooltip
          formatter={(val: number, name) => [fmtPct(val) + " of population", name]}
          labelFormatter={(_l, p) => {
            const r = p?.[0]?.payload as Row | undefined;
            return r ? `Quarter ending ${r.q}` : "";
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="hospital_rate"
          name="Hospital (share of population)"
          stroke="var(--accent)"
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="general_rate"
          name="General (extras) (share of population)"
          stroke="#6b6f7a"
          dot={false}
          strokeWidth={2}
        />
        {refRow && (
          <ReferenceLine
            x={refRow.label}
            stroke="#c45c3e"
            strokeDasharray="4 4"
            label={{
              value: "APRA 2023 change (per APRA documentation)",
              position: "top",
              fill: "#8a4a3a",
              fontSize: 10,
            }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
