#!/bin/bash
# Installs a macOS launchd job that runs sync_sheet.py on a schedule.
# Default: every 2 hours. Override: ./install-sync-schedule.sh 3600   (seconds)
# Remove:  ./install-sync-schedule.sh --uninstall
set -euo pipefail

LABEL="com.local.xwing-sheet-sync"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="$PROJECT_DIR/venv/bin/python"

if [[ "${1:-}" == "--uninstall" ]]; then
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Removed $LABEL"
  exit 0
fi

INTERVAL="${1:-7200}"

if [[ ! -f "$PROJECT_DIR/sync_config.json" ]]; then
  echo "sync_config.json not found. Copy sync_config.example.json and fill it in first." >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PYTHON</string>
    <string>$PROJECT_DIR/sync_sheet.py</string>
  </array>
  <key>WorkingDirectory</key><string>$PROJECT_DIR</string>
  <key>StartInterval</key><integer>$INTERVAL</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$PROJECT_DIR/sync.launchd.log</string>
  <key>StandardErrorPath</key><string>$PROJECT_DIR/sync.launchd.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed $LABEL: runs every $INTERVAL seconds (and once now)."
echo "Logs: $PROJECT_DIR/sync.log"
