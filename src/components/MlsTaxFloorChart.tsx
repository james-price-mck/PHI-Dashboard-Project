import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Label,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtFinancialYear, fmtInt } from "../format";
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
  return `A$${Math.round(v).toLocaleString("en-AU")}`;
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

  const fyLabel = fmtFinancialYear(policy.mls.financial_year);

  return (
    <div
      className="chart-panel chart-panel--tall"
      role="img"
      aria-label="MLS payable vs Basic hospital premium across singles income. Shaded region shows where the surcharge exceeds the Basic premium."
    >
      <div className="chart-toolbar-row">
        <span className="chart-title">
          MLS payable vs Basic hospital premium — singles, FY {fyLabel}
        </span>
        <span className="chart-daterange">FY {fyLabel}</span>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 420px", minWidth: 0, height: 340 }}>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart
              data={rows}
              margin={{ top: 24, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="income"
                type="number"
                domain={[MIN_INCOME, MAX_INCOME]}
                tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
                minTickGap={30}
              >
                <Label
                  value="Singles income (AUD)"
                  position="insideBottom"
                  offset={-4}
                  style={{ fill: "var(--slate)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}
                />
              </XAxis>
              <YAxis
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                tick={{ fill: "var(--slate)", fontSize: 11 }}
                width={58}
              >
                <Label
                  value="AUD per year"
                  angle={-90}
                  position="insideLeft"
                  offset={18}
                  style={{ fill: "var(--slate)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}
                />
              </YAxis>
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
              <Line
                type="stepAfter"
                dataKey="mlsAud"
                name="MLS payable (no hospital cover)"
                stroke="var(--navy)"
                strokeWidth={2.4}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="basicAud"
                name={`Basic premium (~A$${basic.toLocaleString("en-AU")})`}
                stroke="var(--mid-blue)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
              {singles
                .filter((t) => t.rate > 0)
                .map((t, idx) => (
                  <ReferenceLine
                    key={`mls-threshold-${t.label}`}
                    x={t.min}
                    stroke="var(--light-grey)"
                    strokeDasharray="2 3"
                    label={{
                      value: `${t.label} · ${(t.rate * 100).toFixed(t.rate * 100 % 1 === 0 ? 0 : 2)}%`,
                      position: idx % 2 === 0 ? "insideTopRight" : "insideBottomRight",
                      fill: "var(--slate)",
                      fontSize: 9,
                      offset: 6,
                    }}
                  />
                ))}
              {breakeven.breakevenIncomeAud != null && (
                <ReferenceLine
                  x={breakeven.breakevenIncomeAud}
                  stroke="var(--mid-blue)"
                  strokeDasharray="3 3"
                  label={{
                    value: `Breakeven ${formatAud(breakeven.breakevenIncomeAud)}`,
                    position: "top",
                    fill: "var(--mid-blue)",
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
          <div
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--slate)",
              fontWeight: 700,
            }}
          >
            FY {fyLabel} · singles
          </div>
          <div>
            <div
              className="label"
              style={{
                fontSize: "0.7rem",
                color: "var(--slate)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              Breakeven income
            </div>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 600,
                color: "var(--mid-blue)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {breakeven.breakevenIncomeAud != null
                ? formatAud(breakeven.breakevenIncomeAud)
                : "—"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--slate)" }}>
              Above this income, Basic is cheaper than paying the MLS.
            </div>
          </div>
          <div>
            <div
              className="label"
              style={{
                fontSize: "0.7rem",
                color: "var(--slate)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              Individuals with basic cover
            </div>
            <div
              style={{
                fontSize: "1.15rem",
                fontWeight: 600,
                color: "var(--ink)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {basicGrowth.personsThen != null ? fmtInt(basicGrowth.personsThen) : "—"}
              {" → "}
              {basicGrowth.personsNow != null ? fmtInt(basicGrowth.personsNow) : "—"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--slate)" }}>
              {basicGrowth.pctChange != null
                ? `${basicGrowth.pctChange >= 0 ? "+" : ""}${basicGrowth.pctChange.toFixed(0)}% since 2020`
                : ""}
              {basicGrowth.totalPctChange != null
                ? ` · total hospital cover ${basicGrowth.totalPctChange >= 0 ? "+" : ""}${basicGrowth.totalPctChange.toFixed(0)}%`
                : ""}
            </div>
          </div>
        </div>
      </div>
      <p className="chart-source">
        Source: ATO; PrivateHealth.gov.au.
      </p>
      <p className="chart-source" style={{ marginTop: 4 }}>
        Note: The MLS is separate from and additional to the 2% Medicare Levy. It is charged at
        1.0% / 1.25% / 1.5% of whole-of-income across three tiers above A$97,000 (singles,
        FY {fyLabel}), which is why the navy line steps up at each threshold. Basic premium is a
        representative national midpoint; actual cheapest products vary by state and insurer.
      </p>
    </div>
  );
}
