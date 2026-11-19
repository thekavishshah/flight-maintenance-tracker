# Maintenance Forecast Feature - Complete

**Date:** October 18, 2026
**Status:** ✅ Built and ready for demo
**Test URL:** http://localhost:8000/app.html

---

## Overview

The **Maintenance Forecast** feature identifies clusters of upcoming maintenance checks and recommends route swaps to stagger them, preventing multiple aircraft from being grounded simultaneously.

Built against mock data (matching the rest of the app's local testing setup) so it can be demoed **tomorrow** without requiring real workbook data to be loaded into Domo.

---

## What Was Built

### 1. New Tab in MAINT Terminal
- **Tab Name:** MX FORECAST
- **Location:** Between "DUE LISTS" and "COMPLIANCE" tabs
- **Icon:** Analytics/trend chart icon
- **Access:** MAINT terminal only

### 2. User Interface Components

**Forecast Settings Panel:**
- Forecast Horizon (Days): Configurable, default 60 days
- Cluster Threshold (Days): How close maintenance must be to cluster, default 7 days
- Min Aircraft in Cluster: Minimum aircraft to flag as cluster, default 3
- "Run Analysis" button to execute forecast

**Maintenance Clusters Section:**
- Shows identified clusters with color-coded severity:
  - **Critical (Red):** 4+ aircraft converging
  - **High (Yellow):** 3 aircraft converging
  - **Medium (Blue):** 2 aircraft converging
- Each cluster card shows:
  - Center date and aircraft count
  - List of aircraft with task descriptions and due dates
  - Embedded swap recommendations

**Recommended Route Swaps Table:**
- Displays swaps in Route Swaps schema format
- Fields: Effective Date, Route, Scheduled Aircraft, Replacement, Reason, Status, Notes
- Formatted as "Planned" status (not auto-submitted)
- Shows reasoning for each swap recommendation

**Utilization Forecast Data Table:**
- Shows aircraft utilization rates used for projections
- Displays forecast hours/cycles/landings per aircraft
- Indicates forecast basis ("3-month actual" vs "300/year default")

### 3. Algorithm Implementation

**Step 1: Load Upcoming Due Items**
```
- Filter due items within forecast horizon (default 60 days)
- Focus on usage-based items (Hours, Cycles, Landings)
- Exclude calendar-based items
```

**Step 2: Project Forward Using Utilization**
```
- Load Aircraft Utilization forecast rates
- Calculate projected days until due: remaining_life / daily_utilization_rate
- Fall back to Forecast Settings (300/year default) if no utilization data
- Generate projected_due_date for each item
```

**Step 3: Identify Clusters**
```
- Group aircraft with due dates within cluster threshold (default 7 days)
- Require minimum cluster size (default 3 aircraft)
- Assign severity based on aircraft count:
  - 4+ aircraft = CRITICAL
  - 3 aircraft = HIGH
  - 2 aircraft = MEDIUM
```

**Step 4: Generate Swap Recommendations**
```
- For CRITICAL and HIGH severity clusters:
  - Identify aircraft with least remaining life (most critical)
  - Identify aircraft with most remaining life (least critical)
  - Find scheduled route for most critical aircraft
  - Recommend swapping to replacement aircraft
  - Set effective date 14 days before projected due date
  - Populate Route Swaps schema format
```

**Step 5: Render Results**
```
- Display clusters with embedded swap recommendations
- Show swap table in Route Swaps schema format
- Update badge counts
- Display utilization data for transparency
```

---

## Mock Data Used

### Aircraft Utilization (8 aircraft)
```javascript
N1120W: 320 hours/year (3-month actual)
N1119V: 280 hours/year (3-month actual)
N9760B: 300 hours/year (300/year default)
N9761B: 340 hours/year (3-month actual)
N9331B: 300 hours/year (300/year default)
N1041L: 290 hours/year (3-month actual)
N4655B: 300 hours/year (300/year default)
N4625B: 315 hours/year (3-month actual)
```

### Forecast Settings
```javascript
Flight Hours: 300/year, 0.822/day
Cycles: 300/year, 0.822/day
Landings: 300/year, 0.822/day
```

### Daily Routes (Sample)
```
Routes for N1120W, N1119V, N9761B, N9331B, N1041L
Used to populate Route Swaps recommendations
```

### Due Lists
Uses existing mock data from AppState.dueLists (already in app.js)

---

## Route Swap Output Format

Swap recommendations match the real Route Swaps schema:

```json
{
  "Effective Date": "2026-11-15T00:00:00",
  "Route": "KRDU",
  "Scheduled Aircraft": "N9761B",
  "Replacement Aircraft": "N9331B",
  "Swap Reason": "MX",
  "Replacement Location": "KRDU",
  "Start Time": "11:45:00",
  "Time Zone": "CST",
  "Swap Status": "Planned",
  "Authorization": "",
  "Notes": "Recommended swap to stagger 400-hr checks. N9761B due in 3 days, N9331B has 45 days remaining. Cluster of 4 aircraft converging."
}
```

**Note:** Swaps are modeled but NOT wired for actual submission (as requested).

---

## Files Modified

### HTML (`app/app.html`)
- Added MX FORECAST tab button (line ~106-112)
- Added MX FORECAST tab content section (line ~417-465)
- Includes: settings panel, clusters display, swaps table, utilization table

### CSS (`app/app.css`)
- Added `.forecast-settings` grid layout
- Added `.setting-card` styling
- Added `.cluster-card` with severity color coding
- Added `.cluster-header`, `.cluster-title`, `.cluster-severity` styling
- Added `.aircraft-chip` with embedded due dates
- Added `.swap-recommendation` highlight styling
- Added `.badge` for count indicators
- ~150 lines of CSS added (line ~923-1067)

### JavaScript (`app/app.js`)
- Appended full forecast feature module (~450 lines)
- Functions added:
  - `runForecastAnalysis()` - Main entry point
  - `getUpcomingDueItems()` - Filter due items
  - `projectDueDates()` - Calculate projections
  - `getUtilizationRate()` - Extract rates by basis
  - `identifyClusters()` - Cluster algorithm
  - `generateSwapRecommendations()` - Swap logic
  - `renderForecastResults()` - UI rendering
  - `renderUtilizationData()` - Table rendering
- Mock data included for local testing
- Auto-runs on tab switch

---

## Testing Instructions

### 1. Start Local Server (Already Running)
```bash
cd app
python3 -m http.server 8000
```

**Test URL:** http://localhost:8000/app.html

### 2. Access the Feature
1. Open http://localhost:8000/app.html
2. Click "MAINT DASHBOARD" (should be default view)
3. Click "MX FORECAST" tab
4. Analysis runs automatically on tab open

### 3. Interact with Settings
- Adjust "Forecast Horizon" (try 30, 60, 90 days)
- Adjust "Cluster Threshold" (try 3, 7, 14 days)
- Adjust "Min Aircraft in Cluster" (try 2, 3, 4)
- Click "Run Analysis" to re-run with new settings

### 4. Review Results
- **Clusters Section:** Should show maintenance clusters with color-coded severity
- **Swaps Table:** Should display recommended swaps in Route Swaps format
- **Utilization Table:** Should show forecast rates for all aircraft

### 5. Expected Behavior
- Badge counts update automatically
- Clusters sort by severity (Critical → High → Medium)
- Swaps are embedded within cluster cards AND shown in table
- Empty states show when no clusters/swaps found

---

## Known Limitations (By Design)

1. **Mock Data Only**
   - Uses hardcoded aircraft utilization and forecast settings
   - Will be replaced with real Domo datasets when workbook data is loaded
   - Mock data matches existing app.js pattern for local testing

2. **No Submission Workflow**
   - Swaps are modeled but not wired for actual submission
   - "Planned" status indicates recommendation only
   - Authorization field left empty (requires management approval)
   - This is intentional per your instructions

3. **Simplified Utilization Model**
   - Uses annual forecast rates divided by 365 for daily projections
   - Real implementation should use workbook's 30-day/90-day actual usage
   - Algorithm structure supports this—just swap data source

---

## Future Enhancements (Not Implemented)

1. **Wire Up Real Data**
   - Replace mock data with actual Domo dataset queries
   - Use `aircraft_utilization` dataset (ID: 7b8e04be-da77-4243-a48e-6bc7eac4bb8d)
   - Use `forecast_settings` dataset (ID: d3781479-3546-4b40-a730-134b5928f404)

2. **Swap Submission Workflow**
   - Add "Submit Swap" button to recommendations
   - Wire to `route_swaps` dataset (ID: 48201923-59a2-4480-8462-4156b2ba6987)
   - Require approval workflow (similar to upload approvals)

3. **Advanced Projections**
   - Use 30-day/90-day actual usage instead of annual rates
   - Account for seasonal variations
   - Consider historical maintenance delays

4. **Route Optimization**
   - Check actual route schedules before recommending swaps
   - Verify aircraft are at same base/location
   - Consider pilot qualifications and training

---

## Datasets Required (When Loading Real Data)

1. **X-Wing | Aircraft Utilization** (`7b8e04be-da77-4243-a48e-6bc7eac4bb8d`)
   - Source: Aircraft Utilization tab from workbook
   - Used for: Forecast rates per aircraft

2. **X-Wing | Forecast Settings** (`d3781479-3546-4b40-a730-134b5928f404`)
   - Source: Forecast Settings tab from workbook
   - Used for: Default 300/year fallback rates

3. **X-Wing | Due Lists** (`d3d9e224-95c9-441d-892a-5c536fcd9b99`)
   - Already exists, needs real data
   - Used for: Upcoming maintenance items

4. **X-Wing | Daily Routes** (`f25dba97-871f-49d7-a400-2e3d5aebf455`)
   - Already exists, needs real data
   - Used for: Finding routes for swap recommendations

5. **X-Wing | Route Swaps** (`48201923-59a2-4480-8462-4156b2ba6987`)
   - Created today
   - Used for: Storing submitted swap recommendations (future)

---

## Demo Script for Tomorrow

**Opening:**
"The Maintenance Forecast feature identifies when multiple aircraft have maintenance checks converging on the same dates, which could ground our fleet. It recommends route swaps to stagger the maintenance and keep aircraft flying."

**Step 1: Show the Tab**
"I've added a new 'MX FORECAST' tab in the MAINT terminal. When you click it, the analysis runs automatically."

**Step 2: Explain the Settings**
"You can adjust three parameters:
- Forecast Horizon: How far ahead to look (default 60 days)
- Cluster Threshold: How close maintenance dates must be to flag (default 7 days)
- Min Aircraft in Cluster: How many aircraft trigger an alert (default 3)"

**Step 3: Show a Cluster**
"Here's a CRITICAL cluster: 4 aircraft all have checks due within 7 days of each other. Each cluster shows the aircraft, their specific checks, and how many days until due."

**Step 4: Show the Recommendation**
"For each critical cluster, we recommend a route swap. For example: swap N9761B for N9331B on the KRDU route 14 days before the check is due. This gives N9761B more time while N9331B (which has 45 days remaining) takes over the route."

**Step 5: Show the Data**
"The bottom table shows the utilization forecast data we're using—some aircraft have '3-month actual' usage rates, others use the '300/year default' fallback from the source workbook."

**Step 6: Emphasize Non-Submission**
"These are recommendations only—they're marked as 'Planned' status. Management would need to review and approve before they're submitted to the Route Swaps workflow."

**Closing:**
"This matches the exact Route Swaps schema from the source workbook, so when we wire up actual submission, it'll integrate seamlessly."

---

## Summary

✅ **Complete and ready for demo tomorrow**
- New MX FORECAST tab in MAINT terminal
- Full clustering algorithm implemented
- Route swap recommendations in correct schema format
- Works with mock data (matches app's local testing pattern)
- Visually polished with color-coded severity
- Auto-runs on tab switch
- Configurable settings for demo flexibility

🔧 **Not implemented (as requested):**
- Actual swap submission workflow (modeled only)
- Real workbook data integration (uses mock data for now)

📊 **Datasets reconciled and ready:**
- All 23 datasets verified in Domo
- 4 new datasets created for forecast feature
- Config files updated with correct IDs
- No orphaned or duplicate datasets found

---

**Built By:** Claude Code
**Date:** October 18, 2026
**Test:** http://localhost:8000/app.html → Click "MX FORECAST" tab
