# One-page data specification (PHI dashboard)

This table is the **source of truth** for metrics shown in the app. Update when changing extracts or ETL. All series start on **2019-04-01** (first tier-reform quarter) so time windows align across charts.

| metric_id | definition | source | earliest | latest | frequency | known_breaks |
|-----------|------------|--------|----------|--------|------------|--------------|
| `national_hospital` | Insured persons with **hospital treatment** cover, Australia (not policies). | APRA *Quarterly Private Health Insurance Membership Trends* · sheet `HT % coverage` · column block "Total Hospital Treatment Coverage (number of insured persons)" · `AUST.1` | 2019-06-30 | (see `meta.data_as_of` in `dashboard.json`) | Quarterly (calendar quarter) | `2023-07-01` APRA reporting/collection change (see APRA documentation for comparability). |
| `national_general` | Insured persons with **general (extras) treatment** cover, Australia. | Same workbook · sheet `GT % coverage` · `AUST.1` | 2019-06-30 | (see `meta.data_as_of`) | Quarterly | As above. |
| `national_rate_hospital` | Share of **Australian population** with hospital cover (as defined in APRA table). | `HT % coverage` · `AUST` (first block) | 2019-06-30 | (see `meta.data_as_of`) | Quarterly | As above. |
| `jurisdiction_hospital` | Insured persons (hospital) and rates by **state/territory** labels as in APRA columns (e.g. NSW & ACT, SA & NT*). | `HT % coverage` · regional columns in each block | 2019-06-30 | (see `meta.data_as_of`) | Quarterly | **SA & NT\***: combined first-block `share_of_population`; the workbook does not expose a single "combined insured persons" cell — ETL **derives** persons as **share × (SA+NT) population** from the third block (`SA.1`+`NT.1`). |
| `age_coverage` | **Hospital** cover rate by **5-year age band** = APRA insured persons ÷ ABS population. | APRA *Quarterly Membership and Benefits* · sheet `AgeCohort_HT`; denominator from ABS ERP_Q via SDMX. | 2019-06-30 | (see `meta.data_as_of`) | Quarterly | APRA's `80-84 / 85-89 / 90-94 / 95+` bands are collapsed to **`80+`** to match ABS ERP_Q's highest published band. ABS ERP_Q publishes with ~1-quarter lag; the ETL holds the latest ABS distribution forward and flags the affected quarter in `meta.age_source_note`. |
| `tier_quarterly` | Insured persons with **hospital treatment** cover by **product tier** (Gold / Silver / Bronze / Basic / Legacy), Australia. | Department of Health, Disability and Ageing *Private Health Insurance Reform Data Quarterly Trends Report* · sheet `4 HT by Product Tier` · **insured-persons block** (rows ~31+; above that is the policies block we do **not** read) · summary column for each tier. | 2019-06-30 | (see `meta.data_as_of`) | Quarterly | Tiers were introduced on **1 April 2019** and mandatory from **1 April 2020**; the `Legacy` tier captures pre-reform products that insurers migrated into the new taxonomy through 2019–Q1 2020 (after which it is zero). Read the stable tier picture from **2020-Q2** onward. |

**Hospital vs general (extras):** the same person may hold both; **do not** add national hospital + general insured persons to imply a "distinct people" total.

**Denominators:** population figures used in the APRA workbook (`*.2` blocks) align published **coverage %** = insured / population for that table. The age-coverage chart uses ABS ERP by 5-year age band (persons, national) via the ABS Data API (dataflow `ERP_Q`, `MEASURE=1`, `SEX=3`, `REGION=AUS`).

**Reconciliation:**

1. CI compares the last quarter **national hospital insured persons** to `etl/expected_reconciliation.json` (update when the source xlsx is refreshed).
2. The ETL cross-checks the **sum of DoH tier insured persons** against **APRA national hospital insured persons** for every overlapping quarter; tolerance 1% (emitted as `tier_reconciliation` in the bundle). DoH and APRA are independent collections; small differences (≤1%) are expected.
3. The ETL cross-checks the **sum of `AgeCohort_HT` insured persons** against **APRA national hospital insured persons** for every overlapping quarter; tolerance 2%.
