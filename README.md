# Flight Maintenance Tracker

A Domo Custom App for aircraft maintenance tracking: fleet status, due lists, work orders, compliance and maintenance forecasting. It replaces a manual spreadsheet workflow with automated data ingestion and a live dashboard.

## Architecture

```
Maintenance tracking system exports (Excel / PDF)
       ↓
File Upload Interface (Validation + Approval)
       ↓
Magic ETL (Transform + Business Logic)
       ↓
Domo Datasets
       ↓
Custom Domo App (HTML/CSS/JS + domo.js)
```

### Technology Stack
- **Frontend:** Domo Custom App (HTML/CSS/JS)
- **ETL:** Magic ETL + Code Engine (Python for complex parsing)
- **Storage:** Domo Datasets
- **File Upload:** Custom UI → Dataset API
- **Access Control:** Domo PDP (Personalized Data Permissions)
- **Optional sync:** Google Sheets → local JSON via `sync_sheet.py`

## Features

- **Fleet status grid** with a 5-tier color system: Grey → Magenta → Red → Yellow (MEL) → Green
- **Due lists** per tail number, with status: Overdue / Grounded / In Margin / Approaching / OK
- **Work orders**: create blank, or auto-populate from due items
- **Compliance tracking**: tool calibration and shelf-life consumables (Current / Due Soon / Overdue)
- **Aircraft status history search**: 3 years, by tail number or keyword
- **MX forecast**: utilization-based due-date projection and route-swap recommendations (see `MX_FORECAST_FEATURE.md`)
- **Role-based views**: Maintenance (physical assets only) vs Management (everything)

### Status Keywords
| Keyword | Meaning | Color |
|---------|---------|-------|
| *(none)* | Available / Ready | Green |
| `STANDBY` | Out of active roster | Grey |
| `MEL` | Flying with deferred item | Yellow |
| `CUST` | Customer aircraft (tracked separately) | — |

## Datasets

Schemas for every dataset are in `datasets/`. The core ones:

1. **fleet_master**: aircraft registry (tail #, S/N, model, status, engine, times)
2. **aircraft_times**: time-series snapshot (total time, cycles, landings)
3. **daily_routes**: route assignments (tail #, PIC, departure/arrival, date)
4. **due_lists**: maintenance due items (task, ATA, compliance basis, remaining life, status)
5. **airport_locations**: airport master data
6. **avionics_equipment**: avionics tracking and inspections
7. **flight_data**: flight history (route, cargo type, fuel burn)

Additional datasets cover status history, work orders, route swaps, forecast settings, utilization, engines and propellers.

## Project Structure

```
app/                  Domo custom app (app.html, app.js, app.css, manifest.json)
app/data/             Local JSON data used in local mode (gitignored, not in repo)
datasets/             Dataset schema definitions
build_data.py         Builds app/data/*.json from the source workbook
sync_sheet.py         Syncs data from a Google Sheet into app/data/
generate-manifest.py  Generates app/manifest.json from dataset IDs
*.sh                  Dataset creation, packaging, and deploy scripts
```

## Data

Real fleet and maintenance data is **not committed**. `.gitignore` excludes `*.csv`, `*.xlsx`, `source_data/`, `app/data/` and `dataset-ids.json`. To run locally, put your source workbook in `source_data/` and generate the JSON:

```bash
python3 -m venv venv && source venv/bin/activate
pip install pandas openpyxl
python build_data.py
```

## Running Locally

```bash
cd app
python3 -m http.server 8000
# open http://localhost:8000/app.html
```

See `TEST_LOCALLY.md` for details.

## Deployment

```bash
domo login            # authenticate to your Domo instance
./deploy-app.sh
```

See `DEPLOYMENT_GUIDE.md`, `DATA_REFRESH_SETUP.md`, `MAGIC_ETL_DESIGN.md` and `SHEET_SYNC_SETUP.md` for setup details.
