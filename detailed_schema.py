#!/usr/bin/env python3
"""
Get detailed schema for specific sheets
"""
import openpyxl
import json

workbook_path = '/Users/kavish/Downloads/Fleet and Facilities.xlsx'
wb = openpyxl.load_workbook(workbook_path, read_only=True, data_only=True)

# Sheets that need careful header extraction
target_sheets = [
    'Route Swaps',
    'AC status',
    'Access Control'
]

for sheet_name in target_sheets:
    print(f"\n{'='*80}")
    print(f"DETAILED ANALYSIS: {sheet_name}")
    print(f"{'='*80}")

    ws = wb[sheet_name]

    # Print first 10 rows to see structure
    for i, row in enumerate(ws.iter_rows(min_row=1, max_row=10, values_only=True), 1):
        non_empty = [str(cell)[:60] if cell is not None else '' for cell in row if cell is not None and str(cell).strip() != '']
        if non_empty:
            print(f"Row {i}: {non_empty}")

# Also check Access Control permissions structure
print(f"\n{'='*80}")
print("ACCESS CONTROL - Looking for permission matrix")
print(f"{'='*80}")

ws = wb['Access Control']
for i, row in enumerate(ws.iter_rows(min_row=1, max_row=30, values_only=True), 1):
    cells = [str(cell)[:60] if cell is not None else '' for cell in row]
    # Look for rows that might contain permission info
    row_text = ''.join(cells).lower()
    if any(keyword in row_text for keyword in ['edit', 'approve', 'manage', 'view', 'upload', 'user']):
        non_empty = [c for c in cells if c.strip()]
        if non_empty:
            print(f"Row {i}: {non_empty}")
