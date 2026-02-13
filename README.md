# OFLC Role + Wage County Dashboard

This dashboard automatically loads OFLC H-1B disclosure data from the OFLC website and asks the user for only:

- Role
- User wage

It then color-codes US counties based on how county average wages compare to the user wage.

## Run

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Behavior

- Red counties: county average is below your wage.
- Yellow counties: county average is around your wage.
- Green counties: county average is above your wage.

## Data source

`script.js` uses OFLC disclosure workbook URLs from `dol.gov` (FY2023 Q1-Q4 by default) and combines them.
Update `OFLC_DATASETS` when newer OFLC files are published.
