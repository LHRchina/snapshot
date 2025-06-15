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

#### Node.js Installation

**Required Version**: Node.js v14.0.0 or higher (v18+ recommended for best performance)

**Installation Options**:

1. **Official Installer** (Recommended for beginners):
   - Visit [nodejs.org](https://nodejs.org/)
   - Download the LTS version for your operating system
   - Run the installer and follow the setup wizard

2. **Using Node Version Manager (NVM)** (Recommended for developers):
   ```bash
   # Install NVM (macOS/Linux)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   
   # Restart terminal or run:
   source ~/.bashrc
   
   # Install and use Node.js LTS
   nvm install --lts
   nvm use --lts
   ```

3. **Using Homebrew** (macOS):
   ```bash
   brew install node
   ```

4. **Windows Installation**:
   
   **Option A: Official Installer** (Recommended):
   - Visit [nodejs.org](https://nodejs.org/)
   - Download the Windows Installer (.msi) for LTS version
   - Run the installer as Administrator
   - Follow the installation wizard (accept default settings)
   - Restart your computer after installation
   
   **Option B: Using Chocolatey**:
   ```powershell
   # Install Chocolatey first (run as Administrator)
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   
   # Install Node.js
   choco install nodejs
   ```
   
   **Option C: Using Winget** (Windows 10 1709+):
   ```powershell
   winget install OpenJS.NodeJS
   ```
   
   **Option D: Using Scoop**:
   ```powershell
   # Install Scoop first
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   irm get.scoop.sh | iex
   
   # Install Node.js
   scoop install nodejs
   ```
   
   **Option E: Using NVM for Windows**:
   ```powershell
   # Download and install nvm-windows from:
   # https://github.com/coreybutler/nvm-windows/releases
   
   # After installation, restart terminal and run:
   nvm install lts
   nvm use lts
   ```

5. **Linux Package Managers**:
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install nodejs npm
   
   # CentOS/RHEL/Fedora
   sudo dnf install nodejs npm
   ```

**Verify Installation**:
```bash
# For macOS/Linux
node --version  # Should show v14.0.0 or higher
npm --version   # Should show npm version
```

```powershell
# For Windows (PowerShell or Command Prompt)
node --version  # Should show v14.0.0 or higher
npm --version   # Should show npm version
```

**Windows-Specific Notes**:
- If you get "'node' is not recognized" error, restart your terminal/PowerShell
- You may need to add Node.js to your PATH manually if using portable installation
- For corporate networks, you might need to configure npm proxy settings:
  ```powershell
  npm config set proxy http://proxy.company.com:8080
  npm config set https-proxy http://proxy.company.com:8080
  ```

#### Other Requirements

- npm or yarn package manager (included with Node.js)
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