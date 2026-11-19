#!/usr/bin/env python3
"""
Extract data from Excel files and create JSON for local testing
"""
import pandas as pd
import json
from datetime import datetime

def extract_master_fleet():
    """Extract Master Fleet data"""
    df = pd.read_excel("/Users/kavish/Downloads/Fleet and Facilities.xlsx",
                       sheet_name="Master Fleet")

    # Clean the data
    df = df.fillna("")

    # Convert to records
    records = df.to_dict('records')

    # Save as JSON
    with open('app/data/fleet_master.json', 'w') as f:
        json.dump(records, f, indent=2, default=str)

    print(f"✅ Extracted {len(records)} fleet master records")
    return records

def extract_aircraft_status():
    """Extract Aircraft Status History"""
    df = pd.read_excel("/Users/kavish/Downloads/Fleet and Facilities.xlsx",
                       sheet_name="AC status")

    # Skip header rows and get actual data
    df = df[df['Asset'].notna() & (df['Asset'] != 'NaN')]

    # Clean the data
    df = df.fillna("")

    # Convert to records
    records = df.to_dict('records')

    # Save as JSON
    with open('app/data/aircraft_status_history.json', 'w') as f:
        json.dump(records, f, indent=2, default=str)

    print(f"✅ Extracted {len(records)} aircraft status records")
    return records

def extract_route_swaps():
    """Extract Route Swaps data"""
    df = pd.read_excel("/Users/kavish/Downloads/Fleet and Facilities.xlsx",
                       sheet_name="Route Swaps")

    # Skip header row
    if len(df) > 1:
        df = df.iloc[1:]  # Skip first row if it's headers

    # Clean the data
    df = df.fillna("")

    # Rename columns to match schema
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
            'Unnamed: 10': 'Notes'
        })

    # Convert to records
    records = df.to_dict('records')

    # Save as JSON
    with open('app/data/route_swaps.json', 'w') as f:
        json.dump(records, f, indent=2, default=str)

    print(f"✅ Extracted {len(records)} route swap records")
    return records

def main():
    print("Extracting data from Excel files...")
    print("="*80)

    # Create data directory if it doesn't exist
    import os
    os.makedirs('app/data', exist_ok=True)

    # Extract all data
    fleet_data = extract_master_fleet()
    status_data = extract_aircraft_status()
    swap_data = extract_route_swaps()

    print("\n" + "="*80)
    print("✅ Data extraction complete!")
    print(f"\nTotal records extracted:")
    print(f"  - Fleet Master: {len(fleet_data)}")
    print(f"  - Aircraft Status: {len(status_data)}")
    print(f"  - Route Swaps: {len(swap_data)}")
    print("\nJSON files created in app/data/")

if __name__ == "__main__":
    main()
