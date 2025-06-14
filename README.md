# News to Audio Generator

A Node.js application that automatically generates audio summaries from news articles using advanced translation services and text-to-speech technology.

## 🌟 Features

- **Multi-source News Fetching**: Automatically retrieves latest news from various sources
- **Advanced Translation**: Integrated iFlytek OTS translation service with fallback to translatte
- **High-Quality Audio**: Generates professional audio using iFlytek TTS (with Murf.ai fallback)
- **Robust Error Handling**: Three-tier fallback system for maximum reliability
- **Security-First**: Environment-based configuration with credential protection
- **Performance Monitoring**: Built-in logging and performance tracking

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- iFlytek OTS API credentials (optional, has fallback)
- Murf.ai API credentials

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

3. **Run security audit**
   ```bash
   node apply_security_fixes.js
   ```

4. **Test the system**
   ```bash
   # Test translation service
   node ots.js test
   
   # Generate news audio
   node news-to-audio.js
   ```

## 📁 Project Structure

```
news-to-audio/
├── news-to-audio.js          # Main application
├── ots.js                    # iFlytek translation service
├── apply_security_fixes.js   # Security utilities
├── .env.example              # Environment template
├── .gitignore               # Git ignore rules
├── package.json             # Dependencies
├── docs/
│   ├── IFLYTEK_OTS_INTEGRATION.md
│   └── ADVANCED_CODE_QUALITY_ENHANCEMENTS.md
├── news_data/               # Generated content
│   ├── summary.txt
│   └── audio.mp3
└── logs/                    # Application logs
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example` with your actual credentials:

```env
# iFlytek Services (Translation + TTS)
IFLYTEK_APP_ID=your_app_id_here
IFLYTEK_API_SECRET=your_api_secret_here
IFLYTEK_API_KEY=your_api_key_here
IFLYTEK_HOST=api-dx.xf-yun.com

# Murf.ai Text-to-Speech (Fallback)
MURF_API_KEY=your_murf_api_key_here

# Performance Settings
MAX_TEXT_LENGTH=10000
TRANSLATION_CHUNK_SIZE=2000
LOG_LEVEL=info
```

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