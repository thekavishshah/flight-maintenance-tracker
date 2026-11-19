#!/usr/bin/env python3
"""
Export Fleet & Facilities workbook tabs to CSV
"""
import sys
import csv

try:
    import openpyxl
except ImportError:
    print("Installing openpyxl...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "openpyxl"])
    import openpyxl

workbook_path = '/Users/kavish/Downloads/Fleet and Facilities.xlsx'
wb = openpyxl.load_workbook(workbook_path, read_only=True, data_only=True)

# Export key tabs for demo
tabs_to_export = {
    'Master Fleet': 'master_fleet.csv',
    'Due List Import': 'due_list_import.csv',
    'Aircraft Times Import': 'aircraft_times.csv',
    'Daily Route Import': 'daily_routes.csv',
    'Fleet Asset Import': 'fleet_asset_import.csv'
}

for sheet_name, csv_filename in tabs_to_export.items():
    if sheet_name not in wb.sheetnames:
        print(f"⚠ Sheet '{sheet_name}' not found, skipping...")
        continue

    ws = wb[sheet_name]

    # Find header row (skip title rows)
    header_row = None
    for row_idx, row in enumerate(ws.iter_rows(values_only=True), 1):
        # Skip completely empty rows
        if all(cell is None or str(cell).strip() == '' for cell in row):
            continue

        # Check if this looks like a header row (contains text, not just numbers)
        non_empty = [cell for cell in row if cell is not None and str(cell).strip() != '']
        if non_empty and any(isinstance(cell, str) for cell in non_empty):
            header_row = row_idx
            break

    if not header_row:
        print(f"⚠ Could not find header row for '{sheet_name}', skipping...")
        continue

    # Write to CSV
    output_path = f'/Users/kavish/Desktop/plugin-ai-vibe/xwing-maintenance-dashboard/{csv_filename}'

    with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)

        rows_written = 0
        for row in ws.iter_rows(min_row=header_row, values_only=True):
            # Skip completely empty rows
            if all(cell is None or str(cell).strip() == '' for cell in row):
                continue

            # Clean up the row
            cleaned_row = []
            for cell in row:
                if cell is None:
                    cleaned_row.append('')
                elif isinstance(cell, str):
                    cleaned_row.append(cell.strip())
                else:
                    cleaned_row.append(str(cell))

            writer.writerow(cleaned_row)
            rows_written += 1

            # Limit to reasonable number of rows for demo
            if rows_written >= 1000:
                break

        print(f"✓ Exported '{sheet_name}' to {csv_filename} ({rows_written} rows)")

print("\n✓ Export complete!")
print("\nGenerated files:")
import os
for filename in tabs_to_export.values():
    filepath = f'/Users/kavish/Desktop/plugin-ai-vibe/xwing-maintenance-dashboard/{filename}'
    if os.path.exists(filepath):
        size = os.path.getsize(filepath)
        print(f"  - {filename} ({size} bytes)")
