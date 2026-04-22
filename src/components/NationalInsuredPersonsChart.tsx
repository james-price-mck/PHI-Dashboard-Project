import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NationalQuarter } from "../types";
import { fmtInt, shortQuarterLabel } from "../format";

type Row = { label: string; q: string; hospital: number | null; general: number | null };

export function NationalInsuredPersonsChart({ data }: { data: NationalQuarter[] }) {
  const rows: Row[] = data.map((d) => ({
    q: d.quarter,
    label: shortQuarterLabel(d.quarter),
    hospital: d.hospital_treatment.insured_persons,
    general: d.general_treatment.insured_persons,
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
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
          tickFormatter={(v) => (v / 1e6).toFixed(1) + "m"}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
        />
        <Tooltip
          formatter={(v: number, name) => [fmtInt(v) + " persons", name]}
          labelFormatter={(_l, p) => {
            const r = p?.[0]?.payload as Row | undefined;
            return r ? `Quarter ending ${r.q}` : "";
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="hospital"
          name="Hospital — insured persons"
          stroke="var(--accent)"
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="general"
          name="General (extras) — insured persons"
          stroke="#6b6f7a"
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
