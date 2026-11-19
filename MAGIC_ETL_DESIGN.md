# Magic ETL Flow Design - X-Wing Maintenance Dashboard

## Overview

This document outlines the Magic ETL flow infrastructure for transforming 135 ACM data into the X-Wing Maintenance Dashboard datasets. These flows will be implemented once the 135 ACM API/integration is provided.

---

## Data Flow Architecture

```
135 ACM (Source)
      ↓
File Upload / API Integration
      ↓
Upload Validation Layer
      ↓
Magic ETL Flows (9 flows)
      ↓
Domo Datasets (10 datasets)
      ↓
X-Wing Dashboard (Custom App)
```

---

## ETL Flow Inventory

### 1. Fleet Master ETL Flow

**Purpose:** Transform Fleet Asset Report into Fleet Master dataset

**Input Source:**
- Dataset: Raw Upload - Fleet Asset Report
- Format: Excel/CSV
- Update Frequency: Weekly (or on-demand upload)

**Transformations:**
1. **Column Mapping:**
   - Map 135 ACM columns to standard schema
   - tail_number, serial_number, model, status, engine_sn
   - total_time, total_landings, total_cycles

2. **Data Validation:**
   - Verify tail numbers match FAA format (N####X)
   - Ensure serial numbers are unique
   - Validate numeric fields (times, cycles, landings)

3. **Data Enrichment:**
   - Add last_updated timestamp
   - Add upload_source filename reference
   - Calculate aircraft age from serial number

4. **Data Quality Checks:**
   - Flag aircraft with missing critical data
   - Identify duplicates
   - Check for invalid status codes

**Output:** X-Wing | Fleet Master dataset

---

### 2. Aircraft Times ETL Flow

**Purpose:** Create time-series snapshots of aircraft times (2x daily refresh)

**Input Source:**
- Dataset: Raw Upload - Aircraft MX Times Report
- Format: Excel/CSV
- Update Frequency: 2x daily (7am, 7pm)

**Transformations:**
1. **Snapshot Creation:**
   - Create snapshot_date and snapshot_time fields
   - Preserve historical data (append-only)

2. **Column Mapping:**
   - Map times, cycles, landings fields
   - Calculate hobbs_time if available

3. **Deduplication:**
   - Check for duplicate entries on same day
   - Keep most recent entry per aircraft per day

4. **Validation:**
   - Ensure times are monotonically increasing
   - Flag anomalies (e.g., negative deltas)
   - Alert if times decrease

**Output:** X-Wing | Aircraft Times dataset

---

### 3. Daily Routes ETL Flow

**Purpose:** Transform Daily Route Sheet into route assignments

**Input Source:**
- Dataset: Raw Upload - Daily Route Sheet
- Format: Excel/CSV
- Update Frequency: Daily

**Transformations:**
1. **Route Parsing:**
   - Extract route_id, flight_date, tail_number
   - Parse PIC name
   - Extract airport codes (departure/arrival)

2. **Airport Validation:**
   - Lookup airports in Airport Locations dataset
   - Flag unknown airports for manual review

3. **Schedule Extraction:**
   - Parse scheduled times
   - Handle multi-leg routes (leg_sequence)

4. **Data Quality:**
   - Verify all required fields present
   - Check for conflicting assignments (same aircraft, multiple routes)

**Output:** X-Wing | Daily Routes dataset

---

### 4. Due Lists ETL Flow

**Purpose:** Transform Aircraft Due Lists into maintenance tracking data

**Input Source:**
- Dataset: Raw Upload - Aircraft Due Lists (per tail)
- Format: Excel/CSV
- Update Frequency: Weekly or on-demand

**Transformations:**
1. **Due Item Extraction:**
   - Parse task descriptions
   - Extract ATA chapter codes
   - Identify compliance basis (Hours/Cycles/Calendar/Landings)

2. **Life Calculations:**
   - Calculate remaining_life from current times
   - Compute forecast_due_date
   - Determine status (Overdue/Grounded/In Margin/Approaching/OK)

3. **Status Logic:**
   ```
   Overdue: remaining_life < 0
   Grounded: remaining_life < -10 (critical)
   In Margin: 0 <= remaining_life < 10
   Approaching: 10 <= remaining_life < 50
   OK: remaining_life >= 50
   ```

4. **Deduplication:**
   - Remove duplicate due items
   - Keep most recent version

5. **Validation:**
   - Verify tail numbers exist in Fleet Master
   - Check for valid ATA chapters
   - Flag items with missing critical data

**Output:** X-Wing | Due Lists dataset

---

### 5. Airport Locations ETL Flow

**Purpose:** Build and maintain airport master data

**Input Source:**
- Dataset: Raw Upload - Airport Detailed Activity Report
- Format: Excel/CSV
- Update Frequency: Monthly or as needed

**Transformations:**
1. **Column Mapping:**
   - Extract airport_code, airport_name, city, state, country
   - Standardize formats

2. **Validation:**
   - Verify ICAO/IATA codes
   - Check for duplicates

3. **Active Status:**
   - Mark airports as active based on recent usage

**Output:** X-Wing | Airport Locations dataset

---

### 6. Avionics Equipment ETL Flow

**Purpose:** Track avionics equipment by aircraft

**Input Source:**
- Dataset: Raw Upload - Aircraft Avionics Equipment Tracker
- Format: Excel/CSV
- Update Frequency: Monthly

**Transformations:**
1. **Equipment Parsing:**
   - Extract equipment_type, serial_number, manufacturer, model
   - Parse install dates and inspection dates

2. **Validation:**
   - Verify tail numbers
   - Check for duplicate serial numbers
   - Validate date formats

3. **Inspection Tracking:**
   - Calculate next_inspection_date if not provided
   - Flag overdue inspections

**Output:** X-Wing | Avionics Equipment dataset

---

### 7. Flight Data ETL Flow

**Purpose:** Build flight history database

**Input Source:**
- Dataset: Raw Upload - Flight Data Report
- Format: Excel/CSV
- Update Frequency: Weekly

**Transformations:**
1. **Flight Parsing:**
   - Extract flight_id, tail_number, flight_date
   - Parse departure/arrival airports
   - Extract cargo type, flight time, fuel burn

2. **Validation:**
   - Check for duplicate flights
   - Verify airports exist
   - Validate numeric fields

3. **Enrichment:**
   - Calculate flight efficiency metrics
   - Link to route data if available

**Output:** X-Wing | Flight Data dataset

---

### 8. Aircraft Status History ETL Flow

**Purpose:** Maintain 3-year searchable status history

**Input Source:**
- Multiple sources:
  - Manual status entries (Quick Add form)
  - Auto-generated from due items
  - Imported from 135 ACM status logs

**Transformations:**
1. **History Entry Creation:**
   - Generate unique history_id
   - Capture status_date, status, discrepancy
   - Track entered_by user

2. **Resolution Tracking:**
   - Link to work orders when resolved
   - Capture resolution_date and notes

3. **Retention:**
   - Maintain 3 years of history
   - Archive older entries

**Output:** X-Wing | Aircraft Status History dataset

---

### 9. Upload Audit Log ETL Flow

**Purpose:** Track all file uploads and approvals

**Input Source:**
- App-generated upload entries
- Manual review entries

**Transformations:**
1. **Audit Entry Creation:**
   - Capture upload_timestamp, report_type, filename
   - Record uploaded_by user
   - Store validation results

2. **Approval Tracking:**
   - Update approval_status (Pending/Imported/Rejected)
   - Record reviewed_by and approval decisions

3. **Metrics:**
   - Count row_count for each upload
   - Track approval times

**Output:** X-Wing | Upload Audit Log dataset

---

## Data Quality Framework

### Validation Rules by Dataset

**Fleet Master:**
- Tail number format: `^N\d{4}[A-Z]$`
- Serial number: Required, unique
- Total time: >= 0, <= 50000
- Total landings: >= 0, <= 100000

**Due Lists:**
- Remaining life: numeric
- Forecast due date: valid date, not in past
- Status: one of 5 allowed values

**Daily Routes:**
- Flight date: not in future
- Airport codes: exist in Airport Locations
- Tail number: exist in Fleet Master

### Error Handling

**Level 1 - Critical Errors (Block Import):**
- Missing required fields
- Invalid data types
- Duplicate primary keys
- Referential integrity violations

**Level 2 - Warnings (Import with Flag):**
- Data quality concerns
- Unusual values (outliers)
- Missing optional fields

**Level 3 - Info (Log Only):**
- Row counts
- Processing times
- Duplicate entries (kept most recent)

---

## Code Engine Integration

For complex transformations that exceed Magic ETL capabilities, use Code Engine:

### Use Cases for Code Engine:

1. **PDF Parsing:**
   - Extract data from PDF due lists
   - OCR for scanned documents
   - Complex table extraction

2. **Advanced Calculations:**
   - Forecast due dates with complex logic
   - Maintenance interval calculations
   - Cost analysis and projections

3. **External API Calls:**
   - 135 ACM API integration
   - FAA registry lookups
   - Weather data enrichment

### Suggested Code Engine Scripts:

**1. `parse-due-list-pdf.py`**
```python
# Parse PDF due lists into structured data
# Use PyPDF2 or pdfplumber
# Output: JSON for Magic ETL
```

**2. `calculate-forecast-dates.py`**
```python
# Calculate forecast due dates based on:
# - Current times/cycles
# - Historical utilization
# - Compliance basis
```

**3. `fetch-135acm-data.py`**
```python
# Fetch data from 135 ACM API (when available)
# Transform into standard schema
# Write to staging dataset
```

---

## Scheduling & Automation

### Automated Refresh Schedule:

**2x Daily (Aircraft Times):**
- 7:00 AM - Morning refresh
- 7:00 PM - Evening refresh
- Triggers: Scheduled DataFlow run

**Daily:**
- Daily Routes (8:00 AM)
- Flight Data (11:00 PM)

**Weekly:**
- Fleet Master (Monday 6:00 AM)
- Due Lists (Monday 6:00 AM)
- Avionics Equipment (Monday 6:00 AM)

**Monthly:**
- Airport Locations (1st of month, 6:00 AM)

**On-Demand:**
- Any upload via BULK IMPORT tab
- Manual refresh via app

### Trigger Configuration:

```
DataFlow: Aircraft Times Refresh
Trigger: Scheduled (Cron)
Schedule: 0 7,19 * * * (7am, 7pm daily)
Timezone: America/Chicago
On Failure: Alert <maintenance-lead-email>
```

---

## Implementation Checklist

When 135 ACM integration is ready:

- [ ] Obtain sample 135 ACM files for all report types
- [ ] Create Magic ETL flows (9 flows)
- [ ] Test with sample data
- [ ] Validate all transformations
- [ ] Set up scheduling
- [ ] Configure error alerts
- [ ] Create Code Engine scripts (if needed)
- [ ] Document 135 ACM API endpoints
- [ ] Set up API authentication
- [ ] Test end-to-end data flow
- [ ] Train users on upload process
- [ ] Monitor initial production runs

---

## Appendix: 135 ACM Report Types

**Expected Reports from 135 ACM:**

1. Fleet Asset Report
2. Aircraft Due Lists (per tail)
3. Daily Route Sheet
4. Aircraft MX Times Report
5. Flight Data Report
6. Airport Detailed Activity Report
7. Aircraft Avionics Equipment Tracker

**Format:** Excel (.xlsx), CSV (.csv), or PDF
**Delivery:** Manual upload or API (TBD)

---

## Notes

- This design is ready to implement once 135 ACM integration details are provided
- Magic ETL flows can be built in Domo's visual interface
- Code Engine scripts will handle complex parsing/transformations
- All flows include data quality checks and error handling
- Scheduling ensures data freshness without manual intervention

**Last Updated:** September 25, 2026
