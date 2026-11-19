#!/bin/bash

# Package X-Wing Maintenance Dashboard for Domo Upload

echo "=========================================="
echo "X-Wing Dashboard - Package for Domo"
echo "=========================================="
echo ""

# Navigate to project root
cd "$(dirname "$0")"

# Create a clean package directory
echo "Creating package directory..."
rm -rf package
mkdir -p package

# Copy app files
echo "Copying app files..."
cp app/manifest.json package/
cp app/app.html package/
cp app/app.css package/
cp app/app.js package/
cp app/thumbnail.png package/

# Create ZIP file
echo "Creating ZIP archive..."
cd package
zip -r ../xwing-dashboard.zip * > /dev/null
cd ..

# Get file size
FILE_SIZE=$(du -h xwing-dashboard.zip | cut -f1)

echo "✅ Package created successfully!"
echo ""
echo "File: xwing-dashboard.zip ($FILE_SIZE)"
echo ""
echo "=========================================="
echo "Next Steps - Manual Upload to Domo:"
echo "=========================================="
echo ""
echo "1. Go to: https://<your-instance>.domo.com"
echo ""
echo "2. Navigate to:"
echo "   Admin → Dev Studio → Custom Apps"
echo "   (or search for 'Custom Apps' in the top search bar)"
echo ""
echo "3. Click 'Create Custom App'"
echo ""
echo "4. Upload: xwing-dashboard.zip"
echo ""
echo "5. Configure dataset mappings in the Domo UI:"
echo "   - fleet_master → $( cat dataset-ids.json | grep -A 2 fleet_master | grep id | cut -d'"' -f4)"
echo "   - aircraft_times → $(cat dataset-ids.json | grep -A 2 aircraft_times | grep id | cut -d'"' -f4)"
echo "   - (and 8 more...see dataset-ids.json for all IDs)"
echo ""
echo "6. Save and publish the app"
echo ""
echo "7. Add the app to a page:"
echo "   Create → Page → Add Card → Custom Apps → X-Wing Maintenance Dashboard"
echo ""
echo "=========================================="
echo ""
echo "Alternative: Test Locally First"
echo "=========================================="
echo ""
echo "Before uploading to Domo, test locally:"
echo "  cd app && open app.html"
echo ""
echo "This will open the app in your browser with mock data."
echo "Check browser console (Cmd+Option+I) for errors."
echo ""

# Clean up package directory
rm -rf package
