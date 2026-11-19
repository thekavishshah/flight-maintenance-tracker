#!/usr/bin/env python3
"""
X-Wing Maintenance Dashboard - Comprehensive Data Extraction
Extracts all required datasets from source Excel files with proper cleaning and validation.
"""
import pandas as pd
import openpyxl
import json
import re
from datetime import datetime
from pathlib import Path

# Source files (read-only)
FLEET_WORKBOOK = "source_data/Fleet and Facilities.xlsx"
KPI_WORKBOOK = "source_data/AI KPI List.xlsx"
OUTPUT_DIR = Path("app/data")

# Excluded aircraft (per client spec)
EXCLUDED_AIRCRAFT = {'N863MA', 'N1037N', 'N208N', 'N9469B'}  # Leased/sold/salvage

def ensure_output_dir():
    """Create output directory if it doesn't exist"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"📁 Output directory: {OUTPUT_DIR}")

def parse_remaining_with_margin(value):
    """
    Parse remaining values like "-13(17)" into numeric and margin components
    Returns: (remaining_value, remaining_with_margin)
    """
    if pd.isna(value) or value == '':
        return (None, None)

    value_str = str(value)
    match = re.match(r'([+-]?\d+(?:\.\d+)?)\((\d+)\)', value_str)
    if match:
        return (float(match.group(1)), value_str)

    # Try parsing as plain number
    try:
        return (float(value_str), value_str)
    except:
        return (None, value_str)

def parse_due_at_with_cycles(value):
    """
    Parse due at values like "2026-08-09(2086)" into date and cycles
    Returns: (due_date, due_at_with_cycles)
    """
    if pd.isna(value) or value == '':
        return (None, None)

    value_str = str(value)
    match = re.match(r'(\d{4}-\d{2}-\d{2})\((\d+)\)', value_str)
    if match:
        return (match.group(1), value_str)

    # Try parsing as plain date
    if isinstance(value, datetime):
        return (value.strftime('%Y-%m-%d'), value.strftime('%Y-%m-%d'))

    return (value_str, value_str)

def recover_ata_code(cell, wb_sheet):
    """
    Recover ATA codes that Excel converted to dates
    Returns original "NN-NN" format if reliably recoverable, else "N/A"
    """
    try:
        # Get raw cell value and number format
        if hasattr(cell, 'value') and cell.value is not None:
            if isinstance(cell.value, datetime):
                # Excel date serial - try to recover original ATA format
                # e.g., 1909-06-15 might have been 19-06-15 (ATA 19, section 06, subsection 15)
                year = cell.value.year
                month = cell.value.month
                day = cell.value.day

                # Heuristic: if year is 1900-1999 and looks like ATA pattern
                if 1900 <= year <= 1999:
                    ata_chapter = year - 1900
                    if 0 <= ata_chapter <= 99 and 0 <= month <= 99 and 0 <= day <= 99:
                        return f"{ata_chapter:02d}-{month:02d}"

                return "N/A"
            else:
                # Return as-is if it's already a string
                return str(cell.value)
        return "N/A"
    except:
        return "N/A"

def extract_dashboard_formulas():
    """
    Extract Dashboard sheet formulas using openpyxl (data_only=False)
    Returns formula definitions as text for documentation
    """
    print("\n📊 Extracting Dashboard formulas...")

    wb = openpyxl.load_workbook(FLEET_WORKBOOK, data_only=False)
    if 'Dashboard' not in wb.sheetnames:
        print("⚠️ Dashboard sheet not found")
        return {}

    sheet = wb['Dashboard']
    formulas = {}

    # Read row 6 which contains the main dashboard metrics (per audit report)
    # Common cells: Available, Standby, In Work, MEL, Route Swaps, etc.
    for row in sheet.iter_rows(min_row=1, max_row=50):
        for cell in row:
            if cell.value and isinstance(cell.value, str) and cell.value.startswith('='):
                # Unwrap Google Sheets formulas from __xludf.DUMMYFUNCTION if present
                formula = cell.value
                if '__xludf.DUMMYFUNCTION' in formula:
                    match = re.search(r'"([^"]+)"', formula)
                    if match:
                        formula = match.group(1)

                cell_ref = f"{cell.column_letter}{cell.row}"
                formulas[cell_ref] = formula
                print(f"  Found formula at {cell_ref}: {formula[:80]}...")

    print(f"✅ Extracted {len(formulas)} formulas from Dashboard")
    return formulas

def extract_fleet_master():
    """Extract Master Fleet data"""
    print("\n🛩️ Extracting Master Fleet...")

    df = pd.read_excel(FLEET_WORKBOOK, sheet_name="Master Fleet")
    df = df.fillna("")

    records = df.to_dict('records')

    output_file = OUTPUT_DIR / "fleet_master.json"
    with open(output_file, 'w') as f:
        json.dump(records, f, indent=2, default=str)

    print(f"✅ Extracted {len(records)} fleet master records -> {output_file}")
    return records, "Master Fleet", None

def extract_fleet_asset_import():
    """Extract Fleet Asset Import data"""
    print("\n📋 Extracting Fleet Asset Import...")

    df = pd.read_excel(FLEET_WORKBOOK, sheet_name="Fleet Asset Import")
    df = df.fillna("")

    # Convert dates to ISO strings
    for col in df.columns:
        if df[col].dtype == 'datetime64[ns]':
            df[col] = df[col].apply(lambda x: x.strftime('%Y-%m-%d') if pd.notna(x) else None)

    records = df.to_dict('records')

    output_file = OUTPUT_DIR / "fleet_asset_import.json"
    with open(output_file, 'w') as f:
        json.dump(records, f, indent=2, default=str)

    print(f"✅ Extracted {len(records)} fleet asset records -> {output_file}")
    return records, "Fleet Asset Import", "2026-10-16"  # From Report Uploads

def extract_aircraft_times():
    """Extract Aircraft Times Import data"""
    print("\n⏱️ Extracting Aircraft Times...")

    df = pd.read_excel(FLEET_WORKBOOK, sheet_name="Aircraft Times Import")

    # Get REPORT DATE for as-of tracking
    report_date = None
    if 'REPORT DATE' in df.columns and len(df) > 0:
        report_date = df['REPORT DATE'].iloc[0]
        if isinstance(report_date, datetime):
            report_date = report_date.strftime('%Y-%m-%d')

    # Convert dates to ISO strings
    for col in df.columns:
        if df[col].dtype == 'datetime64[ns]':
            df[col] = df[col].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S') if pd.notna(x) else None)

    df = df.fillna("")
    records = df.to_dict('records')

    output_file = OUTPUT_DIR / "aircraft_times.json"
    with open(output_file, 'w') as f:
        json.dump(records, f, indent=2, default=str)

    print(f"✅ Extracted {len(records)} aircraft times records -> {output_file}")
    return records, "Aircraft Times Import", report_date or "2026-10-16"

def extract_daily_routes():
    """Extract Daily Route Import data"""
    print("\n🛫 Extracting Daily Routes...")

    df = pd.read_excel(FLEET_WORKBOOK, sheet_name="Daily Route Import")

    # Convert dates to ISO strings
    for col in df.columns:
        if df[col].dtype == 'datetime64[ns]':
            df[col] = df[col].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S') if pd.notna(x) else None)

    df = df.fillna("")
    records = df.to_dict('records')

    output_file = OUTPUT_DIR / "daily_routes.json"
    with open(output_file, 'w') as f:
        json.dump(records, f, indent=2, default=str)

    print(f"✅ Extracted {len(records)} daily route records -> {output_file}")
    return records, "Daily Route Import", "2026-10-16"

def extract_due_lists():
    """Extract Due List Import with proper parsing"""
    print("\n📝 Extracting Due Lists...")

    # Load with openpyxl to access raw cell values and formats
    wb = openpyxl.load_workbook(FLEET_WORKBOOK, data_only=True)
    sheet = wb["Due List Import"]

    # Also load with pandas for easier data handling
    df = pd.read_excel(FLEET_WORKBOOK, sheet_name="Due List Import")

    # Parse Remaining column
    df['remaining_value'], df['remaining_with_margin'] = zip(*df['Remaining'].apply(parse_remaining_with_margin))

    # Parse Due At column
    df['due_date'], df['due_at_with_cycles'] = zip(*df['Due At'].apply(parse_due_at_with_cycles))

    # Fix compliance_basis mapping (use "Basis" column, not "Interval Type")
    # Basis values: Calendar, 300/year default, 3-month actual
    # Interval Type values: Days, Hours, Cycles, Landings, Months, etc.
    df['compliance_basis'] = df['Basis']
    df['interval_type_raw'] = df['Interval Type']

    # Flag rows with 300.0 in Part/Serial
    if 'Part / Serial' in df.columns:
        df['part_serial_contains_rate'] = df['Part / Serial'].apply(
            lambda x: True if str(x) == '300.0' else False
        )

    # Recover ATA codes from date conversions
    ata_col_idx = df.columns.get_loc('ATA') if 'ATA' in df.columns else None
    if ata_col_idx is not None:
        recovered_ata = []
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, max_row=len(df)+1), start=0):
            if row_idx < len(df):
                cell = row[ata_col_idx]
                recovered_ata.append(recover_ata_code(cell, sheet))
        df['ATA'] = recovered_ata

    # Flag extreme values in Projected Days (likely unit mismatches)
    if 'Projected Days' in df.columns:
        df['projected_days_reliable'] = df['Projected Days'].apply(
            lambda x: False if pd.notna(x) and abs(float(x)) > 10000 else True
        )

    # Flag whether original "Forecast Due" column had a real date (before transform fills from "Due At")
    if 'Forecast Due' in df.columns:
        df['forecast_due_original_present'] = df['Forecast Due'].apply(
            lambda x: True if pd.notna(x) and x != '' and not (isinstance(x, str) and x.strip() == '') else False
        )

    # Convert dates to ISO strings
    for col in ['Forecast Due', 'Last Completed']:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: x.strftime('%Y-%m-%d') if pd.notna(x) and isinstance(x, datetime) else (str(x) if pd.notna(x) and not isinstance(x, datetime) else None))

    df = df.fillna("")
    records = df.to_dict('records')

    # Count data quality issues
    extreme_values = sum(1 for r in records if r.get('projected_days_reliable') == False)
    rate_in_part_serial = sum(1 for r in records if r.get('part_serial_contains_rate') == True)

    print(f"  ⚠️ Data quality:")
    print(f"    - {extreme_values} rows with extreme Projected Days values (likely unit mismatch)")
    print(f"    - {rate_in_part_serial} rows with rate value (300.0) in Part/Serial field")

    output_file = OUTPUT_DIR / "due_lists.json"
    with open(output_file, 'w') as f:
        json.dump(records, f, indent=2, default=str)

    print(f"✅ Extracted {len(records)} due list records -> {output_file}")
    return records, "Due List Import", "2026-10-16"

def extract_ac_status_history():
    """Extract Aircraft Status History (skip row 1 search form)"""
    print("\n📊 Extracting AC Status History...")

    df = pd.read_excel(FLEET_WORKBOOK, sheet_name="AC status")

    # Row 1 contains search form headers, skip it by filtering
    # Check if first row is search form based on common search terms
    if len(df) > 0 and 'Asset' in df.columns:
        first_val = str(df['Asset'].iloc[0]) if len(df) > 0 else ''
        if first_val in ['Tail Number', 'NaN', ''] or pd.isna(df['Asset'].iloc[0]):
            df = df.iloc[1:]

    # Filter out invalid rows
    if 'Asset' in df.columns:
        df = df[df['Asset'].notna() & (df['Asset'] != 'Tail Number')]

    # Convert dates to ISO strings
    for col in df.columns:
        if df[col].dtype == 'datetime64[ns]':
            df[col] = df[col].apply(lambda x: x.strftime('%Y-%m-%d') if pd.notna(x) else None)

    df = df.fillna("")
    records = df.to_dict('records')

    output_file = OUTPUT_DIR / "aircraft_status_history.json"
    with open(output_file, 'w') as f:
        json.dump(records, f, indent=2, default=str)

    print(f"✅ Extracted {len(records)} AC status records -> {output_file}")
    return records, "AC status", "2026-10-16"

def extract_route_swaps():
    """Extract Route Swaps (skip header row)"""
    print("\n🔄 Extracting Route Swaps...")

    df = pd.read_excel(FLEET_WORKBOOK, sheet_name="Route Swaps")

    # Skip first row (header row in data)
    if len(df) > 0 and df.iloc[0].get('ROUTE SWAPS') == 'Effective Date':
        df = df.iloc[1:]

    # Rename columns
    if 'ROUTE SWAPS' in df.columns:
        df = df.rename(columns={
            'ROUTE SWAPS': 'Effective Date',
            'Unnamed: 1': 'Route',
            'Unnamed: 2': 'Scheduled Aircraft',
            'Unnamed: 3': 'Replacement Aircraft',
            'Unnamed: 4': 'Swap Reason',
            'Unnamed: 5': 'Replacement Location',
            'Unnamed: 6': 'Start Time',
            'Unnamed: 7': 'Time Zone',
            'Unnamed: 8': 'Swap Status',
            'Unnamed: 9': 'Authorization',
            'Unnamed: 10': 'Notes',
            'Unnamed: 11': 'SUBMIT'
        })

    # Filter out blank rows
    df = df[df['Scheduled Aircraft'].notna() & (df['Scheduled Aircraft'] != '')]

    # Convert dates
    for col in df.columns:
        if df[col].dtype == 'datetime64[ns]':
            df[col] = df[col].apply(lambda x: x.strftime('%Y-%m-%d') if pd.notna(x) else None)

    df = df.fillna("")
    records = df.to_dict('records')

    output_file = OUTPUT_DIR / "route_swaps.json"
    with open(output_file, 'w') as f:
        json.dump(records, f, indent=2, default=str)

    print(f"✅ Extracted {len(records)} route swap records -> {output_file}")
    return records, "Route Swaps", "2026-10-16"

def extract_aircraft_utilization():
    """Extract Aircraft Utilization data"""
    print("\n📈 Extracting Aircraft Utilization...")

    df = pd.read_excel(FLEET_WORKBOOK, sheet_name="Aircraft Utilization")

    # Convert dates
    for col in ['PERIOD START', 'PERIOD END']:
        if col in df.columns and df[col].dtype == 'datetime64[ns]':
            df[col] = df[col].apply(lambda x: x.strftime('%Y-%m-%d') if pd.notna(x) else None)

    df = df.fillna("")
    records = df.to_dict('records')

    output_file = OUTPUT_DIR / "aircraft_utilization.json"
    with open(output_file, 'w') as f:
        json.dump(records, f, indent=2, default=str)

    print(f"✅ Extracted {len(records)} aircraft utilization records -> {output_file}")
    return records, "Aircraft Utilization", "2026-10-16"

def extract_forecast_settings():
    """Extract Forecast Settings data"""
    print("\n⚙️ Extracting Forecast Settings...")

    df = pd.read_excel(FLEET_WORKBOOK, sheet_name="Forecast Settings")

    df = df.fillna("")
    records = df.to_dict('records')

    output_file = OUTPUT_DIR / "forecast_settings.json"
    with open(output_file, 'w') as f:
        json.dump(records, f, indent=2, default=str)

    print(f"✅ Extracted {len(records)} forecast settings records -> {output_file}")
    return records, "Forecast Settings", "2026-10-16"

def extract_report_uploads():
    """Extract Report Uploads for REPORTS.md"""
    print("\n📄 Extracting Report Uploads...")

    df = pd.read_excel(FLEET_WORKBOOK, sheet_name="Report Uploads")

    # Convert dates
    for col in df.columns:
        if df[col].dtype == 'datetime64[ns]':
            df[col] = df[col].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S') if pd.notna(x) else None)

    df = df.fillna("")
    records = df.to_dict('records')

    print(f"✅ Extracted {len(records)} report upload records")
    return records

def build_reports_md(report_uploads):
    """Build REPORTS.md from Report Uploads sheet"""
    print("\n📝 Building REPORTS.md...")

    # Analyze report uploads
    df = pd.DataFrame(report_uploads)

    report_summary = []

    if len(df) > 0 and 'Report Type' in df.columns:
        # Group by report type
        for report_type in df['Report Type'].unique():
            if pd.notna(report_type) and report_type != '':
                subset = df[df['Report Type'] == report_type]

                count = len(subset)

                # Get first and last upload dates
                date_col = 'Upload Date' if 'Upload Date' in subset.columns else subset.columns[0]
                dates = pd.to_datetime(subset[date_col], errors='coerce').dropna()

                first_date = dates.min() if len(dates) > 0 else None
                last_date = dates.max() if len(dates) > 0 else None

                # Calculate typical interval
                if len(dates) > 1:
                    sorted_dates = dates.sort_values()
                    intervals = sorted_dates.diff().dropna()
                    avg_interval = intervals.mean() if len(intervals) > 0 else None
                else:
                    avg_interval = None

                # Get uploader
                uploader_col = 'Uploader' if 'Uploader' in subset.columns else None
                uploader = subset[uploader_col].mode()[0] if uploader_col and len(subset[uploader_col].mode()) > 0 else 'Unknown'

                report_summary.append({
                    'report': report_type,
                    'count': count,
                    'first_upload': first_date,
                    'last_upload': last_date,
                    'avg_interval': avg_interval,
                    'uploader': uploader
                })

    # Write REPORTS.md
    with open('REPORTS.md', 'w') as f:
        f.write("# X-Wing Maintenance Dashboard - Report Inventory\n\n")
        f.write("**Generated:** {}\n\n".format(datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        f.write("**Source:** Report Uploads sheet (Fleet and Facilities.xlsx)\n\n")
        f.write("---\n\n")

        f.write("## Report Summary\n\n")
        f.write("| Report | Count | First Upload | Last Upload | Typical Interval | Uploader |\n")
        f.write("|--------|-------|--------------|-------------|------------------|----------|\n")

        for item in report_summary:
            first = item['first_upload'].strftime('%Y-%m-%d') if pd.notna(item['first_upload']) else 'Unknown'
            last = item['last_upload'].strftime('%Y-%m-%d') if pd.notna(item['last_upload']) else 'Unknown'
            interval = f"{item['avg_interval'].days} days" if pd.notna(item['avg_interval']) else 'Unknown'

            f.write(f"| {item['report']} | {item['count']} | {first} | {last} | {interval} | {item['uploader']} |\n")

        f.write("\n---\n\n")
        f.write(f"**Total Report Uploads:** {len(report_uploads)}\n")

    print(f"✅ REPORTS.md created with {len(report_summary)} report types")

def build_metadata(all_datasets):
    """Build _meta.json with dataset metadata"""
    print("\n📊 Building metadata...")

    meta = {
        "generated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "source_workbook": FLEET_WORKBOOK,
        "datasets": {}
    }

    for dataset_name, (records, source_sheet, as_of_date) in all_datasets.items():
        meta["datasets"][dataset_name] = {
            "source_sheet": source_sheet,
            "row_count": len(records),
            "as_of_date": as_of_date,
            "derived_method": "Direct extraction" if as_of_date else "N/A"
        }

    output_file = OUTPUT_DIR / "_meta.json"
    with open(output_file, 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"✅ Metadata saved to {output_file}")

def add_to_gitignore():
    """Add app/data/ to .gitignore if this is a git repo"""
    gitignore_path = Path(".gitignore")

    if gitignore_path.exists():
        content = gitignore_path.read_text()
        if 'app/data/' not in content:
            with open(gitignore_path, 'a') as f:
                f.write("\n# Data files (privacy)\napp/data/\n")
            print("✅ Added app/data/ to .gitignore")
    else:
        # Check if we're in a git repo
        if Path(".git").exists():
            with open(gitignore_path, 'w') as f:
                f.write("# Data files (privacy)\napp/data/\n")
            print("✅ Created .gitignore with app/data/")

def main():
    print("="*80)
    print("X-WING MAINTENANCE DASHBOARD - DATA EXTRACTION")
    print("="*80)

    ensure_output_dir()

    # Extract Dashboard formulas first (for documentation)
    formulas = extract_dashboard_formulas()

    # Save formulas to file for reference
    with open('dashboard_formulas.json', 'w') as f:
        json.dump(formulas, f, indent=2)
    print("✅ Dashboard formulas saved to dashboard_formulas.json")

    # Extract all datasets
    all_datasets = {}

    all_datasets['fleet_master'] = extract_fleet_master()
    all_datasets['fleet_asset_import'] = extract_fleet_asset_import()
    all_datasets['aircraft_times'] = extract_aircraft_times()
    all_datasets['daily_routes'] = extract_daily_routes()
    all_datasets['due_lists'] = extract_due_lists()
    all_datasets['aircraft_status_history'] = extract_ac_status_history()
    all_datasets['route_swaps'] = extract_route_swaps()
    all_datasets['aircraft_utilization'] = extract_aircraft_utilization()
    all_datasets['forecast_settings'] = extract_forecast_settings()

    # Extract report uploads and build REPORTS.md
    report_uploads = extract_report_uploads()
    build_reports_md(report_uploads)

    # Build metadata
    build_metadata(all_datasets)

    # Add to gitignore
    add_to_gitignore()

    print("\n" + "="*80)
    print("✅ DATA EXTRACTION COMPLETE!")
    print("="*80)
    print(f"\nTotal datasets extracted: {len(all_datasets)}")
    for name, (records, sheet, date) in all_datasets.items():
        print(f"  - {name}: {len(records)} records (as-of: {date or 'N/A'})")

    print(f"\n📁 Output: {OUTPUT_DIR}/")
    print("📄 Documentation: REPORTS.md")
    print("📋 Formulas: dashboard_formulas.json")
    print("\n✨ Ready for local demo!")

if __name__ == "__main__":
    main()
