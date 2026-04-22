import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AgeQuarter } from "../types";
import { fmtInt } from "../format";

function sortBands(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const sa = a.match(/^(\d+)/);
    const sb = b.match(/^(\d+)/);
    if (sa && sb) return parseInt(sa[1], 10) - parseInt(sb[1], 10);
    return a.localeCompare(b);
  });
}

export function AgeDistributionChart({ data }: { data: AgeQuarter[] }) {
  const latest = useMemo(() => (data.length ? data[data.length - 1] : null), [data]);

  const rows = useMemo(() => {
    if (!latest) return [];
    const keys = sortBands(Object.keys(latest.hospital_insured_by_age_band));
    return keys.map((age) => ({
      age,
      persons: latest.hospital_insured_by_age_band[age],
    }));
  }, [latest]);

  if (!latest) return <p className="muted">No age breakdown available.</p>;

  return (
    <div>
      <p className="muted" style={{ marginTop: 0, marginBottom: 8 }}>
        Hospital treatment — insured persons by age band (quarter ending <strong>{latest.quarter}</strong>).
        Administrative counts (not the Coverage Survey).
      </p>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 28, left: 8, bottom: 8 }}
        >
          <CartesianGrid stroke="var(--grid)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(n) => fmtInt(n)}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
          />
          <YAxis
            dataKey="age"
            type="category"
            width={40}
            tick={{ fill: "var(--muted)", fontSize: 9 }}
          />
          <Tooltip
            formatter={(v: number) => [fmtInt(v) + " persons", "Hospital"]}
            labelFormatter={() => "Age band (years)"}
          />
          <Bar dataKey="persons" fill="var(--accent)" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
