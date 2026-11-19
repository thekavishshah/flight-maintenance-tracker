#!/usr/bin/env python3
"""
Analyze Fleet and Facilities workbook schema
"""
import sys
import json

try:
    import openpyxl
except ImportError:
    print("Installing openpyxl...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "openpyxl"])
    import openpyxl

# Load the workbook
workbook_path = '/Users/kavish/Downloads/Fleet and Facilities.xlsx'
wb = openpyxl.load_workbook(workbook_path, read_only=True, data_only=True)

print("=" * 80)
print("FLEET AND FACILITIES WORKBOOK SCHEMA ANALYSIS")
print("=" * 80)

schema = {}

for sheet_name in wb.sheetnames:
    ws = wb[sheet_name]

    # Get headers from first row
    headers = []
    first_row = None

    for row in ws.iter_rows(min_row=1, max_row=20, values_only=True):
        # Skip completely empty rows
        if all(cell is None or str(cell).strip() == '' for cell in row):
            continue

        # This might be the header row
        if not first_row:
            first_row = row
            headers = [str(cell).strip() if cell is not None else f"Column_{i}" for i, cell in enumerate(row)]
            break

    # Get a sample row to see data types
    sample_row = None
    for row in ws.iter_rows(min_row=2, max_row=50, values_only=True):
        if any(cell is not None and str(cell).strip() != '' for cell in row):
            sample_row = row
            break

    schema[sheet_name] = {
        'headers': headers,
        'sample_row': [str(cell)[:50] if cell is not None else None for cell in sample_row] if sample_row else None,
        'column_count': len(headers)
    }

    print(f"\n{'=' * 80}")
    print(f"SHEET: {sheet_name}")
    print(f"{'=' * 80}")
    print(f"Columns ({len(headers)}):")
    for i, header in enumerate(headers):
        sample_val = sample_row[i] if sample_row and i < len(sample_row) else None
        sample_str = f" (e.g., {str(sample_val)[:40]}...)" if sample_val and str(sample_val).strip() else ""
        print(f"  {i+1}. {header}{sample_str}")

# Save to JSON for reference
with open('/Users/kavish/Desktop/plugin-ai-vibe/xwing-maintenance-dashboard/workbook_schema.json', 'w') as f:
    json.dump(schema, f, indent=2)

print("\n" + "=" * 80)
print("Schema saved to workbook_schema.json")
print("=" * 80)
