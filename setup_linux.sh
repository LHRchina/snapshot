#!/bin/bash

# Linux Server Setup Script for Website Snapshot Tool
# This script handles all dependencies and system requirements

set -e  # Exit on any error

echo "🚀 Setting up Website Snapshot Tool for Linux server..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Function to detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo $ID
    elif type lsb_release >/dev/null 2>&1; then
        lsb_release -si | tr '[:upper:]' '[:lower:]'
    else
        echo "unknown"
    fi
}

# Install system dependencies based on distribution
install_system_deps() {
    local distro=$(detect_distro)
    echo "📦 Installing system dependencies for $distro..."
    
    case $distro in
        ubuntu|debian)
            sudo apt-get update
            sudo apt-get install -y wget gnupg ca-certificates curl
            ;;
        centos|rhel|fedora)
            if command -v dnf >/dev/null 2>&1; then
                sudo dnf install -y wget curl ca-certificates
            else
                sudo yum install -y wget curl ca-certificates
            fi
            ;;
        alpine)
            sudo apk add --no-cache wget curl ca-certificates
            ;;
        *)
            echo "⚠️  Unknown distribution: $distro"
            echo "   Please install wget, curl, and ca-certificates manually"
            ;;
    esac
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node >/dev/null 2>&1; then
        echo "❌ Node.js is not installed"
        echo "   Please install Node.js 14+ from: https://nodejs.org/"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 14 ]; then
        echo "❌ Node.js version $node_version is too old (requires 14+)"
        exit 1
    fi
    
    echo "✅ Node.js $(node --version) detected"
}

# Install npm dependencies
install_npm_deps() {
    echo "📦 Installing npm dependencies..."
    npm install
}

# Install Chrome browser for Puppeteer
install_chrome() {
    echo "🌐 Installing Chrome browser for Puppeteer..."
    
    # Detect architecture
    local arch=$(uname -m)
    echo "📋 Detected architecture: $arch"
    
    # For ARM64/aarch64 systems, try different approaches
    if [[ "$arch" == "aarch64" || "$arch" == "arm64" ]]; then
        echo "🔧 ARM64 detected, using alternative installation..."
        
        # Try to install system Chrome first for ARM
        local distro=$(detect_distro)
        case $distro in
            ubuntu|debian)
                echo "📦 Installing system Chrome for ARM64..."
                wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add - 2>/dev/null || true
                echo "deb [arch=arm64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list >/dev/null || true
                sudo apt-get update >/dev/null 2>&1 || true
                sudo apt-get install -y google-chrome-stable >/dev/null 2>&1 || true
                ;;
        esac
    fi
    
    # Try npm script first, fallback to direct command
     if npm run install-browser 2>/dev/null; then
         echo "✅ Chrome installed via npm script"
     else
         echo "📦 Fallback: Installing Chrome directly..."
         npx puppeteer browsers install chrome 2>/dev/null || {
             echo "⚠️  Standard Chrome installation failed"
             echo "🔄 Trying system browser installation..."
             
             # Try installing system Chrome/Chromium
             local distro=$(detect_distro)
             case $distro in
                 ubuntu|debian)
                     echo "📦 Attempting to install system Chrome..."
                     wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add - 2>/dev/null || true
                     echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list >/dev/null 2>&1 || true
                     sudo apt-get update >/dev/null 2>&1 || true
                     sudo apt-get install -y google-chrome-stable >/dev/null 2>&1 || {
                         echo "📦 Chrome failed, trying Chromium via snap..."
                         sudo snap install chromium 2>/dev/null || {
                             echo "📦 Snap failed, trying apt chromium..."
                             sudo apt-get install -y chromium-browser >/dev/null 2>&1 || true
                         }
                     }
                     ;;
                 centos|rhel|fedora)
                     echo "📦 Attempting to install system Chrome..."
                     sudo dnf install -y google-chrome-stable 2>/dev/null || sudo yum install -y google-chrome-stable 2>/dev/null || {
                         echo "📦 Chrome failed, trying Chromium..."
                         sudo dnf install -y chromium 2>/dev/null || sudo yum install -y chromium 2>/dev/null || true
                     }
                     ;;
             esac
             
             echo "🔄 Trying with PUPPETEER_SKIP_CHROMIUM_DOWNLOAD..."
             PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install puppeteer
         }
     fi
    
    # Verify installation
     if npx puppeteer browsers installed chrome >/dev/null 2>&1; then
         echo "✅ Chrome browser installed successfully"
     elif command -v google-chrome >/dev/null 2>&1; then
         echo "✅ System Chrome detected, will use system installation"
     elif command -v chromium-browser >/dev/null 2>&1; then
         echo "✅ Chromium detected, will use system installation"
     elif command -v chromium >/dev/null 2>&1; then
         echo "✅ Chromium detected, will use system installation"
     elif snap list chromium >/dev/null 2>&1; then
         echo "✅ Snap Chromium detected, will use snap installation"
     else
         echo "⚠️  Chrome installation verification failed"
         echo "   The tool may still work with system-installed browsers"
         echo "   or in Docker containers with pre-installed Chrome"
         echo "   Try manually installing: sudo snap install chromium"
     fi
}

# Make scripts executable
setup_permissions() {
    echo "🔧 Setting up permissions..."
    chmod +x run_snapshot.sh
    chmod +x setup_linux.sh
}

# Test the setup
test_setup() {
    echo "🧪 Testing the setup..."
    echo "   This will take a screenshot to verify everything works..."
    
    if ./run_snapshot.sh; then
        echo "✅ Test completed successfully!"
        echo "   Check the screenshots/ directory for the test image"
    else
        echo "❌ Test failed. Check logs/ directory for details"
        exit 1
    fi
}

# Main setup process
main() {
    echo "Starting setup process..."
    
    # Install system dependencies (requires sudo)
    if [ "$EUID" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
        install_system_deps
    else
        echo "⚠️  Skipping system dependencies (no sudo or running as root)"
        echo "   You may need to install: wget, curl, ca-certificates"
    fi
    
    check_nodejs
    install_npm_deps
    install_chrome
    setup_permissions
    
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Test the tool: ./run_snapshot.sh"
    echo "2. Set up cron job: crontab -e"
    echo "3. Use examples from: crontab_examples.txt"
    echo ""
    
    # Ask if user wants to run test
    read -p "Would you like to run a test now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_setup
    fi
}

# Run main function
main "$@"