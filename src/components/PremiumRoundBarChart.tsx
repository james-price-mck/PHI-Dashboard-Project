import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PremiumTierData, PremiumTierRound } from "../types";

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 12,
};

type TierKey = "gold" | "silver" | "bronze" | "basic";

const TIERS: { key: TierKey; label: string }[] = [
  { key: "gold", label: "Gold" },
  { key: "silver", label: "Silver" },
  { key: "bronze", label: "Bronze" },
  { key: "basic", label: "Basic" },
];

type Row = {
  tier: string;
  round2025: number;
  round2026: number;
};

function roundByYear(rounds: PremiumTierRound[], year: string): PremiumTierRound | undefined {
  return rounds.find((r) => r.effective.startsWith(year));
}

function formatPctLabel(v: number | string): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function PremiumRoundBarChart({ data }: { data: PremiumTierData }) {
  const rows: Row[] = useMemo(() => {
    const r25 = roundByYear(data.tier_rounds, "2025");
    const r26 = roundByYear(data.tier_rounds, "2026");
    return TIERS.map((t) => ({
      tier: t.label,
      round2025: r25 ? r25[t.key] : 0,
      round2026: r26 ? r26[t.key] : 0,
    }));
  }, [data]);

  const ind2025 = roundByYear(data.tier_rounds, "2025")?.industry_avg_pct ?? null;
  const ind2026 = roundByYear(data.tier_rounds, "2026")?.industry_avg_pct ?? null;

  return (
    <div
      className="chart-panel"
      role="img"
      aria-label="Premium increases by cover tier for April 2025 and April 2026, with industry-average reference lines. Gold rose about thirteen percent in both years, well above the industry average."
    >
      <div className="chart-toolbar-row">
        <span className="chart-title">
          Premium increases by cover tier
        </span>
        <span className="chart-daterange">Apr 2025 &amp; Apr 2026</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={rows} margin={{ top: 24, right: 120, left: 0, bottom: 16 }} barGap={4}>
          {/* Gridlines suppressed: every bar carries a data label. */}
          <CartesianGrid stroke="var(--grid)" horizontal={false} vertical={false} />
          <XAxis
            dataKey="tier"
            tick={{ fill: "var(--ink)", fontSize: 12, fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: "var(--rule)" }}
          />
          <YAxis
            tick={{ fill: "var(--slate)", fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
            width={40}
            domain={[-2, 15]}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, name: string) => {
              if (typeof v !== "number" || !Number.isFinite(v)) return ["—", name];
              const sign = v >= 0 ? "+" : "";
              return [`${sign}${v.toFixed(1)}%`, name];
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
            payload={[
              { value: "April 2025", type: "square", color: "var(--light-grey)", id: "r25" },
              { value: "April 2026", type: "square", color: "var(--mid-blue)", id: "r26" },
              {
                value: "Industry average (DoH)",
                type: "line",
                color: "var(--slate)",
                id: "ind",
              },
            ]}
          />
          {ind2025 != null && (
            <ReferenceLine
              y={ind2025}
              stroke="var(--slate)"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
              label={{
                value: `2025 avg +${ind2025.toFixed(1)}%`,
                position: "right",
                offset: 8,
                fill: "var(--slate)",
                fontSize: 10,
                fontWeight: 600,
              }}
            />
          )}
          {ind2026 != null && (
            <ReferenceLine
              y={ind2026}
              stroke="var(--slate)"
              strokeDasharray="2 4"
              ifOverflow="extendDomain"
              label={{
                value: `2026 avg +${ind2026.toFixed(1)}%`,
                position: "right",
                offset: 8,
                fill: "var(--slate)",
                fontSize: 10,
                fontWeight: 600,
              }}
            />
          )}
          <Bar
            dataKey="round2025"
            name="April 2025"
            fill="var(--light-grey)"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="round2025"
              position="top"
              formatter={formatPctLabel}
              style={{ fill: "var(--slate)", fontSize: 10, fontWeight: 500 }}
            />
          </Bar>
          <Bar
            dataKey="round2026"
            name="April 2026"
            fill="var(--mid-blue)"
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="round2026"
              position="top"
              formatter={formatPctLabel}
              style={{ fill: "var(--ink)", fontSize: 10, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="chart-source">
        Source: CHOICE; Department of Health, Disability and Ageing.
      </p>
      <p className="chart-source" style={{ marginTop: 4 }}>
        Note: Credible per-tier public estimates could only be found for the April 2025 and
        April 2026 premium rounds.
      </p>
    </div>
  );
}
