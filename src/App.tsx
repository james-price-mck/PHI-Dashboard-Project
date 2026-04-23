import { useEffect, useState } from "react";
import { AgeCoverageChart } from "./components/AgeCoverageChart";
import { CoverageCombinedChart } from "./components/CoverageCombinedChart";
import { GrowthByAgeChart } from "./components/GrowthByAgeChart";
import { InsightHeadline } from "./components/InsightHeadline";
import { JurisdictionChart } from "./components/JurisdictionChart";
import { KpiTile } from "./components/KpiTile";
import { PremiumIndexChart, buildPremiumIndexSeries } from "./components/PremiumIndexChart";
import { TierGoldShareChart } from "./components/TierGoldShareChart";
import { TierQuarterlyChart } from "./components/TierQuarterlyChart";
import { fmtInt, fmtPct, jurisdictionDisplayName, shortQuarterLabel, yyyymmdd } from "./format";
import {
  BASELINE_QUARTER,
  computeExtrasVsHospitalPpDivergence,
  computeNetNewByAgeGroup,
  computeStateMovers,
  computeTierInsight,
  deltaPersons,
  deltaPp,
  getNationalAtQuarter,
  pctChange,
} from "./insights";
import { loadDashboardBundle } from "./loadDashboardData";
import type { DashboardData, PremiumTierData } from "./types";

function useBundle() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [premium, setPremium] = useState<PremiumTierData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let ok = true;
    loadDashboardBundle()
      .then(({ dashboard: d, premium: p }) => {
        if (ok) {
          setDashboard(d);
          setPremium(p);
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
  return { dashboard, premium, err, loading };
}

export function App() {
  const { dashboard: data, premium, err, loading } = useBundle();

  if (loading) {
    return (
      <div className="app">
        <p className="muted">Loading data…</p>
      </div>
    );
  }
  if (err || !data) {
    return (
      <div className="app">
        <div className="error-box" role="alert">
          {err ?? "Failed to load dashboard data."}
        </div>
      </div>
    );
  }

  const latestQ = data.national_quarterly.at(-1)?.quarter ?? "";
  const refDate = yyyymmdd(data.meta.data_as_of ?? "");
  const quarterLabel = data.meta.data_as_of ? shortQuarterLabel(data.meta.data_as_of) : "—";

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

  const { rows: ageGrowthRows, under35SharePct } = data.age_coverage_quarterly?.length
    ? computeNetNewByAgeGroup(data.age_coverage_quarterly, BASELINE_QUARTER, latestQ)
    : { rows: [], under35SharePct: null };

  const extrasVsH = computeExtrasVsHospitalPpDivergence(
    data.national_quarterly,
    BASELINE_QUARTER,
    latestQ,
  );

  const stateMovers = computeStateMovers(data.jurisdiction_quarterly, BASELINE_QUARTER, latestQ);
  const topState = stateMovers[0];
  const bottomState = stateMovers.at(-1);

  const premiumSeries = premium ? buildPremiumIndexSeries(premium) : [];
  const premiumEnd = premiumSeries.at(-1);
  const premiumGoldCum =
    premiumSeries.length >= 2
      ? ((premiumEnd?.gold ?? 100) / 100 - 1) * 100
      : null;
  const premiumIndCum =
    premiumSeries.length >= 2
      ? ((premiumEnd?.industry ?? 100) / 100 - 1) * 100
      : null;

  const tierHeroSubtitle =
    goldShareLatest != null && tierInsight.goldShareThen != null
      ? `Gold’s share of people with hospital cover has fallen from about ${fmtPct(tierInsight.goldShareThen)}% at ${shortQuarterLabel(BASELINE_QUARTER)} to ${fmtPct(goldShareLatest)}% in ${quarterLabel}. Silver and Bronze together now account for roughly ${tierInsight.silverBronzeShareNow != null ? fmtPct(tierInsight.silverBronzeShareNow) : "—"}% — the clearest signal of trade-down after the 2019 tier reforms. Read the stable mix from ${shortQuarterLabel(BASELINE_QUARTER)} onward (Legacy tier tapers to zero).`
      : "";

  return (
    <div className="app">
      <div className="headline-block">
        <span className="badge">APRA · DoH reform tiers · ABS · premium index (curated)</span>
        <h1>Private health cover in Australia: growing, but trading down</h1>
        <p className="lead">
          More people hold hospital cover and extras than before the April 2019 tier reforms — but{" "}
          <strong>Gold is shrinking as a share of the market</strong> while Silver and Bronze expand.
          Data through <strong>{quarterLabel}</strong> ({refDate}).
        </p>
        <p className="muted" style={{ marginTop: 4 }}>
          Sources: APRA membership trends, Department of Health, Disability and Ageing tier data, ABS
          population; premium index from DoH industry rounds and CHOICE (big-five) tier estimates (
          <code>public/data/premium_tiers.json</code>).
        </p>

        <div className="kpi-row" style={{ marginTop: "1.25rem" }}>
          <KpiTile
            label="Hospital cover — people"
            value={natNow?.hospitalPersons != null ? fmtInt(natNow.hospitalPersons) : "—"}
            sub={
              natNow?.hospitalShare != null
                ? `${fmtPct(natNow.hospitalShare)}% of population`
                : undefined
            }
            delta={
              hDelta != null && hPp != null
                ? {
                    text: `${hDelta >= 0 ? "+" : ""}${fmtInt(hDelta)} vs ${shortQuarterLabel(BASELINE_QUARTER)} (${hPct != null ? `${hPct >= 0 ? "+" : ""}${hPct.toFixed(0)}% people, ${hPp >= 0 ? "+" : ""}${hPp.toFixed(1)} pp` : "—"})`,
                    direction: hDelta >= 0 ? "up" : "down",
                  }
                : undefined
            }
          />
          <KpiTile
            label="Extras cover — people"
            value={natNow?.extrasPersons != null ? fmtInt(natNow.extrasPersons) : "—"}
            sub={
              natNow?.extrasShare != null
                ? `${fmtPct(natNow.extrasShare)}% of population`
                : undefined
            }
            delta={
              eDelta != null && ePp != null
                ? {
                    text: `${eDelta >= 0 ? "+" : ""}${fmtInt(eDelta)} vs ${shortQuarterLabel(BASELINE_QUARTER)} (${ePct != null ? `${ePct >= 0 ? "+" : ""}${ePct.toFixed(0)}% people, ${ePp >= 0 ? "+" : ""}${ePp.toFixed(1)} pp` : "—"})`,
                    direction: eDelta >= 0 ? "up" : "down",
                  }
                : undefined
            }
          />
          <KpiTile
            label="Gold — share of hospital cover"
            value={goldShareLatest != null ? `${fmtPct(goldShareLatest)}%` : "—"}
            delta={
              tierInsight.goldDeltaPp != null
                ? {
                    text: `${tierInsight.goldDeltaPp >= 0 ? "+" : ""}${tierInsight.goldDeltaPp.toFixed(1)} pp since ${shortQuarterLabel(BASELINE_QUARTER)}`,
                    direction: tierInsight.goldDeltaPp <= 0 ? "down" : "up",
                  }
                : undefined
            }
          />
          <KpiTile
            label="Silver + Bronze — combined share"
            value={
              tierInsight.silverBronzeShareNow != null
                ? `${fmtPct(tierInsight.silverBronzeShareNow)}%`
                : "—"
            }
            delta={
              tierInsight.silverBronzeDeltaPp != null
                ? {
                    text: `${tierInsight.silverBronzeDeltaPp >= 0 ? "+" : ""}${tierInsight.silverBronzeDeltaPp.toFixed(1)} pp since ${shortQuarterLabel(BASELINE_QUARTER)}`,
                    direction: tierInsight.silverBronzeDeltaPp >= 0 ? "up" : "down",
                  }
                : undefined
            }
          />
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <p className="insight-sub" style={{ marginBottom: 8 }}>
            National trajectory — hospital cover and extras (do not sum the two series; overlap is
            material).
          </p>
          <CoverageCombinedChart data={data.national_quarterly} compact />
        </div>
      </div>

      <section className="insight-section" aria-labelledby="sec-tier">
        <h2 id="sec-tier" className="section-title">
          The market is trading down
        </h2>
        <InsightHeadline
          title="Product tier mix is shifting from Gold toward Silver and Bronze — the defining structural move in hospital cover since mandatory tiers."
          subtitle={tierHeroSubtitle}
        />
        <div className="chart-panel chart-panel--tall">
          {tierSeries.length > 0 ? (
            <TierQuarterlyChart data={tierSeries} />
          ) : (
            <p className="muted">Tier series not present in this bundle.</p>
          )}
        </div>
      </section>

      <section className="insight-section" aria-labelledby="sec-premium">
        <h2 id="sec-premium" className="section-title">
          Gold premiums have diverged sharply
        </h2>
        {premium && premiumEnd ? (
          <>
            <p className="big-stat">
              Gold premium index +{premiumGoldCum != null ? premiumGoldCum.toFixed(0) : "—"}%
              cumulative since 2020 (base 100) vs industry average +
              {premiumIndCum != null ? premiumIndCum.toFixed(0) : "—"}% — big-five tier estimates
              from CHOICE from 2025 rounds onward.
            </p>
            <p className="insight-sub">
              Gold cover has absorbed a disproportionate share of premium inflation as the 2019 reforms
              broadened mandatory Gold benefits. Over the same window, Gold&apos;s share of
              hospital-cover persons has fallen by more than ten percentage points — consistent with
              households responding to price. Sources:{" "}
              <a
                href="https://www.choice.com.au/money/insurance/health/articles/health-insurance-price-hikes-higher-than-ever-what-youre-really-paying"
                target="_blank"
                rel="noreferrer"
              >
                CHOICE (Mar 2026)
              </a>
              ;{" "}
              <a
                href="https://www.health.gov.au/resources/publications/average-annual-price-changes-in-private-health-insurance-premiums"
                target="_blank"
                rel="noreferrer"
              >
                DoH premium rounds
              </a>
              .
            </p>
            <div className="two-panel">
              <PremiumIndexChart data={premium} />
              {tierSeries.length > 0 ? <TierGoldShareChart data={tierSeries} /> : null}
            </div>
          </>
        ) : (
          <p className="muted">
            Premium tier file missing — add <code>public/data/premium_tiers.json</code> to show the
            price index.
          </p>
        )}
      </section>

      <section className="insight-section" aria-labelledby="sec-age">
        <h2 id="sec-age" className="section-title">
          Who&apos;s joining, what are they buying?
        </h2>
        {data.age_coverage_quarterly && data.age_coverage_quarterly.length > 0 ? (
          <>
            <InsightHeadline
              title={
                under35SharePct != null
                  ? `Under-35s account for about ${under35SharePct.toFixed(0)}% of the net growth in hospital-cover persons since ${shortQuarterLabel(BASELINE_QUARTER)}.`
                  : "Net growth in hospital cover by broad age group since the stable tier window."
              }
              subtitle={
                extrasVsH.diffPp != null
                  ? `Extras cover is outpacing hospital cover on a population-share basis by about ${extrasVsH.diffPp.toFixed(1)} percentage points over the same window — consistent with affordability-driven choices on the extras side.`
                  : undefined
              }
            />
            <GrowthByAgeChart rows={ageGrowthRows} />
            <p className="insight-sub" style={{ marginTop: 12 }}>
              Coverage rate (hospital) by broad age group — younger cohorts had more room to rise;
              older cohorts were already high.
            </p>
            <AgeCoverageChart data={data.age_coverage_quarterly} />
            <div className="callout-box">
              <p>
                <strong>Policy context.</strong> Australia&apos;s{" "}
                <strong>Age-Based Discount</strong> (from 1 April 2019) offers eligible people aged
                18–29 a discount on hospital premiums, stepping down by 2% per year above 25 up to a
                maximum 10% for 18–25 — designed to encourage younger people to take up cover.{" "}
                <strong>Lifetime Health Cover</strong> loading applies from age 31 if people delay
                buying hospital cover, which can push younger, price-sensitive buyers toward
                minimum-viable tiers for tax or Medicare levy surcharge reasons.
              </p>
              <p>
                <strong>Industry pattern.</strong> Younger adults are more often observed in Basic and
                Bronze hospital products than in Gold; see discussion in{" "}
                <a
                  href="https://www.choice.com.au/money/insurance/health/articles/health-insurance-price-hikes-higher-than-ever-what-youre-really-paying"
                  target="_blank"
                  rel="noreferrer"
                >
                  CHOICE (2026)
                </a>{" "}
                and APRA / fund disclosures on product mix.
              </p>
              <p>
                <strong>Caveat.</strong> DoH publishes tier mix <em>nationally only</em> — it is not
                cross-tabulated by age or state. The read above is circumstantial: we observe where
                growth in covered lives is concentrated, we know policy incentives for younger buyers,
                and we see Bronze share rise from about{" "}
                {tierInsight.bronzeShareThen != null ? fmtPct(tierInsight.bronzeShareThen) : "—"}% to{" "}
                {tierInsight.bronzeShareNow != null ? fmtPct(tierInsight.bronzeShareNow) : "—"}%.
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
            <strong>Reconciliation:</strong> {data.reconciliation.metric} — {data.reconciliation.message}
            {data.reconciliation.actual != null
              ? ` (actual ${fmtInt(data.reconciliation.actual)})`
              : ""}
            {data.reconciliation.expected != null
              ? ` (expected ${fmtInt(data.reconciliation.expected)})`
              : ""}
            .
          </p>
          <p>
            <strong>APRA Membership Trends:</strong> {data.meta.source_file}. <strong>Build:</strong>{" "}
            {data.meta.etl_build_time_utc}. Series start{" "}
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
            <strong>APRA Jul 2023 reporting change:</strong> APRA implemented AASB 17 and revised
            capital reporting from 1 Jul 2023 (
            <a
              href="https://www.apra.gov.au/september-2023-quarterly-insurance-statistical-publication-break"
              target="_blank"
              rel="noreferrer"
            >
              publication notice
            </a>
            ). The membership and coverage series used here were not affected; the vertical line on
            charts is for completeness.
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
              <strong>Premium index:</strong> {premium.meta.notes} Last reviewed{" "}
              {premium.meta.last_reviewed}.
            </p>
          )}
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
        <h2 id="sec-appendix" className="section-title">
          Appendix — states and territories
        </h2>
        <p className="lead">
          Hospital-cover rates have risen in parallel across states (typically about 1–3 pp since{" "}
          {shortQuarterLabel(BASELINE_QUARTER)}); ranking is little changed. Fastest lift:{" "}
          {topState ? jurisdictionDisplayName(topState.key) : "—"}; slowest:{" "}
          {bottomState ? jurisdictionDisplayName(bottomState.key) : "—"} — differences are modest
          compared with the national tier down-shift.
        </p>
        <JurisdictionChart
          jurisdiction={data.jurisdiction_quarterly}
          nationalHospitalQuarters={data.national_quarterly.map((n) => ({
            quarter: n.quarter,
            share_of_population: n.hospital_treatment.share_of_population,
          }))}
        />
        <p className="muted" style={{ marginTop: 12 }}>
          SA &amp; NT: APRA combines first-block rates; insured persons implied from share × combined
          population in the ETL.
        </p>
      </section>

      <footer className="site">
        Static dashboard for GitHub Pages. Not financial or actuarial advice. Cite APRA, DoH, ABS, and
        the snapshot date of this bundle.
      </footer>
    </div>
  );
}
