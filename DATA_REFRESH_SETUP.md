# Automated Data Refresh Setup - X-Wing Maintenance Dashboard

## Overview

This document provides step-by-step instructions for setting up automated 2x daily data refreshes and other scheduled updates for the X-Wing Maintenance Dashboard.

---

## Refresh Schedule Summary

| Dataset | Frequency | Time (CST) | Purpose |
|---------|-----------|------------|---------|
| Aircraft Times | 2x Daily | 7:00 AM, 7:00 PM | Track current aircraft times |
| Daily Routes | Daily | 8:00 AM | Update route assignments |
| Flight Data | Daily | 11:00 PM | Import completed flights |
| Fleet Master | Weekly | Mon 6:00 AM | Update fleet registry |
| Due Lists | Weekly | Mon 6:00 AM | Refresh maintenance items |
| Avionics Equipment | Weekly | Mon 6:00 AM | Update equipment tracking |
| Airport Locations | Monthly | 1st @ 6:00 AM | Update airport data |
| Work Orders | Real-time | On-demand | User-created entries |
| Upload Audit Log | Real-time | On-demand | Track uploads |
| Status History | Real-time | On-demand | Manual entries |

---

## Implementation Steps

### Step 1: Create DataFlow for Aircraft Times (2x Daily)

**DataFlow Name:** `X-Wing | Aircraft Times - 2x Daily Refresh`

**Configuration:**
1. Navigate to Domo → Data Center → DataFlows
2. Click "Create DataFlow" → Select type based on source:
   - If using 135 ACM API: **Connector DataFlow**
   - If using file uploads: **Magic ETL DataFlow**
3. Configure input dataset:
   - **Input:** Raw Upload - Aircraft MX Times Report
   - **Transform:** Apply Aircraft Times ETL logic (see MAGIC_ETL_DESIGN.md)
   - **Output:** X-Wing | Aircraft Times (`8fad7ef4-5f34-402f-b86b-1b0d62df4976`)

**Scheduling:**
```
Trigger Type: Scheduled
Schedule Type: Advanced (Cron)
Cron Expression: 0 7,19 * * *
Timezone: America/Chicago
Enabled: Yes
```

**Error Handling:**
```
On Failure: Send Alert
Alert Recipients:
  - <maintenance-lead-email>
  - <your-email>
Retry: 2 times, 15 minutes apart
```

**Save and activate the DataFlow**

---

### Step 2: Create DataFlow for Daily Routes

**DataFlow Name:** `X-Wing | Daily Routes - Daily Refresh`

**Configuration:**
1. Input: Raw Upload - Daily Route Sheet
2. Transform: Apply Daily Routes ETL logic
3. Output: X-Wing | Daily Routes (`f25dba97-871f-49d7-a400-2e3d5aebf455`)

**Scheduling:**
```
Trigger Type: Scheduled
Schedule Type: Daily
Time: 8:00 AM CST
Timezone: America/Chicago
Enabled: Yes
```

---

### Step 3: Create DataFlow for Flight Data

**DataFlow Name:** `X-Wing | Flight Data - Daily Refresh`

**Configuration:**
1. Input: Raw Upload - Flight Data Report
2. Transform: Apply Flight Data ETL logic
3. Output: X-Wing | Flight Data (`7b8e4bc4-96ae-4a08-9dbb-4c3521deaff7`)

**Scheduling:**
```
Trigger Type: Scheduled
Schedule Type: Daily
Time: 11:00 PM CST (after day's operations)
Timezone: America/Chicago
Enabled: Yes
```

---

### Step 4: Create DataFlow for Weekly Updates

**DataFlow Name:** `X-Wing | Fleet & Maintenance - Weekly Refresh`

**Configuration:**
1. This single DataFlow can update multiple datasets
2. Inputs:
   - Raw Upload - Fleet Asset Report
   - Raw Upload - Aircraft Due Lists
   - Raw Upload - Avionics Equipment Tracker
3. Outputs:
   - X-Wing | Fleet Master
   - X-Wing | Due Lists
   - X-Wing | Avionics Equipment

**Scheduling:**
```
Trigger Type: Scheduled
Schedule Type: Weekly
Day: Monday
Time: 6:00 AM CST
Timezone: America/Chicago
Enabled: Yes
```

---

### Step 5: Create DataFlow for Monthly Updates

**DataFlow Name:** `X-Wing | Airport Locations - Monthly Refresh`

**Configuration:**
1. Input: Raw Upload - Airport Detailed Activity Report
2. Output: X-Wing | Airport Locations (`d6115040-3383-47dc-b592-cc0db27a8aad`)

**Scheduling:**
```
Trigger Type: Scheduled
Schedule Type: Monthly
Day: 1st of month
Time: 6:00 AM CST
Timezone: America/Chicago
Enabled: Yes
```

---

## Alternative: 135 ACM API Integration

If 135 ACM provides an API (when available):

### Option 1: Direct API Connector

**Setup:**
1. Navigate to Data Center → Connectors
2. Search for REST API or Custom Connector
3. Configure API connection:
   ```
   API Base URL: https://135acm.example.com/api
   Authentication: API Key or OAuth
   Endpoints:
     - /aircraft/times
     - /aircraft/due-lists
     - /routes/daily
     - /flights
   ```
4. Set up scheduled runs (same schedule as above)

### Option 2: Code Engine Script

**Script:** `fetch-135acm-data.py`

```python
import requests
import pandas as pd
from domo import Domo

# Initialize Domo client
domo = Domo(client_id='YOUR_CLIENT_ID', client_secret='YOUR_CLIENT_SECRET')

# Fetch data from 135 ACM API
def fetch_aircraft_times():
    response = requests.get(
        'https://135acm.example.com/api/aircraft/times',
        headers={'Authorization': 'Bearer API_KEY'}
    )
    data = response.json()

    # Transform to Domo schema
    df = pd.DataFrame(data)
    df['snapshot_date'] = pd.to_datetime('today').date()
    df['snapshot_time'] = pd.to_datetime('now')

    # Upload to Domo
    dataset_id = '8fad7ef4-5f34-402f-b86b-1b0d62df4976'
    domo.datasets.data_import(dataset_id, df, 'APPEND')

    print(f"✅ Uploaded {len(df)} aircraft times records")

if __name__ == '__main__':
    fetch_aircraft_times()
```

**Schedule in Domo Code Engine:**
```
Frequency: 2x Daily
Times: 7:00 AM, 7:00 PM CST
Timezone: America/Chicago
```

---

## Manual Refresh via App

Users can trigger manual refreshes from the dashboard:

**Implementation in app.js:**

```javascript
/**
 * Manually refresh all data
 */
async function refreshData() {
  try {
    // Show loading indicator
    showLoadingIndicator();

    // Trigger DataFlow runs via Domo API
    await triggerDataFlowRun('aircraft-times-refresh');
    await triggerDataFlowRun('due-lists-refresh');

    // Reload app data
    await loadAllData();

    // Hide loading indicator
    hideLoadingIndicator();

    alert('Data refreshed successfully!');

  } catch (error) {
    console.error('Refresh error:', error);
    alert('Failed to refresh data. Please try again.');
  }
}

/**
 * Trigger a DataFlow run via Domo API
 */
async function triggerDataFlowRun(dataFlowId) {
  // This requires Domo API credentials
  // Implementation depends on Domo API access
  console.log(`Triggering DataFlow: ${dataFlowId}`);

  // Placeholder - actual implementation when API access is available
  return new Promise(resolve => setTimeout(resolve, 1000));
}
```

---

## Monitoring & Alerts

### DataFlow Monitoring Dashboard

Create a Domo Card to monitor DataFlow runs:

**Card Name:** "X-Wing DataFlow Health Monitor"

**Metrics:**
- Last successful run time
- Failure count (last 7 days)
- Average run duration
- Records processed

**Alerts:**
- Email alert on any failure
- Slack notification (optional)
- Dashboard notification badge

### Alert Recipients

| DataFlow | Primary | Secondary |
|----------|---------|-----------|
| Aircraft Times | Maintenance Lead | Operations Team |
| Due Lists | Maintenance Lead | Maintenance Team |
| Fleet Master | Program Manager | Maintenance Lead |
| All Others | Maintenance Lead | - |

---

## Data Freshness Indicators

**Add to app.html:**

```html
<div class="data-freshness">
  <div class="freshness-item">
    <span class="freshness-label">Aircraft Times:</span>
    <span class="freshness-value" id="times-freshness">2 hours ago</span>
  </div>
  <div class="freshness-item">
    <span class="freshness-label">Due Lists:</span>
    <span class="freshness-value" id="due-lists-freshness">3 days ago</span>
  </div>
</div>
```

**Add to app.js:**

```javascript
/**
 * Update data freshness indicators
 */
function updateDataFreshness() {
  // Get last updated timestamp from datasets
  const timesLastUpdated = getLastUpdatedTimestamp(DATASETS.AIRCRAFT_TIMES);
  const dueListsLastUpdated = getLastUpdatedTimestamp(DATASETS.DUE_LISTS);

  // Calculate time since last update
  const timesFreshness = calculateTimeSince(timesLastUpdated);
  const dueListsFreshness = calculateTimeSince(dueListsLastUpdated);

  // Update UI
  document.getElementById('times-freshness').textContent = timesFreshness;
  document.getElementById('due-lists-freshness').textContent = dueListsFreshness;

  // Color code based on age
  applyFreshnessColors();
}

function calculateTimeSince(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}
```

---

## Testing the Setup

### Pre-Production Testing:

1. **Test Each DataFlow:**
   - Run manually first
   - Verify output data quality
   - Check error handling
   - Validate schedule triggers

2. **Test Schedule:**
   - Set up test runs for tomorrow
   - Monitor completion
   - Verify alerts work

3. **Test API Integration (when available):**
   - Verify API credentials
   - Test API endpoints
   - Check rate limits
   - Validate data schema

4. **Test App Refresh:**
   - Click manual refresh button
   - Verify data updates in UI
   - Check loading indicators

### Production Monitoring (First Week):

- Day 1: Monitor all scheduled runs
- Day 2-3: Verify data accuracy
- Day 4-5: Check for any gaps or errors
- Day 6-7: Fine-tune schedules if needed

---

## Troubleshooting

### Common Issues:

**Issue:** DataFlow fails to run
**Solution:**
- Check input dataset has data
- Verify API credentials (if applicable)
- Check Domo service status
- Review error logs

**Issue:** Data not updating in app
**Solution:**
- Clear browser cache
- Check dataset last updated time
- Verify DataFlow completed successfully
- Reload app

**Issue:** Schedule not triggering
**Solution:**
- Verify schedule is enabled
- Check timezone settings
- Ensure DataFlow is published (not draft)
- Contact Domo support if persistent

---

## Implementation Checklist

When ready to activate automated refreshes:

- [ ] Create all DataFlows (see Step 1-5)
- [ ] Configure schedules (cron expressions)
- [ ] Set up error alerts
- [ ] Add alert recipients
- [ ] Create monitoring dashboard
- [ ] Test each DataFlow manually
- [ ] Verify schedule triggers
- [ ] Document any custom configurations
- [ ] Train team on monitoring
- [ ] Enable automated runs in production

---

## Maintenance

### Weekly Tasks:
- Review DataFlow run history
- Check for any failures
- Validate data quality

### Monthly Tasks:
- Review schedule effectiveness
- Adjust times if needed
- Update documentation

### Quarterly Tasks:
- Review API usage (if applicable)
- Optimize DataFlow performance
- Update alert contacts

---

## Additional Resources

**Domo Documentation:**
- [DataFlows Guide](https://domohelp.domo.com/hc/en-us/articles/360043931814)
- [Scheduling DataFlows](https://domohelp.domo.com/hc/en-us/articles/360042934434)
- [Alerts & Notifications](https://domohelp.domo.com/hc/en-us/articles/360043428933)

---

**Last Updated:** September 25, 2026
**Author:** Claude Code
**Status:** Ready for Implementation (pending 135 ACM integration)
