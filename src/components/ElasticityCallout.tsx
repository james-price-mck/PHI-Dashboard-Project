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

  const elasticityText =
    e != null
      ? `${e.toFixed(2)}`
      : "—";

  const elasticityHint =
    e != null
      ? Math.abs(e) < 1
        ? "inelastic — price-setting power"
        : "elastic"
      : undefined;

  return (
    <div className="callout-box" aria-label="Price elasticity of Gold demand">
      <p style={{ fontWeight: 700, margin: 0, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.72rem", color: "var(--accent-2)" }}>
        Back-of-envelope · price-setting power
      </p>
      <div className="stat-grid" role="group" aria-label="Gold elasticity stats">
        <div className="stat">
          <div className="label">ΔP Gold (5y)</div>
          <div className="value">{signed(deltaPricePct, 0)}%</div>
          <div className="hint">
            vs industry avg {signed(industryAvgPct, 0)}% over the same window
          </div>
        </div>
        <div className="stat">
          <div className="label">
            ΔQ Gold ({baselineLabel} → {latestLabel})
          </div>
          <div className="value">{signed(deltaQuantityPct, 1)}%</div>
          <div className="hint">
            {goldPersonsThen != null && goldPersonsNow != null
              ? `${fmtInt(goldPersonsThen)} → ${fmtInt(goldPersonsNow)} people on Gold`
              : ""}
          </div>
        </div>
        <div className="stat">
          <div className="label">Implied own-price elasticity</div>
          <div className="value">{elasticityText}</div>
          <div className="hint">{elasticityHint}</div>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: "0.9rem" }}>
        Gold premium <em>revenue</em> on insured persons still rose by roughly{" "}
        <strong>{signed(revenueUpliftPct, 0)}%</strong> over the five years — losing ~
        {deltaQuantityPct != null ? Math.round(Math.abs(deltaQuantityPct)) : "—"}% of
        Gold members was more than offset by the ~
        {deltaPricePct != null ? Math.round(deltaPricePct) : "—"}% price hike.
        Consistent with a profit-maximising response to inelastic demand.
      </p>
      <p className="muted" style={{ marginTop: 6, fontSize: "0.75rem" }}>
        Elasticity here is a back-of-envelope aggregate partial correlation, not a
        causal identification. Revenue ignores claims costs and product-mix
        within-Gold, so it is a ceiling on the profit implication.
      </p>
    </div>
  );
}
