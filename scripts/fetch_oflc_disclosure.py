#!/usr/bin/env python3
"""Fetch latest OFLC H-1B disclosure files and consolidate into one CSV."""

import argparse
import re
from pathlib import Path
from urllib.parse import urljoin

import pandas as pd
import requests

PERFORMANCE_URL = "https://www.dol.gov/agencies/eta/foreign-labor/performance"
PATTERN = re.compile(r"https://www\.dol\.gov[^\"']*H-1B[^\"']*Disclosure[^\"']*\.(?:xlsx|csv)", re.IGNORECASE)


def discover_urls(limit: int) -> list[str]:
    html = requests.get(PERFORMANCE_URL, timeout=30).text
    urls = set(PATTERN.findall(html))

    # Fallback for relative links if page format changes.
    if not urls:
        rel_pattern = re.compile(r"href=[\"']([^\"']*H-1B[^\"']*Disclosure[^\"']*\.(?:xlsx|csv))[\"']", re.IGNORECASE)
        for rel in rel_pattern.findall(html):
            urls.add(urljoin(PERFORMANCE_URL, rel))

    return sorted(urls, reverse=True)[:limit]


def read_oflc_file(url: str) -> pd.DataFrame:
    if url.lower().endswith(".csv"):
        return pd.read_csv(url, low_memory=False)
    return pd.read_excel(url, engine="openpyxl")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="data/raw/oflc_lca_latest.csv")
    parser.add_argument("--limit", type=int, default=4, help="How many most recent disclosure files to combine")
    args = parser.parse_args()

    urls = discover_urls(args.limit)
    if not urls:
        raise RuntimeError("Could not discover OFLC disclosure URLs from performance page")

    frames = []
    for url in urls:
        print(f"Loading: {url}")
        df = read_oflc_file(url)
        df["_source_url"] = url
        frames.append(df)

    merged = pd.concat(frames, ignore_index=True)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    merged.to_csv(out, index=False)
    print(f"Wrote {len(merged)} rows from {len(urls)} files to {out}")


if __name__ == "__main__":
    main()
