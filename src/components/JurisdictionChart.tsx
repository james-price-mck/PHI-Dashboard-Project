import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { JurisdictionQuarter } from "../types";
import { fmtPct, jurisdictionDisplayName, shortQuarterLabel } from "../format";
import { BASELINE_QUARTER } from "../insights";

const PANEL_ORDER = ["NSW_ACT", "VIC", "QLD", "WA", "SA_NT", "TAS"] as const;

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  padding: "6px 8px",
  fontSize: 11,
};

type Props = {
  jurisdiction: JurisdictionQuarter[];
  nationalHospitalQuarters: { quarter: string; share_of_population: number | null }[];
  baselineQuarter?: string;
};

export function JurisdictionChart({
  jurisdiction,
  nationalHospitalQuarters,
  baselineQuarter = BASELINE_QUARTER,
}: Props) {
  const nationalByQ = useMemo(
    () => new Map(nationalHospitalQuarters.map((n) => [n.quarter, n.share_of_population])),
    [nationalHospitalQuarters],
  );

  const merged = useMemo(() => {
    return jurisdiction.map((jr) => {
      const q = jr.quarter;
      const label = shortQuarterLabel(q);
      const row: Record<string, string | number | null> = { q, label };
      const aust = nationalByQ.get(q) ?? null;
      row.AUST = aust;
      for (const k of PANEL_ORDER) {
        row[k] = jr.jurisdictions[k]?.share_of_population ?? null;
      }
      return row;
    });
  }, [jurisdiction, nationalByQ]);

  const latestQ = jurisdiction.at(-1)?.quarter ?? "";
  const baselineRow = jurisdiction.find((j) => j.quarter === baselineQuarter);

  return (
    <div
      className="jurisdiction-grid"
      role="img"
      aria-label="Hospital cover share of population by state; all regions trend up in parallel with little change in ranking."
    >
      {PANEL_ORDER.map((key) => {
        const jLatest = jurisdiction.at(-1)?.jurisdictions[key];
        const jThen = baselineRow?.jurisdictions[key];
        const shareNow = jLatest?.share_of_population ?? null;
        const shareThen = jThen?.share_of_population ?? null;
        const dpp =
          shareNow != null && shareThen != null
            ? (shareNow - shareThen) * 100
            : null;
        const title = `${jurisdictionDisplayName(key)} · ${
          shareNow != null ? fmtPct(shareNow) : "—"
        }% · ${dpp != null ? `${dpp >= 0 ? "+" : ""}${dpp.toFixed(1)} pts` : "—"} since ${shortQuarterLabel(baselineQuarter)}`;

        return (
          <div key={key} className="jurisdiction-cell">
            <h3>{title}</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={merged} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--grid)" vertical={false} />
                <XAxis
                  dataKey="label"
                  hide
                  tick={{ fontSize: 8 }}
                />
                <YAxis
                  domain={[0.30, 0.54]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fill: "var(--slate)", fontSize: 10 }}
                  width={34}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, name: string) => [fmtPct(v) + "%", name]}
                  labelFormatter={(_l, p) => {
                    const r = p?.[0]?.payload as { q: string } | undefined;
                    return r ? `Quarter ending ${shortQuarterLabel(r.q)}` : "";
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="AUST"
                  name="Australia (national)"
                  stroke="var(--slate)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey={key}
                  name={jurisdictionDisplayName(key)}
                  stroke="var(--mid-blue)"
                  strokeWidth={2.4}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
