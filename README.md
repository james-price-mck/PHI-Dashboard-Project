# Private Health Insurance (Australia) — coverage dashboard

Static React dashboard (Vite) for **insured persons** and **population shares** of **hospital** and **general (extras)** private health cover, built from the Australian Prudential Regulation Authority (APRA) **Quarterly Private Health Insurance Membership Trends** Excel workbook. Deployable to **GitHub Pages** with **GitHub Actions**.

## Quick start

1. **Download** the latest *Quarterly Private Health Insurance Membership Trends* (XLSX) from [APRA — Private health insurance membership and coverage](https://www.apra.gov.au/publications/private-health-insurance-membership-and-coverage) and save it as e.g. `data/raw/membership_trends_dec_2025.xlsx` (or pass `--xlsx`).

2. **Python ETL** (writes `public/data/dashboard.json`):

   ```bash
   python -m pip install -r etl/requirements.txt
   python etl/build_dashboard_data.py --xlsx data/raw/membership_trends_dec_2025.xlsx
   ```

3. **Front end** (produces `package-lock.json`; **commit the lockfile** for faster, reliable CI):

   ```bash
   npm install
   npm run dev
   ```

4. **Production build**:

   ```bash
   npm run build
   npm run preview
   ```

5. For **GitHub Pages** (project site at `/<repo-name>/`):

   - **Enable Pages once** (required or `deploy-pages` returns **404 Not Found**): go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions** (not “Deploy from a branch”). Without this, the workflow can build and upload an artifact but **Create Pages deployment** fails.
   - The workflow sets `VITE_BASE` to `/${{ github.event.repository.name }}/` for project-site URLs.
   - CI uses current first-party `actions/*` major versions and `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` to stay ahead of the [Node 20 deprecation on runners](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/) (action internals; the Vite build uses Node 22 in `setup-node`).

6. **Reconciliation** (optional gate): the ETL loads `etl/expected_reconciliation.json` and compares the **last** quarter’s **national hospital insured persons** to `hospital_insured_national`. **Update** that file when you refresh the APRA workbook so CI keeps passing, or use `--no-fail-reconcile` for local experiments.

## Data spec

Authoritative one-page spec: [`docs/DATA_SPEC.md`](docs/DATA_SPEC.md). JSON shape: [`public/data/dashboard.schema.json`](public/data/dashboard.schema.json).

## License

The code in this repository is provided as-is. The **data** is from APRA (and population concepts as noted by APRA); use and attribution must follow APRA and the Australian Bureau of Statistics where applicable.
