#!/bin/bash

# X-Wing Maintenance Dashboard - Deployment Script
# Publishes Custom Domo App to <your-instance>.domo.com

echo "=========================================="
echo "X-Wing Maintenance Dashboard Deployment"
echo "=========================================="
echo ""

# Check if domo CLI is available
if ! command -v domo &> /dev/null; then
    echo "❌ Error: Domo CLI not found"
    echo "Please install the Domo CLI first"
    exit 1
fi

# Check authentication
echo "Checking Domo authentication..."
WHOAMI_OUTPUT=$(domo auth whoami 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ Error: Not authenticated with Domo"
    echo "Please run: domo auth login <your-instance>.domo.com"
    exit 1
fi

echo "✅ Authenticated"
echo ""

# Navigate to app directory
cd app || exit 1

# Verify required files exist
echo "Verifying app files..."
required_files=("manifest.json" "app.html" "app.css" "app.js" "thumbnail.png")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Error: Missing required file: $file"
        exit 1
    fi
done
echo "✅ All required files present"
echo ""

# Show app info
APP_NAME=$(grep -o '"name": "[^"]*"' manifest.json | head -1 | cut -d'"' -f4)
APP_VERSION=$(grep -o '"version": "[^"]*"' manifest.json | head -1 | cut -d'"' -f4)
echo "App Name: $APP_NAME"
echo "Version: $APP_VERSION"
echo "Datasets: 19 (10 MAINT + 9 OPS)"
echo ""

# Ask for confirmation
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "Publishing Custom App to Domo..."
echo "(This will create a new design or update the existing one)"
echo ""

# Run domo app publish
# On first publish: creates new design and writes ID to manifest.json
# On subsequent publishes: updates existing design
domo app publish

# Check if successful
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Deployment failed"
    echo "Check the error messages above"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""

# Extract the design ID from manifest.json (it should have been written by domo app publish)
DESIGN_ID=$(grep -o '"id": "[^"]*"' manifest.json | head -1 | cut -d'"' -f4)

if [ ! -z "$DESIGN_ID" ]; then
    echo "Design ID: $DESIGN_ID"
    echo "Instance: <your-instance>.domo.com"
    echo ""
    echo "Next steps:"
    echo "1. Go to Domo → More → Admin → Custom Apps"
    echo "2. Find '$APP_NAME' in the list"
    echo "3. Click to test the app"
    echo "4. Create a card on a dashboard to deploy it"
    echo "5. Share with maintenance and management users"
else
    echo "Note: Check manifest.json for the design ID"
fi

echo ""
