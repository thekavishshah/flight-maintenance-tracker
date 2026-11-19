#!/usr/bin/env python3
"""
Examine Excel files and show their structure
"""
import pandas as pd
import sys

def examine_excel(filepath):
    print(f"\n{'='*80}")
    print(f"FILE: {filepath}")
    print(f"{'='*80}")

    # Get all sheet names
    xl_file = pd.ExcelFile(filepath)
    print(f"\nSheets found: {len(xl_file.sheet_names)}")

    for sheet_name in xl_file.sheet_names:
        print(f"\n{'-'*80}")
        print(f"SHEET: {sheet_name}")
        print(f"{'-'*80}")

        # Read the sheet
        df = pd.read_excel(filepath, sheet_name=sheet_name)

        print(f"Rows: {len(df)}")
        print(f"Columns: {len(df.columns)}")
        print(f"\nColumn Names:")
        for i, col in enumerate(df.columns, 1):
            print(f"  {i}. {col}")

        print(f"\nFirst 3 rows preview:")
        print(df.head(3).to_string())

if __name__ == "__main__":
    examine_excel("/Users/kavish/Downloads/Fleet and Facilities.xlsx")
    examine_excel("/Users/kavish/Downloads/AI KPI List.xlsx")
