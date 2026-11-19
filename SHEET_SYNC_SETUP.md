# Google Sheet Auto-Sync + Data History

`sync_sheet.py` pulls the live **Fleet and Facilities** Google Sheet, rebuilds
`app/data/*.json` via `build_data.py`, and saves a dated snapshot in
`app/data/history/`. The dashboard header has a **Data date** picker to view any
saved date; `app.html?date=YYYY-MM-DD` links straight to one.

## One-time setup

1. **Sheet ID**: copy the long ID from the Sheet URL
   (`docs.google.com/spreadsheets/d/<THIS PART>/edit`).
2. `cp sync_config.example.json sync_config.json` and paste the ID.
3. **Access** (pick one):
   - **Service account (recommended, Sheet stays private).** In Google Cloud Console:
     create a project, enable the *Google Drive API*, create a service account, add a
     JSON key, and save it as `credentials/google-service-account.json`. Then share the
     Sheet (Viewer) with the service account's `...@...iam.gserviceaccount.com` email.
   - **Link sharing.** Set the Sheet to "Anyone with the link can view" and remove the
     `service_account_file` line from `sync_config.json`.
4. Test: `venv/bin/python sync_sheet.py`
5. Schedule: `./install-sync-schedule.sh` (every 2 hours; pass seconds to change it,
   e.g. `./install-sync-schedule.sh 3600`). Remove with `--uninstall`.

## How history works

- One snapshot per calendar date; a later sync on the same day replaces that day's.
- Files that did not change are stored once (content-hashed in `history/objects/`),
  so daily snapshots cost almost nothing unless the data changed.
- A download that is not a valid workbook, or is missing a required tab, is rejected
  and the dashboard keeps its last good data. Check `sync.log`.
- An open dashboard checks for new syncs every 5 minutes and reloads itself when it is
  on "Latest". It stays put if you are looking at a past date.

## Notes

- macOS may block background jobs from reading `~/Desktop`. If `sync.launchd.log`
  shows "Operation not permitted", grant Full Disk Access to `venv/bin/python3.14`
  or move the project out of Desktop.
- The scheduler only runs while the Mac is awake. Missed runs happen on wake.
- History applies to the local dashboard. Inside Domo, the app reads Domo datasets.
  See "Domo" below.

## Domo

For the published Domo app, the equivalent is Domo's Google Sheets connector on a
schedule with the update method set to **Append**, plus a `_BATCH_LAST_RUN_` date
column. The app would then filter `domo.get('/data/v1/<alias>')` by that date.
