# How to Test Locally Before Deploying

## Quick Test (Open in Browser)

The easiest way to test is to open `app.html` directly in your browser:

```bash
cd flight-maintenance-tracker/app
open app.html
```

**Note:** This will use mock data since you're not connected to Domo.

---

## What to Test

### 1. Visual/UI Tests
- [ ] Page loads without errors
- [ ] All tabs are visible and clickable
- [ ] OPS/MAINT view toggle works
- [ ] All styling renders correctly (dark theme, colors, fonts)
- [ ] Fleet status grid displays
- [ ] Tables render properly

### 2. Work Order Tests
- [ ] Click "Create Blank Work Order" button
- [ ] Modal opens with form
- [ ] All form fields are present
- [ ] Form validation works (try submitting empty form)
- [ ] Can select aircraft from dropdown
- [ ] Date picker works
- [ ] Modal closes on cancel/submit

- [ ] Click "Auto-Populate from Due Items" button
- [ ] Modal shows list of due items
- [ ] Checkboxes work
- [ ] Can select/deselect items
- [ ] Modal closes properly

### 3. File Upload Tests
- [ ] BULK IMPORT tab loads
- [ ] Report type dropdown works
- [ ] File upload area is visible
- [ ] Can select file type dropdown
- [ ] Upload button is present

### 4. Navigation Tests
- [ ] All MAINT tabs clickable (7 tabs)
- [ ] All OPS tabs clickable (6 tabs)
- [ ] Tab switching works smoothly
- [ ] Active tab highlights correctly

### 5. Check Browser Console
Open browser console (F12 or Cmd+Option+I):
- Look for JavaScript errors (red text)
- Check for warnings
- Verify no missing file errors

---

## Common Issues & Fixes

### Issue: "Domo is not defined"
**Cause:** Not connected to Domo environment
**Solution:** This is expected when testing locally. The app will use mock data.

### Issue: Blank page or white screen
**Cause:** JavaScript error
**Solution:**
1. Open browser console (F12)
2. Look for error messages
3. Check file paths are correct

### Issue: Styles don't load
**Cause:** CSS file path issue
**Solution:**
1. Verify `app.css` is in same folder as `app.html`
2. Check browser console for 404 errors

### Issue: Images don't load
**Cause:** Missing image files
**Solution:**
1. Verify `thumbnail.png` exists
2. Check image paths in HTML

---

## Advanced Testing (With Domo Dev Tools)

If you have access to Domo's development tools:

### Option 1: Use `domo dev` (Local Development Server)

```bash
cd flight-maintenance-tracker
domo dev
```

This starts a local server connected to Domo with real datasets.

### Option 2: Test in Domo Sandbox

1. Create a test page in Domo
2. Add a "Custom App" card
3. Point it to your development version
4. Test with real Domo data

---

## Checklist Before Deploying

- [ ] All JavaScript loads without errors
- [ ] All CSS loads correctly
- [ ] All modals open/close properly
- [ ] Forms have proper validation
- [ ] Buttons are clickable
- [ ] Tables render data
- [ ] No console errors
- [ ] Thumbnail.png exists
- [ ] Manifest.json is valid JSON

---

## Testing the Deployment

After you fix the deployment issues, you can test the deployed app:

### 1. Deploy to Domo
```bash
cd flight-maintenance-tracker
./deploy-app.sh
```

### 2. Add to Domo Page
1. Go to Domo → Create → Page
2. Add Card → Custom App
3. Select "X-Wing Maintenance Dashboard"
4. Verify it loads with real data

### 3. Test Key Features
- [ ] Work order creation (saves to dataset)
- [ ] File upload (creates audit log entry)
- [ ] Approval workflow (updates status)
- [ ] Access control (test with different users)

---

## Current Deployment Error

You're getting this error:
```
JSON parse error: Instantiation of [simple type, class com.domo.ryuu.model.designs.DataPoint]
value failed for JSON property fields which is a non-nullable type
```

**This means:** The manifest.json is missing required field mapping information.

**Fix:** I'll update the manifest to include the field specifications.

---

## Next Steps

1. I'll fix the manifest.json format
2. You test locally by opening app.html
3. Once local testing passes, we deploy to Domo
4. Then test in Domo with real data

Ready to proceed?
