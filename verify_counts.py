#!/usr/bin/env python3
"""
Verify expected bucket counts after applying forecast_due_original_present rule
"""
import json
from datetime import datetime, timedelta

# Load due lists
with open('app/data/due_lists.json', 'r') as f:
    due_lists = json.load(f)

# Excluded aircraft
EXCLUDED = {'N1037N', 'N208N', 'N9469B', 'N863MA'}

# Today's date (using ?asof=2026-10-19)
TODAY = datetime(2026, 10, 19)

# Counters
overdue = 0
due30 = 0
due3160 = 0
due6190 = 0

skipped_calendar = []

for item in due_lists:
    tail = item.get('Aircraft', '')
    if tail in EXCLUDED:
        continue

    interval_type = (item.get('Interval Type') or item.get('interval_type') or '').lower()
    is_op = any(x in interval_type for x in ['hour', 'hrs', 'cycle', 'cyc', 'landing', 'ldg'])

    metric = None

    if is_op:
        # Operational items: use Projected Days
        proj_days = item.get('Projected Days') or item.get('projected_days')
        if proj_days is not None and proj_days != '':
            try:
                metric = float(proj_days)
            except:
                pass
    else:
        # Calendar items: check forecast_due_original_present
        if not item.get('forecast_due_original_present', False):
            # Skip - track for reporting
            forecast_due = item.get('Forecast Due') or item.get('forecast_due_date')
            due_at = item.get('Due At') or item.get('due_date')

            would_be_bucket = 'N/A'
            if due_at:
                try:
                    if isinstance(due_at, str):
                        # Parse "2026-10-31" or "2026-10-31 00:00:00"
                        due_date_str = due_at.split()[0]
                        due_date = datetime.strptime(due_date_str, '%Y-%m-%d')
                        days = (due_date - TODAY).days
                        if days < 0:
                            would_be_bucket = 'Overdue'
                        elif days <= 30:
                            would_be_bucket = '<=30d'
                        elif days <= 60:
                            would_be_bucket = '31-60d'
                        elif days <= 90:
                            would_be_bucket = '61-90d'
                        else:
                            would_be_bucket = '>90d'
                except:
                    pass

            skipped_calendar.append({
                'tail': tail,
                'task': (item.get('Task / Inspection', '') or '')[:50],
                'due_at': due_at,
                'would_be_bucket': would_be_bucket
            })
            continue

        # Calendar items with original forecast_due: use Forecast Due
        forecast_due = item.get('Forecast Due') or item.get('forecast_due_date')
        if forecast_due and forecast_due != '':
            try:
                if isinstance(forecast_due, str):
                    due_date = datetime.strptime(forecast_due, '%Y-%m-%d')
                    # Use fractional days like the JS code
                    due_midnight = datetime(due_date.year, due_date.month, due_date.day)
                    today_midnight = datetime(TODAY.year, TODAY.month, TODAY.day)
                    metric = (due_midnight - today_midnight).total_seconds() / 86400
            except Exception as e:
                pass

    if metric is None:
        continue

    # Bucket assignment
    if metric < 0:
        overdue += 1
    elif metric <= 30:
        due30 += 1
    elif metric <= 60:
        due3160 += 1
    elif metric <= 90:
        due6190 += 1

print('\n📊 Expected Dashboard Counts:')
print(f'  Overdue:       {overdue:3d} (target: 138)')
print(f'  Due ≤30d:      {due30:3d} (target: 63)')
print(f'  Due 31-60d:    {due3160:3d} (target: 67)')
print(f'  Due 61-90d:    {due6190:3d} (target: 59)')

print(f'\n⚠️ Skipped {len(skipped_calendar)} calendar items (no original Forecast Due)')

# Count by bucket
bucket_counts = {}
for item in skipped_calendar:
    bucket = item['would_be_bucket']
    bucket_counts[bucket] = bucket_counts.get(bucket, 0) + 1

print('📊 Skipped items by bucket:')
for bucket in sorted(bucket_counts.keys()):
    print(f'  {bucket:12s}: {bucket_counts[bucket]:3d}')

# Show a few examples of skipped items
print('\n📋 Sample skipped items:')
for item in skipped_calendar[:10]:
    print(f"  {item['tail']:8s} | {item['task']:50s} | {item['would_be_bucket']:8s}")
