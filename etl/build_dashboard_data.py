"""
Build static dashboard JSON from APRA "Quarterly Private Health Insurance Membership Trends" xlsx.

Default input: data/raw/membership_trends_dec_2025.xlsx (download from APRA
https://www.apra.gov.au/publications/private-health-insurance-membership-and-coverage
 — "Statistical trends in membership and benefits" / Membership Trends.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import asdict, dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

# HT % coverage: header row 22 (0-based index 22) = row 23 in Excel — verified Dec 2025 file.
HT_COVERAGE_HEADER = 22
# GT % coverage: table starts later in sheet.
GT_COVERAGE_HEADER = 30
# HT by Age: age bands as columns; header on row 35 Excel (0-based 34).
HT_BY_AGE_HEADER = 34

HT_SHEET = "HT % coverage"
GT_SHEET = "GT % coverage"
AGE_SHEET = "HT by Age "

# APRA: reporting framework / collection change — annotate charts (see APRA private health insurance statistics)
APRA_METHODOLOGY_CHANGE = "2023-07-01"

STATE_KEYS_HT = [
    "NSW & ACT",
    "VIC",
    "QLD",
    "SA & NT*",
    "WA",
    "TAS",
    "ACT",
    "NT**",
    "AUST",
]
@dataclass
class ReconciliationResult:
    passed: bool
    metric: str
    expected: float | None
    actual: float | None
    abs_diff: float | None
    tolerance: float
    message: str


def _q_iso(ts: Any) -> str:
    if isinstance(ts, datetime):
        return ts.date().isoformat()
    if isinstance(ts, date):
        return ts.isoformat()
    return str(ts)[:10]


def load_ht_gt(path: Path) -> tuple[pd.DataFrame, pd.DataFrame]:
    ht = pd.read_excel(path, sheet_name=HT_SHEET, header=HT_COVERAGE_HEADER)
    gt = pd.read_excel(path, sheet_name=GT_SHEET, header=GT_COVERAGE_HEADER)
    return ht, gt


def load_ht_by_age(path: Path) -> pd.DataFrame:
    return pd.read_excel(path, sheet_name=AGE_SHEET, header=HT_BY_AGE_HEADER)


def build_national_quarterly_simple(ht: pd.DataFrame, gt: pd.DataFrame) -> list[dict[str, Any]]:
    h = ht.dropna(subset=["Quarter"]).copy()
    g = gt.dropna(subset=["Quarter"]).copy()
    h["Quarter"] = pd.to_datetime(h["Quarter"])
    g["Quarter"] = pd.to_datetime(g["Quarter"])
    h = h[h["Quarter"] >= "2010-01-01"]
    g = g[g["Quarter"] >= "2010-01-01"]
    hq = h.set_index("Quarter").sort_index()
    gq = g.set_index("Quarter").sort_index()
    common = sorted(hq.index.intersection(gq.index))
    rows: list[dict[str, Any]] = []
    for q in common:
        rh = hq.loc[q]
        rg = gq.loc[q]
        if isinstance(rh, pd.DataFrame):
            rh = rh.iloc[0]
        if isinstance(rg, pd.DataFrame):
            rg = rg.iloc[0]
        h_rate = float(rh["AUST"]) if pd.notna(rh["AUST"]) else None
        h_pers = float(rh["AUST.1"]) if pd.notna(rh.get("AUST.1")) else None
        h_erp = float(rh["AUST.2"]) if pd.notna(rh.get("AUST.2")) else None
        g_rate = float(rg["AUST"]) if pd.notna(rg["AUST"]) else None
        g_pers = float(rg["AUST.1"]) if pd.notna(rg.get("AUST.1")) else None
        g_erp = float(rg["AUST.2"]) if pd.notna(rg.get("AUST.2")) else None
        rows.append(
            {
                "quarter": _q_iso(q),
                "hospital_treatment": {
                    "insured_persons": h_pers,
                    "share_of_population": h_rate,
                    "population_denominator": h_erp,
                },
                "general_treatment": {
                    "insured_persons": g_pers,
                    "share_of_population": g_rate,
                    "population_denominator": g_erp,
                },
            }
        )
    return rows


def build_state_quarterly_clean(ht: pd.DataFrame) -> list[dict[str, Any]]:
    h = ht.dropna(subset=["Quarter"]).copy()
    h["Quarter"] = pd.to_datetime(h["Quarter"])
    h = h[h["Quarter"] >= "2010-01-01"]
    labels = [x for x in STATE_KEYS_HT if x != "AUST"]
    out: list[dict[str, Any]] = []
    for _, r in h.iterrows():
        q = r["Quarter"]
        jur: dict[str, Any] = {}
        for label in labels:
            jcode = label.replace(" & ", "_").replace("*", "").replace("**", "")
            if label == "SA & NT*":
                sh = float(r[label]) if pd.notna(r.get(label)) else None
                # APRA: combined % in first block; persons split under SA / NT in the second
                # block, populations under SA.1 / NT.1 (third block). No single combined
                # "insured persons" column — derive a consistent count from % × combined pop.
                p_sa = r.get("SA")
                p_nt = r.get("NT")
                pop_sa = r.get("SA.1")
                pop_nt = r.get("NT.1")
                pop = None
                if pd.notna(pop_sa) and pd.notna(pop_nt):
                    pop = float(pop_sa) + float(pop_nt)
                p = None
                if sh is not None and pop is not None:
                    p = sh * pop
                elif pd.notna(p_sa) and pd.notna(p_nt):
                    p = float(p_sa) + float(p_nt)
                if sh is not None or p is not None or pop is not None:
                    jur["SA_NT"] = {
                        "share_of_population": sh,
                        "insured_persons": p,
                        "population_denominator": pop,
                    }
                continue
            k1 = f"{label}.1"
            k2 = f"{label}.2"
            sh = float(r[label]) if label in h.columns and pd.notna(r.get(label)) else None
            p = float(r[k1]) if k1 in h.columns and pd.notna(r.get(k1)) else None
            pop = float(r[k2]) if k2 in h.columns and pd.notna(r.get(k2)) else None
            if sh is not None or p is not None or pop is not None:
                jur[jcode] = {
                    "share_of_population": sh,
                    "insured_persons": p,
                    "population_denominator": pop,
                }
        out.append({"quarter": _q_iso(q), "jurisdictions": jur})
    return out


def build_age_quarterly(age: pd.DataFrame) -> list[dict[str, Any]]:
    a = age.dropna(subset=["Quarter"]).copy()
    a["Quarter"] = pd.to_datetime(a["Quarter"])
    a = a[a["Quarter"] >= "2010-01-01"]
    age_cols = [c for c in a.columns if c != "Quarter"]
    out: list[dict[str, Any]] = []
    for _, r in a.iterrows():
        bands: dict[str, float] = {}
        for c in age_cols:
            if pd.isna(c) or c == "Quarter":
                continue
            v = r[c]
            if pd.notna(v):
                try:
                    bands[str(c).strip()] = float(v)
                except (TypeError, ValueError):
                    continue
        out.append({"quarter": _q_iso(r["Quarter"]), "hospital_insured_by_age_band": bands})
    return out


def reconcile(
    national: list[dict[str, Any]],
    expected_hospital: float | None,
    tolerance: float = 0.01,
) -> ReconciliationResult:
    if not national or expected_hospital is None:
        return ReconciliationResult(
            True,
            "hospital_insured_national_last_quarter",
            expected_hospital,
            None,
            None,
            tolerance,
            "No reconciliation target set — skipped.",
        )
    last = national[-1]["hospital_treatment"]["insured_persons"]
    if last is None:
        return ReconciliationResult(
            False,
            "hospital_insured_national_last_quarter",
            expected_hospital,
            None,
            None,
            tolerance,
            "Missing last-quarter hospital insured persons.",
        )
    diff = abs(last - expected_hospital)
    rel = diff / max(expected_hospital, 1.0)
    ok = rel <= tolerance
    return ReconciliationResult(
        ok,
        "hospital_insured_national_last_quarter",
        expected_hospital,
        last,
        diff,
        tolerance,
        "PASS" if ok else f"Relative diff {rel:.4f} exceeds tolerance {tolerance}.",
    )


def build_payload(
    xlsx_path: Path,
    expected_hospital: float | None,
    fail_on_reconcile: bool,
) -> dict[str, Any]:
    ht, gt = load_ht_gt(xlsx_path)
    age = load_ht_by_age(xlsx_path)
    national = build_national_quarterly_simple(ht, gt)
    by_state = build_state_quarterly_clean(ht)
    by_age = build_age_quarterly(age)

    rec = reconcile(national, expected_hospital)
    if not rec.passed and rec.message and "skipped" not in rec.message and fail_on_reconcile:
        raise SystemExit(f"Reconciliation failed: {rec.message} actual={rec.actual} expected={rec.expected}")

    now = datetime.now(timezone.utc).isoformat()
    last_q = None
    if national:
        last = national[-1]["quarter"]
        last_q = last
    return {
        "meta": {
            "data_as_of": last_q,
            "etl_build_time_utc": now,
            "source_file": str(xlsx_path.name),
            "apra_methodology_change_iso": APRA_METHODOLOGY_CHANGE,
            "pop_denominator_note": (
                "Population denominators and published coverage shares are as in the APRA "
                "Membership Trends workbook (state/national). Typically aligned to ABS population "
                "concepts; verify against APRA methodology notes for your use case."
            ),
            "hospital_vs_general_note": (
                "Hospital treatment and general (extras) are separate insured-persons series. "
                "They are not additive as a headcount of distinct people (many people hold both)."
            ),
            "tier_note": (
                "Product tier (Gold / Silver / Bronze / Basic) time series is not in the quarterly "
                "Membership Trends file; use APRA annual membership & benefits statistics for tier mix."
            ),
            "sources": [
                "Australian Prudential Regulation Authority (APRA) — Quarterly private health insurance membership trends.",
                "ABoS population concepts as referenced in APRA coverage tables (not separately imported in this build).",
            ],
        },
        "reconciliation": asdict(rec),
        "national_quarterly": national,
        "jurisdiction_quarterly": by_state,
        "hospital_by_age_quarterly": by_age,
    }


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--xlsx",
        type=Path,
        default=Path("data/raw/membership_trends_dec_2025.xlsx"),
    )
    p.add_argument(
        "--out",
        type=Path,
        default=Path("public/data/dashboard.json"),
    )
    p.add_argument(
        "--expected-hospital-insured",
        type=float,
        default=None,
        help="If set, last-quarter national hospital insured persons must match within tolerance (default 1%).",
    )
    p.add_argument("--no-fail-reconcile", action="store_true")
    args = p.parse_args()
    if not args.xlsx.exists():
        print(f"Missing {args.xlsx}. Download the APRA 'Membership Trends' xlsx into data/raw/.", file=sys.stderr)
        sys.exit(1)
    ex = None
    if args.expected_hospital_insured is not None:
        ex = args.expected_hospital_insured
    elif os.environ.get("EXPECTED_HOSPITAL_INSURED"):
        ex = float(os.environ["EXPECTED_HOSPITAL_INSURED"])
    else:
        exp_path = Path(__file__).resolve().parent / "expected_reconciliation.json"
        if exp_path.exists():
            with exp_path.open(encoding="utf-8") as f:
                exp = json.load(f)
            v = exp.get("hospital_insured_national")
            if v is not None:
                ex = float(v)
    pl = build_payload(args.xlsx, ex, fail_on_reconcile=not args.no_fail_reconcile)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(pl, indent=2), encoding="utf-8")
    print(f"Wrote {args.out} ({len(pl['national_quarterly'])} quarters national).")


if __name__ == "__main__":
    main()
