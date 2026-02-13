# H1B Wage Map

Production-ready dashboard for visualizing H-1B prevailing wage levels by US county, deployable to GitHub Pages as a static site.

## Why data was previously "sample only"
GitHub Pages is static hosting (no always-on backend API), so the frontend cannot safely run heavy OFLC ETL in-browser on every page load. The recommended production pattern is:
1. Fetch official OFLC disclosures in CI.
2. Process and aggregate offline.
3. Publish fresh JSON artifacts for the static app.

This repo now supports that automated refresh flow.

## Stack
- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- React-Leaflet county choropleth
- Python ETL scripts for OFLC ingestion + transformation

## Features
- Dark, modern dashboard layout inspired by `h1b-map.vercel.app`
- Job Title selector
- Base Salary slider (30,000–300,000)
- County color classification:
  - Green: Strong (>= Level 3)
  - Blue: Good (>= Level 2)
  - Yellow: Risky (>= Level 1)
  - Red: Unlikely (< Level 1)
- County hover tooltip shows Level 1–4 wages
- Right panel shows clicked county detail and recommendation to reach Level 3
- Missing county/job data rendered in gray

## Project Structure

```text
.github/workflows/
  deploy-pages.yml
  refresh-oflc-data.yml
app/
  globals.css
  layout.tsx
  page.tsx
components/
  WageMap.tsx
lib/
  types.ts
  wageLogic.ts
scripts/
  fetch_oflc_disclosure.py
  process_oflc.py
data/
  raw/sample_oflc_lca.csv
  raw/oflc_lca_latest.csv
  reference/county_fips_reference.csv
  processed/h1b_wage_by_county_job.json
  processed/h1b_wage_sample.json
public/
  data/h1b_wage_by_county_job.json
```

## Local Setup

```bash
npm install
npm run process:data
npm run dev
```

Open `http://localhost:3000`.

## Hydration mismatch fix
To avoid locale-based SSR/client differences (`1,20,000` vs `120,000`), salary values are now rendered with a deterministic comma formatter + `suppressHydrationWarning` on dynamic salary text.

## GitHub Pages Deployment

This project uses static export (`output: 'export'`) and deploys from GitHub Actions.

1. Push to `main` (or `master`).
2. In GitHub repository settings:
   - Go to **Settings → Pages**
   - Set **Source** to **GitHub Actions**
3. Workflow `.github/workflows/deploy-pages.yml` will:
   - Install dependencies
   - Build static files into `out/`
   - Deploy to GitHub Pages

## Official OFLC refresh (automated)

Workflow: `.github/workflows/refresh-oflc-data.yml`
- Runs weekly + manual trigger.
- Scrapes OFLC performance page for recent H-1B disclosure files.
- Downloads and merges recent files to `data/raw/oflc_lca_latest.csv`.
- Re-processes county wage JSON and updates static frontend artifact.
- Commits and pushes refreshed data.

### Manual refresh locally

```bash
python3 -m pip install pandas openpyxl requests
python3 scripts/fetch_oflc_disclosure.py --output data/raw/oflc_lca_latest.csv --limit 4
python3 scripts/process_oflc.py \
  --input data/raw/oflc_lca_latest.csv \
  --county-map data/reference/county_fips_reference.csv \
  --output data/processed/h1b_wage_by_county_job.json \
  --sample-output data/processed/h1b_wage_sample.json \
  --unmatched-log data/processed/unmatched_counties.csv \
  --public-output public/data/h1b_wage_by_county_job.json
```

## Data processing notes
Official source: https://www.dol.gov/agencies/eta/foreign-labor/performance

- Normalizes county names (`County` removal, case normalization, `Saint -> St`)
- Uses state + county lookup to fill missing FIPS from reference mapping file
- Annualizes hourly/daily/weekly/monthly wages
- Aggregates by `county_fips + job_title`
- Computes median `level_1..level_4`
- Logs unmatched counties to `data/processed/unmatched_counties.csv`

> Important: `data/reference/county_fips_reference.csv` in this repo is a minimal demo mapping. For full production coverage, replace it with a complete Census county-to-FIPS mapping file.
