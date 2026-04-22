"""
Fetch ABS Estimated Resident Population (ERP), national, quarterly, by 5-year age band,
Persons (both sexes), and write a tidy CSV.

ABS SDMX dataflow: ABS:ERP_Q(1.0.0)
Dimensions (in order): MEASURE . SEX . AGE . REGION . FREQ

We request MEASURE=1 (Estimated Resident Population), SEX=3 (Persons), REGION=AUS (Australia),
FREQ=Q, and a combination of aggregate 5-year bands + single-year ages 80-115 to build
an "80+" tail:

- Aggregate codes A04 (0-4), A59 (5-9), A10 (10-14), ..., A75 (75-79) give bands 0-79.
- The aggregate codes A85 / A90 / A95 exist in the codelist but ERP_Q does not populate
  them, and A80 in this dataflow is "80-84" (not "80 and over"). We therefore fetch
  single-year ages 80-115 and sum to a synthetic "80+" band.

Output CSV: quarter (e.g. "2025-Q3"), age_band ("0-4" ... "75-79", "80+"), population.
"""
from __future__ import annotations

import argparse
import csv
import sys
from collections import defaultdict
from pathlib import Path
from urllib.request import Request, urlopen

BAND_AGGREGATES: list[tuple[str, str]] = [
    ("A04", "0-4"),
    ("A59", "5-9"),
    ("A10", "10-14"),
    ("A15", "15-19"),
    ("A20", "20-24"),
    ("A25", "25-29"),
    ("A30", "30-34"),
    ("A35", "35-39"),
    ("A40", "40-44"),
    ("A45", "45-49"),
    ("A50", "50-54"),
    ("A55", "55-59"),
    ("A60", "60-64"),
    ("A65", "65-69"),
    ("A70", "70-74"),
    ("A75", "75-79"),
]
SINGLE_AGES_80PLUS: list[str] = [str(a) for a in range(80, 116)]

AGGREGATE_CODES = [code for code, _ in BAND_AGGREGATES]
BAND_BY_CODE = {code: band for code, band in BAND_AGGREGATES}
REQUEST_AGE_CODES = AGGREGATE_CODES + SINGLE_AGES_80PLUS

API_URL_TEMPLATE = (
    "https://data.api.abs.gov.au/rest/data/ABS,ERP_Q,1.0.0/"
    "1.3.{ages}.AUS.Q?startPeriod={start}"
)

OUT_BAND_ORDER = [band for _, band in BAND_AGGREGATES] + ["80+"]


def fetch(start: str = "2019-Q2") -> str:
    url = API_URL_TEMPLATE.format(ages="+".join(REQUEST_AGE_CODES), start=start)
    req = Request(url, headers={"Accept": "application/vnd.sdmx.data+csv"})
    with urlopen(req, timeout=90) as r:
        return r.read().decode("utf-8")


def to_tidy_csv(raw_csv: str, out: Path) -> int:
    reader = csv.DictReader(raw_csv.splitlines())
    buckets: dict[tuple[str, str], float] = defaultdict(float)
    for r in reader:
        age = r["AGE"]
        q = r["TIME_PERIOD"]
        try:
            v = float(r["OBS_VALUE"])
        except (TypeError, ValueError):
            continue
        if age in BAND_BY_CODE:
            band = BAND_BY_CODE[age]
            buckets[(q, band)] += v
        else:
            # Single-year ages 80-115 all contribute to the synthetic "80+" band.
            try:
                single = int(age)
            except ValueError:
                continue
            if single >= 80:
                buckets[(q, "80+")] += v

    rows = [
        {"quarter": q, "age_band": band, "population": int(round(v))}
        for (q, band), v in buckets.items()
    ]
    rows.sort(key=lambda r: (r["quarter"], OUT_BAND_ORDER.index(r["age_band"])))
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["quarter", "age_band", "population"])
        w.writeheader()
        w.writerows(rows)
    return len(rows)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--out", type=Path, default=Path("data/curated/abs_erp_national_5y.csv"))
    p.add_argument("--start", default="2019-Q2")
    args = p.parse_args()
    try:
        raw = fetch(args.start)
    except Exception as e:
        print(f"ABS ERP fetch failed: {e}", file=sys.stderr)
        sys.exit(1)
    n = to_tidy_csv(raw, args.out)
    print(f"Wrote {args.out} ({n} rows).")


if __name__ == "__main__":
    main()
