// Get ?asof= parameter for deterministic TODAY()
// Uses UTC parsing to maintain backward compatibility with dashboard bucket calculations
function getTodayDate() {
  const params = new URLSearchParams(window.location.search);
  const asofParam = params.get('asof');
  if (asofParam) {
    const date = new Date(asofParam);
    if (!isNaN(date.getTime())) {
      console.log(`📅 Using ?asof=${asofParam} for TODAY()`);
      return date;
    }
  }
  return new Date();
}

// Get ?asof= parameter parsed at local midnight for display calculations
// This ensures "2026-10-18" means Oct 18 midnight local time, not UTC
function getTodayDateLocal() {
  const params = new URLSearchParams(window.location.search);
  const asofParam = params.get('asof');
  if (asofParam) {
    const parts = asofParam.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // 0-indexed
      const day = parseInt(parts[2]);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  return new Date();
}

/**
 * Parse and validate dates, returning null for invalid/out-of-range dates
 * Handles: ISO strings, Excel serials, M/D/YYYY, "YYYY-MM-DD(YYYY)"
 * Returns null for dates before 2000 or after 2100
 */
function parseDate(value) {
  if (!value) return null;

  let str = String(value).trim();
  if (!str) return null;

  // Handle "YYYY-MM-DD(YYYY)" format - take part before parenthesis
  if (str.includes('(')) {
    str = str.split('(')[0].trim();
  }

  let date = null;

  // Try Excel serial number (5-digit number like 45124)
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    // Excel serial: days since 1900-01-01 (with 1900 leap year bug)
    const excelEpoch = new Date(1899, 11, 30); // Excel's epoch
    date = new Date(excelEpoch.getTime() + serial * 86400000);
  }
  // Try M/D/YYYY format
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    date = new Date(year, month - 1, day);
  }
  // Try ISO string or other Date-parseable format
  else {
    date = new Date(str);
  }

  // Validate date
  if (!date || isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  if (year < 2000 || year > 2100) return null;

  return date;
}

/**
 * Format date for display, showing "N/A" for invalid dates
 */
function formatDate(value) {
  const date = parseDate(value);
  if (!date) return 'N/A';

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Normalize tail number: UPPER(TRIM), prefix "N" if missing
 */
function normalizeTail(t) {
  if (!t) return '';
  let tail = String(t).trim().toUpperCase();
  if (tail && !tail.startsWith('N') && tail.length <= 6 && /^[0-9A-Z]+$/.test(tail)) {
    tail = 'N' + tail;
  }
  return tail;
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Show inline message (replaces alert/confirm popups)
 * @param {string} message - The message text
 * @param {string} type - 'success', 'warning', 'error', or 'info'
 * @param {number} duration - Duration in ms (default 4000)
 */
function showMessage(message, type = 'info', duration = 4000) {
  const container = document.getElementById('global-message');
  if (!container) return;

  const colors = {
    success: { bg: 'rgba(16, 185, 129, 0.95)', border: '#10b981' },
    warning: { bg: 'rgba(245, 158, 11, 0.95)', border: '#f59e0b' },
    error: { bg: 'rgba(239, 68, 68, 0.95)', border: '#ef4444' },
    info: { bg: 'rgba(59, 130, 246, 0.95)', border: '#3b82f6' }
  };

  const color = colors[type] || colors.info;

  const messageEl = document.createElement('div');
  messageEl.style.cssText = `
    padding: 1rem 1.5rem;
    margin-bottom: 0.5rem;
    background: ${color.bg};
    border-left: 4px solid ${color.border};
    border-radius: 6px;
    color: white;
    font-size: 0.95rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
  `;
  messageEl.textContent = message;

  container.appendChild(messageEl);

  setTimeout(() => {
    messageEl.style.opacity = '0';
    messageEl.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => messageEl.remove(), 300);
  }, duration);
}

/**
 * Show confirmation message (replaces confirm())
 * @param {string} message - The confirmation question
 * @param {Function} onConfirm - Callback if confirmed
 * @param {Function} onCancel - Callback if cancelled (optional)
 */
function showConfirm(message, onConfirm, onCancel = null) {
  const container = document.getElementById('global-message');
  if (!container) {
    // Fallback to native confirm if container not found
    if (confirm(message)) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
    return;
  }

  const messageEl = document.createElement('div');
  messageEl.style.cssText = `
    padding: 1rem 1.5rem;
    margin-bottom: 0.5rem;
    background: rgba(59, 130, 246, 0.95);
    border-left: 4px solid #3b82f6;
    border-radius: 6px;
    color: white;
    font-size: 0.95rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
  `;

  messageEl.innerHTML = `
    <div style="margin-bottom: 0.75rem;">${escapeHtml(message)}</div>
    <div style="display: flex; gap: 0.5rem;">
      <button id="confirm-yes" style="padding: 0.4rem 1rem; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">Confirm</button>
      <button id="confirm-no" style="padding: 0.4rem 1rem; background: #64748b; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">Cancel</button>
    </div>
  `;

  container.appendChild(messageEl);

  const yesBtn = messageEl.querySelector('#confirm-yes');
  const noBtn = messageEl.querySelector('#confirm-no');

  yesBtn.addEventListener('click', () => {
    messageEl.remove();
    onConfirm();
  });

  noBtn.addEventListener('click', () => {
    messageEl.remove();
    if (onCancel) onCancel();
  });
}

// Global state
const AppState = {
  // MAINT Terminal data
  fleetData: [],
  fleetAssetImport: [],
  aircraftTimes: [],
  dailyRoutes: [],
  dueLists: [],
  routeSwaps: [],
  aircraftUtilization: [],
  forecastSettings: [],
  airportLocations: [],
  avionicsEquipment: [],
  flightData: [],
  statusHistory: [],
  uploadAuditLog: [],
  workOrders: [],
  // OPS Terminal data
  capexTransactions: [],
  budgetAllocations: [],
  financialMetrics: [],
  fleetProjections: [],
  routePerformance: [],
  engineInventory: [],
  engineHistory: [],
  propellerInventory: [],
  propellerHistory: [],
  // App state
  currentView: 'maint', // 'ops' or 'maint'
  currentTab: 'maint-dashboard',
  userRole: null, // Will be set from Domo user context
  userEmail: null,
  userName: null,
  dataAsOfDate: null, // Data freshness timestamp
  today: getTodayDate() // Deterministic TODAY() from ?asof or current date
};

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text safe for innerHTML
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * Calculate dashboard counts from real data
 * Uses getTodayDate() for ?asof support and Interval-Type rules for due buckets
 * Targets at asof=2026-10-18: Available=12, Standby=2, InWork=8, MEL=1, Customer=3, ActiveSwaps=1, Overdue=138, Due30=63±1, Due31-60=67±1, Due61-90=59
 * @returns {Object} Dashboard metrics
 */
function calculateDashboardCounts() {
  const today = getTodayDate();

  if (!AppState.fleetData || !AppState.statusHistory || !AppState.dueLists) {
    console.warn('calculateDashboardCounts: data not ready');
    return {
      availableOnRoute: 0, standby: 0, inWork: 0, mel: 0,
      customer: 0, activeRouteSwaps: 0, overdue: 0, due30: 0, due3160: 0, due6190: 0
    };
  }

  // Process all status_history rows (do NOT filter by date)
  const statusRows = [];
  AppState.statusHistory.forEach(entry => {
    const tail = normalizeTail(entry.asset || entry.tail_number);
    if (!tail || tail === 'N863MA') return;

    statusRows.push({
      tail,
      estRtsRaw: (entry.est_rts_raw || '').trim(),
      location: (entry.location || '').trim(),
      issue: (entry.issue || '').trim(),
      notes: (entry.notes || '').trim(),
      workStage: (entry.work_stage || '').trim()
    });
  });

  // 1. STANDBY (2): issue=="STBY" and work_stage=="IN PROGRESS" (case insensitive)
  const standbySet = new Set();
  statusRows.forEach(row => {
    if (row.issue === 'STBY' && row.workStage.toUpperCase() === 'IN PROGRESS') {
      standbySet.add(row.tail);
    }
  });

  // 2. IN WORK (8): work_stage=="IN PROGRESS", est_rts_raw not "STBY"/"UP", issue!="STBY", and issue does NOT match MEL/ABI2
  // Include N9469B even though not a fleet card
  const inWorkSet = new Set();
  statusRows.forEach(row => {
    if (row.workStage.toUpperCase() === 'IN PROGRESS' &&
        row.estRtsRaw !== 'STBY' && row.estRtsRaw !== 'UP' &&
        row.issue !== 'STBY' &&
        !/(?:^|[^A-Z])(?:MEL|ABI2)(?:[^A-Z]|$)/i.test(row.issue)) {
      inWorkSet.add(row.tail);
    }
  });

  // 3. MEL (1): ISSUE matches /(^|[^A-Z])MEL([^A-Z]|$)/i and WORK STAGE not COMPLETE/CANCELLED
  const melSet = new Set();
  statusRows.forEach(row => {
    if (/(?:^|[^A-Z])MEL(?:[^A-Z]|$)/i.test(row.issue) &&
        !/^(COMPLETE|CANCELLED)$/i.test(row.workStage)) {
      melSet.add(row.tail);
    }
  });

  // 4. ACTIVE ROUTE SWAPS (1): "Swap Status" matches /^(Planned|Active)$/i, neither aircraft is N863MA
  let activeRouteSwaps = 0;
  if (AppState.routeSwaps && Array.isArray(AppState.routeSwaps)) {
    activeRouteSwaps = AppState.routeSwaps.filter(swap => {
      const swapStatus = swap['Swap Status'] || '';
      const scheduled = normalizeTail(swap['Scheduled Aircraft']);
      const replacement = normalizeTail(swap['Replacement Aircraft']);
      return /^(Planned|Active)$/i.test(swapStatus) &&
             scheduled !== 'N863MA' && replacement !== 'N863MA';
    }).length;
  }

  // 5. CUSTOMER (3): fleet_master Fleet Status "Customer Aircraft", excluding N863MA
  const customerSet = new Set();
  AppState.fleetData.forEach(ac => {
    const tail = normalizeTail(ac.tail_number || ac.Aircraft);
    if (tail === 'N863MA') return;
    const fleetStatus = (ac.status || ac['Fleet Status'] || '').trim();
    if (fleetStatus === 'Customer Aircraft') {
      customerSet.add(tail);
    }
  });

  // Helper: check if tail is in standby (any status row where ISSUE+" "+NOTES contains "STBY" and WORK STAGE not COMPLETE/COMPLETED/CANCELED/CANCELLED)
  const isInStandby = (tail) => {
    return statusRows.some(row => {
      if (row.tail !== tail) return false;
      const combined = (row.issue + ' ' + row.notes).toUpperCase();
      return combined.includes('STBY') && !/^(COMPLETE|COMPLETED|CANCELED|CANCELLED)$/i.test(row.workStage);
    });
  };

  // Helper: in-work list that counts only tails whose Fleet Status is Active/In Work/Review/Customer Aircraft
  const inWorkList = new Set();
  AppState.fleetData.forEach(ac => {
    const tail = normalizeTail(ac.tail_number || ac.Aircraft);
    if (tail === 'N863MA') return;
    const fleetStatus = (ac.status || ac['Fleet Status'] || '').trim();
    if (/^(Active|In Work|Review|Customer Aircraft)$/i.test(fleetStatus)) {
      if (inWorkSet.has(tail)) {
        inWorkList.add(tail);
      }
    }
  });

  // 6. AVAILABLE ON ROUTE (12): (Fleet Status=="Active" OR has open MEL) AND not in standby set AND not in in-work list
  const availableSet = new Set();
  AppState.fleetData.forEach(ac => {
    const tail = normalizeTail(ac.tail_number || ac.Aircraft);
    if (tail === 'N863MA') return;
    const fleetStatus = (ac.status || ac['Fleet Status'] || '').trim();

    const isActive = fleetStatus === 'Active';
    const hasOpenMEL = melSet.has(tail);

    if ((isActive || hasOpenMEL) && !isInStandby(tail) && !inWorkList.has(tail)) {
      availableSet.add(tail);
    }
  });

  // 7. Due buckets: exclude N1037N, N208N, N9469B, N863MA
  const dueExcluded = ['N1037N', 'N208N', 'N9469B', 'N863MA'];
  let overdue = 0, due30 = 0, due3160 = 0, due6190 = 0;
  const boundaryItems = []; // Track boundary items (29-31 days)
  const skippedCalendarItems = []; // Track calendar items skipped due to missing original forecast_due

  // Get asof local midnight
  const asofLocalMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  AppState.dueLists.forEach(item => {
    const tail = normalizeTail(item.tail_number || item.Aircraft);
    if (dueExcluded.includes(tail)) return;

    const intervalType = (item.interval_type || item['Interval Type'] || '').toLowerCase();
    const isOp = /hours?|hrs?|cycles?|cyc|landings?|ldg/i.test(intervalType);

    let metric = null;
    if (isOp) {
      // Operational items: use Projected Days as-is
      const projDays = parseFloat(item.projected_days || item['Projected Days']);
      if (!isNaN(projDays)) metric = projDays;
    } else {
      // Calendar items: only count if original Forecast Due column had a value
      // This matches the workbook's logic: items without original Forecast Due are skipped
      if (!item.forecast_due_original_present) {
        // Track this skip with what bucket it would have fallen into
        const forecastDue = item.forecast_due_date || item['Forecast Due'];
        let wouldBeBucket = 'N/A';
        if (forecastDue) {
          const dueDate = new Date(forecastDue);
          if (!isNaN(dueDate.getTime()) && dueDate >= new Date('2000-01-01')) {
            const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
            const dueTimestamp = dueMidnight.getTime();
            const asofTimestamp = asofLocalMidnight.getTime();
            const days = (dueTimestamp - asofTimestamp) / 86400000;
            if (days < 0) wouldBeBucket = 'Overdue';
            else if (days <= 30) wouldBeBucket = '<=30d';
            else if (days <= 60) wouldBeBucket = '31-60d';
            else if (days <= 90) wouldBeBucket = '61-90d';
            else wouldBeBucket = '>90d';
          }
        }
        skippedCalendarItems.push({
          tail,
          task: (item.task_description || item['Task / Inspection'] || '').substring(0, 50),
          due_at: item.due_date || item.due_at_with_cycles || 'N/A',
          would_be_bucket: wouldBeBucket
        });
        return; // Skip calendar items without original forecast_due
      }

      // Calendar items: fractional days (dueTimestamp - asofLocalMidnight) / 86400000
      const forecastDue = item.forecast_due_date || item['Forecast Due'];
      if (forecastDue) {
        const dueDate = new Date(forecastDue);
        if (!isNaN(dueDate.getTime()) && dueDate >= new Date('2000-01-01')) {
          // Use local midnight for due date too
          const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
          const dueTimestamp = dueMidnight.getTime();
          const asofTimestamp = asofLocalMidnight.getTime();
          metric = (dueTimestamp - asofTimestamp) / 86400000;
        }
      }
    }

    if (metric === null) return;

    // Track boundary items for verification
    if (metric >= 29.9 && metric <= 30.1) {
      boundaryItems.push({
        tail,
        task: (item.task_description || item['Task / Inspection'] || item.Task || '').substring(0, 50),
        days: metric.toFixed(4),
        intervalType,
        bucket: metric < 0 ? 'Overdue' : (metric <= 30 ? '<=30d' : (metric <= 60 ? '31-60d' : '61-90d'))
      });
    }

    // Bucket assignment: <0, 0<=x<=30, 30<x<=60, 60<x<=90
    if (metric < 0) overdue++;
    else if (metric <= 30) due30++;
    else if (metric <= 60) due3160++;
    else if (metric <= 90) due6190++;
  });

  // Show boundary items (29-31 days)
  if (boundaryItems.length > 0) {
    console.log('\n📌 Boundary items (days 29-31):');
    console.table(boundaryItems);
  }

  // Show skipped calendar items (missing original forecast_due)
  if (skippedCalendarItems.length > 0) {
    console.log(`\n⚠️ Skipped ${skippedCalendarItems.length} calendar items (no original Forecast Due):`);
    console.table(skippedCalendarItems);

    // Count by bucket
    const bucketCounts = {};
    skippedCalendarItems.forEach(item => {
      bucketCounts[item.would_be_bucket] = (bucketCounts[item.would_be_bucket] || 0) + 1;
    });
    console.log('📊 Skipped items by bucket:', bucketCounts);
  }

  // Console table with tails
  console.log('\n📊 Dashboard Counts:');
  console.table([
    { Metric: 'Standby', Target: 2, Actual: standbySet.size, Tails: Array.from(standbySet).join(', ') },
    { Metric: 'In Work', Target: 8, Actual: inWorkSet.size, Tails: Array.from(inWorkSet).join(', ') },
    { Metric: 'MEL', Target: 1, Actual: melSet.size, Tails: Array.from(melSet).join(', ') },
    { Metric: 'Active Route Swaps', Target: 1, Actual: activeRouteSwaps, Tails: '-' },
    { Metric: 'Customer', Target: 3, Actual: customerSet.size, Tails: Array.from(customerSet).join(', ') },
    { Metric: 'Available on Route', Target: 12, Actual: availableSet.size, Tails: Array.from(availableSet).join(', ') },
    { Metric: 'Overdue', Target: 138, Actual: overdue, Tails: '-' },
    { Metric: 'Due ≤30d', Target: 63, Actual: due30, Tails: '-' },
    { Metric: 'Due 31-60d', Target: 67, Actual: due3160, Tails: '-' },
    { Metric: 'Due 61-90d', Target: 59, Actual: due6190, Tails: '-' }
  ]);

  return {
    availableOnRoute: availableSet.size,
    standby: standbySet.size,
    inWork: inWorkSet.size,
    mel: melSet.size,
    customer: customerSet.size,
    activeRouteSwaps: activeRouteSwaps,
    overdue: overdue,
    due30: due30,
    due3160: due3160,
    due6190: due6190
  };
}

/**
 * Update dashboard display with calculated counts
 */
function updateDashboardDisplay() {
  const counts = calculateDashboardCounts();

  // Update the 10 stat cards
  document.getElementById('stat-available').textContent = counts.availableOnRoute;
  document.getElementById('stat-standby').textContent = counts.standby;
  document.getElementById('stat-inwork').textContent = counts.inWork;
  document.getElementById('stat-swaps').textContent = counts.activeRouteSwaps;
  document.getElementById('stat-customer').textContent = counts.customer;
  document.getElementById('stat-mel').textContent = counts.mel;
  document.getElementById('stat-overdue').textContent = counts.overdue;
  document.getElementById('stat-due30').textContent = counts.due30;
  document.getElementById('stat-due3160').textContent = counts.due3160;
  document.getElementById('stat-due6190').textContent = counts.due6190;

  console.log('Dashboard counts updated:', counts);
}

// Dataset aliases from manifest.json
const DATASETS = {
  // MAINT Terminal datasets
  FLEET_MASTER: 'fleet_master',
  FLEET_ASSET_IMPORT: 'fleet_asset_import',
  AIRCRAFT_TIMES: 'aircraft_times',
  DAILY_ROUTES: 'daily_routes',
  DUE_LISTS: 'due_lists',
  ROUTE_SWAPS: 'route_swaps',
  AIRCRAFT_UTILIZATION: 'aircraft_utilization',
  FORECAST_SETTINGS: 'forecast_settings',
  AIRPORT_LOCATIONS: 'airport_locations',
  AVIONICS_EQUIPMENT: 'avionics_equipment',
  FLIGHT_DATA: 'flight_data',
  AIRCRAFT_STATUS_HISTORY: 'aircraft_status_history',
  UPLOAD_AUDIT_LOG: 'upload_audit_log',
  WORK_ORDERS: 'work_orders',
  // OPS Terminal datasets
  CAPEX_TRANSACTIONS: 'capex_transactions',
  BUDGET_ALLOCATIONS: 'budget_allocations',
  FINANCIAL_METRICS: 'financial_metrics',
  FLEET_PROJECTIONS: 'fleet_projections',
  ROUTE_PERFORMANCE: 'route_performance',
  ENGINE_INVENTORY: 'engine_inventory',
  ENGINE_HISTORY: 'engine_history',
  PROPELLER_INVENTORY: 'propeller_inventory',
  PROPELLER_HISTORY: 'propeller_history'
};

/**
 * Initialize the application
 */
async function init() {
  console.log('X-Wing Maintenance Dashboard initializing...');

  // Initialize user context and permissions
  await initializeUserContext();

  // Set up event listeners
  setupEventListeners();

  // Discover dated snapshots and honor ?date= before the first load
  await SnapshotHistory.init();

  // Load all data
  await loadAllData();

  // Apply access control
  applyAccessControl();

  // Update data-as-of timestamp (no longer ticking)
  updateTimestamp();

  // Render quick add list from localStorage
  renderQuickAddList();
}

/**
 * Initialize user context from Domo
 */
async function initializeUserContext() {
  // Load role from localStorage (for demo)
  const savedRole = localStorage.getItem('xwing_demo_role') || 'administrator';
  AppState.userRole = savedRole;
  AppState.userEmail = null;
  AppState.userName = 'Demo user';

  // Set up role selector
  const roleSelector = document.getElementById('role-selector');
  if (roleSelector) {
    roleSelector.value = savedRole;
    roleSelector.addEventListener('change', (e) => {
      const newRole = e.target.value;
      localStorage.setItem('xwing_demo_role', newRole);
      AppState.userRole = newRole;
      applyAccessControl();
      console.log(`Role changed to: ${newRole}`);
    });
  }

  console.log('User context initialized:', {
    email: AppState.userEmail,
    name: AppState.userName,
    role: AppState.userRole
  });
}

/**
 * Get current demo role
 */
function getCurrentRole() {
  return AppState.userRole || 'administrator';
}

/**
 * Apply access control based on user role
 */
function applyAccessControl() {
  console.log('Applying access control for role:', AppState.userRole);

  // Apply PDP filtering to datasets
  applyPDPFiltering();

  // Show/hide UI elements based on role
  applyUIAccessControl();
}

/**
 * Apply PDP filtering to datasets
 */
function applyPDPFiltering() {
  // In a real Domo implementation, PDP would be configured at the dataset level
  // For now, we'll implement client-side filtering as a demonstration

  if (AppState.userRole === 'MAINTENANCE') {
    // Maintenance users see all aircraft and maintenance data
    // No filtering needed
    console.log('MAINTENANCE role: Full access to all maintenance data');

  } else if (AppState.userRole === 'MANAGEMENT') {
    // Management users see financial and operations data
    // They might have limited access to detailed maintenance info
    console.log('MANAGEMENT role: Access to operations and financial data');
  }
}

/**
 * Apply UI access control
 */
function applyUIAccessControl() {
  const role = getCurrentRole();

  // Hide OPS Dashboard, Fleet Planning, CapEx Detail for Editor and View Only
  const opsTab = document.querySelector('[data-tab="ops-dashboard"]');
  const fleetPlanningTab = document.querySelector('[data-tab="fleet-planning"]');
  const capexTab = document.querySelector('[data-tab="capex"]');

  if (role === 'editor' || role === 'view-only') {
    // Hide tabs
    if (opsTab) opsTab.style.display = 'none';
    if (fleetPlanningTab) fleetPlanningTab.style.display = 'none';
    if (capexTab) capexTab.style.display = 'none';

    // Hide OPS view toggle
    const opsViewBtn = document.getElementById('btn-view-ops');
    if (opsViewBtn) opsViewBtn.style.display = 'none';
  } else {
    // Show tabs for administrator
    if (opsTab) opsTab.style.display = '';
    if (fleetPlanningTab) fleetPlanningTab.style.display = '';
    if (capexTab) capexTab.style.display = '';

    const opsViewBtn = document.getElementById('btn-view-ops');
    if (opsViewBtn) opsViewBtn.style.display = '';
  }

  // View Only: disable Quick Add, Create Work Order, Accept/Reject buttons
  if (role === 'view-only') {
    // Quick Add button
    const quickAddBtn = document.getElementById('btn-quick-add');
    if (quickAddBtn) {
      quickAddBtn.disabled = true;
      quickAddBtn.title = 'View Only - editing disabled';
      quickAddBtn.style.opacity = '0.5';
      quickAddBtn.style.cursor = 'not-allowed';
    }

    // Approve/Reject buttons (bulk import)
    const approvalButtons = document.querySelectorAll('.btn-approve, .btn-reject');
    approvalButtons.forEach(btn => {
      btn.disabled = true;
      btn.title = 'View Only - editing disabled';
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    });

    // Accept/Reject buttons (MX Forecast)
    const forecastButtons = document.querySelectorAll('.btn-accept, .btn-reject');
    forecastButtons.forEach(btn => {
      if (!btn.hasAttribute('disabled')) { // Don't override already-disabled buttons
        btn.disabled = true;
        btn.title = 'View Only';
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      }
    });
  } else {
    // Enable buttons for administrator and editor
    const quickAddBtn = document.getElementById('btn-quick-add');
    if (quickAddBtn) {
      quickAddBtn.disabled = false;
      quickAddBtn.title = '';
      quickAddBtn.style.opacity = '1';
      quickAddBtn.style.cursor = 'pointer';
    }

    const approvalButtons = document.querySelectorAll('.btn-approve, .btn-reject');
    approvalButtons.forEach(btn => {
      btn.disabled = false;
      btn.title = '';
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    });

    // Accept/Reject buttons (MX Forecast)
    const forecastButtons = document.querySelectorAll('.btn-accept, .btn-reject');
    forecastButtons.forEach(btn => {
      if (!btn.hasAttribute('disabled') || btn.title === 'View Only') {
        btn.disabled = false;
        btn.title = '';
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    });
  }

  console.log(`UI access control applied for role: ${role}`);
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // View toggle buttons (OPS/MAINT)
  const viewToggleButtons = document.querySelectorAll('.view-toggle-btn');
  viewToggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  // Tab navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (!btn.disabled) {
        switchTab(btn.dataset.tab);
      }
    });
  });

  // Refresh button
  document.getElementById('btnRefresh')?.addEventListener('click', refreshData);

  // Quick Add Form
  document.getElementById('btn-quick-add')?.addEventListener('click', handleQuickAdd);

  // History Search
  document.getElementById('btn-history-search')?.addEventListener('click', handleHistorySearch);

  // Due Lists Filters
  document.getElementById('filter-tail')?.addEventListener('change', filterDueLists);
  document.getElementById('filter-status')?.addEventListener('change', filterDueLists);
  document.getElementById('filter-task')?.addEventListener('input', debounce(filterDueLists, 300));

  // File Upload
  const fileUploadArea = document.getElementById('file-upload-area');
  const fileInput = document.getElementById('file-upload');

  fileUploadArea?.addEventListener('click', () => fileInput.click());
  fileUploadArea?.addEventListener('dragover', handleDragOver);
  fileUploadArea?.addEventListener('drop', handleFileDrop);
  fileInput?.addEventListener('change', handleFileSelect);

  document.getElementById('report-type')?.addEventListener('change', validateUploadForm);
  document.getElementById('btn-upload')?.addEventListener('click', handleFileUpload);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Load all data from Domo datasets
 */
async function loadAllData() {
  console.log('Loading all datasets...');

  try {
    // Load data in parallel for better performance
    const [
      // MAINT Terminal datasets
      fleetData,
      fleetAssetImport,
      aircraftTimes,
      dailyRoutes,
      dueLists,
      routeSwaps,
      aircraftUtilization,
      forecastSettings,
      airportLocations,
      avionicsEquipment,
      flightData,
      statusHistory,
      uploadAuditLog,
      workOrders,
      // OPS Terminal datasets
      capexTransactions,
      budgetAllocations,
      financialMetrics,
      fleetProjections,
      routePerformance,
      engineInventory,
      engineHistory,
      propellerInventory,
      propellerHistory
    ] = await Promise.all([
      // MAINT Terminal datasets
      fetchDataset(DATASETS.FLEET_MASTER),
      fetchDataset(DATASETS.FLEET_ASSET_IMPORT),
      fetchDataset(DATASETS.AIRCRAFT_TIMES),
      fetchDataset(DATASETS.DAILY_ROUTES),
      fetchDataset(DATASETS.DUE_LISTS),
      fetchDataset(DATASETS.ROUTE_SWAPS),
      fetchDataset(DATASETS.AIRCRAFT_UTILIZATION),
      fetchDataset(DATASETS.FORECAST_SETTINGS),
      fetchDataset(DATASETS.AIRPORT_LOCATIONS),
      fetchDataset(DATASETS.AVIONICS_EQUIPMENT),
      fetchDataset(DATASETS.FLIGHT_DATA),
      fetchDataset(DATASETS.AIRCRAFT_STATUS_HISTORY),
      fetchDataset(DATASETS.UPLOAD_AUDIT_LOG),
      fetchDataset(DATASETS.WORK_ORDERS),
      // OPS Terminal datasets
      fetchDataset(DATASETS.CAPEX_TRANSACTIONS),
      fetchDataset(DATASETS.BUDGET_ALLOCATIONS),
      fetchDataset(DATASETS.FINANCIAL_METRICS),
      fetchDataset(DATASETS.FLEET_PROJECTIONS),
      fetchDataset(DATASETS.ROUTE_PERFORMANCE),
      fetchDataset(DATASETS.ENGINE_INVENTORY),
      fetchDataset(DATASETS.ENGINE_HISTORY),
      fetchDataset(DATASETS.PROPELLER_INVENTORY),
      fetchDataset(DATASETS.PROPELLER_HISTORY)
    ]);

    // Update global state - MAINT Terminal
    // Transform fleet data to normalize column names
    AppState.fleetData = fleetData.map(aircraft => ({
      tail_number: aircraft.Aircraft || aircraft.tail_number,
      serial_number: aircraft['Aircraft Serial Number'] || aircraft.serial_number,
      model: aircraft.Model || aircraft.model || 'Cessna 208B',
      status: aircraft['Fleet Status'] || aircraft.status,
      home_base: aircraft['Home Base'] || aircraft.home_base,
      current_location: aircraft['Current Location'] || aircraft.current_location,
      engine_sn: aircraft.engine_sn || aircraft['Engine S/N'],
      total_time: aircraft.total_time || aircraft['Total Time'],
      total_landings: aircraft.total_landings || aircraft['Total Landings'],
      total_cycles: aircraft.total_cycles || aircraft['Total Cycles'],
      year_manufactured: aircraft['Year of Manufacture'] || aircraft.year_manufactured,
      last_updated: aircraft.last_updated
    }));
    AppState.fleetAssetImport = fleetAssetImport;
    AppState.aircraftTimes = aircraftTimes;
    AppState.dailyRoutes = dailyRoutes;

    // Transform due lists to normalize column names
    AppState.dueLists = dueLists.map(item => {
      const remainingLife = item.remaining_value !== undefined ? item.remaining_value : (item.Remaining || item.remaining_life);
      const projectedDays = item['Projected Days'] || item.projected_days || remainingLife;

      // Calculate status based on remaining days
      let status = 'OK';
      if (projectedDays !== null && projectedDays !== undefined) {
        const days = parseFloat(projectedDays);
        if (!isNaN(days)) {
          if (days < 0) {
            status = 'Overdue';
          } else if (days <= 30) {
            status = 'Approaching';
          }
        }
      }

      return {
        tail_number: item.Aircraft || item.tail_number,
        task_description: item['Task / Inspection'] || item.task_description,
        ata_chapter: item.ATA || item.ata_chapter,
        compliance_basis: item.Basis || item.compliance_basis,
        remaining_life: remainingLife,
        forecast_due_date: item['Forecast Due'] || item.forecast_due_date || item.due_date,
        forecast_due_original_present: item.forecast_due_original_present !== undefined ? item.forecast_due_original_present : (item['Forecast Due'] ? true : false),
        last_completed_date: item['Last Completed'] || item.last_completed_date,
        part_serial: item['Part / Serial'] || item.part_serial,
        status: item.status || status,
        projected_days: projectedDays,
        interval_type: item['Interval Type'] || item.interval_type_raw || item.interval_type,
        notes: item.Notes || item.notes,
        upload_source: item.upload_source
      };
    });
    AppState.routeSwaps = routeSwaps;

    // Transform aircraft utilization to normalize column names
    AppState.aircraftUtilization = aircraftUtilization.map(item => ({
      AIRCRAFT: item.AIRCRAFT || item.aircraft || item.tail_number,
      FORECAST_HOURS: item['FORECAST HOURS'] || item.FORECAST_HOURS || item.forecast_hours,
      FORECAST_CYCLES: item['FORECAST CYCLES'] || item.FORECAST_CYCLES || item.forecast_cycles,
      FORECAST_LANDINGS: item['FORECAST LANDINGS'] || item.FORECAST_LANDINGS || item.forecast_landings,
      FORECAST_BASIS: item['FORECAST BASIS'] || item.FORECAST_BASIS || item.forecast_basis,
      // Keep other fields for reference
      PERIOD_START: item['PERIOD START'] || item.PERIOD_START,
      PERIOD_END: item['PERIOD END'] || item.PERIOD_END,
      FLIGHT_HOURS: item['FLIGHT HOURS'] || item.FLIGHT_HOURS,
      ANNUAL_HOURS: item['ANNUAL HOURS'] || item.ANNUAL_HOURS,
      ANNUAL_CYCLES: item['ANNUAL CYCLES'] || item.ANNUAL_CYCLES,
      ANNUAL_LANDINGS: item['ANNUAL LANDINGS'] || item.ANNUAL_LANDINGS
    }));

    AppState.forecastSettings = forecastSettings;
    AppState.airportLocations = airportLocations;
    AppState.avionicsEquipment = avionicsEquipment;
    AppState.flightData = flightData;
    AppState.uploadAuditLog = uploadAuditLog;

    // Transform statusHistory to clean up and normalize
    try {
      AppState.statusHistory = statusHistory.map(record => {
        // Remove Unnamed columns
        const cleaned = {};
        for (const [key, value] of Object.entries(record)) {
          if (!key.startsWith('Unnamed:')) {
            cleaned[key] = value;
          }
        }

        // Keep raw values for dashboard calculations
        return {
          // Normalized names
          tail_number: cleaned.Asset || cleaned.tail_number || '',
          status_date: cleaned['Est. RTS'] || cleaned.status_date || new Date().toISOString(),
          location: cleaned.Location || cleaned.location || '',
          discrepancy_description: cleaned.ISSUE || cleaned.discrepancy_description || '',
          resolution_notes: cleaned.NOTES || cleaned.resolution_notes || '',
          status: cleaned['WORK STAGE'] || cleaned.status || 'Unknown',
          record_date: cleaned['Record Date'] || cleaned.record_date || '',
          entered_by: cleaned.entered_by || 'System',
          // Raw values for dashboard counts
          est_rts_raw: String(cleaned['Est. RTS'] || '').trim(),
          issue: String(cleaned.ISSUE || '').trim(),
          notes: String(cleaned.NOTES || '').trim(),
          work_stage: String(cleaned['WORK STAGE'] || '').trim(),
          asset: String(cleaned.Asset || '').trim()
        };
      }).filter(record => record.tail_number); // Only keep records with tail numbers

      // Debug: show first status record
      if (AppState.statusHistory.length > 0) {
        console.log('✅ Sample status record:', AppState.statusHistory[0]);
      }
    } catch (err) {
      console.error('❌ Error transforming statusHistory:', err);
      AppState.statusHistory = [];
    }

    // Merge work orders with localStorage (demo mode)
    const localWorkOrders = JSON.parse(localStorage.getItem('xwing_demo_work_orders') || '[]');
    AppState.workOrders = [...workOrders, ...localWorkOrders];

    // Update global state - OPS Terminal
    AppState.capexTransactions = capexTransactions;
    AppState.budgetAllocations = budgetAllocations;
    AppState.financialMetrics = financialMetrics;
    AppState.fleetProjections = fleetProjections;
    AppState.routePerformance = routePerformance;
    AppState.engineInventory = engineInventory;
    AppState.engineHistory = engineHistory;
    AppState.propellerInventory = propellerInventory;
    AppState.propellerHistory = propellerHistory;

    // Set data as-of date from aircraft times
    if (aircraftTimes && aircraftTimes.length > 0 && aircraftTimes[0]['REPORT DATE']) {
      AppState.dataAsOfDate = aircraftTimes[0]['REPORT DATE'];
    }

    console.log('All datasets loaded successfully');
    console.log('Fleet data count:', fleetData.length);
    console.log('Due lists count:', dueLists.length);
    console.log('Aircraft times count:', aircraftTimes.length);
    console.log('Status history count:', statusHistory.length);

    // Render initial views
    try {
      renderFleetStatusGrid();
    } catch (e) {
      console.error('Error rendering fleet status grid:', e);
    }

    try {
      renderDueListsTable();
    } catch (e) {
      console.error('Error rendering due lists table:', e);
    }

    try {
      renderUploadHistory();
    } catch (e) {
      console.error('Error rendering upload history:', e);
    }

    try {
      populateTailFilterDropdown();
    } catch (e) {
      console.error('Error populating tail filter:', e);
    }

    // Update dashboard with calculated counts
    try {
      updateDashboardDisplay();
    } catch (e) {
      console.error('Error updating dashboard display:', e);
    }

    // Update timestamp with data-as-of date
    try {
      updateTimestamp();
    } catch (e) {
      console.error('Error updating timestamp:', e);
    }

    // Render OPS Terminal views (may have no data)
    try {
      renderOPSDashboard();
    } catch (e) {
      console.error('Error rendering OPS dashboard:', e);
    }

    try {
      renderFleetRecords();
    } catch (e) {
      console.error('Error rendering fleet records:', e);
    }

  } catch (error) {
    console.error('Error loading datasets:', error);
    console.error('Error stack:', error.stack);
    showError(`Failed to load data: ${error.message}\n\nCheck browser console (F12) for details.`);
  }
}

/**
 * Fetch data from a Domo dataset using Domo.js
 * FOR LOCAL DEMO: Loads from app/data/*.json files
 */
async function fetchDataset(alias) {
  try {
    // Use Domo.js to fetch data (production)
    if (typeof domo !== 'undefined') {
      const data = await domo.get(`/data/v1/${alias}`);
      return data;
    } else {
      // LOCAL DEMO MODE: Load from JSON files
      console.log(`📁 Loading ${alias} from local JSON...`);

      try {
        const data = await loadLocalDataset(alias);
        if (data && data.length >= 0) {
          console.log(`✅ Loaded ${data.length} records from app/data/${alias}.json`);
          return data;
        }
      } catch (jsonError) {
        // Show visible error banner instead of silent fallback
        console.error(`❌ Failed to load ${alias}:`, jsonError);
        showDatasetError(alias, jsonError.message);
        return [];
      }

      return [];
    }
  } catch (error) {
    console.error(`❌ Error fetching dataset ${alias}:`, error);
    showDatasetError(alias, error.message);
    return [];
  }
}

/**
 * Show a visible error banner for failed dataset loads
 */
function showDatasetError(alias, message) {
  const errorBanner = document.createElement('div');
  errorBanner.className = 'dataset-error-banner';
  errorBanner.innerHTML = `
    <strong>⚠️ Dataset Load Error:</strong> Failed to load "${alias}"<br>
    <small>${escapeHtml(message)}</small>
  `;
  errorBanner.style.cssText = 'background: #ff4444; color: white; padding: 12px; margin: 8px; border-radius: 4px; font-size: 14px;';

  const container = document.querySelector('.app-container') || document.body;
  container.insertBefore(errorBanner, container.firstChild);

  // Auto-remove after 10 seconds
  setTimeout(() => errorBanner.remove(), 10000);
}

/**
 * Dated snapshot history (local mode). sync_sheet.py writes:
 *   data/history/index.json             list of snapshot dates, newest first
 *   data/history/snapshots/<date>.json  { files: { dataset: "objects/<hash>.json" } }
 * Viewing "latest" reads data/<dataset>.json exactly as before.
 */
const SnapshotHistory = {
  POLL_MS: 5 * 60 * 1000,
  index: null,
  selectedDate: null,
  files: null,

  dataUrl(name) {
    if (this.selectedDate && this.files && this.files[name]) {
      return `data/history/${this.files[name]}`;
    }
    return `data/${name}.json`;
  },

  async fetchIndex() {
    try {
      const res = await fetch(`data/history/index.json?_=${Date.now()}`);
      return res.ok ? await res.json() : null;
    } catch (e) {
      return null;
    }
  },

  async init() {
    if (typeof domo !== 'undefined') return;
    this.index = await this.fetchIndex();
    if (!this.index || !this.index.snapshots?.length) return;

    document.getElementById('snapshotPicker').hidden = false;
    this.renderOptions();

    const select = document.getElementById('snapshot-selector');
    select.addEventListener('change', () => this.select(select.value || null));
    document.getElementById('snapshotPrev').addEventListener('click', () => this.step(1));
    document.getElementById('snapshotNext').addEventListener('click', () => this.step(-1));
    document.getElementById('historyBannerLatest').addEventListener('click', () => this.select(null));

    const requested = new URLSearchParams(location.search).get('date');
    if (requested) await this.select(requested, { reload: false });

    setInterval(() => this.poll(), this.POLL_MS);
  },

  renderOptions() {
    const select = document.getElementById('snapshot-selector');
    const snaps = this.index.snapshots;
    select.innerHTML = `<option value="">Latest (${snaps[0].date})</option>` +
      snaps.slice(1).map(s => `<option value="${s.date}">${s.date}</option>`).join('');
    select.value = this.selectedDate || '';
    this.updateControls();
  },

  // offset +1 = older, -1 = newer; index 0 of the list is "Latest"
  step(offset) {
    const dates = [null, ...this.index.snapshots.slice(1).map(s => s.date)];
    const current = this.selectedDate === this.index.latest ? null : this.selectedDate;
    const next = dates.indexOf(current) + offset;
    if (next >= 0 && next < dates.length) this.select(dates[next]);
  },

  async select(date, { reload = true } = {}) {
    if (date === this.index.latest) date = null;
    if (date && !this.index.snapshots.some(s => s.date === date)) {
      showMessage(`No snapshot saved for ${date}. Showing latest data.`, 'warning');
      date = null;
    }

    let files = null;
    if (date) {
      try {
        const res = await fetch(`data/history/snapshots/${date}.json?_=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        files = (await res.json()).files;
      } catch (e) {
        showMessage(`Could not load snapshot ${date}: ${e.message}`, 'error');
        return;
      }
    }

    this.selectedDate = date;
    this.files = files;

    const url = new URL(location.href);
    if (date) url.searchParams.set('date', date); else url.searchParams.delete('date');
    history.replaceState(null, '', url);

    document.getElementById('snapshot-selector').value = date || '';
    this.updateControls();

    if (reload) {
      await loadAllData();
      updateTimestamp();
      if (AppState.currentTab === 'data-sources') renderDataSources();
    }
  },

  updateControls() {
    const snaps = this.index.snapshots;
    const pos = this.selectedDate ? snaps.findIndex(s => s.date === this.selectedDate) : 0;
    document.getElementById('snapshotPrev').disabled = pos >= snaps.length - 1;
    document.getElementById('snapshotNext').disabled = !this.selectedDate;

    const banner = document.getElementById('historyBanner');
    banner.hidden = !this.selectedDate;
    document.body.classList.toggle('viewing-history', !!this.selectedDate);
    if (this.selectedDate) {
      const snap = snaps.find(s => s.date === this.selectedDate);
      document.getElementById('historyBannerText').textContent =
        `Viewing historical data from ${this.selectedDate} (synced ${snap.synced_at}). ` +
        `Changes to the sheet after this date are not shown.`;
    }
  },

  async poll() {
    const fresh = await this.fetchIndex();
    if (!fresh || fresh.updated_at === this.index.updated_at) return;
    this.index = fresh;
    this.renderOptions();
    if (!this.selectedDate) {
      await loadAllData();
      updateTimestamp();
      showMessage('Dashboard updated with the latest sheet data.', 'success');
    }
  }
};

/**
 * Load dataset from local JSON files (for demo mode)
 */
async function loadLocalDataset(alias) {
  // Map all dataset aliases to JSON files
  const dataFileMap = {
    [DATASETS.FLEET_MASTER]: 'data/fleet_master.json',
    [DATASETS.FLEET_ASSET_IMPORT]: 'data/fleet_asset_import.json',
    [DATASETS.AIRCRAFT_TIMES]: 'data/aircraft_times.json',
    [DATASETS.DAILY_ROUTES]: 'data/daily_routes.json',
    [DATASETS.DUE_LISTS]: 'data/due_lists.json',
    [DATASETS.ROUTE_SWAPS]: 'data/route_swaps.json',
    [DATASETS.AIRCRAFT_UTILIZATION]: 'data/aircraft_utilization.json',
    [DATASETS.FORECAST_SETTINGS]: 'data/forecast_settings.json',
    [DATASETS.AIRCRAFT_STATUS_HISTORY]: 'data/aircraft_status_history.json'
    // OPS datasets not available for demo (no real data)
  };

  if (!dataFileMap[alias]) {
    console.warn(`No local data file mapped for ${alias} - returning empty array`);
    return [];
  }
  const filename = SnapshotHistory.dataUrl(alias);

  // Add cache-busting timestamp to force fresh data
  const cacheBust = `?_=${Date.now()}`;
  console.log(`📥 Fetching ${filename}${cacheBust}`);
  const response = await fetch(filename + cacheBust);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${filename} not found`);
  }

  const data = await response.json();
  return data;
}

// REMOVED getMockData() - Now using real data from app/data/*.json files

/**
 * Render the fleet status grid
 */
function renderFleetStatusGrid() {
  const container = document.getElementById('fleet-status-grid');
  if (!container) return;

  if (AppState.fleetData.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No fleet data available. Please upload Fleet Asset Report.</p></div>';
    return;
  }

  container.innerHTML = '';

  // Excluded aircraft per spec (Inactive + N863MA)
  const EXCLUDED_AIRCRAFT = ['N863MA', 'N1037N', 'N208N', 'N9469B'];

  // Count and render only non-excluded aircraft
  let aircraftCount = 0;
  const statusCounts = {
    ACTIVE: [],
    'IN WORK': [],
    STANDBY: [],
    MEL: [],
    CUSTOMER: []
  };
  const allPilots = new Set();

  AppState.fleetData.forEach(aircraft => {
    if (!EXCLUDED_AIRCRAFT.includes(aircraft.tail_number)) {
      const card = createFleetCard(aircraft);
      container.appendChild(card);
      aircraftCount++;

      // Track status for logging
      const statusBadge = card.querySelector('.status-badge');
      if (statusBadge) {
        const status = statusBadge.textContent.trim();
        if (statusCounts[status]) {
          statusCounts[status].push(aircraft.tail_number);
        }
      }

      // Track pilot names
      const pilotElement = Array.from(card.querySelectorAll('.fleet-card-label'))
        .find(el => el.textContent === 'Pilot');
      if (pilotElement) {
        const pilotValue = pilotElement.nextElementSibling.textContent.trim();
        if (pilotValue && pilotValue !== 'N/A') {
          allPilots.add(pilotValue);
        }
      }
    }
  });

  // Update subtitle with aircraft count
  const subtitle = document.getElementById('mx-control-subtitle');
  if (subtitle) {
    subtitle.textContent = `Real-time maintenance control for ${aircraftCount} aircraft`;
  }

  // Console logging for verification
  console.log('\n📊 Fleet Card Status Counts:');
  console.table([
    { Status: 'ACTIVE (green)', Count: statusCounts.ACTIVE.length, Tails: statusCounts.ACTIVE.join(', ') },
    { Status: 'IN WORK (yellow)', Count: statusCounts['IN WORK'].length, Tails: statusCounts['IN WORK'].join(', ') },
    { Status: 'STANDBY (grey)', Count: statusCounts.STANDBY.length, Tails: statusCounts.STANDBY.join(', ') },
    { Status: 'MEL (yellow)', Count: statusCounts.MEL.length, Tails: statusCounts.MEL.join(', ') },
    { Status: 'CUSTOMER (grey)', Count: statusCounts.CUSTOMER.length, Tails: statusCounts.CUSTOMER.join(', ') }
  ]);

  console.log('\n👨‍✈️ Distinct Pilot Names:', Array.from(allPilots).sort());
}

/**
 * Create a fleet status card
 */
function createFleetCard(aircraft) {
  const card = document.createElement('div');
  card.className = 'fleet-card';

  // Join aircraft_times data
  const timesData = AppState.aircraftTimes.find(t =>
    normalizeTail(t.AIRCRAFT || t.Aircraft || t.aircraft) === normalizeTail(aircraft.tail_number)
  );

  // Join latest daily_routes entry for this tail
  const routeEntries = AppState.dailyRoutes
    .filter(r => normalizeTail(r.AIRCRAFT || r.Aircraft || r.aircraft) === normalizeTail(aircraft.tail_number))
    .sort((a, b) => {
      const dateA = new Date(a.DATE || a.Date || 0);
      const dateB = new Date(b.DATE || b.Date || 0);
      return dateB - dateA;
    });
  const latestRoute = routeEntries.length > 0 ? routeEntries[0] : null;

  // Determine status from dashboard rules (use exact same sets as calculateDashboardCounts)
  const tail = normalizeTail(aircraft.tail_number);
  let displayStatus = 'ACTIVE';
  let statusClass = 'status-green';
  let showMELTag = false;

  // Build status sets from statusHistory (exact same as dashboard)
  const statusRows = [];
  AppState.statusHistory.forEach(entry => {
    const entryTail = normalizeTail(entry.asset || entry.tail_number);
    if (!entryTail) return;

    statusRows.push({
      tail: entryTail,
      estRtsRaw: (entry.est_rts_raw || '').trim(),
      location: (entry.location || '').trim(),
      issue: (entry.issue || '').trim(),
      notes: (entry.notes || '').trim(),
      workStage: (entry.work_stage || '').trim()
    });
  });

  // Build sets (same as dashboard)
  // 1. CUSTOMER: Fleet Status == "Customer Aircraft"
  const fleetStatus = (aircraft.status || aircraft['Fleet Status'] || '').trim();
  const isCustomer = fleetStatus === 'Customer Aircraft';

  // 2. IN WORK: work_stage=="IN PROGRESS", est_rts_raw not "STBY"/"UP", issue!="STBY", issue does NOT match MEL/ABI2
  const isInWork = statusRows.some(row =>
    row.tail === tail &&
    row.workStage.toUpperCase() === 'IN PROGRESS' &&
    row.estRtsRaw !== 'STBY' && row.estRtsRaw !== 'UP' &&
    row.issue !== 'STBY' &&
    !/(?:^|[^A-Z])(?:MEL|ABI2)(?:[^A-Z]|$)/i.test(row.issue)
  );

  // 3. STANDBY: issue=="STBY" and work_stage=="IN PROGRESS"
  const isStandby = statusRows.some(row =>
    row.tail === tail && row.issue === 'STBY' && row.workStage.toUpperCase() === 'IN PROGRESS'
  );

  // 4. OPEN MEL: ISSUE matches MEL and WORK STAGE not COMPLETE/CANCELLED
  const hasOpenMEL = statusRows.some(row =>
    row.tail === tail &&
    /(?:^|[^A-Z])MEL(?:[^A-Z]|$)/i.test(row.issue) &&
    !/^(COMPLETE|CANCELLED)$/i.test(row.workStage)
  );

  // Apply priority order (a -> b -> c -> d -> e)
  if (isCustomer) {
    displayStatus = 'CUSTOMER';
    statusClass = 'status-grey';
  } else if (isInWork) {
    displayStatus = 'IN WORK';
    statusClass = 'status-yellow';
    // Add MEL tag if also in open-MEL set
    if (hasOpenMEL) {
      showMELTag = true;
    }
  } else if (isStandby) {
    displayStatus = 'STANDBY';
    statusClass = 'status-grey';
  } else if (hasOpenMEL) {
    displayStatus = 'MEL';
    statusClass = 'status-yellow';
  }
  // else remains ACTIVE green

  card.classList.add(statusClass);

  // Build card HTML
  let cardBodyHTML = `
    <div class="fleet-card-row">
      <span class="fleet-card-label">Serial #</span>
      <span class="fleet-card-value">${aircraft.serial_number || 'N/A'}</span>
    </div>
    <div class="fleet-card-row">
      <span class="fleet-card-label">Model</span>
      <span class="fleet-card-value">${aircraft.model || 'N/A'}</span>
    </div>
    <div class="fleet-card-row">
      <span class="fleet-card-label">Total Time</span>
      <span class="fleet-card-value">${timesData && timesData['AFTT'] != null ? parseFloat(timesData['AFTT']).toFixed(1) + ' hrs' : 'N/A'}</span>
    </div>
    <div class="fleet-card-row">
      <span class="fleet-card-label">Landings</span>
      <span class="fleet-card-value">${timesData && timesData['LANDINGS'] != null ? timesData['LANDINGS'] : 'N/A'}</span>
    </div>
    <div class="fleet-card-row">
      <span class="fleet-card-label">Cycles</span>
      <span class="fleet-card-value">${timesData && timesData['START CYCLES'] != null ? timesData['START CYCLES'] : 'N/A'}</span>
    </div>`;

  // Add route if available
  if (latestRoute) {
    const departure = latestRoute.DEPARTURE || latestRoute.Departure;
    const destination = latestRoute.DESTINATION || latestRoute.Destination;
    const routeValue = (departure && destination) ? `${departure} → ${destination}` : 'N/A';
    cardBodyHTML += `
    <div class="fleet-card-row">
      <span class="fleet-card-label">Route</span>
      <span class="fleet-card-value">${routeValue}</span>
    </div>`;
  }

  // Add pilot if available
  if (latestRoute) {
    let pilotValue = latestRoute.PIC || latestRoute.Pilot || 'N/A';
    // Clean up pilot name: strip trailing / ((S|TS|TF)-.*|x?ADMIN.*|Talena.*)$/i
    pilotValue = pilotValue.replace(/ ((S|TS|TF)-.*|x?ADMIN.*|Talena.*)$/i, '').trim();
    cardBodyHTML += `
    <div class="fleet-card-row">
      <span class="fleet-card-label">Pilot</span>
      <span class="fleet-card-value">${pilotValue}</span>
    </div>`;
  }

  // Build status badge with optional MEL tag
  let statusBadgeHTML = `<span class="status-badge ${displayStatus.toLowerCase().replace(/\s+/g, '-')}">${displayStatus}</span>`;
  if (showMELTag) {
    statusBadgeHTML += ' <span class="status-badge mel" style="font-size: 0.7em; padding: 2px 6px;">MEL</span>';
  }

  card.innerHTML = `
    <div class="fleet-card-header">
      <span class="tail-number">${aircraft.tail_number}</span>
      ${statusBadgeHTML}
    </div>
    <div class="fleet-card-body">
      ${cardBodyHTML}
    </div>
  `;

  // Click to view due list
  card.addEventListener('click', () => {
    viewDueListForTail(aircraft.tail_number);
  });

  return card;
}

/**
 * Get status class based on aircraft status
 */
function getStatusClass(status) {
  if (!status) return 'status-green'; // Available/Ready

  const statusUpper = status.toUpperCase();

  // Match exact statuses from fleet_master.json
  if (statusUpper === 'ACTIVE') return 'status-green';
  if (statusUpper === 'STANDBY' || statusUpper === 'STBY') return 'status-grey';
  if (statusUpper === 'IN WORK') return 'status-yellow'; // NOT green!
  if (statusUpper === 'CUSTOMER AIRCRAFT' || statusUpper === 'CUST') return 'status-grey';
  if (statusUpper === 'INACTIVE') return 'status-grey';
  if (statusUpper === 'MEL') return 'status-yellow';
  if (statusUpper === 'DOWN' || statusUpper === 'GROUNDED') return 'status-red';

  return 'status-green'; // Default for active
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
  if (!status) {
    return '<span class="status-badge ready">READY</span>';
  }

  const statusUpper = status.toUpperCase();
  const badgeClass = statusUpper.toLowerCase().replace(/\s+/g, '-');

  return `<span class="status-badge ${badgeClass}">${statusUpper}</span>`;
}

/**
 * Render the due lists table
 */
function renderDueListsTable() {
  const container = document.getElementById('due-lists-table');
  if (!container) return;

  if (AppState.dueLists.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No due list data available. Please upload Aircraft Due Lists.</p></div>';
    return;
  }

  const table = document.createElement('table');
  table.className = 'data-table';

  table.innerHTML = `
    <thead>
      <tr>
        <th>Tail</th>
        <th>Task</th>
        <th>ATA</th>
        <th>Basis</th>
        <th>Remaining</th>
        <th>Due Date</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody id="due-lists-tbody">
      ${AppState.dueLists.map(item => createDueListRow(item)).join('')}
    </tbody>
  `;

  container.innerHTML = '';
  container.appendChild(table);
}

/**
 * Compute remaining days and status for a due item
 * Returns { remainingText, status, statusClass, isOverdue }
 */
function computeRemainingAndStatus(item) {
  const intervalType = (item.interval_type || '').toLowerCase();
  const isCalendarItem = !/hours?|hrs?|cycles?|cyc|landings?|ldg/i.test(intervalType);

  let remainingText = 'N/A';
  let status = 'OK';
  let statusClass = 'ok';
  let isOverdue = false;

  if (isCalendarItem && item.forecast_due_date) {
    // For calendar items: compute from due date
    // Use getTodayDateLocal() for display (Oct 18 = Oct 18 midnight local)
    // Use parseDate for due date (which uses UTC, so "2026-08-29" = Aug 28 in PDT)
    const today = getTodayDateLocal();
    const dueDate = parseDate(item.forecast_due_date);

    if (!dueDate) {
      return { remainingText: 'N/A', status: 'OK', statusClass: 'ok', isOverdue: false };
    }

    // Set both to local midnight for accurate day calculation
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueDateMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    const diffMs = dueDateMidnight - todayMidnight;
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // Compute remaining text
    if (days < 0) {
      remainingText = `Overdue by ${Math.abs(days)} days`;
      isOverdue = true;
    } else {
      remainingText = `${days} days`;
    }

    // Compute status from days
    if (days < 0) {
      status = 'Overdue';
      statusClass = 'overdue';
    } else if (days <= 30) {
      status = 'Approaching';
      statusClass = 'approaching';
    } else {
      status = 'OK';
      statusClass = 'ok';
    }
  } else {
    // For hours/cycles/landings: use projected days
    const projectedDays = item.projected_days;

    if (projectedDays !== null && projectedDays !== undefined) {
      const days = parseFloat(projectedDays);
      if (!isNaN(days)) {
        // Format remaining text consistently with calendar items
        if (days < 0) {
          remainingText = `Overdue by ${Math.abs(days).toFixed(1)} days`;
          isOverdue = true;
        } else {
          remainingText = days.toFixed(1);
        }

        // Compute status from projected days
        if (days < 0) {
          status = 'Overdue';
          statusClass = 'overdue';
        } else if (days <= 30) {
          status = 'Approaching';
          statusClass = 'approaching';
        } else {
          status = 'OK';
          statusClass = 'ok';
        }
      }
    } else if (item.remaining_life !== null && item.remaining_life !== undefined) {
      // Fallback to remaining_life if projected_days not available
      let remainingStr = String(item.remaining_life);
      if (remainingStr.includes('(')) {
        remainingStr = remainingStr.split('(')[0].trim();
      }
      const remaining = parseFloat(remainingStr);
      if (!isNaN(remaining)) {
        // Format remaining text consistently
        if (remaining < 0) {
          remainingText = `Overdue by ${Math.abs(remaining).toFixed(1)} days`;
          isOverdue = true;
        } else {
          remainingText = remaining.toFixed(1);
        }

        if (remaining < 0) {
          status = 'Overdue';
          statusClass = 'overdue';
        } else if (remaining <= 30) {
          status = 'Approaching';
          statusClass = 'approaching';
        } else {
          status = 'OK';
          statusClass = 'ok';
        }
      }
    }
  }

  return { remainingText, status, statusClass, isOverdue };
}

/**
 * Create a due list table row
 */
function createDueListRow(item) {
  // Compute remaining and status using shared function
  const computed = computeRemainingAndStatus(item);

  // Check if this is a stale August export row
  const isStaleRow = item.notes && (
    item.notes.includes('N9762B due-list export') ||
    item.notes.includes('N9505B due-list export')
  );

  // Add stale tag if applicable
  const staleTag = isStaleRow ? '<span class="badge badge-warning" style="font-size: 0.7rem; margin-left: 0.5rem;">Aug export - stale</span>' : '';

  return `
    <tr class="${computed.isOverdue ? 'overdue-row' : ''}">
      <td><strong>${escapeHtml(item.tail_number)}</strong>${staleTag}</td>
      <td>${escapeHtml(item.task_description)}</td>
      <td>${escapeHtml(item.ata_chapter || 'N/A')}</td>
      <td>${escapeHtml(item.compliance_basis || 'N/A')}</td>
      <td>${computed.remainingText}</td>
      <td>${formatDate(item.forecast_due_date)}</td>
      <td><span class="due-status ${computed.statusClass}">${escapeHtml(computed.status)}</span></td>
    </tr>
  `;
}

/**
 * Render Due Lists tab (due-lists-table-2)
 */
function renderDueListsTab() {
  const container = document.getElementById('due-lists-table-2');
  if (!container) return;

  if (AppState.dueLists.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No due list data available.</p></div>';
    return;
  }

  // Check if there are any stale August export rows
  const hasStaleData = AppState.dueLists.some(item =>
    item.notes && (
      item.notes.includes('N9762B due-list export') ||
      item.notes.includes('N9505B due-list export')
    )
  );

  const staleNotice = hasStaleData ? `
    <div class="info-message" style="margin-bottom: 1rem; background: #fef3c7; border-left: 4px solid #f59e0b; color: #92400e;">
      <p>⚠️ <strong>Note:</strong> Some aircraft show data from an older export (August). Remaining values for these rows are recalculated from the due date, but the source data is out of date.</p>
    </div>
  ` : '';

  const table = document.createElement('table');
  table.className = 'data-table';

  table.innerHTML = `
    <thead>
      <tr>
        <th>Tail</th>
        <th>Task</th>
        <th>ATA</th>
        <th>Basis</th>
        <th>Remaining</th>
        <th>Due Date</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody id="due-lists-tbody-2">
      ${AppState.dueLists.map(item => createDueListRow(item)).join('')}
    </tbody>
  `;

  container.innerHTML = staleNotice;
  container.appendChild(table);

  // Verify consistency between Remaining and Status
  let overdueInRemainingButNotStatus = 0;
  let overdueInStatusButNotRemaining = 0;
  AppState.dueLists.forEach(item => {
    const computed = computeRemainingAndStatus(item);
    const remainingHasOverdue = computed.remainingText.includes('Overdue');
    const statusIsOverdue = computed.status === 'Overdue';

    if (remainingHasOverdue && !statusIsOverdue) {
      overdueInRemainingButNotStatus++;
    }
    if (statusIsOverdue && !remainingHasOverdue) {
      overdueInStatusButNotRemaining++;
    }
  });

  console.log(`Rendered Due Lists tab: ${AppState.dueLists.length} rows`);
  console.log(`Consistency check: ${overdueInRemainingButNotStatus} rows with "Overdue" in Remaining but Status not OVERDUE`);
  console.log(`Consistency check: ${overdueInStatusButNotRemaining} rows with Status OVERDUE but "Overdue" not in Remaining`);
}

/**
 * Filter due lists based on selected criteria
 */
function filterDueLists() {
  const tailFilter = document.getElementById('filter-tail')?.value || '';
  const statusFilter = document.getElementById('filter-status')?.value || '';
  const taskFilter = document.getElementById('filter-task')?.value.toLowerCase() || '';

  const filteredData = AppState.dueLists.filter(item => {
    const matchesTail = !tailFilter || item.tail_number === tailFilter;
    const matchesStatus = !statusFilter || item.status === statusFilter;
    const matchesTask = !taskFilter || item.task_description.toLowerCase().includes(taskFilter);

    return matchesTail && matchesStatus && matchesTask;
  });

  const tbody = document.getElementById('due-lists-tbody');
  if (tbody) {
    tbody.innerHTML = filteredData.map(item => createDueListRow(item)).join('');
  }
}

/**
 * Filter due lists on Due Lists tab
 */
function filterDueListsTab() {
  const tailFilter = document.getElementById('filter-tail-2')?.value || '';
  const statusFilter = document.getElementById('filter-status-2')?.value || '';
  const taskFilter = document.getElementById('filter-task-2')?.value.toLowerCase() || '';

  const filteredData = AppState.dueLists.filter(item => {
    const matchesTail = !tailFilter || item.tail_number === tailFilter;
    const matchesStatus = !statusFilter || item.status === statusFilter;
    const matchesTask = !taskFilter || (item.task_description || '').toLowerCase().includes(taskFilter);

    return matchesTail && matchesStatus && matchesTask;
  });

  const tbody = document.getElementById('due-lists-tbody-2');
  if (tbody) {
    tbody.innerHTML = filteredData.map(item => createDueListRow(item)).join('');
  }

  // Count Overdue items
  const overdueCount = filteredData.filter(item => item.status === 'Overdue').length;
  console.log(`Filtered Due Lists: ${filteredData.length} total, ${overdueCount} overdue`);
}

/**
 * Populate tail number filter dropdown
 */
function populateTailFilterDropdown() {
  const select = document.getElementById('filter-tail');
  if (!select) return;

  const uniqueTails = [...new Set(AppState.fleetData.map(a => a.tail_number))].sort();

  select.innerHTML = '<option value="">All Aircraft</option>' +
    uniqueTails.map(tail => `<option value="${tail}">${tail}</option>`).join('');
}

/**
 * View due list for a specific tail number
 */
function viewDueListForTail(tailNumber) {
  // Switch to maintenance control tab if not already there
  if (AppState.currentTab !== 'maintenance-control') {
    switchTab('maintenance-control');
  }

  // Set filter and apply
  const tailFilter = document.getElementById('filter-tail');
  if (tailFilter) {
    tailFilter.value = tailNumber;
    filterDueLists();
  }

  // Scroll to due lists section
  const dueListsSection = document.querySelector('.section:has(#due-lists-table)');
  if (dueListsSection) {
    dueListsSection.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Handle quick add form submission
 */
async function handleQuickAdd() {
  const tailInput = document.getElementById('quick-tail');
  const statusSelect = document.getElementById('quick-status');
  const descriptionInput = document.getElementById('quick-description');

  const tailNumber = tailInput?.value.trim();
  const status = statusSelect?.value;
  const description = descriptionInput?.value.trim();

  if (!tailNumber || !status) {
    showMessage('Please enter tail number and select status', 'warning');
    return;
  }

  // Normalize tail number
  const normalizedTail = normalizeTail(tailNumber);

  // Validate against fleet_master
  const validAircraft = AppState.fleetData.find(a => normalizeTail(a.tail_number) === normalizedTail);
  if (!validAircraft) {
    showMessage(`Warning: ${normalizedTail} is not in the fleet registry. Entry saved but may not appear on dashboard.`, 'warning');
  }

  try {
    // Create new entry
    const newEntry = {
      tail_number: normalizedTail,
      status: status,
      description: description || '',
      timestamp: new Date().toISOString(),
      entered_by: AppState.userName || 'Demo user'
    };

    // Load existing entries from localStorage
    let quickAddEntries = [];
    try {
      const stored = localStorage.getItem('xwing_demo_quick_add');
      if (stored) {
        quickAddEntries = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading quick add entries:', e);
    }

    // Add new entry
    quickAddEntries.unshift(newEntry);

    // Save to localStorage
    localStorage.setItem('xwing_demo_quick_add', JSON.stringify(quickAddEntries));

    console.log('Quick add entry saved:', newEntry);

    // Clear form
    tailInput.value = '';
    statusSelect.value = '';
    descriptionInput.value = '';

    // Refresh the list
    renderQuickAddList();

    showMessage(`Status saved for ${normalizedTail}`, 'success');

  } catch (error) {
    console.error('Error adding status:', error);
    showMessage('Failed to add status. Please try again.', 'error');
  }
}

/**
 * Render the list of quick add entries from localStorage
 */
function renderQuickAddList() {
  const container = document.getElementById('quick-add-list');
  if (!container) return;

  // Load entries from localStorage
  let entries = [];
  try {
    const stored = localStorage.getItem('xwing_demo_quick_add');
    if (stored) {
      entries = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading quick add entries:', e);
  }

  if (entries.length === 0) {
    container.innerHTML = '';
    return;
  }

  const tableHTML = `
    <h4 style="margin-bottom: 0.75rem; font-size: 0.9rem; color: #cbd5e1;">Entered this session (${entries.length})</h4>
    <table class="data-table">
      <thead>
        <tr>
          <th>Tail</th>
          <th>Status</th>
          <th>Description</th>
          <th>Timestamp</th>
          <th>Entered By</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map(entry => `
          <tr>
            <td><strong>${escapeHtml(entry.tail_number)}</strong></td>
            <td><span class="badge badge-info">${escapeHtml(entry.status)}</span></td>
            <td>${escapeHtml(entry.description) || '—'}</td>
            <td>${new Date(entry.timestamp).toLocaleString()}</td>
            <td>${escapeHtml(entry.entered_by)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;
}

/**
 * Handle aircraft status history search
 */
function handleHistorySearch() {
  const searchInput = document.getElementById('history-search');
  const searchTerm = searchInput?.value.trim().toLowerCase();

  if (!searchTerm) {
    showMessage('Please enter a tail number or keyword to search', 'warning');
    return;
  }

  const results = AppState.statusHistory.filter(record => {
    return record.tail_number.toLowerCase().includes(searchTerm) ||
           (record.discrepancy_description && record.discrepancy_description.toLowerCase().includes(searchTerm)) ||
           (record.resolution_notes && record.resolution_notes.toLowerCase().includes(searchTerm));
  });

  renderHistoryResults(results, searchTerm);
}

/**
 * Render history search results
 */
function renderHistoryResults(results, searchTerm) {
  const container = document.getElementById('history-results');
  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No results found for "${escapeHtml(searchTerm)}"</p></div>`;
    return;
  }

  const table = document.createElement('table');
  table.className = 'data-table';

  table.innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Tail</th>
        <th>Status</th>
        <th>Description</th>
        <th>Entered By</th>
        <th>Resolution Date</th>
        <th>Resolution</th>
      </tr>
    </thead>
    <tbody>
      ${results.map(record => `
        <tr>
          <td>${new Date(record.status_date).toLocaleDateString()}</td>
          <td><strong>${escapeHtml(record.tail_number)}</strong></td>
          <td><span class="status-badge ${escapeHtml(record.status).toLowerCase()}">${escapeHtml(record.status)}</span></td>
          <td>${escapeHtml(record.discrepancy_description)}</td>
          <td>${escapeHtml(record.entered_by)}</td>
          <td>${record.resolution_date ? new Date(record.resolution_date).toLocaleDateString() : 'Pending'}</td>
          <td>${escapeHtml(record.resolution_notes) || 'N/A'}</td>
        </tr>
      `).join('')}
    </tbody>
  `;

  container.innerHTML = '';
  container.appendChild(table);
}

/**
 * Render upload history
 */
function renderUploadHistory() {
  const container = document.getElementById('upload-history');
  if (!container) return;

  if (AppState.uploadAuditLog.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No upload history available.</p></div>';
    return;
  }

  // Count pending approvals
  const pendingCount = AppState.uploadAuditLog.filter(log => log.approval_status === 'Pending Review').length;

  // Add pending approvals header if there are any
  let headerHtml = '';
  if (pendingCount > 0) {
    headerHtml = `
      <div class="approval-header">
        <div class="approval-badge">
          <span class="badge-count">${pendingCount}</span>
          <span class="badge-text">Pending Approval${pendingCount > 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
  }

  const table = document.createElement('table');
  table.className = 'data-table';

  table.innerHTML = `
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Report Type</th>
        <th>Filename</th>
        <th>Uploaded By</th>
        <th>Validation Result</th>
        <th>Status</th>
        <th>Rows</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${AppState.uploadAuditLog.slice(0, 20).map(log => `
        <tr class="${log.approval_status === 'Pending Review' ? 'pending-row' : ''}">
          <td>${new Date(log.upload_timestamp).toLocaleString()}</td>
          <td>${log.report_type}</td>
          <td>${log.source_filename}</td>
          <td>${log.uploaded_by}</td>
          <td>${log.validation_result}</td>
          <td><span class="status-badge ${log.approval_status.toLowerCase().replace(/\s+/g, '-')}">${log.approval_status}</span></td>
          <td>${log.row_count}</td>
          <td class="actions-cell">
            ${log.approval_status === 'Pending Review' ? `
              <button class="btn-approve" onclick="approveUpload('${log.upload_id}')">Approve</button>
              <button class="btn-reject" onclick="rejectUpload('${log.upload_id}')">Reject</button>
            ` : log.reviewed_by ? `
              <span class="reviewed-by">Reviewed by ${log.reviewed_by}</span>
            ` : '-'}
          </td>
        </tr>
      `).join('')}
    </tbody>
  `;

  container.innerHTML = headerHtml;
  container.appendChild(table);
}

/**
 * Approve an upload
 */
async function approveUpload(uploadId) {
  try {
    const upload = AppState.uploadAuditLog.find(log => log.upload_id === uploadId);
    if (!upload) {
      showMessage('Upload not found', 'error');
      return;
    }

    const confirmMsg = `Approve this upload?\n\nFile: ${upload.source_filename}\nType: ${upload.report_type}\n\nThis will import the data into the system.`;

    showConfirm(confirmMsg, async () => {
      // Update upload status
      upload.approval_status = 'Imported';
      upload.reviewed_by = AppState.userName || 'System';
      upload.validation_result = `Approved and imported ${upload.row_count} rows`;

      // Update in Domo (in real implementation, this would trigger ETL)
      await domo.put(`/data/v1/${DATASETS.UPLOAD_AUDIT_LOG}/${uploadId}`, upload);

      // Refresh display
      renderUploadHistory();

      showMessage('Upload approved successfully! The data will be processed and imported into the system.', 'success');
    });

  } catch (error) {
    console.error('Error approving upload:', error);
    showMessage('Failed to approve upload. Please try again.', 'error');
  }
}

/**
 * Reject an upload
 */
async function rejectUpload(uploadId) {
  try {
    const upload = AppState.uploadAuditLog.find(log => log.upload_id === uploadId);
    if (!upload) {
      showMessage('Upload not found', 'error');
      return;
    }

    // Simplified: just reject with default reason (avoiding prompt)
    const reason = 'Rejected by user';

    // Update upload status
    upload.approval_status = 'Rejected';
    upload.reviewed_by = AppState.userName || 'System';
    upload.validation_result = `Rejected: ${reason}`;

    // Update in Domo
    await domo.put(`/data/v1/${DATASETS.UPLOAD_AUDIT_LOG}/${uploadId}`, upload);

    // Refresh display
    renderUploadHistory();

    showMessage(`Upload rejected. Reason: ${reason}`, 'success');

  } catch (error) {
    console.error('Error rejecting upload:', error);
    showMessage('Failed to reject upload. Please try again.', 'error');
  }
}

/**
 * Create blank work order
 */
function createBlankWorkOrder() {
  // Create modal for work order form
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'work-order-modal';

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Create New Work Order</h2>
        <button class="close-modal" onclick="closeWorkOrderModal()">&times;</button>
      </div>
      <div class="modal-body">
        <form id="work-order-form">
          <div class="form-group">
            <label for="wo-tail">Aircraft Tail Number *</label>
            <select id="wo-tail" required>
              <option value="">Select Aircraft</option>
              ${AppState.fleetData.map(a => `<option value="${a.tail_number}">${a.tail_number} - ${a.model}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label for="wo-title">Title *</label>
            <input type="text" id="wo-title" required placeholder="Brief description of work">
          </div>

          <div class="form-group">
            <label for="wo-description">Description *</label>
            <textarea id="wo-description" rows="3" required placeholder="Detailed description of work to be performed"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="wo-priority">Priority *</label>
              <select id="wo-priority" required>
                <option value="Low">Low</option>
                <option value="Medium" selected>Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div class="form-group">
              <label for="wo-ata">ATA Chapter</label>
              <input type="text" id="wo-ata" placeholder="e.g., 34">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="wo-assigned">Assigned To</label>
              <input type="text" id="wo-assigned" placeholder="Team or person name">
            </div>

            <div class="form-group">
              <label for="wo-due-date">Due Date</label>
              <input type="date" id="wo-due-date">
            </div>
          </div>

          <div class="form-group">
            <label for="wo-disc-type">Discrepancy Type</label>
            <select id="wo-disc-type">
              <option value="">Select Type</option>
              <option value="Scheduled Maintenance">Scheduled Maintenance</option>
              <option value="Unscheduled Maintenance">Unscheduled Maintenance</option>
              <option value="Avionics">Avionics</option>
              <option value="Powerplant">Powerplant</option>
              <option value="Airframe">Airframe</option>
              <option value="MEL Item">MEL Item</option>
            </select>
          </div>

          <div class="form-group">
            <label for="wo-notes">Notes</label>
            <textarea id="wo-notes" rows="2" placeholder="Additional notes or comments"></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="closeWorkOrderModal()">Cancel</button>
            <button type="submit" class="btn-primary">Create Work Order</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle form submission
  document.getElementById('work-order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveWorkOrder();
  });

  // Show modal
  setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * Close work order modal
 */
function closeWorkOrderModal() {
  const modal = document.getElementById('work-order-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
}

/**
 * Save work order to dataset
 */
async function saveWorkOrder() {
  try {
    // Generate work order ID and number
    const workOrderId = `WO-${Date.now()}`;
    const year = new Date().getFullYear();
    const count = AppState.workOrders.length + 1;
    const workOrderNumber = `WO-${year}-${String(count).padStart(3, '0')}`;

    // Collect form data
    const workOrder = {
      work_order_id: workOrderId,
      work_order_number: workOrderNumber,
      tail_number: document.getElementById('wo-tail').value,
      title: document.getElementById('wo-title').value,
      description: document.getElementById('wo-description').value,
      status: 'Open',
      priority: document.getElementById('wo-priority').value,
      assigned_to: document.getElementById('wo-assigned').value || null,
      created_date: new Date().toISOString(),
      created_by: AppState.userName || 'System',
      due_date: document.getElementById('wo-due-date').value || null,
      started_date: null,
      completed_date: null,
      labor_hours: 0,
      parts_used: null,
      notes: document.getElementById('wo-notes').value || null,
      source: 'Manual',
      source_due_item_id: null,
      approval_status: 'Pending',
      approved_by: null,
      approval_date: null,
      ata_chapter: document.getElementById('wo-ata').value || null,
      discrepancy_type: document.getElementById('wo-disc-type').value || null,
      last_updated: new Date().toISOString()
    };

    // Save to Domo dataset (production) or localStorage (demo)
    if (typeof domo !== 'undefined') {
      await domo.post(`/data/v1/${DATASETS.WORK_ORDERS}`, [workOrder]);
    } else {
      // DEMO MODE: Save to localStorage
      const localWorkOrders = JSON.parse(localStorage.getItem('xwing_demo_work_orders') || '[]');
      localWorkOrders.push(workOrder);
      localStorage.setItem('xwing_demo_work_orders', JSON.stringify(localWorkOrders));
      console.log('💾 Work order saved to localStorage (demo mode)');
    }

    // Update local state
    AppState.workOrders.push(workOrder);

    // Close modal
    closeWorkOrderModal();

    // Refresh work orders display
    renderWorkOrders();

    // Show success message
    showMessage(`Work Order ${workOrderNumber} created successfully!`, 'success');

  } catch (error) {
    console.error('Error saving work order:', error);
    showMessage('Failed to create work order. Please try again.', 'error');
  }
}

/**
 * Create work order from due items
 */
function createWorkOrderFromDue() {
  // Filter due items that are approaching or overdue (next 30 days)
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));

  const upcomingDue = AppState.dueLists.filter(item => {
    if (!item.forecast_due_date) return false;
    const dueDate = new Date(item.forecast_due_date);
    return dueDate <= thirtyDaysFromNow && ['Approaching', 'In Margin', 'Overdue', 'Grounded'].includes(item.status);
  });

  if (upcomingDue.length === 0) {
    showMessage('No due items found in the next 30 days.', 'info');
    return;
  }

  // Create modal for selecting due items
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'auto-populate-modal';

  modal.innerHTML = `
    <div class="modal-content modal-large">
      <div class="modal-header">
        <h2>Auto-Populate Work Orders from Due Items</h2>
        <button class="close-modal" onclick="closeAutoPopulateModal()">&times;</button>
      </div>
      <div class="modal-body">
        <p>Select due items to create work orders (${upcomingDue.length} items due in next 30 days):</p>
        <div class="due-items-selection">
          ${upcomingDue.map(item => `
            <div class="due-item-checkbox">
              <input type="checkbox" id="due-${item.due_item_id}" value="${item.due_item_id}" checked>
              <label for="due-${item.due_item_id}">
                <strong>${item.tail_number}</strong> - ${item.task_description}
                <span class="status-badge ${item.status.toLowerCase()}">${item.status}</span>
                <span class="due-date">Due: ${item.forecast_due_date}</span>
              </label>
            </div>
          `).join('')}
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="closeAutoPopulateModal()">Cancel</button>
          <button type="button" class="btn-primary" onclick="createWorkOrdersFromSelected()">Create Work Orders</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('show'), 10);
}

/**
 * Close auto-populate modal
 */
function closeAutoPopulateModal() {
  const modal = document.getElementById('auto-populate-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
}

/**
 * Create work orders from selected due items
 */
async function createWorkOrdersFromSelected() {
  try {
    const selectedIds = Array.from(document.querySelectorAll('.due-item-checkbox input:checked'))
      .map(cb => cb.value);

    if (selectedIds.length === 0) {
      showMessage('Please select at least one due item.', 'warning');
      return;
    }

    const newWorkOrders = [];
    const year = new Date().getFullYear();
    let count = AppState.workOrders.length + 1;

    for (const dueItemId of selectedIds) {
      const dueItem = AppState.dueLists.find(item => item.due_item_id === dueItemId);
      if (!dueItem) continue;

      const workOrder = {
        work_order_id: `WO-${Date.now()}-${count}`,
        work_order_number: `WO-${year}-${String(count).padStart(3, '0')}`,
        tail_number: dueItem.tail_number,
        title: dueItem.task_description,
        description: `Auto-populated from due item: ${dueItem.task_description}`,
        status: 'Open',
        priority: dueItem.status === 'Overdue' || dueItem.status === 'Grounded' ? 'High' : 'Medium',
        assigned_to: null,
        created_date: new Date().toISOString(),
        created_by: AppState.userName || 'System',
        due_date: dueItem.forecast_due_date,
        started_date: null,
        completed_date: null,
        labor_hours: 0,
        parts_used: null,
        notes: `Compliance basis: ${dueItem.compliance_basis}. Last completed: ${dueItem.last_completed_date}`,
        source: 'Auto-populated',
        source_due_item_id: dueItem.due_item_id,
        approval_status: 'Pending',
        approved_by: null,
        approval_date: null,
        ata_chapter: dueItem.ata_chapter,
        discrepancy_type: 'Scheduled Maintenance',
        last_updated: new Date().toISOString()
      };

      newWorkOrders.push(workOrder);
      count++;
    }

    // Save all work orders to Domo dataset (production) or localStorage (demo)
    if (typeof domo !== 'undefined') {
      await domo.post(`/data/v1/${DATASETS.WORK_ORDERS}`, newWorkOrders);
    } else {
      // DEMO MODE: Save to localStorage
      const localWorkOrders = JSON.parse(localStorage.getItem('xwing_demo_work_orders') || '[]');
      localWorkOrders.push(...newWorkOrders);
      localStorage.setItem('xwing_demo_work_orders', JSON.stringify(localWorkOrders));
      console.log(`💾 ${newWorkOrders.length} work orders saved to localStorage (demo mode)`);
    }

    // Update local state
    AppState.workOrders.push(...newWorkOrders);

    // Close modal
    closeAutoPopulateModal();

    // Refresh work orders display
    renderWorkOrders();

    // Show success message
    showMessage(`Successfully created ${newWorkOrders.length} work order(s)!`, 'success');

  } catch (error) {
    console.error('Error creating work orders:', error);
    showMessage('Failed to create work orders. Please try again.', 'error');
  }
}

/**
 * Render work orders list
 */
function renderWorkOrders() {
  const container = document.getElementById('work-orders-list');
  if (!container) return;

  // Check if there are any work orders
  if (!AppState.workOrders || AppState.workOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No work orders created yet. Click "Create Blank Work Order" to get started.</p>
      </div>
    `;
    return;
  }

  // Create table with work orders
  const tableHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>WO Number</th>
          <th>Tail Number</th>
          <th>Title</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Assigned To</th>
          <th>Due Date</th>
          <th>Created Date</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        ${AppState.workOrders.map(wo => `
          <tr>
            <td><strong>${escapeHtml(wo.work_order_number)}</strong></td>
            <td>${escapeHtml(wo.tail_number)}</td>
            <td>${escapeHtml(wo.title)}</td>
            <td><span class="status-badge ${escapeHtml(wo.status).toLowerCase()}">${escapeHtml(wo.status)}</span></td>
            <td><span class="priority-badge ${escapeHtml(wo.priority).toLowerCase()}">${escapeHtml(wo.priority)}</span></td>
            <td>${escapeHtml(wo.assigned_to) || 'Unassigned'}</td>
            <td>${wo.due_date ? new Date(wo.due_date).toLocaleDateString() : 'N/A'}</td>
            <td>${new Date(wo.created_date).toLocaleDateString()}</td>
            <td>${escapeHtml(wo.source)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;
  console.log(`✅ Rendered ${AppState.workOrders.length} work orders`);
}

/**
 * Handle file upload drag over
 */
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'copy';
}

/**
 * Handle file drop
 */
function handleFileDrop(e) {
  e.preventDefault();
  e.stopPropagation();

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

/**
 * Handle file selection
 */
function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

/**
 * Handle selected file
 */
function handleFile(file) {
  const fileInfo = document.getElementById('file-info');
  if (fileInfo) {
    fileInfo.style.display = 'block';
    fileInfo.innerHTML = `
      <div>
        <strong>File:</strong> ${file.name} (${(file.size / 1024).toFixed(2)} KB)
      </div>
      <button class="btn-secondary" onclick="clearFile()">Remove</button>
    `;
  }

  validateUploadForm();
}

/**
 * Clear selected file
 */
function clearFile() {
  const fileInput = document.getElementById('file-upload');
  const fileInfo = document.getElementById('file-info');

  if (fileInput) fileInput.value = '';
  if (fileInfo) fileInfo.style.display = 'none';

  validateUploadForm();
}

/**
 * Validate upload form
 */
function validateUploadForm() {
  const reportType = document.getElementById('report-type')?.value;
  const fileInput = document.getElementById('file-upload');
  const uploadBtn = document.getElementById('btn-upload');

  const isValid = reportType && fileInput?.files.length > 0;

  if (uploadBtn) {
    uploadBtn.disabled = !isValid;
  }
}

/**
 * Handle file upload
 */
async function handleFileUpload() {
  const reportType = document.getElementById('report-type')?.value;
  const fileInput = document.getElementById('file-upload');
  const file = fileInput?.files[0];

  if (!reportType || !file) {
    showMessage('Please select report type and file', 'warning');
    return;
  }

  // Validate file
  const validation = validateUploadFile(file, reportType);
  if (!validation.valid) {
    showMessage(`File validation failed: ${validation.errors.join(', ')}`, 'error');
    return;
  }

  try {
    // Show upload progress
    showUploadProgress('Validating file...', 20);

    // Perform client-side validation
    await performClientSideValidation(file, reportType);

    showUploadProgress('Preparing upload...', 40);

    // Create upload audit log entry
    const uploadId = `UPL-${Date.now()}`;
    const uploadLogEntry = {
      upload_id: uploadId,
      upload_timestamp: new Date().toISOString(),
      report_type: reportType,
      uploaded_by: AppState.userEmail || 'system',
      source_filename: file.name,
      validation_result: 'Pending validation',
      reviewed_by: null,
      approval_status: 'Pending Review',
      row_count: 0, // Will be updated after parsing
      archive_reference: null
    };

    showUploadProgress('Saving upload record...', 60);

    // Save to upload audit log
    await domo.post(`/data/v1/${DATASETS.UPLOAD_AUDIT_LOG}`, [uploadLogEntry]);

    showUploadProgress('Upload complete!', 100);

    // Update local state
    AppState.uploadAuditLog.push(uploadLogEntry);

    // Show success message
    setTimeout(() => {
      hideUploadProgress();
      showMessage(`File uploaded successfully! Upload ID: ${uploadId}. Status: Pending Review`, 'success');

      // Clear form
      clearFile();
      document.getElementById('report-type').value = '';

      // Refresh upload history
      renderUploadHistory();
    }, 500);

  } catch (error) {
    console.error('File upload error:', error);
    hideUploadProgress();
    showMessage(`File upload failed: ${error.message}. Please try again or contact support.`, 'error');
  }
}

/**
 * Validate upload file
 */
function validateUploadFile(file, reportType) {
  const errors = [];

  // File size validation (max 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB in bytes
  if (file.size > maxSize) {
    errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (50MB)`);
  }

  // File type validation
  const allowedExtensions = ['.pdf', '.xlsx', '.xls', '.csv'];
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    errors.push(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
  }

  // File name validation (basic)
  if (file.name.length > 255) {
    errors.push('File name is too long (max 255 characters)');
  }

  // Report type specific validation
  const reportTypeValidation = validateReportType(file, reportType);
  if (reportTypeValidation.length > 0) {
    errors.push(...reportTypeValidation);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate report type specific requirements
 */
function validateReportType(file, reportType) {
  const errors = [];
  const fileName = file.name.toLowerCase();

  switch (reportType) {
    case 'Fleet Asset Report':
      // Should be Excel or CSV
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
        errors.push('Fleet Asset Report should be in Excel (.xlsx, .xls) or CSV format');
      }
      break;

    case 'Aircraft Due Lists':
      // Should contain tail number in filename
      const tailPattern = /n\d{4}[a-z]/i;
      if (!tailPattern.test(fileName)) {
        errors.push('Aircraft Due Lists filename should contain tail number (e.g., N1120W)');
      }
      break;

    case 'Daily Route Sheet':
      // Should be recent (within last 7 days based on filename if it has a date)
      break;

    case 'Aircraft MX Times Report':
      // Should be Excel or CSV
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
        errors.push('Aircraft MX Times Report should be in Excel or CSV format');
      }
      break;

    default:
      // Generic validation passed
      break;
  }

  return errors;
}

/**
 * Perform client-side validation
 */
async function performClientSideValidation(file, reportType) {
  return new Promise((resolve) => {
    // Simulate async validation (in real implementation, this would parse the file)
    setTimeout(() => {
      console.log(`Validated ${reportType}: ${file.name}`);
      resolve();
    }, 500);
  });
}

/**
 * Show upload progress
 */
function showUploadProgress(message, percent) {
  let progressContainer = document.getElementById('upload-progress');

  if (!progressContainer) {
    progressContainer = document.createElement('div');
    progressContainer.id = 'upload-progress';
    progressContainer.className = 'upload-progress';
    document.body.appendChild(progressContainer);
  }

  progressContainer.innerHTML = `
    <div class="upload-progress-content">
      <div class="upload-progress-message">${message}</div>
      <div class="upload-progress-bar">
        <div class="upload-progress-fill" style="width: ${percent}%"></div>
      </div>
      <div class="upload-progress-percent">${percent}%</div>
    </div>
  `;

  progressContainer.style.display = 'block';
}

/**
 * Hide upload progress
 */
function hideUploadProgress() {
  const progressContainer = document.getElementById('upload-progress');
  if (progressContainer) {
    progressContainer.style.display = 'none';
  }
}

/**
 * Switch between OPS and MAINT views
 */
function switchView(viewName) {
  const maintNav = document.querySelector('.view-nav-maint');
  const opsNav = document.querySelector('.view-nav-ops');
  const viewTitle = document.getElementById('viewTitle');

  // Update view toggle buttons
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Toggle navigation visibility
  if (viewName === 'maint') {
    maintNav.style.display = 'flex';
    opsNav.style.display = 'none';
    viewTitle.textContent = 'MAINT TERMINAL';

    // Switch to first MAINT tab
    switchTab('maint-dashboard');
  } else if (viewName === 'ops') {
    maintNav.style.display = 'none';
    opsNav.style.display = 'flex';
    viewTitle.textContent = 'OPS TERMINAL';

    // Switch to first OPS tab
    switchTab('ops-dashboard');
  }

  AppState.currentView = viewName;
  console.log(`Switched to ${viewName.toUpperCase()} view`);
}

/**
 * Switch to a different tab within the current view
 */
function switchTab(tabName) {
  // Update tab buttons (only within the current view's navigation)
  const currentNavSelector = AppState.currentView === 'maint' ? '.view-nav-maint' : '.view-nav-ops';
  const currentNav = document.querySelector(currentNavSelector);

  if (currentNav) {
    currentNav.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
  }

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === tabName);
  });

  // Render tabs when accessed
  switch (tabName) {
    case 'due-lists':
      renderDueListsTab();
      break;
    case 'ops-dashboard':
      renderOPSDashboard();
      break;
    case 'fleet-records':
      renderFleetRecords();
      break;
    case 'fleet-planning':
      renderFleetPlanning();
      break;
    case 'capex':
      renderCapExDetail();
      break;
    case 'engine-stock':
      renderEngineStock();
      break;
    case 'propeller-stock':
      renderPropellerStock();
      break;
    case 'data-sources':
      renderDataSources();
      break;
  }

  AppState.currentTab = tabName;
  console.log(`Switched to tab: ${tabName}`);
}

/**
 * Refresh all data
 */
async function refreshData() {
  console.log('Refreshing data...');
  const btnRefresh = document.getElementById('btnRefresh');

  if (btnRefresh) {
    btnRefresh.disabled = true;
    btnRefresh.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>';
  }

  await loadAllData();

  if (btnRefresh) {
    btnRefresh.disabled = false;
    btnRefresh.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>';
  }

  updateTimestamp();
}

/**
 * Update timestamp to show data-as-of date (not current time)
 */
function updateTimestamp() {
  const timestampEl = document.getElementById('lastUpdated');
  if (timestampEl) {
    if (AppState.dataAsOfDate) {
      const asOfDate = new Date(AppState.dataAsOfDate);
      timestampEl.textContent = `Data as of: ${asOfDate.toLocaleDateString()} ${asOfDate.toLocaleTimeString()}`;
    } else {
      timestampEl.textContent = 'Data as of: Loading...';
    }
  }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
  if (e.altKey) {
    switch (e.key) {
      case '1':
        switchTab('maintenance-control');
        break;
      case '2':
        switchTab('data-sources');
        break;
      case 'r':
        refreshData();
        break;
    }
  }
}

/**
 * Show error message
 */
function showError(message) {
  showMessage(message, 'error');
}

// ============================================================================
// OPS TERMINAL RENDERING FUNCTIONS
// ============================================================================

/**
 * Render OPS Dashboard with financial metrics
 */
function renderOPSDashboard() {
  console.log('Rendering OPS Dashboard...');

  if (AppState.financialMetrics.length === 0) {
    console.log('No financial metrics data available');
    return;
  }

  const latestMetrics = AppState.financialMetrics[0]; // Get latest metrics

  // Update stat cards with dynamic data
  const statsGrid = document.querySelector('#ops-dashboard .stats-grid');
  if (!statsGrid) return;

  statsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Monthly Revenue</div>
      <div class="stat-value">$${(latestMetrics.total_revenue / 1000000).toFixed(1)}M</div>
      <div class="stat-change positive">+${latestMetrics.profit_margin.toFixed(1)}% margin</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Utilization Rate</div>
      <div class="stat-value">${latestMetrics.fleet_utilization_percent.toFixed(1)}%</div>
      <div class="stat-change ${latestMetrics.fleet_utilization_percent >= 85 ? 'positive' : 'negative'}">
        ${latestMetrics.fleet_utilization_percent >= 85 ? 'Above target' : 'Below target'}
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Maintenance Cost</div>
      <div class="stat-value">$${(latestMetrics.maintenance_costs / 1000).toFixed(0)}K</div>
      <div class="stat-change">Within budget</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">CapEx This Quarter</div>
      <div class="stat-value">$${(latestMetrics.capex_spending / 1000).toFixed(0)}K</div>
      <div class="stat-change">${AppState.capexTransactions.length} transactions</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Net Profit</div>
      <div class="stat-value">$${(latestMetrics.net_profit / 1000).toFixed(0)}K</div>
      <div class="stat-change positive">+${latestMetrics.profit_margin.toFixed(1)}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Flight Hours</div>
      <div class="stat-value">${latestMetrics.total_flight_hours.toLocaleString()}</div>
      <div class="stat-change">${latestMetrics.total_cycles.toLocaleString()} cycles</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Aircraft Available</div>
      <div class="stat-value">${latestMetrics.aircraft_available} / ${latestMetrics.aircraft_available + latestMetrics.aircraft_in_maintenance}</div>
      <div class="stat-change">${latestMetrics.aircraft_in_maintenance} in maintenance</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Revenue/Flight Hour</div>
      <div class="stat-value">$${latestMetrics.revenue_per_flight_hour}</div>
      <div class="stat-change">Cost: $${latestMetrics.cost_per_flight_hour}/hr</div>
    </div>
  `;

  console.log('OPS Dashboard rendered');
}

/**
 * Render Fleet Records view
 */
function renderFleetRecords() {
  const container = document.getElementById('fleet-records-grid');
  if (!container) return;

  if (AppState.fleetData.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No fleet data available.</p></div>';
    return;
  }

  container.innerHTML = '';
  AppState.fleetData.forEach(aircraft => {
    const card = createFleetCard(aircraft);
    container.appendChild(card);
  });

  console.log('Fleet Records rendered');
}

/**
 * Render Fleet Planning view
 */
function renderFleetPlanning() {
  const container = document.querySelector('#fleet-planning .placeholder-content');
  if (!container || AppState.fleetProjections.length === 0) return;

  const content = document.createElement('section');
  content.className = 'section';
  content.innerHTML = `
    <h3>Fleet Projections</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Tail</th>
          <th>Model</th>
          <th>Planned Action</th>
          <th>Action Date</th>
          <th>Est. Cost</th>
          <th>Hours Remaining</th>
          <th>Utilization Forecast</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${AppState.fleetProjections.map(proj => `
          <tr>
            <td><strong>${proj.tail_number}</strong></td>
            <td>${proj.aircraft_model}</td>
            <td>${proj.planned_action}</td>
            <td>${new Date(proj.action_date).toLocaleDateString()}</td>
            <td>$${(proj.estimated_cost / 1000).toFixed(0)}K</td>
            <td>${proj.projected_hours_remaining.toLocaleString()} hrs</td>
            <td>${proj.utilization_forecast.toFixed(1)}%</td>
            <td><span class="badge ${proj.approval_status === 'Approved' ? 'badge-success' : 'badge-warning'}">${proj.approval_status}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.parentElement.replaceChild(content, container);
  console.log('Fleet Planning rendered');
}

/**
 * Render CapEx Detail view
 */
function renderCapExDetail() {
  const container = document.querySelector('#capex .placeholder-content');
  if (!container || AppState.capexTransactions.length === 0) return;

  const content = document.createElement('section');
  content.className = 'section';
  content.innerHTML = `
    <h3>CapEx Transactions</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Category</th>
          <th>Tail</th>
          <th>Description</th>
          <th>Vendor</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${AppState.capexTransactions.map(txn => `
          <tr>
            <td>${new Date(txn.transaction_date).toLocaleDateString()}</td>
            <td>${txn.category}</td>
            <td><strong>${txn.tail_number || 'N/A'}</strong></td>
            <td>${txn.description}</td>
            <td>${txn.vendor}</td>
            <td>$${txn.amount.toLocaleString()}</td>
            <td><span class="badge ${txn.payment_status === 'Paid' ? 'badge-success' : 'badge-warning'}">${txn.payment_status}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.parentElement.replaceChild(content, container);
  console.log('CapEx Detail rendered');
}

/**
 * Render Engine Stock view
 */
function renderEngineStock() {
  const container = document.querySelector('#engine-stock .placeholder-content');
  if (!container || AppState.engineInventory.length === 0) return;

  const content = document.createElement('section');
  content.className = 'section';
  content.innerHTML = `
    <h3>Engine Inventory</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Serial Number</th>
          <th>Model</th>
          <th>Status</th>
          <th>Location</th>
          <th>Total Time</th>
          <th>TSO</th>
          <th>Time to TBO</th>
          <th>Next Overhaul</th>
          <th>Condition</th>
        </tr>
      </thead>
      <tbody>
        ${AppState.engineInventory.map(engine => `
          <tr>
            <td><strong>${engine.engine_serial_number}</strong></td>
            <td>${engine.engine_model}</td>
            <td><span class="badge ${engine.current_status === 'Installed' ? 'badge-success' : engine.current_status === 'Stock' ? 'badge-info' : 'badge-warning'}">${engine.current_status}</span></td>
            <td>${engine.location}</td>
            <td>${engine.total_time_hours.toFixed(1)} hrs</td>
            <td>${engine.time_since_overhaul.toFixed(1)} hrs</td>
            <td>${engine.time_remaining_to_overhaul.toFixed(1)} hrs</td>
            <td>${new Date(engine.next_overhaul_date).toLocaleDateString()}</td>
            <td>${engine.condition}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.parentElement.replaceChild(content, container);
  console.log('Engine Stock rendered');
}

/**
 * Render Propeller Stock view
 */
function renderPropellerStock() {
  const container = document.querySelector('#propeller-stock .placeholder-content');
  if (!container || AppState.propellerInventory.length === 0) return;

  const content = document.createElement('section');
  content.className = 'section';
  content.innerHTML = `
    <h3>Propeller Inventory</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Serial Number</th>
          <th>Model</th>
          <th>Status</th>
          <th>Location</th>
          <th>Total Time</th>
          <th>TSO</th>
          <th>Time to TBO</th>
          <th>Next Overhaul</th>
          <th>Condition</th>
        </tr>
      </thead>
      <tbody>
        ${AppState.propellerInventory.map(prop => `
          <tr>
            <td><strong>${prop.propeller_serial_number}</strong></td>
            <td>${prop.propeller_model}</td>
            <td><span class="badge ${prop.current_status === 'Installed' ? 'badge-success' : prop.current_status === 'Stock' ? 'badge-info' : 'badge-warning'}">${prop.current_status}</span></td>
            <td>${prop.location}</td>
            <td>${prop.total_time_hours.toFixed(1)} hrs</td>
            <td>${prop.time_since_overhaul.toFixed(1)} hrs</td>
            <td>${prop.time_remaining_to_overhaul.toFixed(1)} hrs</td>
            <td>${new Date(prop.next_overhaul_date).toLocaleDateString()}</td>
            <td>${prop.condition}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.parentElement.replaceChild(content, container);
  console.log('Propeller Stock rendered');
}

/**
 * Render Data Sources tab - read-only view of loaded datasets
 */
async function renderDataSources() {
  const container = document.getElementById('data-sources-table');
  if (!container) return;

  // Dataset descriptions
  const descriptions = {
    'fleet_master': 'Aircraft fleet registry with tail numbers, models, status, and ownership',
    'fleet_asset_import': 'Aircraft operational status and fleet assignments',
    'aircraft_times': 'Current aircraft times (AFTT, landings, cycles, engine/prop hours)',
    'daily_routes': 'Daily route assignments showing which aircraft flies which route',
    'due_lists': 'Maintenance due items for all aircraft (inspections, tasks, compliance)',
    'aircraft_status_history': 'Historical aircraft status changes and maintenance events',
    'route_swaps': 'Planned future route swaps and schedule changes',
    'aircraft_utilization': 'Forecast flight hours and cycles for maintenance planning',
    'forecast_settings': 'Maintenance forecast parameters and utilization assumptions'
  };

  try {
    // Load metadata with cache-busting
    const cacheBust = `?_=${Date.now()}`;
    const metaResponse = await fetch(SnapshotHistory.dataUrl('_meta') + cacheBust);
    const meta = await metaResponse.json();

    // Get report date from aircraft_times if available
    let reportDate = 'N/A';
    if (AppState.aircraftTimes && AppState.aircraftTimes.length > 0) {
      const firstRecord = AppState.aircraftTimes[0];
      if (firstRecord['REPORT DATE']) {
        reportDate = firstRecord['REPORT DATE'].split(' ')[0]; // Extract date part
      }
    }

    // Build table rows
    const rows = Object.keys(meta.datasets).map(key => {
      const dataset = meta.datasets[key];
      const fileName = `${key}.json`;
      const description = descriptions[key] || 'Dataset';
      const rowCount = dataset.row_count || 0;
      // Use report date for fleet_master, otherwise use metadata as_of_date
      const asOfDate = (key === 'fleet_master' && reportDate !== 'N/A') ? reportDate : (dataset.as_of_date || 'N/A');
      const sourceSheet = dataset.source_sheet || 'N/A';

      return `
        <tr>
          <td><strong>${fileName}</strong></td>
          <td>${description}</td>
          <td>${rowCount.toLocaleString()}</td>
          <td>${asOfDate}</td>
          <td>${sourceSheet}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>File</th>
            <th>What It Is</th>
            <th>Row Count</th>
            <th>As-of Date</th>
            <th>Source Sheet</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; border-radius: 4px;">
        <p style="margin: 0; font-size: 0.9rem; color: #94a3b8;">
          <strong>Source:</strong> ${meta.source_workbook}<br>
          <strong>Generated:</strong> ${meta.generated_at}
        </p>
      </div>
    `;

    console.log('Data Sources rendered');
  } catch (error) {
    console.error('Error loading data sources metadata:', error);
    container.innerHTML = '<div class="empty-state"><p>Unable to load data sources metadata.</p></div>';
  }
}

/**
 * Debounce function for input handlers
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose for debugging
window.AppState = AppState;
window.refreshData = refreshData;// ============================================================================
// MAINTENANCE FORECAST FEATURE
// ============================================================================
// Algorithm: Cluster upcoming maintenance checks and recommend route swaps
// to stagger them, preventing multiple aircraft from being grounded simultaneously.
// ============================================================================

// NO MORE MOCK DATA - using real extracted data from AppState

/**
 * Run the maintenance forecast analysis
 * REAL DATA: Uses getTodayDate() for ?asof support, excludes inactive aircraft
 */
function runForecastAnalysis() {
  const horizon = parseInt(document.getElementById('forecast-horizon').value) || 90;
  const clusterWindow = parseInt(document.getElementById('cluster-threshold').value) || 14;
  const minAircraft = parseInt(document.getElementById('min-cluster-size').value) || 2;

  console.log(`🔍 Running forecast analysis: horizon=${horizon}, window=${clusterWindow}, min=${minAircraft}`);

  // Step 1: Get upcoming due items within horizon
  const upcomingDue = getUpcomingDueItems(horizon);
  console.log(`✓ Found ${upcomingDue.length} upcoming due items after filters`);

  // Step 2: Identify clusters by task name
  const clusters = identifyClusters(upcomingDue, clusterWindow, minAircraft);
  console.log(`✓ Identified ${clusters.length} clusters`);

  // Step 3: Generate swap recommendations
  const swapRecommendations = generateSwapRecommendations(clusters, clusterWindow);
  console.log(`✓ Generated ${swapRecommendations.length} swap recommendations`);

  // Step 4: Render results
  renderForecastResults(clusters, swapRecommendations);
  renderUtilizationData();
}

/**
 * Get upcoming due items within forecast horizon
 * REAL DATA: Uses getTodayDate() for ?asof, excludes N863MA/N1037N/N208N/N9469B
 * Days calculation matches Dashboard sheet logic (no unit conversion)
 */
function getUpcomingDueItems(horizon) {
  const EXCLUDED_AIRCRAFT = ['N863MA', 'N1037N', 'N208N', 'N9469B'];
  const today = getTodayDate();

  const items = [];
  let countTotal = 0;
  let countExcluded = 0;
  let countNoData = 0;
  let countOutOfRange = 0;

  AppState.dueLists.forEach(item => {
    countTotal++;

    // Filter 1: Exclude inactive aircraft
    if (EXCLUDED_AIRCRAFT.includes(item.tail_number)) {
      countExcluded++;
      return;
    }

    // Determine if this is an operational item (hours/cycles/landings)
    const intervalType = (item.interval_type || '').toLowerCase();
    const isOperationalItem = /hours?|hrs?|cycles?|cyc|landings?|ldg/i.test(intervalType);

    let days = null;
    let dueDate = null;

    if (isOperationalItem) {
      // Operational item: use projected_days
      const projDays = parseFloat(item.projected_days);
      if (!isNaN(projDays) && projDays >= 0) {
        days = Math.round(projDays);
        dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + days);
      } else {
        countNoData++;
        return;
      }
    } else {
      // Calendar item: use forecast_due_date ONLY if original Forecast Due column had a value
      // This matches the workbook's logic: items without original Forecast Due are skipped
      if (!item.forecast_due_original_present) {
        countNoData++;
        return;
      }

      const forecastDue = item.forecast_due_date;
      if (forecastDue) {
        dueDate = new Date(forecastDue);
        // Validate date (reject dates before 2000-01-01)
        if (isNaN(dueDate.getTime()) || dueDate < new Date('2000-01-01')) {
          countNoData++;
          return;
        }
        days = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
      } else {
        countNoData++;
        return;
      }
    }

    // Filter 2: Include if 0 <= days <= horizon
    if (days >= 0 && days <= horizon) {
      // Parse remaining_life for display (extract x from "x(y)" format)
      let remainingDisplay = String(item.remaining_life || item.remaining_value || '');
      const match = remainingDisplay.match(/^([\d.]+)/);
      if (match) {
        remainingDisplay = match[1];
      }

      items.push({
        ...item,
        days_until_due: days,
        due_date: dueDate,
        is_operational: isOperationalItem,
        remaining_display: remainingDisplay,
        basis: isOperationalItem ? intervalType : 'calendar'
      });
    } else {
      countOutOfRange++;
    }
  });

  console.log(`  📊 Filter breakdown: total=${countTotal}, excluded=${countExcluded}, no_data=${countNoData}, out_of_range=${countOutOfRange}, kept=${items.length}`);
  return items;
}

/**
 * Normalize task name for grouping
 * Removes serial numbers, part numbers, collapses whitespace
 * Merges duplicate 200-hour inspection names
 */
function normalizeTaskName(task) {
  if (!task) return '';

  let normalized = String(task).trim().toUpperCase();

  // Collapse multiple spaces/tabs to single space
  normalized = normalized.replace(/\s+/g, ' ');

  // Remove common serial/part number patterns at end
  // Examples: "INSPECT VALVE S/N 12345" -> "INSPECT VALVE"
  //           "REPLACE PART P/N ABC-123" -> "REPLACE PART"
  normalized = normalized.replace(/\s+(S\/N|P\/N|SN|PN|SERIAL|PART)\s+[\w-]+$/i, '');
  normalized = normalized.replace(/\s+[A-Z0-9]{3,}-[A-Z0-9]+$/i, ''); // ABC-123 pattern
  normalized = normalized.replace(/\s+\d{4,}$/i, ''); // Trailing 4+ digit numbers

  // Merge duplicate 200-hour inspection variants into one canonical name
  // This fixes the duplicate "200 HOUR" entries (High and Medium severity)
  if (normalized.includes('200') && normalized.includes('HOUR') && normalized.includes('MARTINAIRE')) {
    // Normalize all variations to a single canonical form
    normalized = 'MARTINAIRE A.A.I.P. 200 HOUR/12 MONTH INSPECTION - ENGINE';
  }

  return normalized.trim();
}

/**
 * Identify clusters by task name with sliding window
 * Groups items by normalized task, finds aircraft whose days converge within window
 */
function identifyClusters(items, window, minAircraft) {
  const EXCLUDED_AIRCRAFT = ['N863MA', 'N1037N', 'N208N', 'N9469B'];

  // Group by normalized task name
  const taskGroups = {};
  items.forEach(item => {
    if (EXCLUDED_AIRCRAFT.includes(item.tail_number)) return;

    const taskKey = normalizeTaskName(item.task_description || item['Task / Inspection']);
    if (!taskKey) return;

    if (!taskGroups[taskKey]) {
      taskGroups[taskKey] = [];
    }
    taskGroups[taskKey].push(item);
  });

  const clusters = [];

  // For each task group, find the largest sliding window
  Object.entries(taskGroups).forEach(([taskKey, taskItems]) => {
    // Get unique aircraft in this task
    const aircraftMap = {};
    taskItems.forEach(item => {
      const tail = item.tail_number;
      // Keep the earliest due item per aircraft for this task
      if (!aircraftMap[tail] || item.days_until_due < aircraftMap[tail].days_until_due) {
        aircraftMap[tail] = item;
      }
    });

    const uniqueItems = Object.values(aircraftMap);

    // Need at least minAircraft distinct aircraft
    if (uniqueItems.length < minAircraft) return;

    // Sort by days_until_due
    uniqueItems.sort((a, b) => a.days_until_due - b.days_until_due);

    // Find largest sliding window where max - min <= window
    let bestWindow = [];
    for (let i = 0; i < uniqueItems.length; i++) {
      const windowItems = [uniqueItems[i]];
      for (let j = i + 1; j < uniqueItems.length; j++) {
        const spread = uniqueItems[j].days_until_due - uniqueItems[i].days_until_due;
        if (spread <= window) {
          windowItems.push(uniqueItems[j]);
        } else {
          break;
        }
      }

      if (windowItems.length >= minAircraft && windowItems.length > bestWindow.length) {
        bestWindow = windowItems;
      }
    }

    if (bestWindow.length >= minAircraft) {
      const minDays = bestWindow[0].days_until_due;
      const maxDays = bestWindow[bestWindow.length - 1].days_until_due;
      const spread = maxDays - minDays;

      // Determine basis (hours/cycles/landings/calendar)
      const basisSet = new Set(bestWindow.map(i => i.basis));
      const basis = basisSet.size === 1 ? bestWindow[0].basis : 'mixed';

      // Determine severity based on earliest days
      let severity = 'low';
      if (minDays <= 30) severity = 'high';
      else if (minDays <= 60) severity = 'medium';

      clusters.push({
        task: taskKey,
        original_task: bestWindow[0].task_description || bestWindow[0]['Task / Inspection'],
        aircraft_count: bestWindow.length,
        items: bestWindow,
        aircraft: bestWindow.map(i => ({
          tail: i.tail_number,
          days: i.days_until_due,
          date: i.due_date
        })),
        min_days: minDays,
        max_days: maxDays,
        spread: spread,
        basis: basis,
        severity: severity,
        is_calendar: basis === 'calendar'
      });
    }
  });

  // Sort: swappable (hrs/ldg/cyc) first, then calendar, then by earliest days, then by aircraft count
  clusters.sort((a, b) => {
    // Calendar clusters go last
    if (a.is_calendar && !b.is_calendar) return 1;
    if (!a.is_calendar && b.is_calendar) return -1;

    // Within each group, sort by earliest days, then aircraft count
    if (a.min_days !== b.min_days) return a.min_days - b.min_days;
    return b.aircraft_count - a.aircraft_count;
  });

  return clusters;
}

/**
 * Generate route swap recommendations grouped by SOURCE aircraft
 * One card per source aircraft, listing all inspections it improves
 * Targets allocated uniquely: no target used twice, no target is also a source
 * @param {Array} clusters - Array of cluster objects
 * @param {number} clusterWindow - Cluster window in days (default 14)
 */
function generateSwapRecommendations(clusters, clusterWindow = 14) {
  const EXCLUDED_AIRCRAFT = ['N863MA', 'N1037N', 'N208N', 'N9469B'];

  // Get aircraft with "In Progress" status from status history
  const inProgressTails = new Set();
  if (AppState.statusHistory && Array.isArray(AppState.statusHistory)) {
    AppState.statusHistory.forEach(entry => {
      const workStage = (entry.WORK_STAGE || entry.work_stage || '').toUpperCase();
      if (workStage === 'IN PROGRESS') {
        inProgressTails.add(entry.tail_number);
      }
    });
  }

  // Get standby and customer aircraft from fleet master
  const standbyTails = new Set();
  const customerTails = new Set();
  if (AppState.fleetData && Array.isArray(AppState.fleetData)) {
    AppState.fleetData.forEach(ac => {
      const status = (ac.status || ac.Status || '').toUpperCase();
      if (status.includes('STANDBY') || status === 'STBY') {
        standbyTails.add(ac.tail_number);
      }
      if (status.includes('CUSTOMER') || status === 'CUST') {
        customerTails.add(ac.tail_number);
      }
    });
  }

  // Step 1: Collect all source aircraft and their inspections
  const sourceCards = {}; // source_tail -> { inspections: [], earliest_days, all_cluster_tails: Set }

  clusters.forEach(cluster => {
    // Skip calendar clusters
    if (cluster.is_calendar) return;
    if (cluster.items.length < 2) return;

    const sortedItems = [...cluster.items].sort((a, b) => a.days_until_due - b.days_until_due);
    const sourceTail = sortedItems[1].tail_number; // 2nd-earliest is the source (1st is already critical)
    const sourceItem = sortedItems[1];

    if (!sourceCards[sourceTail]) {
      sourceCards[sourceTail] = {
        source_tail: sourceTail,
        inspections: [],
        earliest_days: sourceItem.days_until_due,
        earliest_severity: cluster.severity,
        all_cluster_tails: new Set() // Collect all tails from all clusters this source appears in
      };
    }

    // Add this inspection to the source's card
    // Store cluster items with their days for spread calculation later
    sourceCards[sourceTail].inspections.push({
      task: cluster.task,
      current_days: sourceItem.days_until_due,
      severity: cluster.severity,
      basis: cluster.basis,
      cluster_items: cluster.items.map(i => ({ tail: i.tail_number, days: i.days_until_due }))
    });

    // Track earliest due and highest severity
    if (sourceItem.days_until_due < sourceCards[sourceTail].earliest_days) {
      sourceCards[sourceTail].earliest_days = sourceItem.days_until_due;
      sourceCards[sourceTail].earliest_severity = cluster.severity;
    }

    // Collect all cluster aircraft tails
    cluster.items.forEach(i => sourceCards[sourceTail].all_cluster_tails.add(i.tail_number));
  });

  // Step 2: Sort source cards by earliest due inspection
  const sortedSources = Object.values(sourceCards).sort((a, b) => a.earliest_days - b.earliest_days);

  // Step 3: Assign targets to each source card
  const usedTargets = new Set();
  const sourceSet = new Set(sortedSources.map(s => s.source_tail));

  const swapCards = [];

  sortedSources.forEach(sourceCard => {
    // For this source, get available targets
    const availableTargets = AppState.aircraftUtilization
      .filter(u => {
        const tail = u.AIRCRAFT;
        return tail !== sourceCard.source_tail && // Not the source itself
               !sourceCard.all_cluster_tails.has(tail) && // Not in any of this source's clusters
               !EXCLUDED_AIRCRAFT.includes(tail) &&
               !inProgressTails.has(tail) &&
               !standbyTails.has(tail) &&
               !customerTails.has(tail) &&
               !usedTargets.has(tail) && // Not already used as a target
               !sourceSet.has(tail); // Not a source aircraft in another card
      })
      .map(u => ({
        tail: u.AIRCRAFT,
        hours_rate: parseFloat(u.FORECAST_HOURS) || 0,
        cycles_rate: parseFloat(u.FORECAST_CYCLES) || 0,
        landings_rate: parseFloat(u.FORECAST_LANDINGS) || 0,
        route: findCurrentRoute(u.AIRCRAFT)
      }))
      .filter(a => a.hours_rate > 0 || a.cycles_rate > 0 || a.landings_rate > 0);

    if (availableTargets.length === 0) {
      // No valid target
      swapCards.push({
        type: 'no_target',
        source_tail: sourceCard.source_tail,
        inspections: sourceCard.inspections,
        earliest_days: sourceCard.earliest_days,
        max_severity: sourceCard.earliest_severity
      });
      return;
    }

    // Choose lowest utilization target (use hours as primary)
    availableTargets.sort((a, b) => a.hours_rate - b.hours_rate);
    const target = availableTargets[0];
    usedTargets.add(target.tail);

    // Recompute from/to days for all inspections using this target's rate
    // Filter to keep only inspections that meet spread criteria
    const inspectionsWithDays = sourceCard.inspections.map(insp => {
      const basisMap = {
        'hours': 'hours_rate', 'hrs': 'hours_rate', 'hour': 'hours_rate',
        'cycles': 'cycles_rate', 'cyc': 'cycles_rate', 'cycle': 'cycles_rate',
        'landings': 'landings_rate', 'ldg': 'landings_rate', 'landing': 'landings_rate'
      };
      const rateField = basisMap[insp.basis.toLowerCase()] || 'hours_rate';
      const targetRate = target[rateField];

      // Get source aircraft's current rate
      const sourceUtil = AppState.aircraftUtilization.find(u => u.AIRCRAFT === sourceCard.source_tail);
      const sourceRateField = basisMap[insp.basis.toLowerCase()] === 'hours_rate' ? 'FORECAST_HOURS' :
                              basisMap[insp.basis.toLowerCase()] === 'cycles_rate' ? 'FORECAST_CYCLES' : 'FORECAST_LANDINGS';
      const sourceRate = sourceUtil ? parseFloat(sourceUtil[sourceRateField]) || 0 : 0;

      let newDays, gainedDays;
      if (sourceRate > 0 && targetRate > 0) {
        const remainingUnits = insp.current_days * (sourceRate / 365);
        newDays = Math.round(remainingUnits / (targetRate / 365));
        gainedDays = newDays - insp.current_days;
      } else {
        newDays = insp.current_days;
        gainedDays = 0;
      }

      // Calculate before/after spread
      // Before spread: current spread among cluster aircraft
      const clusterDays = insp.cluster_items.map(item => item.days);
      const beforeSpread = Math.max(...clusterDays) - Math.min(...clusterDays);

      // After spread: replace source aircraft's days with newDays
      const afterDays = insp.cluster_items.map(item =>
        item.tail === sourceCard.source_tail ? newDays : item.days
      );
      const afterSpread = Math.max(...afterDays) - Math.min(...afterDays);

      return {
        task: insp.task,
        current_days: insp.current_days,
        new_days: newDays,
        gained_days: gainedDays,
        severity: insp.severity,
        before_spread: beforeSpread,
        after_spread: afterSpread,
        cluster_items: insp.cluster_items
      };
    }).filter(insp => {
      // Keep inspection only if:
      // 1. After-spread > cluster window (separates the aircraft)
      // 2. AND (gained_days > 0 OR (gained_days < 0 AND after_spread > before_spread))
      const separates = insp.after_spread > clusterWindow;
      const worthwhile = insp.gained_days > 0 || (insp.gained_days < 0 && insp.after_spread > insp.before_spread);
      return separates && worthwhile;
    });

    // Only add the swap card if there are qualifying inspections
    if (inspectionsWithDays.length > 0) {
      swapCards.push({
        type: 'swap',
        source_tail: sourceCard.source_tail,
        target_tail: target.tail,
        target_route: target.route || 'unknown',
        target_rate: target.hours_rate, // Use hours as display rate
        inspections: inspectionsWithDays,
        earliest_days: sourceCard.earliest_days,
        max_severity: sourceCard.earliest_severity
      });
    } else {
      // No qualifying inspections after filtering - show "No effective swap available"
      swapCards.push({
        type: 'no_effective_swap',
        source_tail: sourceCard.source_tail,
        target_tail: target.tail,
        inspections: [],
        earliest_days: sourceCard.earliest_days,
        max_severity: sourceCard.earliest_severity
      });
    }
  });

  console.log(`✈️ Source cards: ${swapCards.length}, Targets allocated: ${usedTargets.size}`);
  console.log(`   Sources: ${swapCards.filter(c => c.type === 'swap').map(c => c.source_tail).join(', ')}`);
  console.log(`   Targets: ${Array.from(usedTargets).join(', ')}`);

  // Print each swap card with before/after spread for verification
  console.log(`\n📋 SWAP CARD QUALITY VERIFICATION (cluster window: ${clusterWindow}d):`);
  swapCards.forEach(card => {
    if (card.type === 'swap') {
      console.log(`\n  ✈️ Swap ${card.source_tail} to ${card.target_tail}:`);
      card.inspections.forEach(insp => {
        const spreadDelta = insp.after_spread - insp.before_spread;
        const spreadDeltaSign = spreadDelta >= 0 ? '+' : '';
        console.log(`    • ${insp.task.substring(0, 60)}${insp.task.length > 60 ? '...' : ''}`);
        console.log(`      ${insp.current_days}d → ~${insp.new_days}d (${insp.gained_days >= 0 ? '+' : ''}${insp.gained_days}d); spread ${insp.before_spread}d → ${insp.after_spread}d (${spreadDeltaSign}${spreadDelta}d)`);
      });
    } else if (card.type === 'no_effective_swap') {
      console.log(`\n  ⚠️ ${card.source_tail} → ${card.target_tail}: No effective swap (all inspections filtered out)`);
    } else if (card.type === 'no_target') {
      console.log(`\n  ⚠️ ${card.source_tail}: No suitable target available`);
    }
  });

  // Step 4: Create calendar recommendations
  const calendarRecs = [];
  clusters.forEach(cluster => {
    if (cluster.is_calendar) {
      calendarRecs.push({
        cluster_task: cluster.task,
        type: 'calendar',
        advice: `Calendar-dated inspection. Schedule all ${cluster.aircraft_count} aircraft for this work in a single maintenance visit to minimize downtime.`,
        cluster_id: cluster.task
      });
    }
  });

  return [...swapCards, ...calendarRecs];
}

/**
 * Extract swap cards from recommendations (already grouped by source in generateSwapRecommendations)
 * Returns array of source cards sorted by severity and earliest due
 */
function groupRecommendationsByPair(recommendations) {
  // Swap cards are already properly grouped by source aircraft
  const swapCards = recommendations.filter(r => r.type === 'swap' || r.type === 'no_target' || r.type === 'no_effective_swap');

  // Sort by severity, then earliest days
  swapCards.sort((a, b) => {
    const severityRank = { 'high': 3, 'medium': 2, 'low': 1 };
    if (severityRank[a.max_severity] !== severityRank[b.max_severity]) {
      return severityRank[b.max_severity] - severityRank[a.max_severity];
    }
    return a.earliest_days - b.earliest_days;
  });

  return swapCards;
}

/**
 * Find current route for an aircraft from daily_routes.json
 * Returns the most recent route
 */
function findCurrentRoute(tailNumber) {
  if (!AppState.dailyRoutes || AppState.dailyRoutes.length === 0) return null;

  const routes = AppState.dailyRoutes
    .filter(r => r.AIRCRAFT === tailNumber)
    .sort((a, b) => {
      const dateA = new Date(a.DATE || a.date || 0);
      const dateB = new Date(b.DATE || b.date || 0);
      return dateB - dateA;
    });

  return routes.length > 0 ? (routes[0].DESTINATION || routes[0].destination || routes[0].ROUTE) : null;
}

// Global state for cluster filtering
let globalClusters = [];
let globalRecommendations = [];
let clusterFilter = 'all';

/**
 * Filter clusters by type
 */
function filterClusters(type) {
  clusterFilter = type;

  // Update button states
  document.getElementById('filter-all').className = type === 'all' ? 'btn-small btn-primary' : 'btn-small';
  document.getElementById('filter-swappable').className = type === 'swappable' ? 'btn-small btn-primary' : 'btn-small';
  document.getElementById('filter-calendar').className = type === 'calendar' ? 'btn-small btn-primary' : 'btn-small';

  // Filter and re-render
  let filtered = globalClusters;
  if (type === 'swappable') {
    filtered = globalClusters.filter(c => !c.is_calendar);
  } else if (type === 'calendar') {
    filtered = globalClusters.filter(c => c.is_calendar);
  }

  renderForecastResults(filtered, globalRecommendations, type);
}

/**
 * Render forecast results with grouped swap pairs
 * Decisions stored in localStorage (xwing_demo_forecast_decisions)
 */
function renderForecastResults(clusters, recommendations, filterType = 'all') {
  // Store globally for filtering
  if (filterType === 'all') {
    globalClusters = clusters;
    globalRecommendations = recommendations;
  }
  // Load saved decisions from localStorage
  const savedDecisions = JSON.parse(localStorage.getItem('xwing_demo_forecast_decisions') || '{}');

  // Separate calendar advice and actionable recommendations
  const calendarRecs = recommendations.filter(r => r.type === 'calendar');
  const noDataRecs = recommendations.filter(r => r.type === 'no_data');
  const actionableRecs = recommendations.filter(r => r.type !== 'calendar' && r.type !== 'no_data');

  console.log(`📊 Rendering: ${recommendations.length} total recs, ${calendarRecs.length} calendar, ${actionableRecs.length} actionable`);

  // Group actionable recommendations by aircraft pair
  const swapGroups = groupRecommendationsByPair(actionableRecs);
  console.log(`✈️ Created ${swapGroups.length} swap groups from ${actionableRecs.length} actionable recommendations`);

  // Update cluster count badge
  document.getElementById('cluster-count-badge').textContent = clusters.length;
  document.getElementById('cluster-count-badge').className = clusters.length > 0 ? 'badge' : 'badge zero';

  // Update swap count badge (count number of unique pairs, not individual recs)
  document.getElementById('swap-count-badge').textContent = swapGroups.length;
  document.getElementById('swap-count-badge').className = swapGroups.length > 0 ? 'badge' : 'badge zero';

  // Render clusters with calendar advice
  const clustersContainer = document.getElementById('forecast-clusters');
  if (clusters.length === 0) {
    const horizon = parseInt(document.getElementById('forecast-horizon').value) || 90;
    const window = parseInt(document.getElementById('cluster-threshold').value) || 14;
    const minAircraft = parseInt(document.getElementById('min-cluster-size').value) || 2;
    clustersContainer.innerHTML = `
      <p class="empty-state">
        No maintenance clusters found.<br>
        <small style="color: var(--text-muted);">
          (No identical inspections within ${window} days across ${minAircraft}+ aircraft in the next ${horizon} days)
        </small>
      </p>
    `;
  } else {
    // Show calendar clusters and advice
    const calendarClusters = clusters.filter(c => c.is_calendar);
    const swappableClusters = clusters.filter(c => !c.is_calendar);

    let html = '';

    // Render swappable clusters (if filter allows)
    if (filterType === 'all' || filterType === 'swappable') {
      html += swappableClusters.map(cluster => {
        return `
          <div class="cluster-card ${cluster.severity === 'high' ? '' : (cluster.severity === 'medium' ? 'warning' : 'info')}">
            <div class="cluster-header">
              <div class="cluster-title" title="${escapeHtml(cluster.original_task)}">
                ${escapeHtml(cluster.task.substring(0, 60))}${cluster.task.length > 60 ? '...' : ''}
              </div>
              <span class="cluster-severity ${cluster.severity}">${cluster.severity}</span>
            </div>
            <div class="cluster-details" style="font-size: 0.85rem; color: var(--text-muted); margin: 0.5rem 0;">
              ${cluster.aircraft_count} aircraft | ${cluster.basis} | Spread: ${cluster.spread} days (${cluster.min_days}-${cluster.max_days}d)
            </div>
            <div class="cluster-aircraft-list">
              ${cluster.aircraft.map(ac => `
                <div class="aircraft-chip" title="${ac.tail}: Due ${ac.date.toLocaleDateString()}">
                  ${ac.tail}
                  <span class="due-date">${ac.days}d</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    // Render calendar clusters (if filter allows)
    if (filterType === 'all' || filterType === 'calendar') {
      html += calendarClusters.map(cluster => {
        const calRec = calendarRecs.find(r => r.cluster_id === cluster.task);
        return `
          <div class="cluster-card info">
            <div class="cluster-header">
              <div class="cluster-title" title="${escapeHtml(cluster.original_task)}">
                ${escapeHtml(cluster.task.substring(0, 60))}${cluster.task.length > 60 ? '...' : ''}
              </div>
              <span class="cluster-severity low">calendar</span>
            </div>
            <div class="cluster-details" style="font-size: 0.85rem; color: var(--text-muted); margin: 0.5rem 0;">
              ${cluster.aircraft_count} aircraft | ${cluster.basis} | Spread: ${cluster.spread} days (${cluster.min_days}-${cluster.max_days}d)
            </div>
            <div class="cluster-aircraft-list">
              ${cluster.aircraft.map(ac => `
                <div class="aircraft-chip" title="${ac.tail}: Due ${ac.date.toLocaleDateString()}">
                  ${ac.tail}
                  <span class="due-date">${ac.days}d</span>
                </div>
              `).join('')}
            </div>
            ${calRec ? `
              <div style="margin-top: 1rem; background: var(--bg-secondary); padding: 0.75rem; border-radius: 4px;">
                <div style="font-size: 0.85rem; color: var(--text-muted);">
                  📅 ${escapeHtml(calRec.advice)}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }

    clustersContainer.innerHTML = html || '<p class="empty-state">No clusters match the current filter.</p>';
  }

  // Render swap groups in the "Recommended Route Swaps" section
  const swapsContainer = document.getElementById('forecast-swaps');
  if (swapGroups.length === 0 && calendarRecs.length === 0) {
    swapsContainer.innerHTML = '<p class="empty-state">No swap recommendations available.</p>';
  } else {
    let html = '';

    // Show grouped swaps (only if not filtering to calendar-only)
    if (filterType === 'all' || filterType === 'swappable') {
      html += swapGroups.map(group => renderSwapGroup(group, savedDecisions)).join('');
    }

    swapsContainer.innerHTML = html || '<p class="empty-state">No swappable recommendations available.</p>';
  }

  // Re-apply access control to newly rendered forecast buttons
  applyUIAccessControl();
}

/**
 * Render a swap card (one source aircraft, all its inspections)
 * Card ID: source_tail
 */
function renderSwapGroup(card, savedDecisions) {
  // Handle "no target" case
  if (card.type === 'no_target') {
    return `
      <div class="cluster-card info" style="margin-bottom: 1rem;">
        <div class="cluster-header">
          <div class="cluster-title">
            Swap ${escapeHtml(card.source_tail)} - No suitable target available
          </div>
          <span class="cluster-severity ${card.max_severity}">${card.max_severity}</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin: 0.5rem 0;">
          ${card.inspections.length} inspection${card.inspections.length > 1 ? 's' : ''} | All valid targets already allocated or unavailable
        </div>
      </div>
    `;
  }

  // Handle "no effective swap" case
  if (card.type === 'no_effective_swap') {
    return `
      <div class="cluster-card info" style="margin-bottom: 1rem;">
        <div class="cluster-header">
          <div class="cluster-title">
            Swap ${escapeHtml(card.source_tail)} to ${escapeHtml(card.target_tail)} - No effective swap available
          </div>
          <span class="cluster-severity ${card.max_severity}">${card.max_severity}</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin: 0.5rem 0;">
          No inspections meet spread separation criteria (after-spread must exceed cluster window)
        </div>
      </div>
    `;
  }

  // Normal swap card
  const cardId = card.source_tail;
  const decision = savedDecisions[cardId];

  const statusBadge = decision
    ? `<span class="status-badge ${decision === 'accepted' ? 'status-green' : 'status-red'}" style="margin-left: 0.5rem; font-size: 0.75rem;">${decision.toUpperCase()}</span>`
    : '';

  // Show target route and rate
  const targetInfo = card.target_route && card.target_route !== 'unknown'
    ? `${card.target_route} (${card.target_rate}/yr)`
    : `${card.target_tail} (${card.target_rate}/yr)`;

  return `
    <div class="cluster-card ${card.max_severity === 'high' ? '' : (card.max_severity === 'medium' ? 'warning' : 'info')}" style="margin-bottom: 1rem;">
      <div class="cluster-header">
        <div class="cluster-title">
          Swap ${escapeHtml(card.source_tail)} to ${escapeHtml(card.target_tail)}${statusBadge}
        </div>
        <span class="cluster-severity ${card.max_severity}">${card.max_severity}</span>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin: 0.5rem 0;">
        Target: ${escapeHtml(targetInfo)} | ${card.inspections.length} inspection${card.inspections.length > 1 ? 's' : ''} improved
      </div>
      <div style="background: var(--bg-secondary); padding: 0.75rem; border-radius: 4px; margin: 0.5rem 0;">
        ${card.inspections.map(insp => {
          const gainSign = insp.gained_days >= 0 ? '+' : '';
          return `
            <div style="font-size: 0.85rem; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              <div style="font-weight: 600; margin-bottom: 0.25rem;">${escapeHtml(insp.task.substring(0, 50))}${insp.task.length > 50 ? '...' : ''}</div>
              <div style="color: var(--text-muted);">
                ${insp.current_days}d → ~${insp.new_days}d (${gainSign}${insp.gained_days}d); spread ${insp.before_spread}d → ${insp.after_spread}d
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; align-items: center;">
        <button
          class="btn-small btn-accept ${decision === 'accepted' ? 'btn-primary' : ''}"
          onclick="handleSwapGroupDecision('${cardId}', 'accepted')"
          ${decision === 'accepted' ? 'disabled' : ''}
        >
          ✓ Accept
        </button>
        <button
          class="btn-small btn-reject ${decision === 'rejected' ? 'btn-secondary' : ''}"
          onclick="handleSwapGroupDecision('${cardId}', 'rejected')"
          ${decision === 'rejected' ? 'disabled' : ''}
        >
          ✗ Reject
        </button>
      </div>
    </div>
  `;
}

/**
 * Render a single recommendation with Accept/Reject buttons
 * (Legacy function - kept for compatibility)
 */
function renderRecommendation(rec, index, savedDecisions) {
  const recId = `${rec.cluster_task}_${index}`;
  const decision = savedDecisions[recId];

  // Calendar advice (no buttons)
  if (rec.type === 'calendar') {
    return `
      <div class="swap-recommendation" style="background: var(--bg-secondary); padding: 0.75rem; border-radius: 4px; margin-bottom: 0.5rem;">
        <div style="font-size: 0.85rem; color: var(--text-muted);">
          📅 ${escapeHtml(rec.advice)}
        </div>
      </div>
    `;
  }

  // No data advice (no buttons)
  if (rec.type === 'no_data') {
    return `
      <div class="swap-recommendation" style="background: var(--bg-secondary); padding: 0.75rem; border-radius: 4px; margin-bottom: 0.5rem;">
        <div style="font-size: 0.85rem; color: var(--text-muted);">
          ⚠️ ${escapeHtml(rec.advice)}
        </div>
      </div>
    `;
  }

  // Actionable recommendation with Accept/Reject
  const statusBadge = decision
    ? `<span class="status-badge ${decision === 'accepted' ? 'status-green' : 'status-red'}" style="margin-left: 0.5rem;">${decision.toUpperCase()}</span>`
    : '';

  return `
    <div class="swap-recommendation" style="background: var(--bg-secondary); padding: 0.75rem; border-radius: 4px; margin-bottom: 0.5rem;">
      <div class="swap-recommendation-title">
        ${rec.action} Recommendation${statusBadge}
      </div>
      <div style="font-size: 0.85rem; margin: 0.5rem 0;">
        ${escapeHtml(rec.reason)}
      </div>
      ${!rec.has_data ? '<div style="font-size: 0.75rem; color: var(--warning); margin-top: 0.25rem;">⚠️ Missing route data for one or both aircraft</div>' : ''}
      <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; align-items: center;">
        <button
          class="btn-small btn-accept ${decision === 'accepted' ? 'btn-primary' : ''}"
          onclick="handleForecastDecision('${recId}', 'accepted')"
          ${decision === 'accepted' ? 'disabled' : ''}
        >
          ✓ Accept
        </button>
        <button
          class="btn-small btn-reject ${decision === 'rejected' ? 'btn-secondary' : ''}"
          onclick="handleForecastDecision('${recId}', 'rejected')"
          ${decision === 'rejected' ? 'disabled' : ''}
        >
          ✗ Reject
        </button>
      </div>
    </div>
  `;
}

/**
 * Handle Accept/Reject decision for a swap group
 * Stores decision in localStorage and re-renders
 */
function handleSwapGroupDecision(groupId, decision) {
  const savedDecisions = JSON.parse(localStorage.getItem('xwing_demo_forecast_decisions') || '{}');
  savedDecisions[groupId] = decision;
  localStorage.setItem('xwing_demo_forecast_decisions', JSON.stringify(savedDecisions));

  console.log(`✓ Swap group ${groupId} ${decision}`);

  // Re-run analysis to refresh UI
  runForecastAnalysis();
}

/**
 * Handle Accept/Reject decision for a recommendation
 * (Legacy function - kept for compatibility)
 * Stores decision in localStorage and re-renders
 */
function handleForecastDecision(recId, decision) {
  const savedDecisions = JSON.parse(localStorage.getItem('xwing_demo_forecast_decisions') || '{}');
  savedDecisions[recId] = decision;
  localStorage.setItem('xwing_demo_forecast_decisions', JSON.stringify(savedDecisions));

  console.log(`✓ Recommendation ${recId} ${decision}`);

  // Re-run analysis to refresh UI
  runForecastAnalysis();
}

/**
 * Render utilization data table
 */
function renderUtilizationData() {
  const utilizationContainer = document.getElementById('utilization-data');

  utilizationContainer.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Aircraft</th>
          <th>Forecast Hours</th>
          <th>Forecast Cycles</th>
          <th>Forecast Landings</th>
          <th>Forecast Basis</th>
        </tr>
      </thead>
      <tbody>
        ${AppState.aircraftUtilization.map(u => `
          <tr>
            <td><strong>${escapeHtml(u.AIRCRAFT || u.tail_number)}</strong></td>
            <td>${u.FORECAST_HOURS || u.forecast_hours || 'N/A'}/year</td>
            <td>${u.FORECAST_CYCLES || u.forecast_cycles || 'N/A'}/year</td>
            <td>${u.FORECAST_LANDINGS || u.forecast_landings || 'N/A'}/year</td>
            <td><span class="status-badge ${(u.FORECAST_BASIS || u.forecast_basis || '').includes('actual') ? 'status-green' : 'status-blue'}">${escapeHtml(u.FORECAST_BASIS || u.forecast_basis || 'N/A')}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Auto-run on tab switch
document.addEventListener('DOMContentLoaded', () => {
  // Re-run analysis when tab is opened
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'mx-forecast') {
        setTimeout(() => runForecastAnalysis(), 100);
      }
    });
  });
});
