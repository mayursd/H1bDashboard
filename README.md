# H1B Wage Map

Production-ready full-stack dashboard for visualizing H-1B prevailing wage levels by US county, now configured to deploy as a static GitHub Pages site.

## Stack
- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- React-Leaflet county choropleth
- Python ETL pipeline for OFLC LCA disclosure data

## Features
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
  process_oflc.py
data/
  raw/sample_oflc_lca.csv
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

The app automatically sets Next.js `basePath`/`assetPrefix` to `/<repo-name>` during CI.

## Data processing (OFLC)

Official source: https://www.dol.gov/agencies/eta/foreign-labor/performance

1. Download OFLC H-1B LCA disclosure CSV/XLSX files and convert to CSV if needed.
2. Replace `data/raw/sample_oflc_lca.csv` with full extracted rows.
3. Run:

```bash
npm run process:data
```

### ETL behavior
- Normalizes county names (`County` removal, case normalization, `Saint -> St`)
- Uses state + county lookup to fill missing FIPS from reference mapping file
- Annualizes hourly/daily/weekly/monthly wages
- Aggregates by `county_fips + job_title`
- Computes median `level_1..level_4`
- Logs unmatched counties to `data/processed/unmatched_counties.csv`
- Syncs static frontend data to `public/data/h1b_wage_by_county_job.json`

### Output format

```json
{
  "29189_Software Developer": {
    "county_fips": "29189",
    "county_name": "St. Louis",
    "state": "MO",
    "job_title": "Software Developer",
    "level_1": 76400,
    "level_2": 97385,
    "level_3": 118705,
    "level_4": 140846,
    "source_count": 11
  }
}
```
