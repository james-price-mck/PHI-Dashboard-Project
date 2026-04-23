import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { shortQuarterLabel } from "../format";
import { BASELINE_QUARTER, computeExtrasHospitalGapSeries } from "../insights";
import type { NationalQuarter } from "../types";

type Props = {
  national: NationalQuarter[];
};

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid var(--rule)",
  borderRadius: 2,
  padding: "8px 10px",
  fontSize: 12,
};

export function ExtrasVsHospitalGapChart({ national }: Props) {
  const rows = useMemo(() => {
    const series = computeExtrasHospitalGapSeries(national, BASELINE_QUARTER);
    return series
      .filter((r) => r.quarter >= BASELINE_QUARTER)
      .map((r) => ({
        quarter: r.quarter,
        label: shortQuarterLabel(r.quarter),
        hospitalPp: r.hospitalPp,
        extrasPp: r.extrasPp,
        gapPp: r.gapPp,
      }));
  }, [national]);

  const last = rows.at(-1);

  return (
    <div
      className="chart-panel chart-panel--tall"
      role="img"
      aria-label="Cumulative percentage-point change in hospital and extras coverage share since 2020 Q2. Extras outpaces hospital."
    >
      <div style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 420px", minWidth: 0, height: 320 }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={rows} margin={{ top: 16, right: 16, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--muted)", fontSize: 10 }}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} pp`}
                tick={{ fill: "var(--muted)", fontSize: 10 }}
                width={54}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(_l, p) => {
                  const r = p?.[0]?.payload as { quarter?: string } | undefined;
                  return r?.quarter
                    ? `Quarter ending ${shortQuarterLabel(r.quarter)}`
                    : "";
                }}
                formatter={(val: number | string, name: string) => {
                  if (typeof val !== "number" || !Number.isFinite(val)) return ["—", name];
                  const s = val >= 0 ? "+" : "";
                  return [`${s}${val.toFixed(2)} pp`, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine
                y={0}
                stroke="var(--chart-ink-muted)"
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
              <Line
                type="monotone"
                dataKey="extrasPp"
                name="Extras cover (pp Δ)"
                stroke="var(--chart-blue-2)"
                strokeWidth={2.4}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="hospitalPp"
                name="Hospital cover (pp Δ)"
                stroke="var(--accent-2)"
                strokeWidth={2.4}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="gapPp"
                name="Gap (extras − hospital)"
                stroke="var(--chart-brick)"
                strokeWidth={1.8}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div
          style={{
            flex: "0 1 220px",
            minWidth: 200,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            paddingTop: 12,
          }}
        >
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", fontWeight: 700 }}>
            Since {shortQuarterLabel(BASELINE_QUARTER)}
          </div>
          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Extras pp Δ
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--chart-blue-2)", fontVariantNumeric: "tabular-nums" }}>
              {last?.extrasPp != null
                ? `${last.extrasPp >= 0 ? "+" : ""}${last.extrasPp.toFixed(2)} pp`
                : "—"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Hospital pp Δ
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent-2)", fontVariantNumeric: "tabular-nums" }}>
              {last?.hospitalPp != null
                ? `${last.hospitalPp >= 0 ? "+" : ""}${last.hospitalPp.toFixed(2)} pp`
                : "—"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              Affordability-proxy gap
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--chart-brick)", fontVariantNumeric: "tabular-nums" }}>
              {last?.gapPp != null
                ? `${last.gapPp >= 0 ? "+" : ""}${last.gapPp.toFixed(2)} pp`
                : "—"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              Extras minus hospital — widened monotonically since the baseline.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
