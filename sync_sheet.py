#!/usr/bin/env python3
"""
X-Wing Maintenance Dashboard - Google Sheet sync + dated history snapshots.

Pulls the live "Fleet and Facilities" Google Sheet, rebuilds app/data/*.json
with build_data.py, then records a snapshot under app/data/history/ so the
dashboard can show the data as it was on any previous sync date.

Usage:
    venv/bin/python sync_sheet.py                 # download, rebuild, snapshot
    venv/bin/python sync_sheet.py --no-download   # rebuild from the local xlsx, snapshot
    venv/bin/python sync_sheet.py --snapshot-only [--date YYYY-MM-DD]
                                                  # snapshot current app/data as-is

Config lives in sync_config.json (see sync_config.example.json).
"""
import argparse
import hashlib
import json
import os
import shutil
import sys
import tempfile
import urllib.request
from datetime import datetime
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
CONFIG_FILE = PROJECT_DIR / "sync_config.json"
DATA_DIR = PROJECT_DIR / "app" / "data"
HISTORY_DIR = DATA_DIR / "history"
OBJECTS_DIR = HISTORY_DIR / "objects"
SNAPSHOTS_DIR = HISTORY_DIR / "snapshots"
INDEX_FILE = HISTORY_DIR / "index.json"
LOG_FILE = PROJECT_DIR / "sync.log"

XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

# Sheets build_data.py reads; a download missing any of these is rejected
# instead of overwriting the dashboard data with a broken build.
REQUIRED_SHEETS = [
    "Master Fleet", "Fleet Asset Import", "Aircraft Times Import",
    "Daily Route Import", "Due List Import", "AC status", "Route Swaps",
    "Aircraft Utilization", "Forecast Settings",
]

DATASET_FILES = [
    "fleet_master", "fleet_asset_import", "aircraft_times", "daily_routes",
    "due_lists", "aircraft_status_history", "route_swaps",
    "aircraft_utilization", "forecast_settings", "_meta",
]


def log(msg):
    line = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def load_config():
    if not CONFIG_FILE.exists():
        sys.exit(
            f"Missing {CONFIG_FILE.name}. Copy sync_config.example.json to "
            f"sync_config.json and set spreadsheet_id."
        )
    cfg = json.loads(CONFIG_FILE.read_text())
    if not cfg.get("spreadsheet_id") or "PASTE" in cfg["spreadsheet_id"]:
        sys.exit("Set spreadsheet_id in sync_config.json (the long ID in the Sheet URL).")
    return cfg


def get_access_token(service_account_file):
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request

    path = Path(service_account_file).expanduser()
    if not path.is_absolute():
        path = PROJECT_DIR / path
    creds = service_account.Credentials.from_service_account_file(
        str(path), scopes=["https://www.googleapis.com/auth/drive.readonly"]
    )
    creds.refresh(Request())
    return creds.token


def download_sheet(cfg, dest):
    sheet_id = cfg["spreadsheet_id"]
    sa_file = cfg.get("service_account_file")
    if sa_file:
        url = f"https://www.googleapis.com/drive/v3/files/{sheet_id}/export?mimeType={XLSX_MIME}"
        headers = {"Authorization": f"Bearer {get_access_token(sa_file)}"}
    else:
        # Works only when the Sheet is shared as "Anyone with the link can view".
        url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=xlsx"
        headers = {}

    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as resp, open(dest, "wb") as out:
        shutil.copyfileobj(resp, out)

    with open(dest, "rb") as f:
        if f.read(2) != b"PK":
            raise RuntimeError(
                "Download is not an .xlsx file (Google likely returned a login page). "
                "Share the Sheet with the service account, or set it to 'Anyone with the link'."
            )


def validate_workbook(path):
    import openpyxl

    wb = openpyxl.load_workbook(path, read_only=True)
    missing = [s for s in REQUIRED_SHEETS if s not in wb.sheetnames]
    wb.close()
    if missing:
        raise RuntimeError(f"Downloaded workbook is missing sheets: {', '.join(missing)}")


def rebuild_json():
    os.chdir(PROJECT_DIR)  # build_data.py uses project-relative paths
    sys.path.insert(0, str(PROJECT_DIR))
    import build_data

    build_data.main()


def store_object(src):
    data = src.read_bytes()
    digest = hashlib.sha256(data).hexdigest()[:20]
    rel = f"objects/{digest}.json"
    target = HISTORY_DIR / rel
    if not target.exists():
        target.write_bytes(data)
    return rel


def write_json_atomic(path, obj):
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, indent=2))
    tmp.replace(path)


def snapshot(date_str=None):
    OBJECTS_DIR.mkdir(parents=True, exist_ok=True)
    SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    date_str = date_str or now.strftime("%Y-%m-%d")

    files = {}
    for name in DATASET_FILES:
        src = DATA_DIR / f"{name}.json"
        if src.exists():
            files[name] = store_object(src)

    meta = json.loads((DATA_DIR / "_meta.json").read_text()) if (DATA_DIR / "_meta.json").exists() else {}
    as_of_dates = sorted({d.get("as_of_date") for d in meta.get("datasets", {}).values() if d.get("as_of_date")})

    entry = {
        "date": date_str,
        "synced_at": now.strftime("%Y-%m-%d %H:%M:%S"),
        "source_as_of": as_of_dates[-1] if as_of_dates else None,
        "files": files,
    }
    # One snapshot per calendar date: a later sync the same day replaces it.
    write_json_atomic(SNAPSHOTS_DIR / f"{date_str}.json", entry)

    index = json.loads(INDEX_FILE.read_text()) if INDEX_FILE.exists() else {"snapshots": []}
    snaps = {s["date"]: s for s in index["snapshots"]}
    earlier = [d for d in snaps if d < date_str]
    previous = snaps[max(earlier)] if earlier else None
    changed = previous is None or previous.get("fingerprint") != _fingerprint(files)
    snaps[date_str] = {
        "date": date_str,
        "synced_at": entry["synced_at"],
        "source_as_of": entry["source_as_of"],
        "fingerprint": _fingerprint(files),
    }
    index["snapshots"] = sorted(snaps.values(), key=lambda s: s["date"], reverse=True)
    index["latest"] = index["snapshots"][0]["date"]
    index["updated_at"] = entry["synced_at"]
    write_json_atomic(INDEX_FILE, index)

    _garbage_collect(index)
    log(f"Snapshot saved for {date_str} ({len(files)} files, "
        f"{'data changed' if changed else 'no data changes'} vs previous snapshot)")


def _fingerprint(files):
    return hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()[:16]


def _garbage_collect(index):
    keep = set()
    for s in index["snapshots"]:
        snap = json.loads((SNAPSHOTS_DIR / f"{s['date']}.json").read_text())
        keep.update(Path(p).name for p in snap["files"].values())
    for obj in OBJECTS_DIR.glob("*.json"):
        if obj.name not in keep:
            obj.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--no-download", action="store_true", help="rebuild from the existing local xlsx")
    parser.add_argument("--snapshot-only", action="store_true", help="only snapshot current app/data")
    parser.add_argument("--date", help="snapshot date to record (YYYY-MM-DD); defaults to today")
    args = parser.parse_args()

    if args.date:
        datetime.strptime(args.date, "%Y-%m-%d")

    try:
        if not args.snapshot_only:
            if not args.no_download:
                cfg = load_config()
                workbook = PROJECT_DIR / "source_data" / "Fleet and Facilities.xlsx"
                with tempfile.TemporaryDirectory() as tmp:
                    tmp_xlsx = Path(tmp) / "download.xlsx"
                    log("Downloading Google Sheet...")
                    download_sheet(cfg, tmp_xlsx)
                    validate_workbook(tmp_xlsx)
                    shutil.copyfile(tmp_xlsx, workbook)
                log("Download OK, rebuilding dashboard data...")
            rebuild_json()
        snapshot(args.date)
        log("Sync complete")
    except Exception as e:
        log(f"SYNC FAILED: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
