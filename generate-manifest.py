#!/usr/bin/env python3
"""
Generate manifest.json with complete field mappings for Domo Custom App
"""

import json
import glob

# Load dataset IDs
with open('dataset-ids.json', 'r') as f:
    dataset_ids = json.load(f)['datasets']

# Load existing manifest to preserve app ID
try:
    with open('app/manifest.json', 'r') as f:
        existing_manifest = json.load(f)
        app_id = existing_manifest.get('id', 'fc8e4481-c562-4b44-91ed-f7a3ca8c1e83')
except:
    app_id = 'fc8e4481-c562-4b44-91ed-f7a3ca8c1e83'

# Mapping of dataset file names to aliases (ALL 23 datasets)
dataset_mapping = {
    "01-fleet-master.json": "fleet_master",
    "02-aircraft-times.json": "aircraft_times",
    "03-daily-routes.json": "daily_routes",
    "04-due-lists.json": "due_lists",
    "05-airport-locations.json": "airport_locations",
    "06-avionics-equipment.json": "avionics_equipment",
    "07-flight-data.json": "flight_data",
    "08-aircraft-status-history.json": "aircraft_status_history",
    "09-upload-audit-log.json": "upload_audit_log",
    "10-work-orders.json": "work_orders",
    "11-capex-transactions.json": "capex_transactions",
    "12-budget-allocations.json": "budget_allocations",
    "13-financial-metrics.json": "financial_metrics",
    "14-fleet-projections.json": "fleet_projections",
    "15-route-performance.json": "route_performance",
    "16-engine-inventory.json": "engine_inventory",
    "17-engine-history.json": "engine_history",
    "18-propeller-inventory.json": "propeller_inventory",
    "19-propeller-history.json": "propeller_history",
    "20-route-swaps.json": "route_swaps",
    "21-forecast-settings.json": "forecast_settings",
    "22-aircraft-utilization.json": "aircraft_utilization",
    "23-fleet-asset-import.json": "fleet_asset_import"
}

# Build datasetsMapping array with fields
datasets_mapping = []

for filename in sorted(dataset_mapping.keys()):
    alias = dataset_mapping[filename]

    # Load dataset schema
    schema_path = f'datasets/{filename}'
    try:
        with open(schema_path, 'r') as f:
            schema = json.load(f)

        # Get dataset ID
        dataset_id = dataset_ids[alias]['id']

        # Build fields array from schema columns
        fields = []
        for col in schema.get('columns', []):
            # Convert column name to valid alias (no spaces, use underscores)
            field_alias = col['name'].replace(' ', '_').replace('/', '_').replace('(', '').replace(')', '')
            fields.append({
                "alias": field_alias,
                "columnName": col['name']
            })

        datasets_mapping.append({
            "alias": alias,
            "dataSetId": dataset_id,
            "fields": fields
        })

        print(f"✓ {alias}: {len(fields)} fields")

    except Exception as e:
        print(f"⚠ Error processing {filename}: {e}")

# Base manifest with datasetsMapping (not mapping)
manifest = {
    "name": "X-Wing Maintenance Dashboard",
    "version": "2.0.0",
    "id": app_id,
    "description": "Aircraft maintenance tracking dashboard ",
    "author": "",
    "size": {
        "width": 4,
        "height": 4
    },
    "datasetsMapping": datasets_mapping
}

# Write manifest
with open('app/manifest.json', 'w') as f:
    json.dump(manifest, f, indent=2)

print(f"\n✓ Generated app/manifest.json with {len(datasets_mapping)} datasets")
print(f"  App ID: {app_id}")
print(f"  Total fields: {sum(len(d['fields']) for d in datasets_mapping)}")
