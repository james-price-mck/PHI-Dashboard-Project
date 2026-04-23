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
    { year: "2020 (base)", industry, gold, silver, bronze },
  ];
  for (const r of rows) {
    const y = r.effective.slice(0, 4);
    industry *= 1 + r.industry_avg / 100;
    const gp = r.gold ?? r.industry_avg;
    const sp = r.silver ?? r.industry_avg;
    const bp = r.bronze ?? r.industry_avg;
    gold *= 1 + gp / 100;
    silver *= 1 + sp / 100;
    bronze *= 1 + bp / 100;
    out.push({
      year: y,
      industry: Math.round(industry * 10) / 10,
      gold: Math.round(gold * 10) / 10,
      silver: Math.round(silver * 10) / 10,
      bronze: Math.round(bronze * 10) / 10,
    });
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
      aria-label="Cumulative premium index by tier from hand-curated annual increases, baseline one hundred in two thousand twenty."
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "var(--muted)", fontSize: 10 }} />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            domain={[90, "auto"]}
            tickFormatter={(v) => `${v}`}
            width={40}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number) => [`${v}`, "Index"]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="industry"
            name="Industry average (DoH)"
            stroke="var(--chart-warm-grey)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="gold"
            name="Gold (big-five est.)"
            stroke="var(--chart-brick)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="silver"
            name="Silver (est.)"
            stroke="var(--accent-2)"
            strokeWidth={1.5}
            strokeOpacity={0.7}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="bronze"
            name="Bronze (est.)"
            stroke="var(--chart-amber)"
            strokeWidth={1.5}
            strokeOpacity={0.7}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="muted" style={{ marginTop: 8, fontSize: "0.75rem" }}>
        {data.meta.notes}
      </p>
    </div>
  );
}
