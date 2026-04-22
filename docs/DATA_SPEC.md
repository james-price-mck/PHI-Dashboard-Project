# One-page data specification (PHI dashboard)

This table is the **source of truth** for metrics shown in the app. Update when changing extracts or ETL.

| metric_id | definition | source | earliest | latest | frequency | known_breaks |
|-----------|------------|--------|----------|--------|------------|--------------|
| `national_hospital` | Insured persons with **hospital treatment** cover, Australia (not policies). | APRA *Quarterly Private Health Insurance Membership Trends* · sheet `HT % coverage` · column block “Total Hospital Treatment Coverage (number of insured persons)” · `AUST.1` | 2010-03-31* | (see `meta.data_as_of` in `dashboard.json`) | Quarterly (calendar quarter) | `2023-07-01` APRA reporting/collection change (see APRA documentation for comparability). |
| `national_general` | Insured persons with **general (extras) treatment** cover, Australia. | Same workbook · sheet `GT % coverage` · `AUST.1` | 2010-03-31* | (see `meta.data_as_of`) | Quarterly | As above. |
| `national_rate_hospital` | Share of **Australian population** with hospital cover (as defined in APRA table). | `HT % coverage` · `AUST` (first block) | 2010+ | (see `meta.data_as_of`) | Quarterly | As above. |
| `jurisdiction_hospital` | Insured persons (hospital) and rates by **state/territory** labels as in APRA columns (e.g. NSW & ACT, SA & NT*). | `HT % coverage` · regional columns in each block | 2010+ | (see `meta.data_as_of`) | Quarterly | **SA & NT\***: combined first-block `share_of_population`; the workbook does not expose a single “combined insured persons” cell — ETL **derives** persons as **share × (SA+NT) population** from the third block (`SA.1`+`NT.1`) to stay consistent with the published share. Jurisdictions are as published; **not** a substitute for the Coverage Survey for age/sex. |
| `hospital_by_age` | **Hospital** insured persons by **single year of age band** columns (0–4, 5–9, …, 90-94+). | `HT by Age` sheet | 2010+** | (see `meta.data_as_of`) | Quarterly | Age bands per APRA. |
| `tier_gold_silver_etc` | Gold / Silver / Bronze / Basic mix | **Not** in quarterly membership trends. Use APRA **annual** membership and benefits statistics. | — | — | Annual (typ.) | `2019-04-01` market tier taxonomy. |

\*First quarter in the built extract after applying `>= 2010-01-01` filter.  
\*\*The `HT by Age` sheet in the inspected file has age detail from 1997; the dashboard filters to `>= 2010-01-01` for consistency with national series.

**Hospital vs general (extras):** the same person may hold both; **do not** add national hospital + general insured persons to imply a “distinct people” total.

**Denominators:** population figures used in the APRA workbook (`*.2` blocks) align published **coverage %** = insured / population for that table; for strict ABoS ERP comparisons, use ABoS tables separately (not merged in the default ETL).

**Reconciliation:** CI compares the last quarter **national hospital insured persons** to `etl/expected_reconciliation.json` (update when the source xlsx is refreshed).
