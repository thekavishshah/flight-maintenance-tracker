#!/usr/bin/env python3
"""
Update app.js mock data with real CSV data for demo
"""
import csv
import json
import re

# Read real fleet data from CSV
fleet_data = []
with open('master_fleet.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Skip inactive/sold aircraft for cleaner demo
        if row['Fleet Status'] in ['Inactive', 'Customer Aircraft']:
            continue
        fleet_data.append({
            'tail_number': row['Aircraft'],
            'serial_number': row['Aircraft Serial Number'],
            'model': 'Cessna 208B',  # All are 208B
            'status': row['Fleet Status'] if row['Fleet Status'] != 'Active' else None,
            'home_base': row['Home Base'],
            'current_location': row['Current Location'] or row['Home Base'],
            'est_rts': row['Est. RTS'],
            'management_notes': row['Management Notes'],
            'year_of_manufacture': row['Year of Manufacture'],
            'engine_sn': None,  # Not in CSV
            'total_time': None,  # Not in CSV
            'total_landings': None,  # Not in CSV
            'total_cycles': None,  # Not in CSV
            'last_updated': None  # Not in CSV
        })

# Read real due list data from CSV (limit to 50 for performance)
due_list_data = []
with open('due_list_import.csv', 'r') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        if i >= 50:  # Limit to 50 rows for demo
            break
        # Only include items with valid projected days
        if not row['Projected Days'] or row['Projected Days'] == '':
            continue

        try:
            projected_days = float(row['Projected Days'])
        except:
            continue

        due_list_data.append({
            'due_item_id': f"DUE-{i+1:03d}",
            'tail_number': row['Aircraft'],
            'task_description': row['Task / Inspection'],
            'ata_chapter': row['ATA'],
            'compliance_basis': row['Basis'],
            'remaining_life': projected_days,
            'forecast_due_date': row['Forecast Due'],
            'last_completed_date': row['Last Completed'],
            'part_serial': row['Part / Serial'] or None,
            'status': 'Overdue' if projected_days < 0 else 'Approaching' if projected_days < 30 else 'OK',
            'upload_source': f"{row['Aircraft']} Due List.xlsx",
            'last_updated': None
        })

# Generate JavaScript code for fleet master
fleet_js = "return [\n"
for i, aircraft in enumerate(fleet_data):
    fleet_js += "        { "
    fleet_js += f"tail_number: '{aircraft['tail_number']}', "
    fleet_js += f"serial_number: '{aircraft['serial_number']}', "
    fleet_js += f"model: '{aircraft['model']}', "
    status_val = 'null' if not aircraft['status'] else f"'{aircraft['status']}'"
    fleet_js += f"status: {status_val}, "
    fleet_js += f"home_base: '{aircraft['home_base']}', "
    fleet_js += f"engine_sn: null, "
    fleet_js += "total_time: null, total_landings: null, total_cycles: null, "
    fleet_js += "last_updated: null"
    fleet_js += " }"
    if i < len(fleet_data) - 1:
        fleet_js += ","
    fleet_js += "\n"
fleet_js += "      ];"

# Generate JavaScript code for due lists
due_js = "return [\n"
for i, item in enumerate(due_list_data):
    due_js += "        { "
    due_js += f"due_item_id: '{item['due_item_id']}', "
    due_js += f"tail_number: '{item['tail_number']}', "
    # Escape single quotes in task description
    task = item['task_description'].replace("'", "\\'")
    due_js += f"task_description: '{task}', "
    due_js += f"ata_chapter: '{item['ata_chapter']}', "
    due_js += f"compliance_basis: '{item['compliance_basis']}', "
    due_js += f"remaining_life: {item['remaining_life']}, "
    due_js += f"forecast_due_date: '{item['forecast_due_date']}', "
    due_js += f"last_completed_date: '{item['last_completed_date']}', "
    part_val = 'null' if not item['part_serial'] else f"'{item['part_serial']}'"
    due_js += f"part_serial: {part_val}, "
    due_js += f"status: '{item['status']}', "
    due_js += f"upload_source: '{item['upload_source']}', "
    due_js += "last_updated: null"
    due_js += " }"
    if i < len(due_list_data) - 1:
        due_js += ","
    due_js += "\n"
due_js += "      ];"

# Read app.js
with open('app/app.js', 'r') as f:
    app_js_content = f.read()

# Replace FLEET_MASTER mock data
fleet_pattern = r"(case DATASETS\.FLEET_MASTER:\s+)return \[[\s\S]*?\];"
app_js_content = re.sub(fleet_pattern, r"\1" + fleet_js, app_js_content, count=1)

# Replace DUE_LISTS mock data
due_pattern = r"(case DATASETS\.DUE_LISTS:\s+)return \[[\s\S]*?\];"
app_js_content = re.sub(due_pattern, r"\1" + due_js, app_js_content, count=1)

# Write updated app.js
with open('app/app.js', 'w') as f:
    f.write(app_js_content)

print(f"✓ Updated app/app.js with real data:")
print(f"  - Fleet Master: {len(fleet_data)} aircraft")
print(f"  - Due Lists: {len(due_list_data)} items")
print(f"\n✓ Ready for local demo at http://localhost:8000/app.html")
