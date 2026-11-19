#!/usr/bin/env python3
"""
Reconcile dataset IDs between Domo instance and config files
"""
import json
import subprocess
import sys

print("=" * 80)
print("DATASET ID RECONCILIATION REPORT")
print("=" * 80)

# Load config files
print("\n[1/4] Loading config files...")
with open('dataset-ids.json', 'r') as f:
    config_ids = json.load(f)['datasets']

with open('app/manifest.json', 'r') as f:
    manifest = json.load(f)
    manifest_mappings = {m['alias']: m['dataSetId'] for m in manifest['datasetsMapping']}

print(f"   - dataset-ids.json: {len(config_ids)} datasets")
print(f"   - app/manifest.json: {len(manifest_mappings)} dataset mappings")

# Check each dataset in Domo
print("\n[2/4] Checking datasets in Domo...")
results = {
    'found': [],
    'not_found': [],
    'schema_mismatch': []
}

for alias, info in config_ids.items():
    dataset_id = info['id']
    print(f"\n   Checking {alias} ({dataset_id})...")

    try:
        result = subprocess.run(
            ['domo', 'dataset', 'get', '--id', dataset_id, '--json'],
            capture_output=True,
            text=True,
            check=True
        )

        domo_data = json.loads(result.stdout)

        results['found'].append({
            'alias': alias,
            'id': dataset_id,
            'name': domo_data.get('name'),
            'columnCount': domo_data.get('columnCount', 0),
            'rowCount': domo_data.get('rowCount', 0),
            'created': domo_data.get('created'),
            'lastUpdated': domo_data.get('lastUpdated')
        })

        print(f"      ✓ Found: {domo_data.get('name')}")
        print(f"        Columns: {domo_data.get('columnCount', 0)}, Rows: {domo_data.get('rowCount', 0)}")

    except subprocess.CalledProcessError as e:
        results['not_found'].append({
            'alias': alias,
            'id': dataset_id,
            'name': info['name'],
            'error': e.stderr
        })
        print(f"      ✗ NOT FOUND: {dataset_id}")

# Check for datasets in manifest but not in dataset-ids.json
print("\n[3/4] Checking for orphaned mappings in manifest.json...")
orphaned = []
for alias, dataset_id in manifest_mappings.items():
    if alias not in config_ids:
        orphaned.append({'alias': alias, 'id': dataset_id})
        print(f"   ⚠ Found in manifest but not in dataset-ids.json: {alias} ({dataset_id})")

# Get all X-Wing datasets from Domo
print("\n[4/4] Searching for all X-Wing datasets in Domo...")
try:
    result = subprocess.run(
        ['domo', 'dataset', 'list', '--json'],
        capture_output=True,
        text=True,
        check=True
    )

    all_datasets = json.loads(result.stdout)
    xwing_datasets = [d for d in all_datasets if 'X-Wing' in d.get('name', '')]

    print(f"   Found {len(xwing_datasets)} X-Wing datasets in Domo")

    # Find potential duplicates/orphans
    configured_ids = set(info['id'] for info in config_ids.values())
    orphaned_in_domo = []

    for ds in xwing_datasets:
        if ds['id'] not in configured_ids:
            orphaned_in_domo.append(ds)
            print(f"   ⚠ X-Wing dataset NOT in config: {ds['name']} ({ds['id']})")
            print(f"      Created: {ds.get('created')}, Columns: {ds.get('columnCount', 0)}, Rows: {ds.get('rowCount', 0)}")

except Exception as e:
    print(f"   Error listing datasets: {e}")
    xwing_datasets = []
    orphaned_in_domo = []

# Generate summary
print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)

print(f"\n✓ FOUND IN DOMO: {len(results['found'])}/{len(config_ids)}")
for ds in results['found']:
    print(f"   {ds['alias']:30} {ds['name']:40} ({ds['columnCount']} cols, {ds['rowCount']} rows)")

if results['not_found']:
    print(f"\n✗ NOT FOUND IN DOMO: {len(results['not_found'])}")
    for ds in results['not_found']:
        print(f"   {ds['alias']:30} {ds['id']}")
        print(f"      Expected: {ds['name']}")

if orphaned:
    print(f"\n⚠ ORPHANED IN MANIFEST.JSON: {len(orphaned)}")
    for ds in orphaned:
        print(f"   {ds['alias']:30} {ds['id']}")

if orphaned_in_domo:
    print(f"\n⚠ ORPHANED IN DOMO (not in config): {len(orphaned_in_domo)}")
    for ds in orphaned_in_domo:
        print(f"   {ds['name']:50} {ds['id']}")
        print(f"      Created: {ds.get('created')}, Last Updated: {ds.get('lastUpdated')}")
        print(f"      Columns: {ds.get('columnCount', 0)}, Rows: {ds.get('rowCount', 0)}")
        print(f"      Owner: {ds.get('owner', {}).get('name', 'Unknown')}")

# Generate action items
print("\n" + "=" * 80)
print("RECOMMENDED ACTIONS")
print("=" * 80)

if results['not_found']:
    print("\n1. MISSING DATASETS - Run create-datasets.sh to create:")
    for ds in results['not_found']:
        print(f"   - {ds['alias']}")

if orphaned:
    print("\n2. ORPHANED MANIFEST MAPPINGS - Remove from app/manifest.json:")
    for ds in orphaned:
        print(f"   - {ds['alias']} ({ds['id']})")

if orphaned_in_domo:
    print("\n3. ORPHANED DOMO DATASETS - Review and delete if duplicates:")
    for ds in orphaned_in_domo:
        print(f"   - {ds['name']} ({ds['id']})")
        print(f"     domo dataset delete --id {ds['id']}")

if not results['not_found'] and not orphaned and not orphaned_in_domo:
    print("\n✓ All datasets are properly reconciled!")

print("\n" + "=" * 80)

# Save detailed report
report = {
    'timestamp': subprocess.run(['date', '+%Y-%m-%d %H:%M:%S'], capture_output=True, text=True).stdout.strip(),
    'summary': {
        'configured': len(config_ids),
        'found_in_domo': len(results['found']),
        'not_found_in_domo': len(results['not_found']),
        'orphaned_in_manifest': len(orphaned),
        'orphaned_in_domo': len(orphaned_in_domo)
    },
    'found': results['found'],
    'not_found': results['not_found'],
    'orphaned_in_manifest': orphaned,
    'orphaned_in_domo': orphaned_in_domo
}

with open('dataset-reconciliation-report.json', 'w') as f:
    json.dump(report, f, indent=2)

print("Detailed report saved to: dataset-reconciliation-report.json")
print("=" * 80)
