#!/bin/bash

# Script to create the Work Orders dataset in Domo
# Run this after Phase 0 to add the new Work Orders dataset

echo "🚀 Creating X-Wing | Work Orders dataset in Domo..."
echo ""

# Check if domo CLI is authenticated
if ! domo dataset list &> /dev/null; then
    echo "❌ Error: domo CLI is not authenticated."
    echo "Please run: domo auth login <your-instance>.domo.com"
    exit 1
fi

# Create the Work Orders dataset
echo "📦 Creating: X-Wing | Work Orders"

DATASET_ID=$(domo dataset create \
    --file datasets/10-work-orders.json \
    --name "X-Wing | Work Orders")

if [ $? -eq 0 ]; then
    echo "✅ Work Orders dataset created successfully!"
    echo "   Dataset ID: $DATASET_ID"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Add this dataset ID to dataset-ids.json as 'work_orders'"
    echo "   2. Update app/manifest.json to include the work_orders dataset mapping"
    echo "   3. Deploy the updated app with ./deploy-app.sh"
else
    echo "❌ Failed to create Work Orders dataset"
    exit 1
fi

echo ""
echo "✨ Done! Work Orders dataset is ready for Phase 1 development."
