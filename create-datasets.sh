#!/bin/bash

# X-Wing Maintenance Dashboard - Dataset Creation Script
# Creates all 13 core datasets in Domo for the maintenance ops system

echo "Creating X-Wing Maintenance Dashboard datasets in Domo..."
echo "=========================================================="

# Dataset 1: Fleet Master
echo "\n[1/13] Creating Fleet Master dataset..."
domo dataset create --file datasets/01-fleet-master.json

# Dataset 2: Aircraft Times
echo "\n[2/13] Creating Aircraft Times dataset..."
domo dataset create --file datasets/02-aircraft-times.json

# Dataset 3: Daily Routes
echo "\n[3/13] Creating Daily Routes dataset..."
domo dataset create --file datasets/03-daily-routes.json

# Dataset 4: Due Lists (Largest dataset)
echo "\n[4/13] Creating Due Lists dataset..."
domo dataset create --file datasets/04-due-lists.json

# Dataset 5: Airport Locations
echo "\n[5/13] Creating Airport Locations dataset..."
domo dataset create --file datasets/05-airport-locations.json

# Dataset 6: Avionics Equipment
echo "\n[6/13] Creating Avionics Equipment dataset..."
domo dataset create --file datasets/06-avionics-equipment.json

# Dataset 7: Flight Data
echo "\n[7/13] Creating Flight Data dataset..."
domo dataset create --file datasets/07-flight-data.json

# Dataset 8: Aircraft Status History (for 3-year search feature)
echo "\n[8/13] Creating Aircraft Status History dataset..."
domo dataset create --file datasets/08-aircraft-status-history.json

# Dataset 9: Upload Audit Log
echo "\n[9/13] Creating Upload Audit Log dataset..."
domo dataset create --file datasets/09-upload-audit-log.json

# Dataset 20: Route Swaps (NEW - from Fleet & Facilities workbook)
echo "\n[10/13] Creating Route Swaps dataset..."
domo dataset create --file datasets/20-route-swaps.json

# Dataset 21: Forecast Settings (NEW - for Maintenance Forecast feature)
echo "\n[11/13] Creating Forecast Settings dataset..."
domo dataset create --file datasets/21-forecast-settings.json

# Dataset 22: Aircraft Utilization (NEW - for Maintenance Forecast feature)
echo "\n[12/13] Creating Aircraft Utilization dataset..."
domo dataset create --file datasets/22-aircraft-utilization.json

# Dataset 23: Fleet Asset Import (NEW - from Fleet & Facilities workbook)
echo "\n[13/13] Creating Fleet Asset Import dataset..."
domo dataset create --file datasets/23-fleet-asset-import.json

echo "\n=========================================================="
echo "✅ Dataset creation complete!"
echo "All 13 X-Wing Maintenance datasets have been created in Domo."
echo ""
echo "Next steps:"
echo "1. Verify datasets in Domo UI"
echo "2. Build file upload interface"
echo "3. Create Custom App shell"
