import { useEffect, useState } from "react";
import { CoverageCombinedChart } from "./components/CoverageCombinedChart";
import { ElasticityCallout } from "./components/ElasticityCallout";
import { ExtrasVsHospitalGapChart } from "./components/ExtrasVsHospitalGapChart";
import { GrowthByAgeChart } from "./components/GrowthByAgeChart";
import { JurisdictionChart } from "./components/JurisdictionChart";
import { KpiTile } from "./components/KpiTile";
import { Lhc31AgePanel } from "./components/Lhc31AgePanel";
import { MlsTaxFloorChart } from "./components/MlsTaxFloorChart";
import { PremiumRoundBarChart } from "./components/PremiumRoundBarChart";
import { TierGoldShareChart } from "./components/TierGoldShareChart";
import { TierQuarterlyChart } from "./components/TierQuarterlyChart";
import {
  fmtCompactSigned,
  fmtFinancialYear,
  fmtInt,
  fmtPct,
  jurisdictionDisplayName,
  shortQuarterLabel,
} from "./format";
import {
  BASELINE_QUARTER,
  computeExtrasVsHospitalPpDivergence,
  computeGoldElasticity,
  computeCoverageDeltaByCohort,
  computeStateMovers,
  computeTierInsight,
  deltaPersons,
  deltaPp,
  getNationalAtQuarter,
  pctChange,
} from "./insights";
import { loadDashboardBundle } from "./loadDashboardData";
import type { DashboardData, PolicyConstants, PremiumTierData } from "./types";

function useBundle() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [premium, setPremium] = useState<PremiumTierData | null>(null);
  const [policy, setPolicy] = useState<PolicyConstants | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let ok = true;
    loadDashboardBundle()
      .then(({ dashboard: d, premium: p, policy: pc }) => {
        if (ok) {
          setDashboard(d);
          setPremium(p);
          setPolicy(pc);
        }
      })
      .catch((e: Error) => {
        if (ok) setErr(e.message);
      })
      .finally(() => {
        if (ok) setLoading(false);
      });
    return () => {
      ok = false;
    };
  }, []);
  return { dashboard, premium, policy, err, loading };
}

export function App() {
  const { dashboard: data, premium, policy, err, loading } = useBundle();

  if (loading) {
    return (
      <div className="app">
        <p className="muted">Loading private health cover data…</p>
      </div>
    );
  }
  if (err || !data) {
    return (
      <div className="app">
        <div className="error-box" role="alert">
          We couldn&apos;t load the dashboard.{" "}
          {err ? <span>{err}. </span> : null}
          Refresh to try again, or check that the data bundle is present at{" "}
          <code>/data/dashboard.json</code>.
        </div>
      </div>
    );
  }

  const latestQ = data.national_quarterly.at(-1)?.quarter ?? "";
  const quarterLabel = data.meta.data_as_of ? shortQuarterLabel(data.meta.data_as_of) : "—";
  const baselineLabel = shortQuarterLabel(BASELINE_QUARTER);
  const baselineYear = baselineLabel.slice(0, 4);

  const natThen = getNationalAtQuarter(data.national_quarterly, BASELINE_QUARTER);
  const natNow = getNationalAtQuarter(data.national_quarterly, latestQ);

  const hDelta = deltaPersons(natNow?.hospitalPersons ?? null, natThen?.hospitalPersons ?? null);
  const hPct = pctChange(natNow?.hospitalPersons ?? null, natThen?.hospitalPersons ?? null);
  const hPp = deltaPp(natNow?.hospitalShare ?? null, natThen?.hospitalShare ?? null);

  const eDelta = deltaPersons(natNow?.extrasPersons ?? null, natThen?.extrasPersons ?? null);
  const ePct = pctChange(natNow?.extrasPersons ?? null, natThen?.extrasPersons ?? null);
  const ePp = deltaPp(natNow?.extrasShare ?? null, natThen?.extrasShare ?? null);

  const tierInsight = computeTierInsight(data);
  const tierSeries = data.tier_quarterly ?? [];
  const latestTier = tierSeries.at(-1);
  const goldShareLatest = latestTier?.share.gold ?? null;

  const ageQuartersAll = data.age_coverage_quarterly ?? [];

  // Granular 7-cohort breakdown for the 1B chart: Δ coverage rate (pts) with
  // bar-thickness encoding net new insured lives.
  const coverageDelta =
    ageQuartersAll.length > 0
      ? computeCoverageDeltaByCohort(ageQuartersAll, BASELINE_QUARTER, latestQ)
      : { rows: [], totalNetNew: 0 };
  const coverageDeltaRows = coverageDelta.rows;
  const cohort65 = coverageDeltaRows.find((r) => r.label === "65 and over") ?? null;
  const cohort30_34 = coverageDeltaRows.find((r) => r.label === "30–34") ?? null;
  const cohort60_64 = coverageDeltaRows.find((r) => r.label === "60–64") ?? null;
  const decisionAgeNetNew = coverageDeltaRows
    .filter((r) => r.decisionMaker)
    .reduce((s, r) => s + r.netNew, 0);
  const cohort65ShareOfDecisionNetNew =
    decisionAgeNetNew > 0 && cohort65?.netNew != null
      ? (cohort65.netNew / decisionAgeNetNew) * 100
      : null;

  const extrasVsH = computeExtrasVsHospitalPpDivergence(
    data.national_quarterly,
    BASELINE_QUARTER,
    latestQ,
  );

  const stateMovers = computeStateMovers(data.jurisdiction_quarterly, BASELINE_QUARTER, latestQ);
  const topState = stateMovers[0];
  const bottomState = stateMovers.at(-1);

  const goldFiveYear = premium?.multi_year_observations.find((o) => o.id === "gold_vs_industry_5y") ?? null;
  const round2025 = premium?.tier_rounds.find((r) => r.effective.startsWith("2025")) ?? null;

  const elasticity = computeGoldElasticity(tierSeries, premium);

  // Action-title copy is computed from live data so it stays accurate after each refresh.
  const growthTitle =
    hPct != null
      ? `PHI coverage has climbed approximately ${Math.round(hPct)}% since the 2019 reforms.`
      : "PHI coverage has climbed since the 2019 reforms.";

  const tradeDownTitle =
    tierInsight.goldDeltaPp != null
      ? `Gold's share of hospital cover has fallen approximately ${Math.round(Math.abs(tierInsight.goldDeltaPp))} points since the 2019 reforms.`
      : "Gold's share of hospital cover has fallen since the 2019 reforms.";

  // 1B frames 65+ as the volume engine. The 30–34 coverage-rate fall and the
  // broader young-adult deep dive are now handled in 1C (see lhcObservationTitle).
  // Deliberately decoupled from the tier story — DoH tier mix is not
  // cross-tabulated by age, so any tier × age link is inferred, not measured.
  const growthDriverTitle = "People aged 65 and over drive volume growth.";

  const lhcObservationTitle =
    "Policy measures are lifting young-adult coverage, but the Age-Based Discount has been materially more effective than the Lifetime Health Cover loading.";

  const goldDivergenceTitle =
    goldFiveYear?.cumulative_pct != null && goldFiveYear?.industry_avg_pct != null
      ? `Gold premiums have outpaced the industry average by approximately ${Math.round(goldFiveYear.cumulative_pct - goldFiveYear.industry_avg_pct)} points over five years.`
      : "Gold premiums have outpaced the industry average over five years.";

  const mlsTitle =
    "Above ~A$110,000 in singles income, Basic hospital costs less than the Medicare Levy Surcharge — creating a hard tax-driven floor of Basic buyers.";

  const extrasGapTitle =
    extrasVsH.diffPp != null
      ? `Extras coverage has grown approximately ${extrasVsH.diffPp.toFixed(1)} points faster than hospital since the 2019 reforms.`
      : "Extras coverage has grown faster than hospital since the 2019 reforms.";

  const appendixTitle =
    "State coverage rates moved in parallel — the national tier mix is the real story.";

  return (
    <div className="app">
      <div className="headline-block">
        <h1>Private health insurance coverage is growing, but consumers are downgrading coverage.</h1>
        <p className="lead">
          More Australians than ever hold private health cover, but are downgrading from{" "}
          <strong>Gold</strong> to <strong>Silver</strong> and <strong>Bronze</strong> hospital
          cover as premium gaps widen and affordability concerns grow. The{" "}
          <strong>1 April 2019 reforms</strong> reclassified every hospital product into four
          standard tiers — Gold, Silver, Bronze, Basic — with a 12-month transition before the
          tiers became <strong>mandatory on 1 April 2020</strong>.
        </p>
        <p className="muted" style={{ marginTop: 4 }}>
          Sources: APRA, Department of Health, Disability and Ageing, ABS, and CHOICE.
        </p>

        <div className="kpi-group-header kpi-group-header--inverse">
          <p>Coverage — more people are covered</p>
          <p>Tier mix — trading down within hospital cover</p>
        </div>
        <div className="kpi-row kpi-row--inverse">
          <KpiTile
            label="Hospital cover"
            value={natNow?.hospitalPersons != null ? fmtInt(natNow.hospitalPersons) : "—"}
            sub={
              natNow?.hospitalShare != null
                ? natThen?.hospitalShare != null
                  ? `${fmtPct(natThen.hospitalShare)}% \u2192 ${fmtPct(natNow.hospitalShare)}% of population`
                  : `${fmtPct(natNow.hospitalShare)}% of population`
                : undefined
            }
            subPlacement="above-delta"
            delta={
              hDelta != null
                ? {
                    text: `${fmtCompactSigned(hDelta)} (${hPct != null ? `${hPct >= 0 ? "+" : ""}${hPct.toFixed(0)}%` : "—"}) since ${baselineYear}`,
                    direction: hDelta >= 0 ? "up" : "down",
                  }
                : undefined
            }
          />
          <KpiTile
            label="Extras cover"
            value={natNow?.extrasPersons != null ? fmtInt(natNow.extrasPersons) : "—"}
            sub={
              natNow?.extrasShare != null
                ? natThen?.extrasShare != null
                  ? `${fmtPct(natThen.extrasShare)}% \u2192 ${fmtPct(natNow.extrasShare)}% of population`
                  : `${fmtPct(natNow.extrasShare)}% of population`
                : undefined
            }
            subPlacement="above-delta"
            delta={
              eDelta != null
                ? {
                    text: `${fmtCompactSigned(eDelta)} (${ePct != null ? `${ePct >= 0 ? "+" : ""}${ePct.toFixed(0)}%` : "—"}) since ${baselineYear}`,
                    direction: eDelta >= 0 ? "up" : "down",
                  }
                : undefined
            }
          />
          <KpiTile
            variant="tier"
            label="Gold share of cover"
            value={goldShareLatest != null ? `${fmtPct(goldShareLatest)}%` : "—"}
            sub={
              tierInsight.goldShareThen != null && tierInsight.goldShareNow != null
                ? `${fmtPct(tierInsight.goldShareThen)}% \u2192 ${fmtPct(tierInsight.goldShareNow)}% of cover`
                : undefined
            }
            subPlacement="above-delta"
            delta={
              tierInsight.goldShareThen != null &&
              tierInsight.goldShareNow != null &&
              tierInsight.goldShareThen > 0
                ? (() => {
                    const relPct =
                      ((tierInsight.goldShareNow - tierInsight.goldShareThen) /
                        tierInsight.goldShareThen) *
                      100;
                    return {
                      text: `${relPct >= 0 ? "+" : ""}${relPct.toFixed(0)}% since ${baselineYear}`,
                      direction: (relPct <= 0 ? "down" : "up") as "up" | "down",
                    };
                  })()
                : undefined
            }
          />
          <KpiTile
            variant="tier"
            label="Silver + Bronze share"
            value={
              tierInsight.silverBronzeShareNow != null
                ? `${fmtPct(tierInsight.silverBronzeShareNow)}%`
                : "—"
            }
            sub={
              tierInsight.silverBronzeShareThen != null && tierInsight.silverBronzeShareNow != null
                ? `${fmtPct(tierInsight.silverBronzeShareThen)}% \u2192 ${fmtPct(tierInsight.silverBronzeShareNow)}% of cover`
                : undefined
            }
            subPlacement="above-delta"
            delta={
              tierInsight.silverBronzeShareThen != null &&
              tierInsight.silverBronzeShareNow != null &&
              tierInsight.silverBronzeShareThen > 0
                ? (() => {
                    const relPct =
                      ((tierInsight.silverBronzeShareNow - tierInsight.silverBronzeShareThen) /
                        tierInsight.silverBronzeShareThen) *
                      100;
                    return {
                      text: `${relPct >= 0 ? "+" : ""}${relPct.toFixed(0)}% since ${baselineYear}`,
                      direction: (relPct >= 0 ? "up" : "down") as "up" | "down",
                    };
                  })()
                : undefined
            }
          />
        </div>

      </div>

      <section className="insight-group" aria-labelledby="sec-group-growth">
        <h2
          id="sec-group-growth"
          className="section-eyebrow group-heading"
        >
          1 · Growth
        </h2>

        <section className="insight-section" aria-labelledby="sec-growth">
          <span className="section-eyebrow">1A · Growth</span>
          <h3 id="sec-growth" className="section-title">
            {growthTitle}
          </h3>
          <CoverageCombinedChart data={data.national_quarterly} />
        </section>

        {ageQuartersAll.length > 0 && (
          <>
            <section className="insight-section" aria-labelledby="sec-growth-driver">
              <span className="section-eyebrow">1B · Growth driver</span>
              <h3 id="sec-growth-driver" className="section-title">
                {growthDriverTitle}
              </h3>
              <p className="insight-sub" style={{ maxWidth: "none" }}>
                {cohort65?.netNew != null && cohort65ShareOfDecisionNetNew != null ? (
                  <>
                    65-and-overs account for{" "}
                    <strong>{cohort65ShareOfDecisionNetNew.toFixed(0)}%</strong> of net new
                    decision-age insured lives since {baselineLabel}, and have been the volume
                    engine behind the overall rise in coverage.
                  </>
                ) : (
                  <>
                    Since {baselineLabel}, 65-and-overs have been the volume engine behind the
                    overall rise in coverage.
                  </>
                )}
              </p>
              <GrowthByAgeChart
                rows={coverageDeltaRows}
                baselineQuarter={BASELINE_QUARTER}
                latestQuarter={latestQ}
              />
            </section>

            <section className="insight-section" aria-labelledby="sec-young-adult-deepdive">
              <span className="section-eyebrow">1C · Young-adult coverage deep dive</span>
              <h3 id="sec-young-adult-deepdive" className="section-title">
                {lhcObservationTitle}
              </h3>
              <p className="insight-sub" style={{ maxWidth: "none" }}>
                Two age-targeted policy levers pull young adults into hospital cover: the{" "}
                <strong>Age-Based Discount</strong> (ABD — up to 10% off premiums for 18–29s,
                tapering 2 pp per year from age 26) and the{" "}
                <strong>Lifetime Health Cover loading</strong> (LHC — 2% per year of delayed
                take-up from age 31, capped at 70%). Both contribute to the ~10-point gap
                between 30–34 and 25–29 coverage today. But since the 2019 Q2 baseline, ABD has
                done more work than LHC: 25–29 coverage is up <strong>+3.8 pts</strong>, while
                30–34 coverage has fallen <strong>−2.2 pts</strong>.
              </p>
              <p className="insight-sub" style={{ maxWidth: "none" }}>
                One plausible read is that affordability pressure tilts young-adult decisions
                toward upfront, visible discounts over deferred, abstract penalties. APRA data
                alone cannot confirm this, but the direction echoes the pricing dynamics
                explored in Section 2.
              </p>
              <Lhc31AgePanel
                ageQuarters={ageQuartersAll}
                latestQuarter={latestQ}
                baselineQuarter={ageQuartersAll[0].quarter}
              />
            </section>
          </>
        )}
      </section>

      <section className="insight-group" aria-labelledby="sec-group-tradedown">
        <h2
          id="sec-group-tradedown"
          className="section-eyebrow group-heading"
        >
          2 · Coverage tier downgrade
        </h2>

        <section className="insight-section" aria-labelledby="sec-tier">
          <span className="section-eyebrow">2A · Consumers are downgrading</span>
          <h3 id="sec-tier" className="section-title">
            {tradeDownTitle}
          </h3>
          {tierInsight.bronzeShareThen != null && tierInsight.bronzeShareNow != null && (
            <p className="insight-sub" style={{ maxWidth: "none" }}>
              Bronze has absorbed most of the shift: its share of hospital cover has risen from{" "}
              <strong>{fmtPct(tierInsight.bronzeShareThen)}%</strong> to{" "}
              <strong>{fmtPct(tierInsight.bronzeShareNow)}%</strong> since {baselineLabel}.
            </p>
          )}
          <div className="chart-panel chart-panel--tall">
            {tierSeries.length > 0 ? (
              <TierQuarterlyChart data={tierSeries} />
            ) : (
              <p className="muted">Tier series not present in this bundle.</p>
            )}
          </div>
        </section>

        <section className="insight-section" aria-labelledby="sec-premium">
          <span className="section-eyebrow">2B · Premium divergence is the driver</span>
          <h3 id="sec-premium" className="section-title">
            {goldDivergenceTitle}
          </h3>
          {premium ? (
            <>
              <p className="insight-sub" style={{ maxWidth: "none" }}>
                In April 2025, Gold premiums across the big-five insurers rose{" "}
                <strong>+{round2025?.gold != null ? round2025.gold.toFixed(1) : "—"}%</strong> —
                while Silver, Bronze and Basic each rose 3% or less, and the DoH industry-weighted
                average was just{" "}
                <strong>
                  +{round2025?.industry_avg_pct != null ? round2025.industry_avg_pct.toFixed(1) : "—"}%
                </strong>
                . Households are responding to price — trading out of Gold as the premium gap widens.
              </p>
              <div className="two-panel">
                <PremiumRoundBarChart data={premium} />
                {tierSeries.length > 0 ? <TierGoldShareChart data={tierSeries} /> : null}
              </div>
              {elasticity.elasticity != null && (
                <ElasticityCallout
                  elasticity={elasticity}
                  baselineLabel={baselineLabel.slice(0, 4)}
                  latestLabel={quarterLabel.slice(0, 4)}
                />
              )}
            </>
          ) : (
            <p className="muted">
              Premium-tier data isn&apos;t available in this build. Add{" "}
              <code>public/data/premium_tiers.json</code> to show the per-round comparison.
            </p>
          )}
        </section>

        <section className="insight-section" aria-labelledby="sec-extras-gap">
          <span className="section-eyebrow">2C · Reinforces the pricing analysis</span>
          <h3 id="sec-extras-gap" className="section-title">
            {extrasGapTitle}
          </h3>
          <p className="insight-sub" style={{ maxWidth: "none" }}>
            Extras cost a fraction of hospital cover and deliver frequent, visible benefits
            (dental, optical, physio). Under budget pressure, households protect those benefits
            and trim their hospital tier: Gold to Silver or Bronze, or down to Basic for MLS
            reasons. This is the behavioural side of the price story in section 2B; the same
            affordability pressure that makes Gold premium rises bite is what slows hospital
            coverage growth.
          </p>
          <ExtrasVsHospitalGapChart national={data.national_quarterly} />
        </section>
      </section>

      <section className="appendix" aria-labelledby="sec-appendix">
        <span className="section-eyebrow">3 · Appendix</span>
        <h2 id="sec-appendix" className="section-title">
          Supporting analyses
        </h2>

        <div className="appendix-subsection" aria-labelledby="sec-appendix-states">
          <span className="section-eyebrow">3A · Jurisdiction trajectories</span>
          <h3 id="sec-appendix-states" className="appendix-subtitle">
            {appendixTitle}
          </h3>
          <p className="lead" style={{ maxWidth: "none" }}>
            Hospital cover rates have risen in parallel across states (typically 1 to 3
            points of population since {baselineLabel}); ranking is little changed. Fastest lift:{" "}
            {topState ? jurisdictionDisplayName(topState.key) : "—"}; slowest:{" "}
            {bottomState ? jurisdictionDisplayName(bottomState.key) : "—"}. Differences are modest
            compared with the national tier down-shift.
          </p>
          <JurisdictionChart
            jurisdiction={data.jurisdiction_quarterly}
            nationalHospitalQuarters={data.national_quarterly.map((n) => ({
              quarter: n.quarter,
              share_of_population: n.hospital_treatment.share_of_population,
            }))}
          />
          <p className="chart-source">
            Source: APRA Private Health Insurance Membership Trends.
          </p>
          <p className="chart-source" style={{ marginTop: 4 }}>
            Note: APRA combines South Australia and the Northern Territory in first-block rates;
            insured persons are implied from share × combined population in the ETL.
          </p>
        </div>

        <div className="appendix-subsection" aria-labelledby="sec-appendix-mls">
          <span className="section-eyebrow">3B · Tax-floor effect</span>
          <h3 id="sec-appendix-mls" className="appendix-subtitle">
            {mlsTitle}
          </h3>
          <p className="lead" style={{ maxWidth: "none" }}>
            Basic hospital is, for many households, a tax product rather than a health product.
            That creates a rational floor of MLS-liable households buying Basic purely to avoid
            the surcharge. Individuals with basic cover are up ~19% since {baselineLabel},
            outpacing the ~13% growth in total hospital cover and consistent with this floor
            hardening.
          </p>
          {policy ? (
            <MlsTaxFloorChart policy={policy} tierSeries={tierSeries} />
          ) : (
            <p className="muted">
              Policy constants aren&apos;t available in this build. Add{" "}
              <code>public/data/policy_constants.json</code> to show the MLS breakeven curve.
            </p>
          )}
        </div>

      </section>

      <details className="methods">
        <summary>Data &amp; methods</summary>
        <div className="inner">
          <p>
            <strong>Reconciliation:</strong> {data.reconciliation.metric} —{" "}
            {data.reconciliation.message}
            {data.reconciliation.actual != null
              ? ` (actual ${fmtInt(data.reconciliation.actual)})`
              : ""}
            {data.reconciliation.expected != null
              ? ` (expected ${fmtInt(data.reconciliation.expected)})`
              : ""}
            .
          </p>
          <p>
            <strong>APRA Membership Trends:</strong> {data.meta.source_file}.{" "}
            <strong>Build:</strong> {data.meta.etl_build_time_utc}. Series start{" "}
            <strong>{shortQuarterLabel(data.meta.series_start_iso)}</strong>.
          </p>
          <p>{data.meta.hospital_vs_general_note}</p>
          <p>{data.meta.pop_denominator_note}</p>
          {data.meta.age_source_note && <p>{data.meta.age_source_note}</p>}
          {data.meta.tier_note && (
            <p>
              <strong>Tier mix:</strong> {data.meta.tier_note}
            </p>
          )}
          <p>
            <strong>Tier × age / state:</strong> the Department of Health, Disability and Ageing
            publishes tier mix at the national level only — it is not cross-tabulated by age
            band or jurisdiction. For this reason the dashboard deliberately does not claim a
            causal link between the ageing of the risk pool (section 1B) and the Gold-to-Silver
            /Bronze trade-down (section 2A): APRA age data shows who is buying, DoH shows the
            national tier mix, and the two cannot be joined. The tier trade-down is evidenced as
            a price-and-affordability story in sections 2B and 2C.
          </p>
          <p>
            <strong>APRA Jul 2023 reporting change:</strong> APRA implemented AASB 17 and revised
            capital reporting from 1 Jul 2023 (
            <a
              href="https://www.apra.gov.au/september-2023-quarterly-insurance-statistical-publication-break"
              target="_blank"
              rel="noreferrer"
            >
              publication notice
            </a>
            ). The membership and coverage series used here were not affected; the vertical line
            on charts is for completeness.
          </p>
          {data.tier_reconciliation && (
            <p>
              <strong>Tier cross-check (DoH vs APRA):</strong>{" "}
              {data.tier_reconciliation.quarters_compared} quarters; worst relative difference{" "}
              {(data.tier_reconciliation.worst_relative_diff * 100).toFixed(2)}% at{" "}
              {data.tier_reconciliation.worst_quarter ?? "—"} (tolerance{" "}
              {(data.tier_reconciliation.tolerance * 100).toFixed(1)}%).{" "}
              {data.tier_reconciliation.passed ? "PASS." : "Investigate."}
            </p>
          )}
          {premium && (
            <p>
              <strong>Premium tiers:</strong> {premium.meta.notes} Last reviewed{" "}
              {premium.meta.last_reviewed}.
            </p>
          )}
          {policy && (
            <p>
              <strong>Policy constants (MLS breakeven):</strong> {policy.meta.notes} Last reviewed{" "}
              {policy.meta.last_reviewed}.
            </p>
          )}
          <p>
            <strong>Elasticity caveat:</strong> the price elasticity of Gold hospital demand shown
            above is a back-of-envelope partial correlation (ΔQ% ÷ ΔP%) over the {baselineLabel} →
            latest window, using the CHOICE 5-year Gold premium observation and Gold
            insured-persons from APRA/DoH. It is <em>not</em> a causal identification —
            confounded by the 2019 tier-reform tail, COVID, demographic shift, and within-Gold
            product mix. The revenue-index statement assumes a flat &quot;premium index&quot; per
            covered Gold life and ignores claims costs, so it is a ceiling on the profit read.
          </p>
          <p>
            <strong>Sources:</strong>
          </p>
          <ul>
            {data.meta.sources.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="muted" style={{ marginTop: 8 }}>
            See <code>docs/DATA_SPEC.md</code> for the machine-readable spec.
          </p>
        </div>
      </details>

      <footer className="site">
        <strong>Not financial or actuarial advice.</strong> Data as of {quarterLabel} from APRA,
        the Department of Health, Disability and Ageing, and the Australian Bureau of Statistics.
        Cite those agencies and the snapshot date when reusing.
      </footer>
    </div>
  );
}
