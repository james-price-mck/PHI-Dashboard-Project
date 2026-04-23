import { useMemo } from "react";
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
import type { PremiumTierData } from "../types";

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 12,
};

export type PremiumIndexPoint = {
  year: string;
  industry: number;
  gold: number;
  silver: number;
  bronze: number;
  goldEstimated: boolean;
  silverEstimated: boolean;
  bronzeEstimated: boolean;
  goldActual: number | null;
  goldFallback: number | null;
  silverActual: number | null;
  silverFallback: number | null;
  bronzeActual: number | null;
  bronzeFallback: number | null;
};

export function buildPremiumIndexSeries(data: PremiumTierData): PremiumIndexPoint[] {
  const rows = [...data.annual_increase_pct].sort(
    (a, b) => a.effective.localeCompare(b.effective),
  );
  let industry = 100;
  let gold = 100;
  let silver = 100;
  let bronze = 100;
  const out: PremiumIndexPoint[] = [
    {
      year: "2020 (base)",
      industry,
      gold,
      silver,
      bronze,
      goldEstimated: true,
      silverEstimated: true,
      bronzeEstimated: true,
      goldActual: null,
      goldFallback: gold,
      silverActual: null,
      silverFallback: silver,
      bronzeActual: null,
      bronzeFallback: bronze,
    },
  ];
  let goldHasActual = false;
  let silverHasActual = false;
  let bronzeHasActual = false;
  for (const r of rows) {
    const y = r.effective.slice(0, 4);
    industry *= 1 + r.industry_avg / 100;
    const goldThisYearActual = r.gold != null;
    const silverThisYearActual = r.silver != null;
    const bronzeThisYearActual = r.bronze != null;
    const gp = r.gold ?? r.industry_avg;
    const sp = r.silver ?? r.industry_avg;
    const bp = r.bronze ?? r.industry_avg;
    gold *= 1 + gp / 100;
    silver *= 1 + sp / 100;
    bronze *= 1 + bp / 100;
    const point: PremiumIndexPoint = {
      year: y,
      industry: Math.round(industry * 10) / 10,
      gold: Math.round(gold * 10) / 10,
      silver: Math.round(silver * 10) / 10,
      bronze: Math.round(bronze * 10) / 10,
      goldEstimated: !goldThisYearActual,
      silverEstimated: !silverThisYearActual,
      bronzeEstimated: !bronzeThisYearActual,
      goldActual: null,
      goldFallback: null,
      silverActual: null,
      silverFallback: null,
      bronzeActual: null,
      bronzeFallback: null,
    };
    if (goldThisYearActual) goldHasActual = true;
    if (silverThisYearActual) silverHasActual = true;
    if (bronzeThisYearActual) bronzeHasActual = true;
    point.goldActual = goldHasActual ? point.gold : null;
    point.goldFallback = goldHasActual ? null : point.gold;
    point.silverActual = silverHasActual ? point.silver : null;
    point.silverFallback = silverHasActual ? null : point.silver;
    point.bronzeActual = bronzeHasActual ? point.bronze : null;
    point.bronzeFallback = bronzeHasActual ? null : point.bronze;
    out.push(point);
  }
  if (out.length > 0) {
    out[0].goldActual = null;
    out[0].goldFallback = out[0].gold;
    out[0].silverActual = null;
    out[0].silverFallback = out[0].silver;
    out[0].bronzeActual = null;
    out[0].bronzeFallback = out[0].bronze;
  }
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1];
    const cur = out[i];
    if (cur.goldActual != null && prev.goldFallback != null && prev.goldActual == null) {
      prev.goldActual = prev.goldFallback;
    }
    if (cur.silverActual != null && prev.silverFallback != null && prev.silverActual == null) {
      prev.silverActual = prev.silverFallback;
    }
    if (cur.bronzeActual != null && prev.bronzeFallback != null && prev.bronzeActual == null) {
      prev.bronzeActual = prev.bronzeFallback;
    }
  }
  return out;
}

type Props = {
  data: PremiumTierData;
};

export function PremiumIndexChart({ data }: Props) {
  const series = useMemo(() => buildPremiumIndexSeries(data), [data]);

  return (
    <div
      className="chart-panel"
      role="img"
      aria-label="Cumulative premium index by tier from hand-curated annual increases, baseline one hundred in two thousand twenty. Gold premiums diverged sharply from twenty twenty five."
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "var(--muted)", fontSize: 10 }} />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            domain={[95, "auto"]}
            tickFormatter={(v) => `${v}`}
            width={40}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, name: string) => {
              if (typeof v !== "number" || !Number.isFinite(v)) return ["—", name];
              return [`Index ${v.toFixed(1)}`, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            payload={[
              { value: "Industry average (DoH)", type: "line", color: "var(--chart-warm-grey)", id: "ind" },
              { value: "Gold (big-five est.)", type: "line", color: "var(--tier-gold)", id: "gold" },
              { value: "Silver (est.)", type: "line", color: "var(--tier-silver)", id: "silver" },
              { value: "Bronze (est.)", type: "line", color: "var(--tier-bronze)", id: "bronze" },
            ]}
          />
          <Line
            type="monotone"
            dataKey="industry"
            name="Industry average (DoH)"
            stroke="var(--chart-warm-grey)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="goldFallback"
            name="Gold (industry-avg fallback)"
            stroke="var(--tier-gold)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="goldActual"
            name="Gold (big-five est.)"
            stroke="var(--tier-gold)"
            strokeWidth={3}
            dot={{ r: 3, fill: "var(--tier-gold)" }}
            connectNulls
            isAnimationActive={false}
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="silverFallback"
            name="Silver (industry-avg fallback)"
            stroke="var(--tier-silver)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="silverActual"
            name="Silver (est.)"
            stroke="var(--tier-silver)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--tier-silver)" }}
            connectNulls
            isAnimationActive={false}
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="bronzeFallback"
            name="Bronze (industry-avg fallback)"
            stroke="var(--tier-bronze)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="bronzeActual"
            name="Bronze (est.)"
            stroke="var(--tier-bronze)"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "var(--tier-bronze)" }}
            connectNulls
            isAnimationActive={false}
            legendType="none"
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="muted" style={{ marginTop: 8, fontSize: "0.75rem" }}>
        Solid lines and dots: published per-tier increases (CHOICE big-five, 2025–2026 rounds).
        Dashed segments: tier-level data not published; the chart conservatively assumes the
        industry-average increase. {data.meta.notes}
      </p>
    </div>
  );
}
