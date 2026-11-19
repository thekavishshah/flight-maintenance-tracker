# X-Wing Maintenance Dashboard - Deployment Guide

**Project:** Aircraft Maintenance Tracking System
**Platform:** Domo Custom App
**Instance:** <your-instance>.domo.com
**Last Updated:** September 30, 2026

---

## Prerequisites

Before deploying, ensure you have:

1. **Domo CLI installed and authenticated**
   ```bash
   # Check if CLI is installed
   domo --version

   # Authenticate (if not already)
   domo auth login <your-instance>.domo.com

   # Verify authentication
   domo auth whoami
   ```

2. **Access to <your-instance>.domo.com**
   - Must have Custom App creation permissions
   - Must have access to all 19 datasets

3. **All datasets created** (should already exist)
   - **MAINT Terminal:** 10 datasets
   - **OPS Terminal:** 9 datasets
   - Total: 19 datasets
   - IDs recorded in `dataset-ids.json` and `manifest.json`

4. **App files prepared** (all in `app/` directory)
   - `manifest.json` - Dataset mappings configured (19 datasets)
   - `app.html` - Main HTML structure (548 lines)
   - `app.css` - Styling (925+ lines)
   - `app.js` - JavaScript logic (2,200+ lines)
   - `thumbnail.png` - App icon

---

## Quick Deployment

### Using the Deployment Script (Recommended)

```bash
cd flight-maintenance-tracker
./deploy-app.sh
```

The script will:
1. ✅ Check Domo CLI is installed
2. ✅ Verify authentication
3. ✅ Check all required files exist
4. ✅ Display app info (name, version, dataset count)
5. ✅ Ask for confirmation
6. ✅ Run `domo app publish` to upload the app
7. ✅ Show deployment results and next steps

**What `domo app publish` does:**
- On **first publish**: Creates new design and writes ID to manifest.json
- On **subsequent publishes**: Updates existing design with new version
- Uploads all files (app.html, app.css, app.js, thumbnail.png)
- Respects manifest.json dataset mappings (all 19 datasets)

---

## Manual Deployment

### Step 1: Verify Authentication

```bash
domo auth whoami
```

If not authenticated:
```bash
domo auth login <your-instance>.domo.com
```

### Step 2: Navigate to App Directory

```bash
cd flight-maintenance-tracker/app
```

### Step 3: Publish the App

```bash
domo app publish
```

This will:
- Create a new Custom App design (first time)
- OR update existing design (if ID exists in manifest.json)
- Upload all assets
- Return the design ID

### Step 4: Verify Deployment

```bash
# Check manifest.json for the design ID
cat manifest.json | grep '"id"'
```

---

## Post-Deployment Steps

### 1. Access the App in Domo

After successful deployment:

1. Go to **Domo** → **More** → **Admin** → **Custom Apps**
2. Find **"X-Wing Maintenance Dashboard"** in the list
3. Click on it to view details
4. Click **"Preview"** or **"Test"** to open the app

### 2. Create a Dashboard Card

To deploy the app on a dashboard:

1. Go to any Domo dashboard (or create new one)
2. Click **"Add Card"** → **"Custom App"**
3. Select **"X-Wing Maintenance Dashboard"**
4. Configure card size (recommended: Full width, tall height)
5. Save the card

### 3. Test Functionality

**MAINT Terminal Tests:**
- [ ] Fleet status grid displays
- [ ] Due lists table loads
- [ ] Work order creation works
- [ ] File upload interface functional
- [ ] Upload approval workflow works
- [ ] Tab navigation smooth
- [ ] OPS/MAINT toggle works

**OPS Terminal Tests:**
- [ ] OPS Dashboard shows financial metrics
- [ ] Fleet Planning displays projections
- [ ] CapEx Detail shows transactions
- [ ] Engine Stock displays inventory
- [ ] Propeller Stock displays inventory
- [ ] Fleet Records shows aircraft

**General Tests:**
- [ ] No console errors
- [ ] All 19 datasets load
- [ ] Mock data displays correctly
- [ ] Dark theme renders properly
- [ ] Status badges color-coded correctly

### 4. Share with Stakeholders

Once tested, share with maintenance users (MAINTENANCE role) and management users (MANAGEMENT role).

**Sharing Instructions:**
1. Go to the dashboard containing the app
2. Click **"Share"**
3. Add users by email
4. Set appropriate permissions:
   - Maintenance users: Can View
   - Management users: Can Edit (for approvals)

---

## Troubleshooting

### Issue: "Not authenticated with Domo"

**Solution:**
```bash
domo auth login <your-instance>.domo.com
```

Follow the prompts to authenticate.

### Issue: "Missing required file"

**Solution:**
Verify all files exist in `app/` directory:
```bash
ls -la app/
# Should show: manifest.json, app.html, app.css, app.js, thumbnail.png
```

### Issue: "Failed to publish app"

**Possible causes:**
1. **Insufficient permissions** - Contact Domo admin for Custom App permissions
2. **Network issues** - Check internet connection
3. **Invalid manifest.json** - Verify JSON syntax is correct
4. **Missing datasets** - Ensure all 19 datasets exist in Domo

**Debug steps:**
```bash
# Check manifest syntax
cat app/manifest.json | python -m json.tool

# Verify dataset access (example)
domo dataset get 1c2201fb-0202-4925-acae-abca7466f4dd
```

### Issue: "App loads but shows no data"

**Expected behavior:**
- If datasets are empty, you'll see "No data available" messages
- This is normal until you upload data from 135 ACM

**To test with mock data:**
- Open `app/app.html` directly in browser
- App will use mock data when Domo.js is not available

### Issue: "Dataset not found" errors

**Solution:**
Verify all 19 dataset IDs in `manifest.json` match the actual dataset IDs in Domo:

```bash
# List all X-Wing datasets
domo dataset list --filter 'X-Wing'
```

Compare IDs with those in `dataset-ids.json`.

---

## Updating the App

### Making Changes

1. Edit files in `app/` directory
   - `app.html` - UI changes
   - `app.css` - Styling changes
   - `app.js` - Logic changes
   - `manifest.json` - Dataset or config changes

2. Update version in `manifest.json`:
   ```json
   "version": "2.1.0"
   ```

3. Redeploy:
   ```bash
   ./deploy-app.sh
   ```

### Version History

Track changes in `manifest.json` version field:
- **1.0.0** - Phase 0 & 1 complete (MAINT Terminal)
- **2.0.0** - Phase 2 complete (OPS Terminal added)
- **2.1.0** - Future updates

---

## Advanced: Direct Domo CLI Commands

### List all Custom Apps

```bash
domo app list
```

### Get app details

```bash
domo app get <DESIGN_ID>
```

### Delete an app

```bash
domo app delete <DESIGN_ID>
```

### Download an app

```bash
domo app download <DESIGN_ID> --dir ./downloaded-app
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Domo CLI installed
- [ ] Authenticated to <your-instance>.domo.com
- [ ] All 19 datasets created and accessible
- [ ] All app files present (5 files in app/ directory)
- [ ] manifest.json has correct version number
- [ ] Tested locally (optional)

### Deployment
- [ ] Run `./deploy-app.sh`
- [ ] Verify no errors in output
- [ ] Note design ID from output
- [ ] Check manifest.json has ID written

### Post-Deployment
- [ ] Access app in Domo Admin → Custom Apps
- [ ] Preview app works
- [ ] Create dashboard card
- [ ] Test MAINT Terminal (7 tabs)
- [ ] Test OPS Terminal (6 tabs)
- [ ] Test OPS/MAINT toggle
- [ ] Verify no console errors
- [ ] Share with stakeholders

### Final Steps
- [ ] Document any issues encountered
- [ ] Update version for next release
- [ ] Notify team of deployment

---

## Dataset Summary

**Total Datasets:** 19

**MAINT Terminal (10):**
1. X-Wing | Fleet Master
2. X-Wing | Aircraft Times
3. X-Wing | Daily Routes
4. X-Wing | Due Lists
5. X-Wing | Airport Locations
6. X-Wing | Avionics Equipment
7. X-Wing | Flight Data
8. X-Wing | Aircraft Status History
9. X-Wing | Upload Audit Log
10. X-Wing | Work Orders

**OPS Terminal (9):**
11. X-Wing | CapEx Transactions
12. X-Wing | Budget Allocations
13. X-Wing | Financial Metrics
14. X-Wing | Fleet Projections
15. X-Wing | Route Performance
16. X-Wing | Engine Inventory
17. X-Wing | Engine History
18. X-Wing | Propeller Inventory
19. X-Wing | Propeller History

All dataset IDs are configured in `app/manifest.json`.

---

## Support

**For deployment issues:**
- Check this guide's Troubleshooting section
- Review Domo CLI documentation: `domo app --help`
- Contact Domo support if needed

**For app functionality issues:**
- Review `PHASE1_COMPLETE.md` and `PHASE2_COMPLETE.md`
- Check browser console for errors
- Test with mock data locally first

**For dataset issues:**
- Verify datasets exist in Domo
- Check dataset IDs match manifest.json
- Ensure you have dataset access permissions

---

**Document Version:** 2.0
**Last Updated:** September 30, 2026
**Status:** Ready for Deployment 🚀
