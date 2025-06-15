# Network Resilience Enhancements for Scraping Issues

## Problem Analysis: khaleejtimes.com Socket Hang Up Error

The recurring "socket hang up" error when scraping `https://www.khaleejtimes.com/` indicates network connectivity issues that require advanced resilience strategies.

### Root Causes Identified:
1. **Server-side connection limits**: khaleejtimes.com may be dropping connections
2. **Network instability**: Intermittent connectivity issues
3. **Rate limiting**: Server may be rejecting rapid requests
4. **Firewall/CDN interference**: Protection mechanisms blocking automated requests

## Immediate Solutions

### 1. Enhanced Connection Management

```javascript
// Enhanced HTTP client with connection pooling
const https = require('https');
const http = require('http');

class ResilientHttpClient {
    constructor() {
        this.httpsAgent = new https.Agent({
            keepAlive: true,
            keepAliveMsecs: 30000,
            maxSockets: 5,
            maxFreeSockets: 2,
            timeout: 60000,
            freeSocketTimeout: 30000
        });
        
        this.httpAgent = new http.Agent({
            keepAlive: true,
            keepAliveMsecs: 30000,
            maxSockets: 5,
            maxFreeSockets: 2,
            timeout: 60000,
            freeSocketTimeout: 30000
        });
    }
    
    getAgent(url) {
        return url.startsWith('https:') ? this.httpsAgent : this.httpAgent;
    }
}
```

### 2. Advanced Retry Strategy with Circuit Breaker

```javascript
class CircuitBreaker {
    constructor(threshold = 5, timeout = 60000) {
        this.failureThreshold = threshold;
        this.timeout = timeout;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    }
    
    async execute(operation) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }
        
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }
    
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
        }
    }
}
```

### 3. Intelligent Retry with Jitter

```javascript
class IntelligentRetry {
    constructor(options = {}) {
        this.maxRetries = options.maxRetries || 5;
        this.baseDelay = options.baseDelay || 1000;
        this.maxDelay = options.maxDelay || 30000;
        this.jitterFactor = options.jitterFactor || 0.1;
    }
    
    async execute(operation, context = {}) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (!this.isRetryable(error) || attempt === this.maxRetries) {
                    throw error;
                }
                
                const delay = this.calculateDelay(attempt);
                console.log(`Retry attempt ${attempt}/${this.maxRetries} for ${context.url || 'unknown'} in ${delay}ms`);
                
                await this.sleep(delay);
            }
        }
        
        throw lastError;
    }
    
    isRetryable(error) {
        const retryableErrors = [
            'socket hang up',
            'ECONNRESET',
            'ETIMEDOUT',
            'ENOTFOUND',
            'ECONNREFUSED',
            'net::ERR_',
            'timeout'
        ];
        
        return retryableErrors.some(pattern => 
            error.message.includes(pattern) || error.code === pattern
        );
    }
    
    calculateDelay(attempt) {
        // Exponential backoff with jitter
        const exponentialDelay = Math.min(
            this.baseDelay * Math.pow(2, attempt - 1),
            this.maxDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitter = exponentialDelay * this.jitterFactor * Math.random();
        
        return Math.floor(exponentialDelay + jitter);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

### 4. Enhanced Puppeteer Configuration

```javascript
const enhancedPuppeteerConfig = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ],
    defaultViewport: {
        width: 1920,
        height: 1080
    },
    timeout: 60000
};

async function createResilientPage(browser) {
    const page = await browser.newPage();
    
    // Set longer timeouts
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    
    // Handle page errors gracefully
    page.on('error', (error) => {
        console.warn('Page error:', error.message);
    });
    
    page.on('pageerror', (error) => {
        console.warn('Page script error:', error.message);
    });
    
    // Set request interception for better control
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
        // Block unnecessary resources to speed up loading
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            request.abort();
        } else {
            request.continue();
        }
    });
    
    return page;
}
```

### 5. Multi-Strategy Fallback System

```javascript
class MultiStrategyFallback {
    constructor() {
        this.strategies = [
            this.puppeteerStrategy.bind(this),
            this.axiosStrategy.bind(this),
            this.cheerioStrategy.bind(this),
            this.playwrightStrategy.bind(this)
        ];
    }
    
    async scrapeWithFallback(url, options = {}) {
        let lastError;
        
        for (let i = 0; i < this.strategies.length; i++) {
            try {
                console.log(`Trying strategy ${i + 1}/${this.strategies.length} for ${url}`);
                const result = await this.strategies[i](url, options);
                
                if (result && result.length > 0) {
                    console.log(`✅ Strategy ${i + 1} succeeded with ${result.length} articles`);
                    return result;
                }
            } catch (error) {
                lastError = error;
                console.warn(`Strategy ${i + 1} failed:`, error.message);
                
                // Wait before trying next strategy
                if (i < this.strategies.length - 1) {
                    await this.sleep(2000);
                }
            }
        }
        
        throw lastError || new Error('All fallback strategies failed');
    }
    
    async puppeteerStrategy(url, options) {
        // Enhanced Puppeteer implementation
        // (Implementation from enhanced_scraper.js)
    }
    
    async axiosStrategy(url, options) {
        // HTTP-only approach with axios
        const axios = require('axios');
        const cheerio = require('cheerio');
        
        const response = await axios.get(url, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive'
            }
        });
        
        const $ = cheerio.load(response.data);
        return this.extractArticles($, url);
    }
    
    async cheerioStrategy(url, options) {
        // Server-side rendering approach
        // Implementation with different parsing logic
    }
    
    async playwrightStrategy(url, options) {
        // Playwright as alternative to Puppeteer
        const { chromium } = require('playwright');
        // Implementation details
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

## Implementation Plan

### Phase 1: Immediate Fixes (1-2 days)
1. **Update news-to-audio.js** with enhanced retry logic
2. **Implement connection pooling** for HTTP requests
3. **Add circuit breaker** for khaleejtimes.com specifically

### Phase 2: Advanced Resilience (3-5 days)
1. **Deploy multi-strategy fallback** system
2. **Add comprehensive monitoring** and alerting
3. **Implement adaptive timeout** based on site performance

### Phase 3: Long-term Optimization (1 week)
1. **Machine learning-based** retry strategies
2. **Distributed scraping** across multiple IPs
3. **Real-time performance** monitoring dashboard

## Environment Variables to Add

```bash
# Network Resilience Settings
SCRAPING_MAX_RETRIES=5
SCRAPING_BASE_DELAY=1000
SCRAPING_MAX_DELAY=30000
SCRAPING_TIMEOUT=60000
SCRAPING_CIRCUIT_BREAKER_THRESHOLD=5
SCRAPING_CIRCUIT_BREAKER_TIMEOUT=60000

# Connection Pool Settings
HTTP_KEEP_ALIVE=true
HTTP_MAX_SOCKETS=5
HTTP_MAX_FREE_SOCKETS=2
HTTP_SOCKET_TIMEOUT=60000

# Site-specific Settings
KHALEEJTIMES_RETRY_DELAY=5000
KHALEEJTIMES_MAX_RETRIES=3
KHALEEJTIMES_TIMEOUT=90000
```

## Quick Implementation for khaleejtimes.com

```javascript
// Add this to news-to-audio.js
const SITE_SPECIFIC_CONFIG = {
    'khaleejtimes.com': {
        maxRetries: 3,
        baseDelay: 5000,
        timeout: 90000,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
};

function getSiteConfig(url) {
    const domain = new URL(url).hostname.replace('www.', '');
    return SITE_SPECIFIC_CONFIG[domain] || {};
}

// Enhanced scraping function
async function scrapeWithEnhancedResilience(url, options = {}) {
    const siteConfig = getSiteConfig(url);
    const retry = new IntelligentRetry(siteConfig);
    const circuitBreaker = new CircuitBreaker();
    
    return await circuitBreaker.execute(async () => {
        return await retry.execute(async () => {
            return await scrapeTopNews(url, { ...options, ...siteConfig });
        }, { url });
    });
}
```

## Success Metrics

- **Zero socket hang up errors** for khaleejtimes.com
- **95% success rate** across all news sources
- **Average response time** under 10 seconds
- **Graceful degradation** when primary methods fail
- **Comprehensive error logging** for debugging

## Monitoring and Alerting

```javascript
class ScrapingMonitor {
    constructor() {
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            errorsByType: {},
            sitePerformance: {}
        };
    }
    
    recordRequest(url, success, responseTime, error = null) {
        this.metrics.totalRequests++;
        
        if (success) {
            this.metrics.successfulRequests++;
        } else {
            this.metrics.failedRequests++;
            
            if (error) {
                const errorType = this.categorizeError(error);
                this.metrics.errorsByType[errorType] = 
                    (this.metrics.errorsByType[errorType] || 0) + 1;
            }
        }
        
        // Update site-specific metrics
        const domain = new URL(url).hostname;
        if (!this.metrics.sitePerformance[domain]) {
            this.metrics.sitePerformance[domain] = {
                requests: 0,
                successes: 0,
                averageTime: 0
            };
        }
        
        const siteMetrics = this.metrics.sitePerformance[domain];
        siteMetrics.requests++;
        if (success) siteMetrics.successes++;
        siteMetrics.averageTime = 
            (siteMetrics.averageTime * (siteMetrics.requests - 1) + responseTime) / siteMetrics.requests;
    }
    
    getHealthReport() {
        const successRate = (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;
        
        return {
            overall: {
                successRate: successRate.toFixed(2) + '%',
                totalRequests: this.metrics.totalRequests,
                averageResponseTime: this.metrics.averageResponseTime
            },
            errors: this.metrics.errorsByType,
            sitePerformance: this.metrics.sitePerformance
        };
    }
}
```

This comprehensive network resilience enhancement specifically addresses the khaleejtimes.com socket hang up issue while providing a robust foundation for handling similar problems across all news sources.