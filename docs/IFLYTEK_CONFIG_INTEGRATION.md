# iFlytek Configuration Integration Guide

## 🎯 Overview

This document explains the successful integration of iFlytek TTS credentials from `config.json` instead of relying solely on environment variables. This enhancement improves configuration management and maintains backward compatibility.

## ✅ Problem Solved

**Issue**: The system was checking for iFlytek credentials only in environment variables (`process.env.IFLYTEK_APP_ID`, etc.), but the actual credentials were stored in `config.json` under the `ots` section.

**Solution**: Modified the credential loading logic to prioritize `config.json` values while maintaining environment variable fallback support.

## 🔧 Changes Made

### 1. Updated `news-to-audio.js`

**Before:**
```javascript
if (process.env.IFLYTEK_APP_ID && process.env.IFLYTEK_API_KEY && process.env.IFLYTEK_API_SECRET) {
    // iFlytek TTS logic
}
```

**After:**
```javascript
// Try iFlytek TTS API first if credentials are available (from config.json or environment variables)
const iflytekAppId = config.ots?.appid || process.env.IFLYTEK_APP_ID;
const iflytekApiKey = config.ots?.apiKey || process.env.IFLYTEK_API_KEY;
const iflytekApiSecret = config.ots?.apiSecret || process.env.IFLYTEK_API_SECRET;

if (iflytekAppId && iflytekApiKey && iflytekApiSecret) {
    // Pass config values to iFlytek TTS
    const iflytekConfig = {
        host: config.ots?.host || process.env.IFLYTEK_HOST,
        appId: iflytekAppId,
        apiKey: iflytekApiKey,
        apiSecret: iflytekApiSecret
    };

    const success = await convertWithIFlytekTTS(text, outputPath, { config: iflytekConfig });
}
```

### 2. Updated `iflytek-tts.js`

**Before:**
```javascript
const tts = new IFlytekTTS({
    host: process.env.IFLYTEK_HOST,
    appId: process.env.IFLYTEK_APP_ID,
    apiKey: process.env.IFLYTEK_API_KEY,
    apiSecret: process.env.IFLYTEK_API_SECRET
});
```

**After:**
```javascript
// Use config from options if provided, otherwise fall back to environment variables
const config = options.config || {
    host: process.env.IFLYTEK_HOST,
    appId: process.env.IFLYTEK_APP_ID,
    apiKey: process.env.IFLYTEK_API_KEY,
    apiSecret: process.env.IFLYTEK_API_SECRET
};

const tts = new IFlytekTTS(config);
```

## 📋 Configuration Structure

The `config.json` file contains iFlytek credentials under the `ots` section:

```json
{
  "ots": {
    "hostUrl": "https://ntrans.xfyun.cn/v2/ots",
    "host": "ntrans.xfyun.cn",
    "appid": "",
    "apiSecret": "",
    "apiKey": "",
    "uri": "/v2/ots"
  }
}
```

## 🔄 Credential Priority Order

1. **Primary**: `config.json` values (`config.ots.appid`, `config.ots.apiKey`, `config.ots.apiSecret`)
2. **Fallback**: Environment variables (`IFLYTEK_APP_ID`, `IFLYTEK_API_KEY`, `IFLYTEK_API_SECRET`)

This ensures backward compatibility while prioritizing the centralized configuration approach.

## ✅ Verification Results

The integration test (`test_iflytek_config.js`) confirms:

- ✅ ots section found in config.json
- ✅ All iFlytek credentials are available
- ✅ iFlytek TTS initialized successfully with config.json credentials
- ✅ news-to-audio.js contains updated credential loading from config.json
- ✅ news-to-audio.js passes config to convertWithIFlytekTTS

## 🚀 Benefits

### 1. **Centralized Configuration**
- All service credentials in one place (`config.json`)
- Easier configuration management
- Reduced dependency on environment variables

### 2. **Backward Compatibility**
- Existing environment variable setups continue to work
- Gradual migration path available
- No breaking changes

### 3. **Improved Maintainability**
- Clear configuration structure
- Easier debugging and troubleshooting
- Better documentation of required credentials

## 🔧 Additional Code Quality Enhancements

### 1. Configuration Validation

```javascript
// config/validator.js - Configuration Validation
class ConfigValidator {
    static validateIFlytekConfig(config) {
        const required = ['appid', 'apiKey', 'apiSecret'];
        const missing = required.filter(field => !config.ots?.[field]);

        if (missing.length > 0) {
            throw new Error(`Missing iFlytek configuration: ${missing.join(', ')}`);
        }

        // Validate credential format
        if (config.ots.appid && !/^[a-f0-9]{8}$/.test(config.ots.appid)) {
            console.warn('⚠️  iFlytek App ID format may be incorrect');
        }

        if (config.ots.apiKey && config.ots.apiKey.length < 20) {
            console.warn('⚠️  iFlytek API Key seems too short');
        }

        return true;
    }

    static validateConfig(config) {
        const validations = [
            () => this.validateIFlytekConfig(config),
            // Add more validations as needed
        ];

        validations.forEach(validate => {
            try {
                validate();
            } catch (error) {
                console.error('❌ Configuration validation failed:', error.message);
                throw error;
            }
        });

        console.log('✅ Configuration validation passed');
        return true;
    }
}

module.exports = { ConfigValidator };
```

### 2. Configuration Loading with Error Handling

```javascript
// config/loader.js - Robust Configuration Loading
const fs = require('fs');
const path = require('path');
const { ConfigValidator } = require('./validator');

class ConfigLoader {
    static loadConfig(configPath = 'config.json') {
        try {
            const fullPath = path.resolve(configPath);

            if (!fs.existsSync(fullPath)) {
                throw new Error(`Configuration file not found: ${fullPath}`);
            }

            const content = fs.readFileSync(fullPath, 'utf8');
            const config = JSON.parse(content);

            // Validate configuration
            ConfigValidator.validateConfig(config);

            console.log('✅ Configuration loaded successfully');
            return config;

        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Invalid JSON in configuration file: ${error.message}`);
            }
            throw error;
        }
    }

    static getIFlytekCredentials(config) {
        return {
            appId: config.ots?.appid || process.env.IFLYTEK_APP_ID,
            apiKey: config.ots?.apiKey || process.env.IFLYTEK_API_KEY,
            apiSecret: config.ots?.apiSecret || process.env.IFLYTEK_API_SECRET,
            host: config.ots?.host || process.env.IFLYTEK_HOST
        };
    }
}

module.exports = { ConfigLoader };
```

### 3. Environment-Specific Configuration

```javascript
// config/environment.js - Environment-Specific Settings
class EnvironmentConfig {
    static getEnvironment() {
        return process.env.NODE_ENV || 'development';
    }

    static loadEnvironmentConfig(baseConfig) {
        const env = this.getEnvironment();
        const envConfigPath = `config.${env}.json`;

        if (fs.existsSync(envConfigPath)) {
            const envConfig = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
            return this.mergeConfigs(baseConfig, envConfig);
        }

        return baseConfig;
    }

    static mergeConfigs(base, override) {
        const merged = { ...base };

        for (const key in override) {
            if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
                merged[key] = this.mergeConfigs(merged[key] || {}, override[key]);
            } else {
                merged[key] = override[key];
            }
        }

        return merged;
    }
}

module.exports = { EnvironmentConfig };
```

## 📊 Configuration Management Best Practices

### 1. **Security Considerations**
- ✅ Keep `config.json` out of version control for production
- ✅ Use `.env` files for sensitive credentials in development
- ✅ Implement configuration encryption for production deployments
- ✅ Regular credential rotation

### 2. **Configuration Structure**
- ✅ Group related settings (e.g., `ots` for iFlytek)
- ✅ Use consistent naming conventions
- ✅ Include default values where appropriate
- ✅ Document all configuration options

### 3. **Error Handling**
- ✅ Validate configuration on startup
- ✅ Provide clear error messages for missing credentials
- ✅ Implement graceful fallbacks
- ✅ Log configuration loading status

## 🎯 Migration Guide

### For Existing Deployments

1. **Keep Environment Variables** (for now)
   ```bash
   # Existing environment variables continue to work
   export IFLYTEK_APP_ID="your_app_id"
   export IFLYTEK_API_KEY="your_api_key"
   export IFLYTEK_API_SECRET="your_api_secret"
   ```

2. **Add to config.json** (recommended)
   ```json
   {
     "ots": {
       "appid": "your_app_id",
       "apiKey": "your_api_key",
       "apiSecret": "your_api_secret",
       "host": "ntrans.xfyun.cn"
     }
   }
   ```

3. **Remove Environment Variables** (optional)
   - Once config.json is working, environment variables can be removed
   - Test thoroughly before removing fallbacks

## 🔍 Troubleshooting

### Common Issues

1. **"Missing iFlytek credentials" Error**
   - Check `config.json` has `ots` section with required fields
   - Verify JSON syntax is valid
   - Ensure file permissions allow reading

2. **"Configuration file not found" Error**
   - Verify `config.json` exists in project root
   - Check file path and working directory

3. **TTS Still Not Working**
   - Run `node test_iflytek_config.js` to verify integration
   - Check network connectivity to iFlytek servers
   - Verify credentials are correct and active

### Debug Commands

```bash
# Test configuration integration
node test_iflytek_config.js

# Test audio generation
node news-to-audio.js

# Check configuration file
cat config.json | jq '.ots'
```

## 🎉 Conclusion

The iFlytek configuration integration successfully:

- ✅ **Resolves the credential loading issue**
- ✅ **Improves configuration management**
- ✅ **Maintains backward compatibility**
- ✅ **Enhances code maintainability**

This change makes the system more robust and easier to configure, while providing a clear path for future configuration enhancements.