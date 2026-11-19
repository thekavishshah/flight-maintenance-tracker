// ============================================================================
// MAINTENANCE FORECAST FEATURE
// ============================================================================
// Algorithm: Cluster upcoming maintenance checks and recommend route swaps
// to stagger them, preventing multiple aircraft from being grounded simultaneously.
// ============================================================================

// Mock data for Aircraft Utilization (replace with actual Domo dataset)
const mockAircraftUtilization = [
  { AIRCRAFT: 'N1120W', FORECAST_HOURS: 320, FORECAST_CYCLES: 310, FORECAST_LANDINGS: 310, FORECAST_BASIS: '3-month actual' },
  { AIRCRAFT: 'N1119V', FORECAST_HOURS: 280, FORECAST_CYCLES: 290, FORECAST_LANDINGS: 290, FORECAST_BASIS: '3-month actual' },
  { AIRCRAFT: 'N9760B', FORECAST_HOURS: 300, FORECAST_CYCLES: 300, FORECAST_LANDINGS: 300, FORECAST_BASIS: '300/year default' },
  { AIRCRAFT: 'N9761B', FORECAST_HOURS: 340, FORECAST_CYCLES: 330, FORECAST_LANDINGS: 330, FORECAST_BASIS: '3-month actual' },
  { AIRCRAFT: 'N9331B', FORECAST_HOURS: 300, FORECAST_CYCLES: 300, FORECAST_LANDINGS: 300, FORECAST_BASIS: '300/year default' },
  { AIRCRAFT: 'N1041L', FORECAST_HOURS: 290, FORECAST_CYCLES: 285, FORECAST_LANDINGS: 285, FORECAST_BASIS: '3-month actual' },
  { AIRCRAFT: 'N4655B', FORECAST_HOURS: 300, FORECAST_CYCLES: 300, FORECAST_LANDINGS: 300, FORECAST_BASIS: '300/year default' },
  { AIRCRAFT: 'N4625B', FORECAST_HOURS: 315, FORECAST_CYCLES: 305, FORECAST_LANDINGS: 305, FORECAST_BASIS: '3-month actual' }
];

// Mock forecast settings
const mockForecastSettings = {
  'Flight Hours': { ANNUAL_RATE: 300, DAILY_RATE: 0.822 },
  'Cycles': { ANNUAL_RATE: 300, DAILY_RATE: 0.822 },
  'Landings': { ANNUAL_RATE: 300, DAILY_RATE: 0.822 }
};

// Mock daily routes for swap recommendations
const mockDailyRoutes = [
  { ROUTE_DATE: '2026-10-20', AIRCRAFT: 'N1120W', DEPARTURE: 'KDFW', DESTINATION: 'KHOU', START_TIME: '08:00' },
  { ROUTE_DATE: '2026-10-20', AIRCRAFT: 'N1119V', DEPARTURE: 'KADS', DESTINATION: 'KDFW', START_TIME: '10:00' },
  { ROUTE_DATE: '2026-10-20', AIRCRAFT: 'N9761B', DEPARTURE: 'KRDU', DESTINATION: 'KCLT', START_TIME: '11:45' },
  { ROUTE_DATE: '2026-10-21', AIRCRAFT: 'N9331B', DEPARTURE: 'KRDU', DESTINATION: 'KCLT', START_TIME: '12:00' },
  { ROUTE_DATE: '2026-10-22', AIRCRAFT: 'N1041L', DEPARTURE: 'KDFW', DESTINATION: 'KHOU', START_TIME: '09:00' }
];

/**
 * Run the maintenance forecast analysis
 */
function runForecastAnalysis() {
  const horizon = parseInt(document.getElementById('forecast-horizon').value) || 60;
  const clusterThreshold = parseInt(document.getElementById('cluster-threshold').value) || 7;
  const minClusterSize = parseInt(document.getElementById('min-cluster-size').value) || 3;

  console.log(`Running forecast analysis: horizon=${horizon}, threshold=${clusterThreshold}, min=${minClusterSize}`);

  // Step 1: Get upcoming due items within horizon
  const upcomingDue = getUpcomingDueItems(horizon);
  console.log(`Found ${upcomingDue.length} upcoming due items`);

  // Step 2: Project forward using utilization forecasts
  const projectedDue = projectDueDates(upcomingDue);
  console.log(`Projected ${projectedDue.length} due dates`);

  // Step 3: Identify clusters
  const clusters = identifyClusters(projectedDue, clusterThreshold, minClusterSize);
  console.log(`Identified ${clusters.length} clusters`);

  // Step 4: Generate swap recommendations
  const swapRecommendations = generateSwapRecommendations(clusters);
  console.log(`Generated ${swapRecommendations.length} swap recommendations`);

  // Step 5: Render results
  renderForecastResults(clusters, swapRecommendations);
  renderUtilizationData();
}

/**
 * Get upcoming due items within forecast horizon
 */
function getUpcomingDueItems(horizon) {
  const today = new Date();
  const horizonDate = new Date(today);
  horizonDate.setDate(horizonDate.getDate() + horizon);

  return AppState.dueLists.filter(item => {
    if (!item.forecast_due_date) return false;

    const dueDate = new Date(item.forecast_due_date);
    const isUpcoming = dueDate >= today && dueDate <= horizonDate;
    const isSignificant = item.compliance_basis !== 'Calendar'; // Focus on usage-based items

    return isUpcoming && isSignificant;
  });
}

/**
 * Project due dates forward using utilization forecasts
 */
function projectDueDates(dueItems) {
  return dueItems.map(item => {
    const utilization = mockAircraftUtilization.find(u => u.AIRCRAFT === item.tail_number);
    const settings = mockForecastSettings[item.compliance_basis] || mockForecastSettings['Flight Hours'];

    // Calculate projected days until due based on utilization rate
    const forecastRate = utilization ? getUtilizationRate(utilization, item.compliance_basis) : settings.ANNUAL_RATE;
    const dailyRate = forecastRate / 365;
    const remainingLife = parseFloat(item.remaining_life) || 0;
    const projectedDays = remainingLife > 0 ? Math.round(remainingLife / dailyRate) : 0;

    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + projectedDays);

    return {
      ...item,
      projected_due_date: projectedDate,
      projected_days: projectedDays,
      forecast_rate: forecastRate,
      forecast_basis: utilization ? utilization.FORECAST_BASIS : '300/year default'
    };
  });
}

/**
 * Get utilization rate for a specific basis
 */
function getUtilizationRate(utilization, basis) {
  switch (basis) {
    case 'Hours':
      return utilization.FORECAST_HOURS;
    case 'Cycles':
      return utilization.FORECAST_CYCLES;
    case 'Landings':
      return utilization.FORECAST_LANDINGS;
    default:
      return 300; // Default fallback
  }
}

/**
 * Identify clusters of aircraft with converging maintenance dates
 */
function identifyClusters(projectedDue, threshold, minSize) {
  // Group by date window
  const clusters = [];
  const processed = new Set();

  projectedDue.forEach((item, index) => {
    if (processed.has(index)) return;

    const clusterDate = item.projected_due_date;
    const clusterItems = [item];
    processed.add(index);

    // Find other items within threshold days
    projectedDue.forEach((other, otherIndex) => {
      if (processed.has(otherIndex) || index === otherIndex) return;

      const daysDiff = Math.abs((other.projected_due_date - clusterDate) / (1000 * 60 * 60 * 24));
      if (daysDiff <= threshold && item.tail_number !== other.tail_number) {
        clusterItems.push(other);
        processed.add(otherIndex);
      }
    });

    // Count unique aircraft in cluster
    const uniqueAircraft = new Set(clusterItems.map(i => i.tail_number));

    if (uniqueAircraft.size >= minSize) {
      clusters.push({
        center_date: clusterDate,
        aircraft_count: uniqueAircraft.size,
        items: clusterItems,
        aircraft: Array.from(uniqueAircraft),
        severity: uniqueAircraft.size >= 4 ? 'critical' : (uniqueAircraft.size >= 3 ? 'high' : 'medium')
      });
    }
  });

  // Sort by severity and date
  return clusters.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity] || a.center_date - b.center_date;
  });
}

/**
 * Generate route swap recommendations to stagger maintenance
 */
function generateSwapRecommendations(clusters) {
  const recommendations = [];

  clusters.forEach(cluster => {
    if (cluster.severity === 'critical' || cluster.severity === 'high') {
      // Find aircraft that could be swapped to delay maintenance
      const sortedItems = cluster.items.sort((a, b) => b.projected_days - a.projected_days);

      // Recommend swapping aircraft with least remaining life to one with most
      const mostCritical = sortedItems[0];
      const leastCritical = sortedItems[sortedItems.length - 1];

      // Find a route for swap recommendation
      const route = mockDailyRoutes.find(r => r.AIRCRAFT === mostCritical.tail_number);

      if (route && mostCritical.tail_number !== leastCritical.tail_number) {
        const effectiveDate = new Date(mostCritical.projected_due_date);
        effectiveDate.setDate(effectiveDate.getDate() - 14); // Recommend 2 weeks before due

        recommendations.push({
          'Effective Date': effectiveDate.toISOString(),
          'Route': route.DESTINATION,
          'Scheduled Aircraft': mostCritical.tail_number,
          'Replacement Aircraft': leastCritical.tail_number,
          'Swap Reason': 'MX',
          'Replacement Location': route.DESTINATION,
          'Start Time': route.START_TIME,
          'Time Zone': 'CST',
          'Swap Status': 'Planned',
          'Authorization': '',
          'Notes': `Recommended swap to stagger ${mostCritical.task_description} maintenance. ${mostCritical.tail_number} due in ${mostCritical.projected_days} days, ${leastCritical.tail_number} has ${leastCritical.projected_days} days remaining. Cluster of ${cluster.aircraft_count} aircraft converging.`,
          cluster_id: cluster.center_date.getTime()
        });
      }
    }
  });

  return recommendations;
}

/**
 * Render forecast results
 */
function renderForecastResults(clusters, swaps) {
  // Update badges
  document.getElementById('cluster-count-badge').textContent = clusters.length;
  document.getElementById('cluster-count-badge').className = clusters.length > 0 ? 'badge' : 'badge zero';

  document.getElementById('swap-count-badge').textContent = swaps.length;
  document.getElementById('swap-count-badge').className = swaps.length > 0 ? 'badge' : 'badge zero';

  // Render clusters
  const clustersContainer = document.getElementById('forecast-clusters');
  if (clusters.length === 0) {
    clustersContainer.innerHTML = '<p class="empty-state">No maintenance clusters identified within the forecast horizon.</p>';
  } else {
    clustersContainer.innerHTML = clusters.map(cluster => `
      <div class="cluster-card ${cluster.severity === 'critical' ? '' : (cluster.severity === 'high' ? 'warning' : 'info')}">
        <div class="cluster-header">
          <div class="cluster-title">Cluster: ${cluster.center_date.toLocaleDateString()} (${cluster.aircraft_count} aircraft)</div>
          <span class="cluster-severity ${cluster.severity}">${cluster.severity}</span>
        </div>
        <div class="cluster-aircraft-list">
          ${cluster.items.map(item => `
            <div class="aircraft-chip">
              ${item.tail_number}
              <span class="due-date">${item.task_description.substring(0, 30)}...</span>
              <span class="due-date">Due: ${item.projected_due_date.toLocaleDateString()} (${item.projected_days}d)</span>
            </div>
          `).join('')}
        </div>
        ${swaps.filter(s => s.cluster_id === cluster.center_date.getTime()).map(swap => `
          <div class="swap-recommendation">
            <div class="swap-recommendation-title">Recommended Swap</div>
            <div class="swap-details">
              Swap ${swap['Scheduled Aircraft']} → ${swap['Replacement Aircraft']} on ${swap.Route} (${new Date(swap['Effective Date']).toLocaleDateString()})
            </div>
            <div class="swap-details" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">
              ${swap.Notes}
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  // Render swap recommendations table
  const swapsContainer = document.getElementById('forecast-swaps');
  if (swaps.length === 0) {
    swapsContainer.innerHTML = '<p class="empty-state">No route swaps recommended.</p>';
  } else {
    swapsContainer.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Effective Date</th>
            <th>Route</th>
            <th>Scheduled Aircraft</th>
            <th>Replacement</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${swaps.map(swap => `
            <tr>
              <td>${new Date(swap['Effective Date']).toLocaleDateString()}</td>
              <td>${swap.Route}</td>
              <td><strong>${swap['Scheduled Aircraft']}</strong></td>
              <td><strong>${swap['Replacement Aircraft']}</strong></td>
              <td><span class="status-badge status-red">${swap['Swap Reason']}</span></td>
              <td><span class="status-badge status-yellow">${swap['Swap Status']}</span></td>
              <td>${swap.Notes.substring(0, 60)}...</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
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
        ${mockAircraftUtilization.map(u => `
          <tr>
            <td><strong>${u.AIRCRAFT}</strong></td>
            <td>${u.FORECAST_HOURS}/year</td>
            <td>${u.FORECAST_CYCLES}/year</td>
            <td>${u.FORECAST_LANDINGS}/year</td>
            <td><span class="status-badge ${u.FORECAST_BASIS.includes('actual') ? 'status-green' : 'status-blue'}">${u.FORECAST_BASIS}</span></td>
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
