#!/usr/bin/env node

/**
 * Quick Security & Quality Fixes Implementation
 * This script demonstrates immediate improvements for the news-to-audio project
 */

const fs = require('fs');
const path = require('path');

// Simple secure configuration manager
class SecureConfig {
    constructor() {
        this.loadEnvironment();
    }

    loadEnvironment() {
        try {
            // Try to load .env file if it exists
            if (fs.existsSync('.env')) {
                const envContent = fs.readFileSync('.env', 'utf8');
                const lines = envContent.split('\n');

                lines.forEach(line => {
                    const [key, value] = line.split('=');
                    if (key && value) {
                        process.env[key.trim()] = value.trim();
                    }
                });
                console.log('✅ Environment variables loaded from .env file');
            } else {
                console.log('⚠️  No .env file found. Using default/hardcoded values.');
                console.log('📝 Create .env file from .env.example for better security');
            }
        } catch (error) {
            console.error('❌ Error loading environment:', error.message);
        }
    }

    get iflytekConfig() {
        return {
            hostUrl: process.env.IFLYTEK_HOST_URL || "https://ntrans.xfyun.cn/v2/ots",
            host: process.env.IFLYTEK_HOST || "ntrans.xfyun.cn",
            appid: process.env.IFLYTEK_APP_ID || "",
            apiSecret: process.env.IFLYTEK_API_SECRET || "",
            apiKey: process.env.IFLYTEK_API_KEY || "",
            uri: "/v2/ots",
            timeout: parseInt(process.env.IFLYTEK_TIMEOUT) || 30000,
            retryAttempts: parseInt(process.env.IFLYTEK_RETRY_ATTEMPTS) || 3,
            retryDelay: parseInt(process.env.IFLYTEK_RETRY_DELAY) || 1000
        };
    }

    validateCredentials() {
        const config = this.iflytekConfig;
        const issues = [];

        if (!config.appid || config.appid === 'your_app_id_here') {
            issues.push('IFLYTEK_APP_ID not configured');
        }

        if (!config.apiSecret || config.apiSecret === 'your_api_secret_here') {
            issues.push('IFLYTEK_API_SECRET not configured');
        }

        if (!config.apiKey || config.apiKey === 'your_api_key_here') {
            issues.push('IFLYTEK_API_KEY not configured');
        }

        return {
            valid: issues.length === 0,
            issues: issues
        };
    }
}

// Enhanced input validation
class InputValidator {
    static validateText(text, maxLength = 10000) {
        if (typeof text !== 'string') {
            throw new Error('Text must be a string');
        }

        if (text.trim().length === 0) {
            throw new Error('Text cannot be empty');
        }

        if (text.length > maxLength) {
            throw new Error(`Text too long. Maximum ${maxLength} characters allowed`);
        }

        // Remove potentially harmful characters
        return text
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Control characters
            .replace(/[\uFEFF\uFFFE\uFFFF]/g, '') // BOM and problematic Unicode
            .trim();
    }

    static validateLanguageCode(code) {
        const validCodes = ['en', 'cn', 'ja', 'ko', 'es', 'fr', 'th', 'ar', 'ru', 'pt', 'de', 'it', 'tr', 'vi', 'ms', 'id'];

        if (!validCodes.includes(code)) {
            throw new Error(`Invalid language code: ${code}. Supported: ${validCodes.join(', ')}`);
        }

        return code;
    }
}

// Simple logging with security considerations
class SecureLogger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.sensitiveKeys = ['apiKey', 'apiSecret', 'password', 'token', 'authorization'];
    }

    sanitize(data) {
        if (typeof data === 'string') {
            return data;
        }

        if (typeof data === 'object' && data !== null) {
            const sanitized = { ...data };

            this.sensitiveKeys.forEach(key => {
                if (sanitized[key]) {
                    sanitized[key] = '[REDACTED]';
                }
            });

            return sanitized;
        }

        return data;
    }

    log(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const sanitizedMeta = this.sanitize(meta);

        console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`,
                   Object.keys(sanitizedMeta).length > 0 ? sanitizedMeta : '');
    }

    info(message, meta) {
        this.log('info', message, meta);
    }

    error(message, meta) {
        this.log('error', message, meta);
    }

    warn(message, meta) {
        this.log('warn', message, meta);
    }

    debug(message, meta) {
        if (this.logLevel === 'debug') {
            this.log('debug', message, meta);
        }
    }
}

// Enhanced error handling
class ErrorHandler {
    static async withRetry(operation, maxAttempts = 3, delay = 1000) {
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (attempt === maxAttempts) {
                    throw error;
                }

                const isRetryable = this.isRetryableError(error);
                if (!isRetryable) {
                    throw error;
                }

                const backoffDelay = delay * Math.pow(2, attempt - 1);
                console.log(`⚠️  Attempt ${attempt} failed, retrying in ${backoffDelay}ms...`);

                await this.sleep(backoffDelay);
            }
        }

        throw lastError;
    }

    static isRetryableError(error) {
        // Network errors, timeouts, and 5xx server errors are retryable
        const retryableStatuses = [408, 429, 500, 502, 503, 504];
        const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];

        return (
            retryableCodes.includes(error.code) ||
            (error.response && retryableStatuses.includes(error.response.status))
        );
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Security audit function
function performSecurityAudit() {
    console.log('\n🔍 Performing Security Audit...');

    const issues = [];
    const recommendations = [];

    // Check for .env file
    if (!fs.existsSync('.env')) {
        issues.push('No .env file found - credentials may be hardcoded');
        recommendations.push('Create .env file from .env.example template');
    }

    // Check .gitignore
    if (fs.existsSync('.gitignore')) {
        const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
        if (!gitignoreContent.includes('.env')) {
            issues.push('.env file not in .gitignore');
            recommendations.push('Add .env to .gitignore to prevent credential leaks');
        }
    } else {
        issues.push('No .gitignore file found');
        recommendations.push('Create .gitignore file to exclude sensitive files');
    }

    // Check for hardcoded credentials in source files
    const sourceFiles = ['ots.js', 'news-to-audio.js'];
    sourceFiles.forEach(file => {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            if (content.includes('') || content.includes('')) {
                issues.push(`Hardcoded credentials found in ${file}`);
                recommendations.push(`Move credentials from ${file} to environment variables`);
            }
        }
    });

    // Check logs directory permissions
    if (fs.existsSync('logs')) {
        try {
            const stats = fs.statSync('logs');
            // Check if logs directory is world-readable (security risk)
            if (stats.mode & 0o004) {
                issues.push('Logs directory is world-readable');
                recommendations.push('Restrict logs directory permissions: chmod 750 logs');
            }
        } catch (error) {
            // Ignore permission check errors on some systems
        }
    }

    return { issues, recommendations };
}

// Main execution
if (require.main === module) {
    const logger = new SecureLogger();
    const config = new SecureConfig();

    console.log('🚀 Security & Quality Fixes Implementation\n');

    // Perform security audit
    const audit = performSecurityAudit();

    if (audit.issues.length > 0) {
        console.log('🚨 Security Issues Found:');
        audit.issues.forEach((issue, index) => {
            console.log(`  ${index + 1}. ${issue}`);
        });

        console.log('\n💡 Recommendations:');
        audit.recommendations.forEach((rec, index) => {
            console.log(`  ${index + 1}. ${rec}`);
        });
    } else {
        console.log('✅ No critical security issues found');
    }

    // Validate configuration
    console.log('\n🔧 Configuration Validation:');
    const validation = config.validateCredentials();

    if (validation.valid) {
        console.log('✅ iFlytek credentials configured');
    } else {
        console.log('⚠️  Configuration issues:');
        validation.issues.forEach(issue => {
            console.log(`  - ${issue}`);
        });
    }

    // Test input validation
    console.log('\n🧪 Testing Input Validation:');
    try {
        const testText = InputValidator.validateText('Hello, world! This is a test.');
        const testLang = InputValidator.validateLanguageCode('en');
        console.log('✅ Input validation working correctly');
    } catch (error) {
        console.log('❌ Input validation failed:', error.message);
    }

    // Test secure logging
    console.log('\n📝 Testing Secure Logging:');
    logger.info('Test log message', {
        apiKey: 'secret123',
        normalData: 'visible',
        apiSecret: 'topsecret'
    });

    console.log('\n🎉 Security fixes implementation completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Create .env file with your actual iFlytek credentials');
    console.log('2. Test the translation service: node ots.js test');
    console.log('3. Run the full pipeline: node news-to-audio.js');
    console.log('4. Monitor logs for any remaining issues');
    console.log('5. Consider implementing the advanced features from ADVANCED_CODE_QUALITY_ENHANCEMENTS.md');
}

// Export classes for use in other modules
module.exports = {
    SecureConfig,
    InputValidator,
    SecureLogger,
    ErrorHandler,
    performSecurityAudit
};