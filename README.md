# Private Health Insurance (Australia) — coverage dashboard

Static React dashboard (Vite) for **insured persons** and **product-tier mix** in Australian private health insurance, since the 1 April 2019 reforms. Built from three sources:

1. **APRA** — *Quarterly Private Health Insurance Membership Trends* (national / state coverage and insured persons).
2. **APRA** — *Quarterly Private Health Insurance Membership and Benefits* (`AgeCohort_HT` sheet, for the age-coverage chart).
3. **Department of Health, Disability and Ageing** — *Private Health Insurance Reform Data Quarterly Trends Report* (sheet `4 HT by Product Tier`, insured-persons block — source of the Gold/Silver/Bronze/Basic time series).
4. **ABS** — Estimated Resident Population by 5-year age band (via the ABS Data API; populates the age-coverage chart's denominator).

Deployable to **GitHub Pages** with **GitHub Actions**.

## Quick start

1. **Download source files** into `data/raw/`:

   - APRA *Membership Trends* (e.g. `data/raw/membership_trends_dec_2025.xlsx`) from [APRA — Private health insurance membership and coverage](https://www.apra.gov.au/publications/private-health-insurance-membership-and-coverage).
   - APRA *Membership and Benefits* (e.g. `data/raw/membership_benefits_dec_2025.xlsx`) from the same APRA page.
   - DoH *PHI Reform Data Quarterly Trends Report* (e.g. `data/raw/phi_reform_trends.xlsx`) from [health.gov.au](https://www.health.gov.au/resources/publications/private-health-insurance-reform-data-quarterly-trends-report).

2. **Fetch ABS ERP** (writes `data/curated/abs_erp_national_5y.csv`):

   ```bash
   python -m pip install -r etl/requirements.txt
   python etl/fetch_abs_erp.py
   ```

3. **Python ETL** (writes `public/data/dashboard.json`):

   ```bash
   python etl/build_dashboard_data.py \
     --xlsx data/raw/membership_trends_dec_2025.xlsx \
     --membership-benefits data/raw/membership_benefits_dec_2025.xlsx \
     --tier-xlsx data/raw/phi_reform_trends.xlsx
   ```

4. **Front end** (produces `package-lock.json`; **commit the lockfile** for faster, reliable CI):

   ```bash
   npm install
   npm run dev
   ```

5. **Production build**:

   ```bash
   npm run build
   npm run preview
   ```

6. For **GitHub Pages** (project site at `/<repo-name>/`):

   - **Enable Pages once** (required or `deploy-pages` returns **404 Not Found**): go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions** (not "Deploy from a branch").
   - The workflow sets `VITE_BASE` to `/${{ github.event.repository.name }}/` for project-site URLs.
   - CI uses current first-party `actions/*` major versions and `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` to stay ahead of the [Node 20 deprecation on runners](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/).

7. **Reconciliation** (optional gate): the ETL loads `etl/expected_reconciliation.json` and compares the **last** quarter's **national hospital insured persons** to `hospital_insured_national`. It also cross-checks the DoH tier total against APRA (tolerance 1%) and the age-band sum against APRA (tolerance 2%). **Update** `expected_reconciliation.json` when you refresh the APRA workbook so CI keeps passing, or use `--no-fail-reconcile` for local experiments.

## Data spec

Authoritative one-page spec: [`docs/DATA_SPEC.md`](docs/DATA_SPEC.md). JSON shape: [`public/data/dashboard.schema.json`](public/data/dashboard.schema.json).

## License

The code in this repository is provided as-is. The **data** is from APRA, the Department of Health, Disability and Ageing, and the Australian Bureau of Statistics; use and attribution must follow those agencies' terms.
