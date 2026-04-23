import { useEffect, useState } from "react";
import { AgeCoverageChart } from "./components/AgeCoverageChart";
import { CoverageCombinedChart } from "./components/CoverageCombinedChart";
import { ElasticityCallout } from "./components/ElasticityCallout";
import { ExtrasVsHospitalGapChart } from "./components/ExtrasVsHospitalGapChart";
import { GrowthByAgeChart } from "./components/GrowthByAgeChart";
import { InsightHeadline } from "./components/InsightHeadline";
import { JurisdictionChart } from "./components/JurisdictionChart";
import { KpiTile } from "./components/KpiTile";
import { Lhc31AgePanel } from "./components/Lhc31AgePanel";
import { MlsTaxFloorChart } from "./components/MlsTaxFloorChart";
import { PremiumRoundBarChart } from "./components/PremiumRoundBarChart";
import { TierGoldShareChart } from "./components/TierGoldShareChart";
import { TierQuarterlyChart } from "./components/TierQuarterlyChart";
import { fmtFinancialYear, fmtInt, fmtPct, jurisdictionDisplayName, shortQuarterLabel } from "./format";
import {
  BASELINE_QUARTER,
  computeExtrasVsHospitalPpDivergence,
  computeGoldElasticity,
  computeNetNewByAgeGroup,
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
  const ageGrowth =
    ageQuartersAll.length > 0
      ? computeNetNewByAgeGroup(ageQuartersAll, BASELINE_QUARTER, latestQ)
      : {
          rows: [],
          totalGrowth: 0,
          decisionAgeGrowth: 0,
          youngDecisionMakerGrowthSharePct: null,
          youngDecisionMakerPopulationSharePct: null,
          youngDecisionMakerOverIndexPp: null,
        };
  const ageGrowthRows = ageGrowth.rows;
  const young25_34 = ageGrowthRows.find((r) => r.label === "25–34") ?? null;

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
    hPp != null && ePp != null
      ? `Hospital and extras have both kept climbing since the 2019 reforms — hospital up ${hPp >= 0 ? "+" : ""}${hPp.toFixed(1)} pp and extras up ${ePp >= 0 ? "+" : ""}${ePp.toFixed(1)} pp of population since ${baselineLabel}.`
      : "Hospital and extras have both kept climbing since the 2019 reforms; both now sit above pre-reform levels.";

  const tradeDownTitle =
    tierInsight.goldDeltaPp != null && tierInsight.silverBronzeDeltaPp != null
      ? `The market is trading down: Gold has lost ${Math.abs(tierInsight.goldDeltaPp).toFixed(1)} pp of hospital share to Silver and Bronze since ${baselineLabel}.`
      : `The market is trading down from Gold toward Silver and Bronze since ${baselineLabel}.`;

  const goldDivergenceTitle =
    goldFiveYear?.cumulative_pct != null &&
    goldFiveYear?.industry_avg_pct != null &&
    tierInsight.goldDeltaPp != null
      ? `Gold premiums outpacing the industry average by ${(goldFiveYear.cumulative_pct - goldFiveYear.industry_avg_pct).toFixed(0)} pp over five years appears to be driving the ${Math.abs(tierInsight.goldDeltaPp).toFixed(1)} pp drop in Gold's share of hospital cover.`
      : "Above-market Gold premium increases appear to be driving the decline in Gold's share of hospital cover.";

  const mlsTitle =
    "Above ~A$110,000 in singles income, Basic hospital costs less than the Medicare Levy Surcharge — creating a hard tax-driven floor of Basic buyers.";

  const extrasGapTitle =
    extrasVsH.diffPp != null
      ? `Extras has outpaced hospital by ${extrasVsH.diffPp.toFixed(1)} pp of population since ${baselineLabel} — small but monotonic, consistent with affordability pressure.`
      : `Extras has outpaced hospital since ${baselineLabel} — consistent with affordability pressure.`;

  const ageTitle =
    ageGrowth.youngDecisionMakerOverIndexPp != null
      ? `Demographics are contributing to the tier shift, but the Lifetime Health Cover loading isn't pulling its weight — 25–34s are under-indexed in net growth by ${Math.abs(ageGrowth.youngDecisionMakerOverIndexPp).toFixed(1)} pp, and 30–34 coverage has fallen despite the loading.`
      : "Demographics are contributing to the tier shift, but the Lifetime Health Cover loading isn't pulling its weight.";

  const appendixTitle =
    "State coverage rates moved in parallel — the national tier mix is the real story.";

  return (
    <div className="app">
      <div className="headline-block">
        <h1>Private health insurance coverage is growing, but consumers are choosing lower tiers.</h1>
        <p className="lead">
          More Australians than ever hold private health cover — but within hospital cover,
          households are shifting from <span className="emph-ink">Gold</span> to{" "}
          <span className="emph-ink">Silver and Bronze tiers</span> as premium gaps widen and the
          Medicare Levy Surcharge pulls price-sensitive buyers into Basic.
        </p>
        <p className="muted" style={{ marginTop: 4 }}>
          Sources: APRA, Department of Health, Disability and Ageing, ABS, and CHOICE.
        </p>

        <div className="kpi-group-header kpi-group-header--inverse">
          <p>Coverage — more people are covered</p>
          <p>Tier mix — but trading down within hospital cover</p>
        </div>
        <div className="kpi-row kpi-row--inverse">
          <KpiTile
            label="Hospital cover"
            value={natNow?.hospitalPersons != null ? fmtInt(natNow.hospitalPersons) : "—"}
            sub={
              natNow?.hospitalShare != null
                ? `${fmtPct(natNow.hospitalShare)}% of population`
                : undefined
            }
            delta={
              hDelta != null && hPp != null
                ? {
                    text: `${hDelta >= 0 ? "+" : ""}${fmtInt(hDelta)} vs ${baselineLabel} (${hPct != null ? `${hPct >= 0 ? "+" : ""}${hPct.toFixed(0)}%` : "—"}; ${hPp >= 0 ? "+" : ""}${hPp.toFixed(1)} pp)`,
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
                ? `${fmtPct(natNow.extrasShare)}% of population`
                : undefined
            }
            delta={
              eDelta != null && ePp != null
                ? {
                    text: `${eDelta >= 0 ? "+" : ""}${fmtInt(eDelta)} vs ${baselineLabel} (${ePct != null ? `${ePct >= 0 ? "+" : ""}${ePct.toFixed(0)}%` : "—"}; ${ePp >= 0 ? "+" : ""}${ePp.toFixed(1)} pp)`,
                    direction: eDelta >= 0 ? "up" : "down",
                  }
                : undefined
            }
          />
          <KpiTile
            variant="tier"
            label="Gold — share of hospital cover"
            value={goldShareLatest != null ? `${fmtPct(goldShareLatest)}%` : "—"}
            delta={
              tierInsight.goldDeltaPp != null
                ? {
                    text: `${tierInsight.goldDeltaPp >= 0 ? "+" : ""}${tierInsight.goldDeltaPp.toFixed(1)} pp vs ${baselineLabel}`,
                    direction: tierInsight.goldDeltaPp <= 0 ? "down" : "up",
                  }
                : undefined
            }
          />
          <KpiTile
            variant="tier"
            label="Silver + Bronze — combined share"
            value={
              tierInsight.silverBronzeShareNow != null
                ? `${fmtPct(tierInsight.silverBronzeShareNow)}%`
                : "—"
            }
            delta={
              tierInsight.silverBronzeDeltaPp != null
                ? {
                    text: `${tierInsight.silverBronzeDeltaPp >= 0 ? "+" : ""}${tierInsight.silverBronzeDeltaPp.toFixed(1)} pp vs ${baselineLabel}`,
                    direction: tierInsight.silverBronzeDeltaPp >= 0 ? "up" : "down",
                  }
                : undefined
            }
          />
        </div>

      </div>

      <section className="insight-section" aria-labelledby="sec-growth">
        <span className="section-eyebrow">1A · Growth</span>
        <h2 id="sec-growth" className="section-title">
          {growthTitle}
        </h2>
        <p className="lead">
          Tracking since {shortQuarterLabel(data.meta.series_start_iso)}, through the 1 April 2019
          Gold/Silver/Bronze/Basic tier reforms and their mandatory adoption on 1 April 2020.
        </p>
        <CoverageCombinedChart data={data.national_quarterly} />
      </section>

      <section className="insight-section" aria-labelledby="sec-tier">
        <span className="section-eyebrow">1B · Trade-down</span>
        <h2 id="sec-tier" className="section-title">
          {tradeDownTitle}
        </h2>
        {tierInsight.bronzeShareThen != null && tierInsight.bronzeShareNow != null && (
          <p className="insight-sub">
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
        <span className="section-eyebrow">2A · Premiums as a driver</span>
        <h2 id="sec-premium" className="section-title">
          {goldDivergenceTitle}
        </h2>
        {premium ? (
          <>
            <p className="insight-sub">
              In the April 2025 round alone, Gold premiums across the big-five insurers rose{" "}
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
                baselineLabel={baselineLabel}
                latestLabel={quarterLabel}
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
        <span className="section-eyebrow">2B · Affordability proxy</span>
        <h2 id="sec-extras-gap" className="section-title">
          {extrasGapTitle}
        </h2>
        <InsightHeadline
          title="Households keep extras and trim hospital."
          subtitle="Extras cost a fraction of hospital cover and deliver frequent, visible benefits (dental, optical, physio). Under budget pressure, households cut their hospital tier — Gold to Silver or Bronze, or down to Basic for MLS reasons — while keeping extras."
        />
        <ExtrasVsHospitalGapChart national={data.national_quarterly} />
      </section>

      <section className="insight-section" aria-labelledby="sec-age">
        <span className="section-eyebrow">2C · Demographics as a driver</span>
        <h2 id="sec-age" className="section-title">
          {ageTitle}
        </h2>
        {ageQuartersAll.length > 0 ? (
          <>
            <h3 className="sub-insight-title">
              {young25_34?.overIndexPp != null && young25_34.overIndexPp < 0
                ? `Young decision-makers (25–34) are ${young25_34.populationSharePct != null ? young25_34.populationSharePct.toFixed(0) : "—"}% of adults but only ${young25_34.growthSharePct != null ? young25_34.growthSharePct.toFixed(0) : "—"}% of net new insured lives — an under-index of ${Math.abs(young25_34.overIndexPp).toFixed(1)} pp.`
                : young25_34?.overIndexPp != null
                  ? `Young decision-makers (25–34) are ${young25_34.populationSharePct != null ? young25_34.populationSharePct.toFixed(0) : "—"}% of adults and ${young25_34.growthSharePct != null ? young25_34.growthSharePct.toFixed(0) : "—"}% of net new insured lives (${young25_34.overIndexPp >= 0 ? "+" : ""}${young25_34.overIndexPp.toFixed(1)} pp vs their population weight).`
                : "Comparing each decision-age cohort's share of net growth to its share of the adult population."}
            </h3>
            <p className="insight-sub">
              Younger buyers concentrate in Basic and Bronze, so a book that grows
              disproportionately older is consistent with the Gold-to-Silver/Bronze trade-down
              shown in section 1B.
            </p>
            <GrowthByAgeChart rows={ageGrowthRows} />

            <h3 className="sub-insight-title" style={{ marginTop: "var(--s-6)" }}>
              The Lifetime Health Cover loading isn&apos;t biting: 30–34 coverage has fallen since {baselineLabel}, even though the loading is designed to activate from age 31.
            </h3>
            <p className="insight-sub">
              The 25–29 rate has climbed — consistent with the Age-Based Discount working — but
              30–34 has slipped. The carrot (ABD, ages 18–29) appears to be doing more work than
              the stick (LHC, from age 31). Likely drivers: the ABD cliff at 30, migration
              composition (permanent residents get a 12-month LHC grace period), and present bias
              against an abstract future loading.
            </p>
            <Lhc31AgePanel
              ageQuarters={ageQuartersAll}
              latestQuarter={latestQ}
              baselineQuarter={ageQuartersAll[0].quarter}
            />

            <div className="callout-box">
              <p>
                <strong>Policy context.</strong> The{" "}
                <strong>Age-Based Discount</strong> (introduced 1 April 2019) gives eligible 18–29s
                up to a 10% discount on hospital premiums, stepping down 2 pp per year from age 26
                — the carrot.{" "}
                <strong>Lifetime Health Cover</strong> loading applies from age 31 if people delay
                taking hospital cover, rising 2% per year of delay and capped at 70% — the stick.
              </p>
              <p className="muted" style={{ marginTop: "var(--s-3)", fontSize: "0.8125rem" }}>
                Caveat: the Department of Health, Disability and Ageing publishes tier mix
                nationally only — it is not cross-tabulated by age or state. The link between
                younger buyers and lower tiers is inferred from APRA age data, DoH national tier
                mix, and industry product disclosures; see Data &amp; methods for the full
                caveat, and{" "}
                <a
                  href="https://www.choice.com.au/money/insurance/health/articles/health-insurance-price-hikes-higher-than-ever-what-youre-really-paying"
                  target="_blank"
                  rel="noreferrer"
                >
                  CHOICE (2026)
                </a>{" "}
                for the industry pattern.
              </p>
            </div>
          </>
        ) : (
          <p className="muted">Age-coverage series not present in this bundle.</p>
        )}
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
            publishes tier mix at the national level only — it is not cross-tabulated by age band
            or jurisdiction. The inferred link between younger decision-makers and lower hospital
            tiers in section 2C is circumstantial: APRA age data and ABS population give the
            demographic mix; DoH gives the national tier mix; industry and CHOICE disclosures
            document younger adults concentrating in Basic and Bronze products.
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
          <p className="lead">
            Hospital cover rates have risen in parallel across states (typically 1–3 pp since{" "}
            {baselineLabel}); ranking is little changed. Fastest lift:{" "}
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
          <p className="lead">
            Basic hospital is, for many households, a tax product rather than a health product.
            That creates a rational floor of MLS-liable households buying Basic purely to avoid
            the surcharge. Basic-tier people are up ~19% since {baselineLabel}, outpacing the
            ~13% growth in total hospital cover and consistent with this floor hardening.
          </p>
          {policy ? (
            <MlsTaxFloorChart policy={policy} tierSeries={tierSeries} />
          ) : (
            <p className="muted">
              Policy constants aren&apos;t available in this build. Add{" "}
              <code>public/data/policy_constants.json</code> to show the MLS breakeven curve.
            </p>
          )}
          <p className="chart-source">
            Source: ATO MLS thresholds (FY {fmtFinancialYear(policy?.mls.financial_year ?? "2024-25")});
            PrivateHealth.gov.au Basic hospital policies.
          </p>
          <p className="chart-source" style={{ marginTop: 4 }}>
            Note: MLS rates are piecewise in income (1.0% / 1.25% / 1.5% across three singles
            tiers above the FY base threshold of A$97,000). The dashed Navy line is a
            representative cheapest Basic hospital premium — actual cheapest products vary by
            state and insurer. Breakeven (vertical marker) shows where the two lines cross;
            everything to the right is the shaded region where Basic is the rational tax-min
            choice.
          </p>
        </div>

        {ageQuartersAll.length > 0 && (
          <div className="appendix-subsection" aria-labelledby="sec-appendix-age-yoy">
            <span className="section-eyebrow">3C · Age-cohort growth, YoY</span>
            <h3 id="sec-appendix-age-yoy" className="appendix-subtitle">
              Under-35s consistently outpace older cohorts in YoY growth of insured lives.
            </h3>
            <p className="lead">
              Trailing-four-quarter year-on-year growth in people with hospital cover, by broad
              age group. This is the absolute-count view; the share-of-growth vs
              share-of-population view in section 2C is the decision-relevant cut.
            </p>
            <AgeCoverageChart data={ageQuartersAll} />
          </div>
        )}
      </section>

      <footer className="site">
        <strong>Not financial or actuarial advice.</strong> Data as of {quarterLabel} from APRA,
        the Department of Health, Disability and Ageing, and the Australian Bureau of Statistics.
        Cite those agencies and the snapshot date when reusing.
      </footer>
    </div>
  );
}
