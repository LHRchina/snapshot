#!/bin/bash

# Website Snapshot Cron Job Script
# This script runs the Puppeteer snapshot tool and handles logging

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the project directory
cd "$SCRIPT_DIR"

# Create logs directory if it doesn't exist
mkdir -p logs

# Generate log filename with timestamp
LOG_FILE="logs/snapshot_$(date +%Y%m%d_%H%M%S).log"

# Check if URL parameter is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide a URL as an argument" >> "$LOG_FILE"
    echo "Usage: $0 <URL>" >> "$LOG_FILE"
    echo "Example: $0 https://example.com" >> "$LOG_FILE"
    exit 1
fi

URL="$1"

# Run the snapshot script and capture output
echo "[$(date)] Starting website snapshot for: $URL" >> "$LOG_FILE"

# Run node snapshot.js with the provided URL and capture both stdout and stderr
node snapshot.js "$URL" >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date)] Snapshot completed successfully" >> "$LOG_FILE"
else
    echo "[$(date)] Snapshot failed with exit code $EXIT_CODE" >> "$LOG_FILE"
fi

# Keep only the last 30 log files to prevent disk space issues
find logs -name "snapshot_*.log" -type f | sort -r | tail -n +31 | xargs rm -f 2>/dev/null

# Keep only the last 50 screenshot files
find screenshots -name "*.png" -type f | sort -r | tail -n +51 | xargs rm -f 2>/dev/null

echo "[$(date)] Cleanup completed" >> "$LOG_FILE"

exit $EXIT_CODE