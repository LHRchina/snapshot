# Website Snapshot Tool

A simple Node.js tool that uses Puppeteer to take full-page screenshots of websites.

## Features

- Takes full-page screenshots of any website
- Automatically handles dynamic content loading
- Saves screenshots with timestamp and domain name
- Creates organized output directory structure
- Handles cookie consent and page loading gracefully

## Installation

1. Install dependencies:
```bash
npm install
```

## Usage

### Take a screenshot of Gulf News
```bash
npm start
```

### Run the script directly
```bash
node snapshot.js
```

## Output

Screenshots are saved in the `./screenshots/` directory with the following naming convention:
```
{domain}_{timestamp}.png
```

Example: `gulfnews_com_2024-01-15T10-30-45-123Z.png`

## Configuration

The script is currently configured to screenshot `https://gulfnews.com/`, but you can modify the `targetUrl` variable in `snapshot.js` to capture any website.

### Screenshot Settings
- **Viewport**: 1920x1080 pixels
- **Format**: PNG
- **Type**: Full page screenshot
- **Wait time**: 2 seconds after page load for dynamic content

## Cron Job Setup

To automatically take screenshots at scheduled intervals, you can set up a cron job:

### Quick Setup

1. **Make the script executable** (already done):
   ```bash
   chmod +x run_snapshot.sh
   ```

2. **Test the script manually**:
   ```bash
   ./run_snapshot.sh
   ```

3. **Open crontab editor**:
   ```bash
   crontab -e
   ```

4. **Add a cron job** (example for daily screenshots at 9 AM):
   ```bash
   0 9 * * * /Users/lihaoran/Documents/projects/snapshot/run_snapshot.sh
   ```

5. **Save and verify**:
   ```bash
   crontab -l
   ```

### Common Cron Schedules

See `crontab_examples.txt` for ready-to-use cron job examples:

- **Every hour**: `0 * * * *`
- **Daily at 9 AM**: `0 9 * * *`
- **Twice daily**: `0 9,18 * * *`
- **Weekdays only**: `0 9 * * 1-5`
- **Every 30 minutes**: `*/30 * * * *`

### Logging and Cleanup

The cron script automatically:
- Creates timestamped log files in `logs/` directory
- Keeps only the last 30 log files
- Keeps only the last 50 screenshots
- Logs all output for debugging

### Monitoring

Check recent logs:
```bash
tail -f logs/snapshot_*.log
```

View all screenshots:
```bash
ls -la screenshots/
```

## Requirements

- Node.js (version 14 or higher)
- Internet connection
- Sufficient disk space for screenshot files
- Cron service (available on macOS/Linux)

## Troubleshooting

### General Issues
- If you encounter permission errors, try running with `--no-sandbox` flag (already included)
- For slow websites, the script waits up to 30 seconds for page load
- Screenshots are saved as PNG files for best quality

### Cron Job Issues
- **Cron not running**: Check if cron service is active: `sudo launchctl list | grep cron`
- **Path issues**: Use absolute paths in cron jobs
- **Environment variables**: Cron runs with minimal environment; the script handles this
- **Permissions**: Ensure the script has execute permissions: `ls -la run_snapshot.sh`
- **Logs**: Check `logs/` directory for detailed error messages

### Testing Cron Jobs
```bash
# Test the script manually
./run_snapshot.sh

# Check if cron job is scheduled
crontab -l

# View system cron logs (macOS)
log show --predicate 'process == "cron"' --last 1h
```