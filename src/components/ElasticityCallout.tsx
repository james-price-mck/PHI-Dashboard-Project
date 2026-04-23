import { useId } from "react";
import { fmtInt } from "../format";
import type { GoldElasticity } from "../insights";

type Props = {
  elasticity: GoldElasticity;
  baselineLabel: string;
  latestLabel: string;
};

function signed(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(digits)}`;
}

export function ElasticityCallout({ elasticity, baselineLabel, latestLabel }: Props) {
  const headingId = useId();
  const {
    deltaQuantityPct,
    deltaPricePct,
    industryAvgPct,
    elasticity: e,
    revenueIndex,
    goldPersonsThen,
    goldPersonsNow,
  } = elasticity;

  const revenueUpliftPct =
    revenueIndex != null ? (revenueIndex - 1) * 100 : null;

  const elasticityText = e != null ? `${e.toFixed(2)}` : "—";

  const elasticityHint =
    e != null
      ? Math.abs(e) < 1
        ? "Inelastic — price-setting power"
        : "Elastic"
      : undefined;

  return (
    <div
      className="callout-box"
      role="region"
      aria-labelledby={headingId}
    >
      <h3
        id={headingId}
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          margin: 0,
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontSize: "0.72rem",
          color: "var(--mid-blue)",
        }}
      >
        Demand for Gold is price-inelastic
      </h3>
      <div className="stat-grid" role="group" aria-label="Gold elasticity stats">
        <div className="stat">
          <div className="label">Gold price change (5y)</div>
          <div className="value">{signed(deltaPricePct, 0)}%</div>
          <div className="hint">
            Industry average {signed(industryAvgPct, 0)}% over the same window.
          </div>
        </div>
        <div className="stat">
          <div className="label">
            People on Gold, change ({baselineLabel} to {latestLabel})
          </div>
          <div className="value">{signed(deltaQuantityPct, 1)}%</div>
          <div className="hint">
            {goldPersonsThen != null && goldPersonsNow != null
              ? `${fmtInt(goldPersonsThen)} to ${fmtInt(goldPersonsNow)} people on Gold.`
              : ""}
          </div>
        </div>
        <div className="stat">
          <div className="label">Implied own-price elasticity</div>
          <div className="value">{elasticityText}</div>
          <div className="hint">{elasticityHint}</div>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: "0.9375rem" }}>
        Gold premium revenue on insured persons still rose by{" "}
        <strong>{signed(revenueUpliftPct, 0)}%</strong> over the five years. Losing ~
        {deltaQuantityPct != null ? Math.round(Math.abs(deltaQuantityPct)) : "—"}% of Gold
        members was more than offset by the ~
        {deltaPricePct != null ? Math.round(deltaPricePct) : "—"}% price rise. This is
        consistent with a profit-maximising response to inelastic demand.
      </p>
      <p className="muted" style={{ marginTop: 6, fontSize: "0.75rem" }}>
        Back-of-envelope partial correlation, not a causal identification. Revenue ignores claims
        costs and within-Gold product mix, so it is a ceiling on the profit read.
      </p>
    </div>
  );
}
