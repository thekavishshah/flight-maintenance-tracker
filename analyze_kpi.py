#!/usr/bin/env python3
"""
Analyze AI KPI List
"""
import openpyxl

kpi_path = '/Users/kavish/Downloads/AI KPI List.xlsx'
wb = openpyxl.load_workbook(kpi_path, read_only=True, data_only=True)

print("=" * 80)
print("AI KPI LIST ANALYSIS")
print("=" * 80)

for sheet_name in wb.sheetnames:
    print(f"\n{'='*80}")
    print(f"SHEET: {sheet_name}")
    print(f"{'='*80}")

    ws = wb[sheet_name]

    # Print first 15 rows to understand structure
    for i, row in enumerate(ws.iter_rows(min_row=1, max_row=15, values_only=True), 1):
        non_empty = [str(cell)[:70] if cell is not None else '' for cell in row if cell is not None and str(cell).strip() != '']
        if non_empty:
            print(f"Row {i}: {' | '.join(non_empty)}")
