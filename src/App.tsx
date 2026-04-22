import { useEffect, useState } from "react";
import { AgeDistributionChart } from "./components/AgeDistributionChart";
import { JurisdictionChart } from "./components/JurisdictionChart";
import { NationalCoverageChart } from "./components/NationalCoverageChart";
import { NationalInsuredPersonsChart } from "./components/NationalInsuredPersonsChart";
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

  return (
    <div className="app">
      <span className="badge">APRA — membership trends (administrative)</span>
      <h1>Private health insurance coverage (Australia)</h1>
      <p className="lead">
        Insured <strong>persons</strong> and population shares for{" "}
        <strong>hospital</strong> and <strong>general (extras)</strong> cover — not policies, and
        not a single “distinct people” total (people may hold both). Source: build from APRA
        Membership Trends, last quarter <strong>{refDate}</strong>.
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
          <div className="label">ETL / data vintage</div>
          <div className="value" style={{ fontSize: "1.1rem" }}>
            {data.reconciliation.passed ? "OK" : "Check"}
          </div>
          <div className="sub">
            {data.meta.data_as_of ? `As of ${data.meta.data_as_of}` : ""} · {data.reconciliation.message}
          </div>
        </div>
      </div>

      <section>
        <h2>Population share (national)</h2>
        <p className="lead" style={{ marginBottom: 12 }}>
          Trend since 2010. Share is as published in the APRA workbook (population denominator is the
          national estimate used there).
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
          APRA regional labels. “Australia (national table)” is the <strong>national</strong> hospital
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
        <h2>By age (hospital — insured persons, latest quarter)</h2>
        <div className="chart-card">
          <AgeDistributionChart data={data.hospital_by_age_quarterly} />
        </div>
      </section>

      <section>
        <h2>Product tier (Gold / Silver / Bronze / Basic)</h2>
        <p className="lead">{data.meta.tier_note}</p>
      </section>

      <details className="methods">
        <summary>Data &amp; methods</summary>
        <div className="inner">
          <p>
            <strong>File:</strong> {data.meta.source_file}. <strong>Build:</strong>{" "}
            {data.meta.etl_build_time_utc}.
          </p>
          <p>{data.meta.hospital_vs_general_note}</p>
          <p>{data.meta.pop_denominator_note}</p>
          <p>
            <strong>APRA methodology break:</strong> see APRA documentation around{" "}
            {data.meta.apra_methodology_change_iso}; chart marks the next quarter in this extract for
            orientation.
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
          <p>
            <strong>Sources:</strong>
          </p>
          <ul>
            {data.meta.sources.map((s) => (
              <li key={s}>{s}</li>
            ))}
            <li>
              Australian Bureau of Statistics — population as referenced in APRA coverage
              construction (separate row-level ABoS tables not re-imported in this build).
            </li>
          </ul>
          <p className="muted" style={{ marginTop: 8 }}>
            See <code>docs/DATA_SPEC.md</code> in the repository for a machine-readable one-page
            spec.
          </p>
        </div>
      </details>

      <footer className="site">
        Static dashboard. Built for GitHub Pages. Do not use as financial or actuarial advice. Always
        cite APRA/ABS and the snapshot date of this bundle.
      </footer>
    </div>
  );
}
