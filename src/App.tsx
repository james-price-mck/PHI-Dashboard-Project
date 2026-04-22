import { useEffect, useState } from "react";
import { AgeCoverageChart } from "./components/AgeCoverageChart";
import { JurisdictionChart } from "./components/JurisdictionChart";
import { NationalCoverageChart } from "./components/NationalCoverageChart";
import { NationalInsuredPersonsChart } from "./components/NationalInsuredPersonsChart";
import { TierQuarterlyChart } from "./components/TierQuarterlyChart";
import { fmtInt, fmtPct, yyyymmdd } from "./format";
import { loadDashboardData } from "./loadDashboardData";
import type { DashboardData } from "./types";

function useData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let ok = true;
    loadDashboardData()
      .then((d) => {
        if (ok) {
          setData(d);
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
  return { data, err, loading };
}

export function App() {
  const { data, err, loading } = useData();

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

  const last = data.national_quarterly.at(-1);
  const h = last?.hospital_treatment;
  const g = last?.general_treatment;
  const refDate = yyyymmdd(data.meta.data_as_of ?? "");

  // Headline tier KPIs — from the post-reform, stable-mix period onward.
  const tierSeries = data.tier_quarterly ?? [];
  const firstStable = tierSeries.find((t) => t.quarter >= "2020-06-30");
  const latestTier = tierSeries.at(-1);
  const goldShareLatest = latestTier?.share.gold ?? null;
  const goldShareStart = firstStable?.share.gold ?? null;
  const goldPctChange =
    goldShareLatest != null && goldShareStart != null
      ? (goldShareLatest - goldShareStart) * 100
      : null;

  return (
    <div className="app">
      <span className="badge">APRA membership trends · DoH reform-data tiers · ABS ERP</span>
      <h1>Private health insurance coverage (Australia)</h1>
      <p className="lead">
        Insured <strong>persons</strong> with private hospital and general (extras) cover, and the
        market&apos;s product-tier mix, since the 1 April 2019 reforms. Sources: APRA (quarterly
        administrative returns), the Department of Health, Disability and Ageing (quarterly reform
        data), and ABS (population). Last quarter <strong>{refDate}</strong>.
      </p>

      <div className="kpi-row">
        <div className="kpi">
          <div className="label">Hospital — persons</div>
          <div className="value">{h ? fmtInt(h.insured_persons) : "—"}</div>
          <div className="sub">{h ? fmtPct(h.share_of_population) + "% of population" : ""}</div>
        </div>
        <div className="kpi">
          <div className="label">General (extras) — persons</div>
          <div className="value">{g ? fmtInt(g.insured_persons) : "—"}</div>
          <div className="sub">{g ? fmtPct(g.share_of_population) + "% of population" : ""}</div>
        </div>
        <div className="kpi">
          <div className="label">Gold share of hospital persons</div>
          <div className="value">
            {goldShareLatest != null ? fmtPct(goldShareLatest) + "%" : "—"}
          </div>
          <div className="sub">
            {goldPctChange != null
              ? `${goldPctChange >= 0 ? "+" : ""}${goldPctChange.toFixed(1)} pp since 2020-Q2`
              : ""}
          </div>
        </div>
        <div className="kpi">
          <div className="label">Data vintage</div>
          <div className="value" style={{ fontSize: "1.1rem" }}>
            {data.reconciliation.passed ? "OK" : "Check"}
          </div>
          <div className="sub">
            {data.meta.data_as_of ? `As of ${data.meta.data_as_of}` : ""} · {data.reconciliation.message}
          </div>
        </div>
      </div>

      <section>
        <h2>Product tier mix — hospital treatment, national</h2>
        <p className="lead" style={{ marginBottom: 12 }}>
          Insured persons by product tier (Gold, Silver, Bronze, Basic), from the Department of
          Health quarterly reform data. Gold&apos;s share of hospital-cover persons has fallen from
          roughly <strong>55% at the start of the reforms</strong> to <strong>{goldShareLatest != null ? fmtPct(goldShareLatest) : "—"}% in {refDate}</strong> — the
          clearest single signal of market drift toward lower-cover tiers. &ldquo;Legacy&rdquo;
          captures pre-reform products that insurers migrated into the new taxonomy during
          2019–Q1 2020; read the stable picture from 2020-Q2 onward.
        </p>
        <div className="chart-card">
          {tierSeries.length > 0 ? (
            <TierQuarterlyChart data={tierSeries} />
          ) : (
            <p className="muted">Tier series not present in this bundle.</p>
          )}
        </div>
      </section>

      <section>
        <h2>Population share (national)</h2>
        <p className="lead" style={{ marginBottom: 12 }}>
          Trend since the 2019 tier reforms. Share is as published in the APRA workbook
          (population denominator is the national estimate used there).
        </p>
        <div className="chart-card">
          <NationalCoverageChart data={data.national_quarterly} />
        </div>
      </section>

      <section>
        <h2>Insured persons (national, levels)</h2>
        <p className="lead" style={{ marginBottom: 12 }}>
          Same series, levels. <strong>Do not</strong> sum the two lines — overlap across cover types
          is material.
        </p>
        <div className="chart-card">
          <NationalInsuredPersonsChart data={data.national_quarterly} />
        </div>
      </section>

      <section>
        <h2>By state / territory (hospital — share of population)</h2>
        <p className="lead" style={{ marginBottom: 12 }}>
          APRA regional labels. &ldquo;Australia (national table)&rdquo; is the <strong>national</strong> hospital
          share for comparison. SA &amp; NT: combined first-block rate; persons where shown are
          implied from share × (SA+NT) population in the ETL.
        </p>
        <div className="chart-card">
          <JurisdictionChart
            jurisdiction={data.jurisdiction_quarterly}
            nationalHospitalQuarters={data.national_quarterly.map((n) => ({
              quarter: n.quarter,
              share_of_population: n.hospital_treatment.share_of_population,
            }))}
          />
        </div>
      </section>

      <section>
        <h2>Hospital coverage rate by age band</h2>
        <p className="lead" style={{ marginBottom: 12 }}>
          Share of each 5-year age band with hospital treatment cover, national. Insured persons
          from APRA <code>AgeCohort_HT</code>, population denominators from ABS national ERP by
          age. {data.meta.age_source_note ?? ""}
        </p>
        <div className="chart-card">
          {data.age_coverage_quarterly && data.age_coverage_quarterly.length > 0 ? (
            <AgeCoverageChart data={data.age_coverage_quarterly} />
          ) : (
            <p className="muted">Age-coverage series not yet built in this bundle.</p>
          )}
        </div>
      </section>

      <details className="methods">
        <summary>Data &amp; methods</summary>
        <div className="inner">
          <p>
            <strong>APRA Membership Trends:</strong> {data.meta.source_file}. <strong>Build:</strong>{" "}
            {data.meta.etl_build_time_utc}. All series are cut to{" "}
            <strong>{data.meta.series_start_iso}</strong> (first tier-reform quarter) so time
            windows are internally consistent across charts.
          </p>
          <p>{data.meta.hospital_vs_general_note}</p>
          <p>{data.meta.pop_denominator_note}</p>
          {data.meta.tier_note && (
            <p>
              <strong>Tier mix:</strong> {data.meta.tier_note}
            </p>
          )}
          <p>
            <strong>APRA methodology break:</strong> see APRA documentation around{" "}
            {data.meta.apra_methodology_change_iso}; charts are annotated where helpful.
          </p>
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
          {data.tier_reconciliation && (
            <p>
              <strong>Tier cross-check (DoH vs APRA):</strong>{" "}
              {data.tier_reconciliation.quarters_compared} quarters compared; worst relative
              difference {(data.tier_reconciliation.worst_relative_diff * 100).toFixed(2)}% at{" "}
              {data.tier_reconciliation.worst_quarter ?? "—"} (tolerance{" "}
              {(data.tier_reconciliation.tolerance * 100).toFixed(1)}%). {data.tier_reconciliation.passed ? "PASS." : "Investigate."}
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
            See <code>docs/DATA_SPEC.md</code> in the repository for a machine-readable one-page
            spec.
          </p>
        </div>
      </details>

      <footer className="site">
        Static dashboard. Built for GitHub Pages. Do not use as financial or actuarial advice. Always
        cite APRA / DoH / ABS and the snapshot date of this bundle.
      </footer>
    </div>
  );
}
