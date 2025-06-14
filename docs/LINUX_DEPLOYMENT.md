# Linux Deployment Guide

## Website Snapshot Tool - Headless Linux Server Setup

This guide covers deploying and running the Website Snapshot Tool on headless Linux servers, including troubleshooting for architecture compatibility issues.

## Prerequisites

- Linux server (Ubuntu 18.04+, CentOS 7+, or similar)
- Node.js 16+ and npm
- Sudo access for system dependencies
- Internet connectivity

## Quick Setup

### Automated Setup (Recommended)

```bash
# Clone or upload your project files
cd /path/to/snapshot

# Run automated setup
./setup_linux.sh

# Test the installation
./setup_linux.sh --test
```

### Manual Setup

1. **Install System Dependencies**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install -y wget gnupg2 software-properties-common
   
   # CentOS/RHEL/Fedora
   sudo yum update
   sudo yum install -y wget
   ```

2. **Install Node.js** (if not already installed):
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # CentOS/RHEL/Fedora
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs
   ```

3. **Install Project Dependencies**:
   ```bash
   npm install
   ```

4. **Install Chrome Browser**:
   ```bash
   npm run install-browser
   # or fallback
   npx puppeteer browsers install chrome
   ```

## System Dependencies by Distribution

### Ubuntu/Debian
```bash
sudo apt-get install -y \
  wget \
  gnupg2 \
  software-properties-common \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libxss1 \
  libasound2
```

### CentOS/RHEL/Fedora
```bash
sudo yum install -y \
  wget \
  alsa-lib \
  atk \
  cups-libs \
  gtk3 \
  libXcomposite \
  libXcursor \
  libXdamage \
  libXext \
  libXi \
  libXrandr \
  libXScrnSaver \
  libXtst \
  pango \
  xorg-x11-fonts-100dpi \
  xorg-x11-fonts-75dpi \
  xorg-x11-fonts-cyrillic \
  xorg-x11-fonts-misc \
  xorg-x11-fonts-Type1
```

## Running Screenshots

### Manual Execution
```bash
# Take a single screenshot
node snapshot.js https://example.com

# Using the wrapper script
./run_snapshot.sh https://example.com
```

### Cron Job Setup
```bash
# Edit crontab
crontab -e

# Add entries (examples in crontab_examples.txt)
# Daily at 2 AM
0 2 * * * /path/to/snapshot/run_snapshot.sh https://example.com

# Every 6 hours
0 */6 * * * /path/to/snapshot/run_snapshot.sh https://example.com
```

## Monitoring

### Check Logs
```bash
# View recent logs
tail -f logs/snapshot_*.log

# Check cron execution
grep CRON /var/log/syslog
```

### Verify Screenshots
```bash
# List screenshots
ls -la screenshots/

# Check file sizes
du -h screenshots/
```

## Troubleshooting

### Chrome/Chromium Issues

**Problem**: "Could not find Chrome" error
```bash
Error: Could not find Chrome (ver. 120.0.6099.109)
```

**Solutions**:
1. Install Chrome manually:
   ```bash
   npx puppeteer browsers install chrome
   ```

2. Install system Chrome:
   ```bash
   # Ubuntu/Debian (x86_64)
   wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
   echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
   sudo apt-get update
   sudo apt-get install google-chrome-stable
   
   # Ubuntu/Debian (ARM64)
   wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
   echo "deb [arch=arm64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
   sudo apt-get update
   sudo apt-get install google-chrome-stable
   
   # CentOS/RHEL/Fedora
   sudo dnf install google-chrome-stable
   # or
   sudo yum install google-chrome-stable
   ```

3. Use Chromium as alternative:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install chromium-browser
   
   # CentOS/RHEL/Fedora
   sudo dnf install chromium
   ```

**Problem**: Architecture compatibility issues (ARM64/x86_64)
```bash
qemu: Could not open '/lib64/ld-linux-x86-64.so.2': No such file or directory
```

**Solutions**:
1. The tool now automatically detects architecture and uses system browsers
2. For ARM64 systems, install system Chrome:
   ```bash
   # The setup script handles this automatically
   ./setup_linux.sh
   ```

3. Manual ARM64 Chrome installation:
   ```bash
   wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
   echo "deb [arch=arm64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
   sudo apt-get update
   sudo apt-get install google-chrome-stable
   ```

4. Use Docker with pre-installed Chrome:
   ```dockerfile
   FROM node:18-slim
   RUN apt-get update && apt-get install -y \
       wget \
       gnupg \
       && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
       && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list \
       && apt-get update \
       && apt-get install -y google-chrome-stable \
       && rm -rf /var/lib/apt/lists/*
   ```

### Permission Issues

**Problem**: Permission denied errors
```bash
./run_snapshot.sh: Permission denied
```

**Solution**:
```bash
chmod +x run_snapshot.sh
chmod +x setup_linux.sh
```

### Network Issues

**Problem**: Cannot reach target website
```bash
Error: net::ERR_NAME_NOT_RESOLVED
```

**Solutions**:
1. Check DNS resolution:
   ```bash
   nslookup example.com
   ```

2. Test connectivity:
   ```bash
   curl -I https://example.com
   ```

3. Check firewall rules:
   ```bash
   sudo iptables -L
   ```

### Disk Space Issues

**Problem**: No space left on device

**Solutions**:
1. Check disk usage:
   ```bash
   df -h
   du -sh screenshots/ logs/
   ```

2. Clean old files:
   ```bash
   # The script automatically cleans files older than 30 days
   # Manual cleanup:
   find screenshots/ -name "*.png" -mtime +7 -delete
   find logs/ -name "*.log" -mtime +7 -delete
   ```

### Memory Issues

**Problem**: Out of memory errors

**Solutions**:
1. Check memory usage:
   ```bash
   free -h
   ```

2. Add swap space:
   ```bash
   sudo fallocate -l 1G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

3. Reduce Chrome memory usage (already configured in the tool):
   - `--single-process`
   - `--disable-dev-shm-usage`
   - `--disable-gpu`

## Security Considerations

### File Permissions
```bash
# Secure the project directory
chmod 755 /path/to/snapshot
chmod 644 *.js *.json *.md *.txt
chmod 755 *.sh

# Secure log and screenshot directories
chmod 755 logs/ screenshots/
chmod 644 logs/*.log screenshots/*.png
```

### Firewall Configuration
```bash
# If running a web server component (future feature)
sudo ufw allow 3000/tcp
```

### User Isolation
```bash
# Run as non-root user
sudo useradd -m -s /bin/bash snapshot-user
sudo su - snapshot-user
```

## Performance Optimization

### Resource Limits
```bash
# Set memory limits for cron jobs
ulimit -v 1048576  # 1GB virtual memory limit
```

### Concurrent Execution
```bash
# Prevent multiple instances
flock -n /tmp/snapshot.lock ./run_snapshot.sh https://example.com
```

## Backup and Recovery

### Backup Screenshots
```bash
# Daily backup script
#!/bin/bash
tar -czf "/backup/screenshots-$(date +%Y%m%d).tar.gz" screenshots/
find /backup -name "screenshots-*.tar.gz" -mtime +30 -delete
```

### Backup Configuration
```bash
# Backup cron configuration
crontab -l > crontab-backup.txt
```

## Docker Deployment

### Dockerfile Example
```dockerfile
FROM node:18-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy project files
COPY package*.json ./
RUN npm install

COPY . .

# Create directories
RUN mkdir -p logs screenshots

# Set permissions
RUN chmod +x run_snapshot.sh

# Run as non-root user
USER node

CMD ["node", "snapshot.js"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  snapshot:
    build: .
    volumes:
      - ./screenshots:/app/screenshots
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review log files in the `logs/` directory
3. Test with the `--test` flag: `./setup_linux.sh --test`
4. Verify system requirements and dependencies

## Architecture Support

The tool now supports:
- **x86_64 (AMD64)**: Full support with bundled Chrome
- **ARM64 (aarch64)**: Automatic fallback to system Chrome
- **Docker containers**: Pre-configured Chrome support
- **Cloud instances**: Optimized for headless environments

The system automatically detects your architecture and chooses the best Chrome installation method.