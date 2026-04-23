# Private Health Insurance (Australia) — coverage dashboard

Static React dashboard (Vite) for **insured persons** and **product-tier mix** in Australian private health insurance, since the 1 April 2019 reforms. Built from three sources:

1. **APRA** — *Quarterly Private Health Insurance Membership Trends* (national / state coverage and insured persons).
2. **APRA** — *Quarterly Private Health Insurance Membership and Benefits* (`AgeCohort_HT` sheet, for the age-coverage chart).
3. **Department of Health, Disability and Ageing** — *Private Health Insurance Reform Data Quarterly Trends Report* (sheet `4 HT by Product Tier`, insured-persons block — source of the Gold/Silver/Bronze/Basic time series).
4. **ABS** — Estimated Resident Population by 5-year age band (via the ABS Data API; populates the age-coverage chart's denominator).

Deployable to **GitHub Pages** with **GitHub Actions**.

## Quick start

1. **Download source files** into `data/raw/` (this directory is gitignored — not checked in):

   - APRA *Membership Trends* (e.g. `data/raw/membership_trends_dec_2025.xlsx`) from [APRA — Private health insurance membership and coverage](https://www.apra.gov.au/publications/private-health-insurance-membership-and-coverage).
   - APRA *Membership and Benefits* (e.g. `data/raw/membership_benefits_dec_2025.xlsx`) from the same APRA page.

   The **DoH** *PHI Reform Data Quarterly Trends Report* is **checked into the repo** under `data/sources/` because `health.gov.au`'s CDN is unreliable from GitHub Actions runners. See [`data/sources/README.md`](data/sources/README.md) for the quarterly refresh procedure.

2. **Fetch ABS ERP** (writes `data/curated/abs_erp_national_5y.csv`):

   ```bash
   python -m pip install -r etl/requirements.txt
   python etl/fetch_abs_erp.py
   ```

3. **Python ETL** (writes `public/data/dashboard.json`):

   ```bash
   python etl/build_dashboard_data.py \
     --xlsx data/raw/membership_trends_dec_2025.xlsx \
     --membership-benefits data/raw/membership_benefits_dec_2025.xlsx
   # --tier-xlsx defaults to data/sources/phi_reform_trends_dec_2025.xlsx
   ```

4. **Premium tiers (annual refresh)** — `public/data/premium_tiers.json` backs the “Gold premiums diverged” section. After each **1 April** premium round, update:
   - `industry_average_pct` — one entry per round, from **DoH** [average annual price changes](https://www.health.gov.au/resources/publications/average-annual-price-changes-in-private-health-insurance-premiums).
   - `tier_rounds` — one entry per round where credible per-tier figures exist (today: the big-five CHOICE analyses of the April 2025 and April 2026 rounds). Each entry carries `gold`, `silver`, `bronze`, `basic`, the matching `industry_avg_pct`, and a `source` string.
   - `multi_year_observations` — aggregate Gold-vs-industry statements (e.g. the CHOICE 5-year number). Do **not** backfill per-tier figures with industry-average fallbacks; that was the misleading pattern we removed.

5. **Front end** (produces `package-lock.json`; **commit the lockfile** for faster, reliable CI):

   ```bash
   npm install
   npm run dev
   ```

6. **Production build**:

   ```bash
   npm run build
   npm run preview
   ```

7. For **GitHub Pages** (project site at `/<repo-name>/`):

   - **Enable Pages once** (required or `deploy-pages` returns **404 Not Found**): go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions** (not "Deploy from a branch").
   - The workflow sets `VITE_BASE` to `/${{ github.event.repository.name }}/` for project-site URLs.
   - CI uses current first-party `actions/*` major versions and `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` to stay ahead of the [Node 20 deprecation on runners](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/).

8. **Reconciliation** (optional gate): the ETL loads `etl/expected_reconciliation.json` and compares the **last** quarter's **national hospital insured persons** to `hospital_insured_national`. It also cross-checks the DoH tier total against APRA (tolerance 1%) and the age-band sum against APRA (tolerance 2%). **Update** `expected_reconciliation.json` when you refresh the APRA workbook so CI keeps passing, or use `--no-fail-reconcile` for local experiments.

## Data spec

Authoritative one-page spec: [`docs/DATA_SPEC.md`](docs/DATA_SPEC.md). JSON shape: [`public/data/dashboard.schema.json`](public/data/dashboard.schema.json).

## License

The code in this repository is provided as-is. The **data** is from APRA, the Department of Health, Disability and Ageing, and the Australian Bureau of Statistics; use and attribution must follow those agencies' terms.
