import { useMemo, useState } from "react";
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
import type { JurisdictionQuarter } from "../types";
import { fmtPct, shortQuarterLabel } from "../format";

const DEFAULT_KEYS: string[] = ["NSW_ACT", "VIC", "QLD", "WA", "AUST"];

const LABELS: Record<string, string> = {
  NSW_ACT: "NSW & ACT",
  VIC: "VIC",
  QLD: "QLD",
  SA_NT: "SA & NT",
  WA: "WA",
  TAS: "TAS",
  ACT: "ACT",
  NT: "NT",
  AUST: "Australia (hospital, national table)",
};

const COLORS: Record<string, string> = {
  NSW_ACT: "var(--accent)",
  VIC: "#1f6b8a",
  QLD: "#4a7a94",
  SA_NT: "#8a6b4a",
  WA: "#6a7a6b",
  TAS: "#7a5a6a",
  ACT: "#5a6a8a",
  NT: "#4a4a4a",
  AUST: "#0d3d52",
};

export function JurisdictionChart({
  jurisdiction,
  nationalHospitalQuarters,
}: {
  jurisdiction: JurisdictionQuarter[];
  nationalHospitalQuarters: { quarter: string; share_of_population: number | null }[];
}) {
  const nationalByQ = useMemo(
    () => new Map(nationalHospitalQuarters.map((n) => [n.quarter, n.share_of_population])),
    [nationalHospitalQuarters],
  );

  const allKeys = useMemo(() => {
    const s = new Set<string>();
    for (const jr of jurisdiction) {
      for (const k of Object.keys(jr.jurisdictions)) s.add(k);
    }
    s.add("AUST");
    return Array.from(s);
  }, [jurisdiction]);

  const [active, setActive] = useState<string[]>([...DEFAULT_KEYS]);

  const merged = useMemo(() => {
    return jurisdiction.map((jr) => {
      const q = jr.quarter;
      const label = shortQuarterLabel(q);
      const row: Record<string, string | number | null> = { q, label };
      const aust = nationalByQ.get(q) ?? null;
      for (const k of allKeys) {
        if (k === "AUST") {
          row[k] = aust;
        } else {
          row[k] = jr.jurisdictions[k]?.share_of_population ?? null;
        }
      }
      return row;
    });
  }, [jurisdiction, nationalByQ, allKeys]);

  return (
    <div>
      <div className="chart-controls">
        <span className="muted">Jurisdictions (hospital cover — share of population, APRA labels):</span>
        {allKeys.map((k) => {
          const on = active.includes(k);
          return (
            <label key={k} style={{ fontSize: 12, color: "var(--muted)" }}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => {
                  if (on) setActive((a) => a.filter((x) => x !== k));
                  else setActive((a) => [...a, k]);
                }}
              />{" "}
              {LABELS[k] ?? k}
            </label>
          );
        })}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={merged} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis
            dataKey="label"
            interval={Math.max(0, Math.floor(merged.length / 8) - 1)}
            angle={-40}
            textAnchor="end"
            height={64}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
          />
          <YAxis
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            domain={[0, 0.75]}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
          />
          <Tooltip
            formatter={(v: number, name) => [fmtPct(v) + " of state/national pop.", name]}
            labelFormatter={(_l, p) => {
              const r = p?.[0]?.payload as { q: string } | undefined;
              return r ? `Quarter ending ${r.q}` : "";
            }}
          />
          <Legend />
          {active.map((k) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              name={LABELS[k] ?? k}
              stroke={COLORS[k] ?? "#888"}
              dot={false}
              connectNulls
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
