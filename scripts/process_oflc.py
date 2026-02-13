#!/usr/bin/env python3
"""Process OFLC LCA disclosure data into county+job prevailing wage JSON."""

import argparse
import csv
import json
import statistics
from pathlib import Path
from typing import Dict, List, Optional, Tuple

UNIT_TO_ANNUAL = {
    "year": 1,
    "yr": 1,
    "hour": 2080,
    "hr": 2080,
    "week": 52,
    "wk": 52,
    "bi-weekly": 26,
    "month": 12,
    "day": 260,
}


def normalize_county(name: str) -> str:
    cleaned = (name or "").strip().lower().replace(" county", "")
    cleaned = cleaned.replace("saint ", "st ").replace("st. ", "st ")
    return " ".join(cleaned.split())


def parse_float(value: str) -> Optional[float]:
    try:
        return float(str(value).replace("$", "").replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def annualize(wage: Optional[float], unit: str) -> Optional[float]:
    if wage is None:
        return None
    factor = UNIT_TO_ANNUAL.get((unit or "").strip().lower())
    if factor is None:
        return None
    return wage * factor


def load_county_map(path: Path) -> Dict[Tuple[str, str], Tuple[str, str]]:
    lookup = {}
    with path.open() as f:
        for row in csv.DictReader(f):
            lookup[(row["state"].strip().upper(), row["county_normalized"].strip().lower())] = (
                row["county_fips"].zfill(5),
                row["county_name"],
            )
    return lookup


def pick(row: dict, *keys: str) -> str:
    for key in keys:
        if key in row and row[key] not in (None, ""):
            return str(row[key])
    return ""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--county-map", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--sample-output", required=False)
    parser.add_argument("--unmatched-log", required=True)
    args = parser.parse_args()

    county_lookup = load_county_map(Path(args.county_map))
    grouped: Dict[Tuple[str, str], dict] = {}
    unmatched: List[dict] = []

    with Path(args.input).open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            state = pick(row, "WORKSITE_STATE", "STATE").strip().upper()
            county_raw = pick(row, "WORKSITE_COUNTY", "COUNTY")
            county_normalized = normalize_county(county_raw)
            fips_raw = pick(row, "WORKSITE_COUNTY_FIPS", "COUNTY_FIPS").strip()
            fips = fips_raw.zfill(5) if fips_raw else ""
            job_title = pick(row, "JOB_TITLE", "SOC_TITLE", "OCCUPATION_TITLE").strip()
            unit = pick(row, "PW_UNIT_OF_PAY", "WAGE_UNIT_OF_PAY")

            if not (state and county_normalized and job_title):
                continue

            if not (fips and fips.isdigit() and len(fips) == 5 and fips != "00000"):
                mapped = county_lookup.get((state, county_normalized))
                if mapped:
                    fips = mapped[0]
                else:
                    unmatched.append({"state": state, "county": county_raw, "job_title": job_title})
                    continue

            mapped = county_lookup.get((state, county_normalized))
            county_name = mapped[1] if mapped else county_raw.replace(" County", "")

            l1 = annualize(parse_float(pick(row, "PW_WAGE_LEVEL_1", "PW_LEVEL_1")), unit)
            l2 = annualize(parse_float(pick(row, "PW_WAGE_LEVEL_2", "PW_LEVEL_2")), unit)
            l3 = annualize(parse_float(pick(row, "PW_WAGE_LEVEL_3", "PW_LEVEL_3")), unit)
            l4 = annualize(parse_float(pick(row, "PW_WAGE_LEVEL_4", "PW_LEVEL_4")), unit)

            if not all([l1, l2, l3, l4]):
                continue

            key = (fips, job_title)
            if key not in grouped:
                grouped[key] = {
                    "county_fips": fips,
                    "county_name": county_name,
                    "state": state,
                    "job_title": job_title,
                    "level_1": [],
                    "level_2": [],
                    "level_3": [],
                    "level_4": [],
                }
            grouped[key]["level_1"].append(l1)
            grouped[key]["level_2"].append(l2)
            grouped[key]["level_3"].append(l3)
            grouped[key]["level_4"].append(l4)

    result = {}
    for (_fips, _job), rec in grouped.items():
        item = {
            "county_fips": rec["county_fips"],
            "county_name": rec["county_name"],
            "state": rec["state"],
            "job_title": rec["job_title"],
            "level_1": round(statistics.median(rec["level_1"])),
            "level_2": round(statistics.median(rec["level_2"])),
            "level_3": round(statistics.median(rec["level_3"])),
            "level_4": round(statistics.median(rec["level_4"])),
            "source_count": len(rec["level_1"]),
        }
        result[f"{item['county_fips']}_{item['job_title']}"] = item

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2))

    if args.sample_output:
        sample_keys = list(result.keys())[:1000]
        Path(args.sample_output).write_text(json.dumps({k: result[k] for k in sample_keys}, indent=2))

    with Path(args.unmatched_log).open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["state", "county", "job_title"])
        writer.writeheader()
        writer.writerows(unmatched)

    print(f"Processed {len(result)} county+job records; unmatched counties: {len(unmatched)}")


if __name__ == "__main__":
    main()
