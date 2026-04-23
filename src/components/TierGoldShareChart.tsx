import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtPct, shortQuarterLabel } from "../format";
import type { TierQuarter } from "../types";
import { BASELINE_QUARTER } from "../insights";

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 12,
};

type Props = {
  data: TierQuarter[];
  baselineQuarter?: string;
};

export function TierGoldShareChart({
  data,
  baselineQuarter = BASELINE_QUARTER,
}: Props) {
  const filtered = data.filter((t) => t.quarter >= baselineQuarter);
  const rows = filtered.map((t) => ({
    label: shortQuarterLabel(t.quarter),
    q: t.quarter,
    gold: t.share.gold,
  }));

  return (
    <div
      className="chart-panel"
      role="img"
      aria-label="Gold share of hospital cover persons from twenty twenty quarter two onward."
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="label" minTickGap={20} tick={{ fill: "var(--muted)", fontSize: 9 }} />
          <YAxis
            domain={[0.2, 0.45]}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            width={40}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number) => [`${fmtPct(v)}%`, "Gold share"]}
            labelFormatter={(_l, p) => {
              const r = p?.[0]?.payload as { q: string } | undefined;
              return r ? `Quarter ending ${shortQuarterLabel(r.q)}` : "";
            }}
          />
          <Line
            type="monotone"
            dataKey="gold"
            name="Gold"
            stroke="var(--tier-gold)"
            strokeWidth={2.8}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
