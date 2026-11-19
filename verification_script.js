// Verification script for Stage 2 follow-up fixes
// Copy and paste this into browser console after loading http://localhost:8080/app/app.html?asof=2026-10-19

console.log('=== VERIFICATION SCRIPT ===\n');

// 1. Document title
console.log('1. Document Title:');
console.log(`   ${document.title}`);
console.log(`   ✓ Expected: "X-Wing Maintenance Dashboard"\n`);

// 2. Alert count (override window.alert to count calls)
console.log('2. Alert Counter Test:');
let alertCounter = 0;
const originalAlert = window.alert;
window.alert = function(...args) {
  alertCounter++;
  console.log(`   ALERT CALLED: ${args[0]}`);
  return originalAlert.apply(window, args);
};

// 3. Quick Add Test - Add N1031P/STANDBY
console.log('3. Testing Quick Add - N1031P/STANDBY:');
document.getElementById('quick-tail').value = 'N1031P';
document.getElementById('quick-status').value = 'STANDBY';
document.getElementById('quick-description').value = 'Test entry 1';
document.getElementById('btn-quick-add').click();

// Wait a bit for message to appear
setTimeout(() => {
  const messages = document.getElementById('global-message');
  const messageText1 = messages ? messages.textContent : 'No message container';
  console.log(`   Inline message: "${messageText1}"`);
  console.log(`   Alert counter: ${alertCounter} (expected: 0)\n`);

  // 4. Quick Add Test - Add N999ZZ/STANDBY (invalid tail)
  console.log('4. Testing Quick Add - N999ZZ/STANDBY (invalid tail):');
  document.getElementById('quick-tail').value = 'N999ZZ';
  document.getElementById('quick-status').value = 'STANDBY';
  document.getElementById('quick-description').value = 'Test entry 2';
  document.getElementById('btn-quick-add').click();

  setTimeout(() => {
    const messageText2 = messages ? messages.textContent : 'No message container';
    console.log(`   Inline message: "${messageText2}"`);
    console.log(`   Alert counter: ${alertCounter} (expected: 0)\n`);

    // 5. Switch to View Only role
    console.log('5. Switch to View Only role and check Accept/Reject buttons:');
    document.getElementById('role-selector').value = 'view-only';
    document.getElementById('role-selector').dispatchEvent(new Event('change'));

    // Wait for access control to apply
    setTimeout(() => {
      // Navigate to Fleet Planning tab
      const fleetPlanningBtn = document.querySelector('[data-tab="fleet-planning"]');
      if (fleetPlanningBtn && fleetPlanningBtn.style.display !== 'none') {
        fleetPlanningBtn.click();

        setTimeout(() => {
          const acceptButtons = document.querySelectorAll('.btn-accept');
          const rejectButtons = document.querySelectorAll('.btn-reject');

          if (acceptButtons.length > 0 && rejectButtons.length > 0) {
            const firstAccept = acceptButtons[0];
            const firstReject = rejectButtons[0];
            console.log(`   First Accept button disabled: ${firstAccept.disabled} (expected: true)`);
            console.log(`   First Reject button disabled: ${firstReject.disabled} (expected: true)`);
          } else {
            console.log(`   No Accept/Reject buttons found (may need to run forecast first)`);
          }
          console.log('');

          // 6. Switch to Data Sources tab and check fleet_master
          console.log('6. Data Sources tab - fleet_master as-of date:');
          const dataSourcesBtn = document.querySelector('[data-tab="data-sources"]');
          if (dataSourcesBtn) {
            dataSourcesBtn.click();

            setTimeout(() => {
              const table = document.querySelector('#data-sources-table table');
              if (table) {
                const rows = table.querySelectorAll('tbody tr');
                const fleetMasterRow = Array.from(rows).find(row =>
                  row.querySelector('td')?.textContent.includes('fleet_master.json')
                );
                if (fleetMasterRow) {
                  const cells = fleetMasterRow.querySelectorAll('td');
                  const asOfDate = cells[3]?.textContent || 'N/A';
                  console.log(`   fleet_master.json as-of date: ${asOfDate} (expected: 2026-10-16)`);
                } else {
                  console.log(`   fleet_master.json row not found`);
                }
              } else {
                console.log(`   Data sources table not found`);
              }
              console.log('');

              // Final summary
              console.log('7. File Modification Times:');
              console.log('   (Check via: ls -l app/app.html app/app.js | head -2)');
              console.log('');
              console.log('=== VERIFICATION COMPLETE ===');
              console.log(`Total alert() calls: ${alertCounter} (expected: 0)`);
            }, 500);
          }
        }, 500);
      } else {
        console.log('   Fleet Planning tab is hidden (expected for View Only role)');
        console.log('   Switching to Administrator to check buttons...');

        // Switch back to Administrator
        document.getElementById('role-selector').value = 'administrator';
        document.getElementById('role-selector').dispatchEvent(new Event('change'));

        setTimeout(() => {
          const fleetPlanningBtn2 = document.querySelector('[data-tab="fleet-planning"]');
          if (fleetPlanningBtn2) {
            fleetPlanningBtn2.click();

            setTimeout(() => {
              // Switch back to View Only
              document.getElementById('role-selector').value = 'view-only';
              document.getElementById('role-selector').dispatchEvent(new Event('change'));

              setTimeout(() => {
                const acceptButtons = document.querySelectorAll('.btn-accept');
                const rejectButtons = document.querySelectorAll('.btn-reject');

                if (acceptButtons.length > 0 && rejectButtons.length > 0) {
                  const firstAccept = acceptButtons[0];
                  const firstReject = rejectButtons[0];
                  console.log(`   First Accept button disabled: ${firstAccept.disabled} (expected: true)`);
                  console.log(`   First Reject button disabled: ${firstReject.disabled} (expected: true)`);
                } else {
                  console.log(`   No Accept/Reject buttons found`);
                }
                console.log('');

                // Continue with Data Sources check...
                console.log('6. Data Sources tab - fleet_master as-of date:');
                const dataSourcesBtn = document.querySelector('[data-tab="data-sources"]');
                if (dataSourcesBtn) {
                  dataSourcesBtn.click();

                  setTimeout(() => {
                    const table = document.querySelector('#data-sources-table table');
                    if (table) {
                      const rows = table.querySelectorAll('tbody tr');
                      const fleetMasterRow = Array.from(rows).find(row =>
                        row.querySelector('td')?.textContent.includes('fleet_master.json')
                      );
                      if (fleetMasterRow) {
                        const cells = fleetMasterRow.querySelectorAll('td');
                        const asOfDate = cells[3]?.textContent || 'N/A';
                        console.log(`   fleet_master.json as-of date: ${asOfDate} (expected: 2026-10-16)`);
                      } else {
                        console.log(`   fleet_master.json row not found`);
                      }
                    } else {
                      console.log(`   Data sources table not found`);
                    }
                    console.log('');

                    // Final summary
                    console.log('7. File Modification Times:');
                    console.log('   (Check via: ls -l app/app.html app/app.js | head -2)');
                    console.log('');
                    console.log('=== VERIFICATION COMPLETE ===');
                    console.log(`Total alert() calls: ${alertCounter} (expected: 0)`);
                  }, 500);
                }
              }, 500);
            }, 500);
          }
        }, 500);
      }
    }, 500);
  }, 1500);
}, 1500);
