import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtInt } from "../format";
import {
  buildMlsCurve,
  computeBasicTierGrowth,
  computeMlsBreakeven,
  BASELINE_QUARTER,
} from "../insights";
import type { PolicyConstants, TierQuarter } from "../types";

type Props = {
  policy: PolicyConstants;
  tierSeries: TierQuarter[];
};

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 12,
};

const MIN_INCOME = 80000;
const MAX_INCOME = 250000;
const STEP = 1000;

function formatAud(v: number): string {
  return `$${Math.round(v).toLocaleString("en-AU")}`;
}

export function MlsTaxFloorChart({ policy, tierSeries }: Props) {
  const singles = policy.mls.singles_tiers;
  const basic = policy.basic_hospital_premium_representative_aud;

  const rows = useMemo(
    () =>
      buildMlsCurve(singles, MIN_INCOME, MAX_INCOME, STEP).map((r) => ({
        income: r.income,
        mlsAud: r.mlsAud,
        basicAud: basic,
        savingsIfBasic: Math.max(0, r.mlsAud - basic),
      })),
    [singles, basic],
  );

  const breakeven = useMemo(
    () => computeMlsBreakeven(singles, basic),
    [singles, basic],
  );

  const basicGrowth = useMemo(
    () => computeBasicTierGrowth(tierSeries, BASELINE_QUARTER),
    [tierSeries],
  );

  return (
    <div
      className="chart-panel chart-panel--tall"
      role="img"
      aria-label="MLS cost vs Basic hospital premium across singles income. Shaded region shows where the surcharge exceeds the policy."
    >
      <div style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 420px", minWidth: 0, height: 340 }}>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart
              data={rows}
              margin={{ top: 16, right: 16, left: 4, bottom: 8 }}
            >
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="income"
                type="number"
                domain={[MIN_INCOME, MAX_INCOME]}
                tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                tick={{ fill: "var(--muted)", fontSize: 10 }}
                minTickGap={30}
              />
              <YAxis
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                tick={{ fill: "var(--muted)", fontSize: 10 }}
                width={54}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(v) =>
                  `Single income ${formatAud(Number(v))}`
                }
                formatter={(val: number | string, name: string) => {
                  if (typeof val !== "number" || !Number.isFinite(val)) return ["—", name];
                  return [formatAud(val), name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="stepAfter"
                dataKey="savingsIfBasic"
                name="Saved by holding Basic"
                stroke="none"
                fill="var(--accent-2)"
                fillOpacity={0.12}
                isAnimationActive={false}
                legendType="none"
                activeDot={false}
              />
              <Line
                type="stepAfter"
                dataKey="mlsAud"
                name="MLS payable (no hospital cover)"
                stroke="var(--chart-brick)"
                strokeWidth={2.4}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="basicAud"
                name={`Representative Basic premium (~$${basic.toLocaleString("en-AU")})`}
                stroke="var(--ink)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
              {breakeven.breakevenIncomeAud != null && (
                <ReferenceLine
                  x={breakeven.breakevenIncomeAud}
                  stroke="var(--accent-2)"
                  strokeDasharray="3 3"
                  label={{
                    value: `Breakeven ~${formatAud(breakeven.breakevenIncomeAud)}`,
                    position: "top",
                    fill: "var(--accent-2)",
                    fontSize: 10,
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div
          style={{
            flex: "0 1 240px",
            minWidth: 220,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingTop: 12,
          }}
        >
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 700 }}>
            FY {policy.mls.financial_year} · singles
          </div>
          <div>
            <div className="label" style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Breakeven income
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {breakeven.breakevenIncomeAud != null
                ? formatAud(breakeven.breakevenIncomeAud)
                : "—"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              Above this income, Basic is cheaper than paying the MLS.
            </div>
          </div>
          <div>
            <div className="label" style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Basic tier persons
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
              {basicGrowth.personsThen != null ? fmtInt(basicGrowth.personsThen) : "—"}
              {" → "}
              {basicGrowth.personsNow != null ? fmtInt(basicGrowth.personsNow) : "—"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              {basicGrowth.pctChange != null
                ? `${basicGrowth.pctChange >= 0 ? "+" : ""}${basicGrowth.pctChange.toFixed(0)}% since 2020 Q2`
                : ""}
              {basicGrowth.totalPctChange != null
                ? ` · total hospital cover ${basicGrowth.totalPctChange >= 0 ? "+" : ""}${basicGrowth.totalPctChange.toFixed(0)}%`
                : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
