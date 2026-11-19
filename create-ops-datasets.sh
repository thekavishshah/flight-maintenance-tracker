#!/bin/bash

# Create OPS Terminal Datasets for X-Wing Maintenance Dashboard
# This script creates 9 new datasets for the OPS Terminal features

echo "🚀 Creating OPS Terminal Datasets in Domo..."
echo "=========================================================="

# CapEx/Financial Datasets
echo "\n[1/9] Creating CapEx Transactions dataset..."
domo dataset create --file datasets/11-capex-transactions.json

echo "\n[2/9] Creating Budget Allocations dataset..."
domo dataset create --file datasets/12-budget-allocations.json

echo "\n[3/9] Creating Financial Metrics dataset..."
domo dataset create --file datasets/13-financial-metrics.json

# Fleet Planning Datasets
echo "\n[4/9] Creating Fleet Projections dataset..."
domo dataset create --file datasets/14-fleet-projections.json

echo "\n[5/9] Creating Route Performance dataset..."
domo dataset create --file datasets/15-route-performance.json

# Engine Stock Datasets
echo "\n[6/9] Creating Engine Inventory dataset..."
domo dataset create --file datasets/16-engine-inventory.json

echo "\n[7/9] Creating Engine History dataset..."
domo dataset create --file datasets/17-engine-history.json

# Propeller Stock Datasets
echo "\n[8/9] Creating Propeller Inventory dataset..."
domo dataset create --file datasets/18-propeller-inventory.json

echo "\n[9/9] Creating Propeller History dataset..."
domo dataset create --file datasets/19-propeller-history.json

echo "\n=========================================================="
echo "✅ All 9 OPS Terminal datasets created successfully!"
echo ""
echo "Next steps:"
echo "1. Update dataset-ids.json with the new dataset IDs"
echo "2. Update app/manifest.json with the new dataset mappings"
echo "3. Build OPS Terminal UI features"
