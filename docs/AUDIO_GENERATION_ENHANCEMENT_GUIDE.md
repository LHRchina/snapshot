# Audio Generation Enhancement Guide

## 🎯 Executive Summary

This guide addresses the "Audio generation failed, but text summary is available" issue and provides comprehensive recommendations to enhance code quality, maintainability, and reliability of the TTS (Text-to-Speech) system.

## 🔍 Current State Analysis

### Audio Generation Pipeline
1. **Primary**: iFlytek TTS API (Premium)
2. **Fallback**: Murf.ai API (Currently disabled)
3. **System Fallback**: Native OS TTS (Currently disabled)

### Identified Issues
- **Single Point of Failure**: Only iFlytek TTS is active
- **No Graceful Degradation**: System TTS fallback is commented out
- **Limited Error Handling**: Basic try-catch without detailed error classification
- **No Retry Logic**: Fails immediately on first error
- **Missing Monitoring**: No metrics or health checks

## 🚀 Immediate Fixes (Quick Wins)

### 1. Enable System TTS Fallback

```javascript
// In news-to-audio.js, uncomment and enhance system TTS
async function convertToAudio(text, outputPath) {
    // Try iFlytek TTS API first
    if (process.env.IFLYTEK_APP_ID && process.env.IFLYTEK_API_KEY && process.env.IFLYTEK_API_SECRET) {
        try {
            console.log('🎵 Using iFlytek TTS API...');
            const { convertWithIFlytekTTS } = require('./iflytek-tts.js');
            const success = await convertWithIFlytekTTS(text, outputPath);
            if (success) {
                console.log('✅ iFlytek TTS completed successfully');
                return true;
            }
        } catch (error) {
            console.log('⚠️  iFlytek TTS failed, trying fallback:', error.message);
        }
    }

    // System TTS Fallback (ENABLE THIS)
    try {
        console.log('🔄 Using system TTS fallback...');
        return await convertWithSystemTTS(text, outputPath);
    } catch (error) {
        console.error('❌ All TTS methods failed:', error.message);
        return false;
    }
}
```

### 2. Implement Robust System TTS

```javascript
async function convertWithSystemTTS(text, outputPath) {
    const { execSync } = require('child_process');
    
    try {
        if (process.platform === 'darwin') {
            // macOS - Enhanced with better voice selection
            const containsChinese = /[\u4e00-\u9fff]/.test(text);
            const voice = containsChinese ? 'Ting-Ting' : 'Alex';
            
            // Create temporary AIFF file first
            const tempPath = outputPath.replace('.mp3', '.aiff');
            execSync(`say -v "${voice}" -o "${tempPath}" "${text}"`, { timeout: 30000 });
            
            // Convert to MP3 if ffmpeg is available
            try {
                execSync(`ffmpeg -i "${tempPath}" -y "${outputPath}"`, { timeout: 15000 });
                fs.unlinkSync(tempPath); // Clean up temp file
            } catch (ffmpegError) {
                // Keep AIFF if MP3 conversion fails
                fs.renameSync(tempPath, outputPath.replace('.mp3', '.aiff'));
            }
            
            return true;
            
        } else if (process.platform === 'win32') {
            // Windows PowerShell TTS
            const script = `
                $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
                $synth.SetOutputToWaveFile('${outputPath.replace('.mp3', '.wav')}')
                $synth.Speak('${text.replace(/'/g, "''")}')
                $synth.Dispose()
            `;
            
            const scriptPath = path.join(__dirname, 'temp_tts.ps1');
            fs.writeFileSync(scriptPath, script);
            execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { timeout: 30000 });
            fs.unlinkSync(scriptPath);
            
            return true;
            
        } else {
            // Linux - espeak
            execSync(`espeak "${text}" -w "${outputPath.replace('.mp3', '.wav')}"`, { timeout: 30000 });
            return true;
        }
        
    } catch (error) {
        console.error('System TTS failed:', error.message);
        throw error;
    }
}
```

## 🏗️ Advanced Enhancements

### 1. TTS Service Manager with Circuit Breaker

```javascript
class TTSServiceManager {
    constructor() {
        this.services = new Map();
        this.circuitBreakers = new Map();
        this.metrics = new Map();
        
        this.initializeServices();
    }
    
    initializeServices() {
        // Register TTS services
        this.services.set('iflytek', {
            name: 'iFlytek TTS',
            priority: 1,
            available: this.checkIFlytekCredentials(),
            convert: this.convertWithIFlytek.bind(this)
        });
        
        this.services.set('system', {
            name: 'System TTS',
            priority: 3,
            available: true,
            convert: this.convertWithSystem.bind(this)
        });
        
        // Initialize circuit breakers
        for (const [key] of this.services) {
            this.circuitBreakers.set(key, {
                failures: 0,
                lastFailure: null,
                state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
                threshold: 3,
                timeout: 60000 // 1 minute
            });
            
            this.metrics.set(key, {
                attempts: 0,
                successes: 0,
                failures: 0,
                avgResponseTime: 0
            });
        }
    }
    
    async convertToAudio(text, outputPath) {
        const availableServices = Array.from(this.services.entries())
            .filter(([key, service]) => service.available && this.isServiceHealthy(key))
            .sort(([, a], [, b]) => a.priority - b.priority);
        
        for (const [key, service] of availableServices) {
            try {
                console.log(`🎵 Attempting TTS with ${service.name}...`);
                const startTime = Date.now();
                
                const success = await service.convert(text, outputPath);
                
                if (success) {
                    this.recordSuccess(key, Date.now() - startTime);
                    console.log(`✅ ${service.name} completed successfully`);
                    return true;
                }
                
            } catch (error) {
                this.recordFailure(key, error);
                console.log(`⚠️  ${service.name} failed: ${error.message}`);
            }
        }
        
        console.error('❌ All TTS services failed');
        return false;
    }
    
    isServiceHealthy(serviceKey) {
        const breaker = this.circuitBreakers.get(serviceKey);
        
        if (breaker.state === 'OPEN') {
            if (Date.now() - breaker.lastFailure > breaker.timeout) {
                breaker.state = 'HALF_OPEN';
                console.log(`🔄 Circuit breaker for ${serviceKey} is now HALF_OPEN`);
            } else {
                return false;
            }
        }
        
        return true;
    }
    
    recordSuccess(serviceKey, responseTime) {
        const breaker = this.circuitBreakers.get(serviceKey);
        const metrics = this.metrics.get(serviceKey);
        
        breaker.failures = 0;
        breaker.state = 'CLOSED';
        
        metrics.attempts++;
        metrics.successes++;
        metrics.avgResponseTime = (metrics.avgResponseTime + responseTime) / 2;
    }
    
    recordFailure(serviceKey, error) {
        const breaker = this.circuitBreakers.get(serviceKey);
        const metrics = this.metrics.get(serviceKey);
        
        breaker.failures++;
        breaker.lastFailure = Date.now();
        
        if (breaker.failures >= breaker.threshold) {
            breaker.state = 'OPEN';
            console.log(`🚫 Circuit breaker for ${serviceKey} is now OPEN`);
        }
        
        metrics.attempts++;
        metrics.failures++;
    }
    
    getHealthStatus() {
        const status = {};
        
        for (const [key, service] of this.services) {
            const breaker = this.circuitBreakers.get(key);
            const metrics = this.metrics.get(key);
            
            status[key] = {
                name: service.name,
                available: service.available,
                healthy: this.isServiceHealthy(key),
                circuitState: breaker.state,
                failures: breaker.failures,
                metrics: {
                    successRate: metrics.attempts > 0 ? (metrics.successes / metrics.attempts * 100).toFixed(2) + '%' : 'N/A',
                    avgResponseTime: metrics.avgResponseTime.toFixed(0) + 'ms',
                    totalAttempts: metrics.attempts
                }
            };
        }
        
        return status;
    }
}
```

### 2. Enhanced Error Classification

```javascript
class TTSErrorHandler {
    static classifyError(error) {
        const errorTypes = {
            NETWORK: ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'socket hang up'],
            AUTH: ['401', 'Unauthorized', 'Invalid credentials'],
            QUOTA: ['429', 'Rate limit', 'Quota exceeded'],
            SERVICE: ['500', '502', '503', '504'],
            INPUT: ['Invalid text', 'Text too long', 'Unsupported language'],
            SYSTEM: ['ENOENT', 'Permission denied', 'Command not found']
        };
        
        const errorMessage = error.message || error.toString();
        
        for (const [type, patterns] of Object.entries(errorTypes)) {
            if (patterns.some(pattern => errorMessage.includes(pattern))) {
                return {
                    type,
                    retryable: ['NETWORK', 'SERVICE', 'QUOTA'].includes(type),
                    delay: this.getRetryDelay(type),
                    message: errorMessage
                };
            }
        }
        
        return {
            type: 'UNKNOWN',
            retryable: false,
            delay: 0,
            message: errorMessage
        };
    }
    
    static getRetryDelay(errorType) {
        const delays = {
            NETWORK: 2000,
            SERVICE: 5000,
            QUOTA: 60000
        };
        
        return delays[errorType] || 0;
    }
}
```

### 3. TTS Health Monitor

```javascript
class TTSHealthMonitor {
    constructor(serviceManager) {
        this.serviceManager = serviceManager;
        this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes
        this.startMonitoring();
    }
    
    startMonitoring() {
        setInterval(() => {
            this.performHealthCheck();
        }, this.healthCheckInterval);
        
        console.log('🏥 TTS Health Monitor started');
    }
    
    async performHealthCheck() {
        const status = this.serviceManager.getHealthStatus();
        const timestamp = new Date().toISOString();
        
        console.log(`\n🏥 TTS Health Check - ${timestamp}`);
        
        for (const [service, info] of Object.entries(status)) {
            const healthIcon = info.healthy ? '✅' : '❌';
            const availableIcon = info.available ? '🟢' : '🔴';
            
            console.log(`   ${healthIcon} ${info.name}:`);
            console.log(`      Available: ${availableIcon} ${info.available}`);
            console.log(`      Circuit: ${info.circuitState}`);
            console.log(`      Success Rate: ${info.metrics.successRate}`);
            console.log(`      Avg Response: ${info.metrics.avgResponseTime}`);
        }
        
        // Log to file for analysis
        this.logHealthStatus(status);
    }
    
    logHealthStatus(status) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            services: status
        };
        
        const logPath = path.join(__dirname, 'logs', 'tts-health.log');
        
        try {
            if (!fs.existsSync(path.dirname(logPath))) {
                fs.mkdirSync(path.dirname(logPath), { recursive: true });
            }
            
            fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.warn('Failed to write health log:', error.message);
        }
    }
}
```

## 📊 Implementation Plan

### Phase 1: Immediate Fixes (1-2 hours)
1. ✅ Enable system TTS fallback
2. ✅ Add basic error handling
3. ✅ Test on current platform

### Phase 2: Enhanced Reliability (4-6 hours)
1. ✅ Implement TTS Service Manager
2. ✅ Add circuit breaker pattern
3. ✅ Enhanced error classification
4. ✅ Add retry logic with exponential backoff

### Phase 3: Monitoring & Analytics (2-3 hours)
1. ✅ Health monitoring system
2. ✅ Performance metrics
3. ✅ Alerting system
4. ✅ Dashboard for TTS status

### Phase 4: Advanced Features (Optional)
1. ✅ Voice selection optimization
2. ✅ Audio quality enhancement
3. ✅ Caching for repeated text
4. ✅ A/B testing for TTS services

## 🔧 Configuration Enhancements

### Environment Variables
```bash
# TTS Configuration
TTS_PRIMARY_SERVICE=iflytek
TTS_FALLBACK_ENABLED=true
TTS_CIRCUIT_BREAKER_THRESHOLD=3
TTS_CIRCUIT_BREAKER_TIMEOUT=60000
TTS_HEALTH_CHECK_INTERVAL=300000
TTS_MAX_RETRIES=3
TTS_RETRY_DELAY=2000

# Audio Quality
TTS_AUDIO_FORMAT=mp3
TTS_AUDIO_QUALITY=high
TTS_VOICE_SPEED=normal
```

### Config File Enhancement
```json
{
  "tts": {
    "services": {
      "iflytek": {
        "enabled": true,
        "priority": 1,
        "timeout": 30000,
        "retries": 3
      },
      "system": {
        "enabled": true,
        "priority": 3,
        "timeout": 30000,
        "voices": {
          "english": "Alex",
          "chinese": "Ting-Ting"
        }
      }
    },
    "circuitBreaker": {
      "threshold": 3,
      "timeout": 60000
    },
    "monitoring": {
      "enabled": true,
      "interval": 300000,
      "logPath": "logs/tts-health.log"
    }
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
```javascript
// test/tts-service-manager.test.js
describe('TTSServiceManager', () => {
    test('should fallback to system TTS when iFlytek fails', async () => {
        // Test implementation
    });
    
    test('should respect circuit breaker state', async () => {
        // Test implementation
    });
    
    test('should record metrics correctly', async () => {
        // Test implementation
    });
});
```

### Integration Tests
```javascript
// test/audio-generation.integration.test.js
describe('Audio Generation Integration', () => {
    test('should generate audio with fallback chain', async () => {
        // Test full pipeline
    });
});
```

## 📈 Success Metrics

1. **Reliability**: Audio generation success rate > 95%
2. **Performance**: Average TTS response time < 10 seconds
3. **Availability**: System uptime > 99.5%
4. **Error Recovery**: Automatic recovery from failures < 2 minutes

## 🚨 Monitoring & Alerting

### Key Metrics to Track
- TTS service success rates
- Response times
- Error frequencies by type
- Circuit breaker state changes
- System resource usage

### Alert Conditions
- All TTS services failing
- Success rate drops below 90%
- Response time exceeds 30 seconds
- Circuit breaker opens

## 🎯 Next Steps

1. **Immediate**: Implement Phase 1 fixes
2. **Short-term**: Deploy enhanced service manager
3. **Medium-term**: Add comprehensive monitoring
4. **Long-term**: Explore additional TTS providers

This enhancement guide provides a roadmap to transform the current fragile TTS system into a robust, maintainable, and highly available audio generation service.