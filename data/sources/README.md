# `data/sources/` — checked-in source workbooks

Files in this directory are **source data** for the ETL, checked into git so CI does
not depend on external CDNs.

Why check them in rather than download in CI?

- **Reproducibility.** Every build uses the exact same bytes; the git commit history
  is the audit trail of data vintage.
- **CI reliability.** `health.gov.au` (Cloudflare-fronted) resets HTTP/2 streams
  from GitHub-hosted Actions runners, intermittently and unpredictably. Retrying
  within the same runner doesn't help because all runners share a small pool of
  Azure IPs that the CDN de-prioritises.
- **Governance.** Updating a checked-in file is a deliberate PR with a reviewable
  diff, not an invisible "the data silently changed under us" event.

## Current contents

| File | Source | Vintage | Size |
|------|--------|---------|------|
| `phi_reform_trends_dec_2025.xlsx` | Department of Health, Disability and Ageing — *Private Health Insurance Reform Data Quarterly Trends Report*. [Download page](https://www.health.gov.au/resources/publications/private-health-insurance-reform-data-quarterly-trends-report). | December 2025 quarter (workbook dated 7 Jan 2026) | 777 KB |

## Refresh procedure (quarterly)

1. Download the latest XLSX from the DoH page above.
2. Replace the file in this directory, keeping the same filename convention
   (`phi_reform_trends_<quarter>.xlsx`). If the URL or filename scheme changes on
   the DoH side, update the ETL default path in
   `etl/build_dashboard_data.py` and the CI step in `.github/workflows/pages.yml`.
3. Also refresh the APRA workbooks (downloaded in CI, not checked in — see the
   `Download APRA source workbooks` step in the workflow), and update
   `etl/expected_reconciliation.json` to match the new last-quarter national
   hospital insured-persons number.
4. Run `python etl/build_dashboard_data.py` locally to verify reconciliation and
   the DoH-vs-APRA cross-check both pass, then commit everything in one PR.

## Attribution

The workbook is published by the Australian Government Department of Health,
Disability and Ageing. Use and re-distribution must follow the department's terms
and cite the publication date.
