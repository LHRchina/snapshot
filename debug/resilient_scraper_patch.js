/**
 * Resilient Scraper Patch - Immediate Fix for Socket Hang Up Issues
 * Specifically addresses khaleejtimes.com connectivity problems
 */

const https = require('https');
const http = require('http');

// Enhanced HTTP agents with connection pooling
const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 5,
    maxFreeSockets: 2,
    timeout: 60000,
    freeSocketTimeout: 30000
});

const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 5,
    maxFreeSockets: 2,
    timeout: 60000,
    freeSocketTimeout: 30000
});

// Site-specific configurations
const SITE_CONFIGS = {
    'khaleejtimes.com': {
        maxRetries: 4,
        baseDelay: 3000,
        maxDelay: 15000,
        timeout: 90000,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        waitForNetworkIdle: 2000,
        extraArgs: [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=VizDisplayCompositor',
            '--no-first-run'
        ]
    },
    'default': {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        timeout: 60000,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        waitForNetworkIdle: 1000,
        extraArgs: []
    }
};

class ResilientRetry {
    constructor(siteConfig) {
        this.maxRetries = siteConfig.maxRetries || 3;
        this.baseDelay = siteConfig.baseDelay || 1000;
        this.maxDelay = siteConfig.maxDelay || 10000;
        this.jitterFactor = 0.1;
    }

    async execute(operation, context = {}) {
        let lastError;
        const startTime = Date.now();

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`🔄 Attempt ${attempt}/${this.maxRetries} for ${context.url || 'unknown'}`);
                const result = await operation();
                
                const duration = Date.now() - startTime;
                console.log(`✅ Success on attempt ${attempt} after ${duration}ms`);
                return result;
            } catch (error) {
                lastError = error;
                const duration = Date.now() - startTime;
                
                console.log(`❌ Attempt ${attempt} failed after ${duration}ms: ${error.message}`);
                
                if (!this.isRetryable(error) || attempt === this.maxRetries) {
                    console.log(`🚫 ${attempt === this.maxRetries ? 'Max retries reached' : 'Non-retryable error'}, giving up`);
                    break;
                }
                
                const delay = this.calculateDelay(attempt);
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await this.sleep(delay);
            }
        }
        
        throw lastError;
    }

    isRetryable(error) {
        const retryablePatterns = [
            'socket hang up',
            'ECONNRESET',
            'ETIMEDOUT',
            'ENOTFOUND',
            'ECONNREFUSED',
            'net::ERR_',
            'timeout',
            'Navigation timeout',
            'Protocol error'
        ];
        
        return retryablePatterns.some(pattern => 
            error.message.includes(pattern) || 
            error.code === pattern ||
            (error.name && error.name.includes(pattern))
        );
    }

    calculateDelay(attempt) {
        // Exponential backoff with jitter
        const exponentialDelay = Math.min(
            this.baseDelay * Math.pow(1.5, attempt - 1),
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

class CircuitBreaker {
    constructor(threshold = 3, timeout = 60000) {
        this.failureThreshold = threshold;
        this.timeout = timeout;
        this.failures = new Map(); // Per-domain failure tracking
    }

    async execute(operation, domain) {
        const domainState = this.getOrCreateDomainState(domain);
        
        if (domainState.state === 'OPEN') {
            if (Date.now() - domainState.lastFailureTime > this.timeout) {
                domainState.state = 'HALF_OPEN';
                console.log(`🔄 Circuit breaker for ${domain} moving to HALF_OPEN`);
            } else {
                throw new Error(`Circuit breaker is OPEN for ${domain}`);
            }
        }
        
        try {
            const result = await operation();
            this.onSuccess(domain);
            return result;
        } catch (error) {
            this.onFailure(domain);
            throw error;
        }
    }

    getOrCreateDomainState(domain) {
        if (!this.failures.has(domain)) {
            this.failures.set(domain, {
                count: 0,
                state: 'CLOSED',
                lastFailureTime: null
            });
        }
        return this.failures.get(domain);
    }

    onSuccess(domain) {
        const domainState = this.getOrCreateDomainState(domain);
        domainState.count = 0;
        domainState.state = 'CLOSED';
        console.log(`✅ Circuit breaker for ${domain} reset to CLOSED`);
    }

    onFailure(domain) {
        const domainState = this.getOrCreateDomainState(domain);
        domainState.count++;
        domainState.lastFailureTime = Date.now();
        
        if (domainState.count >= this.failureThreshold) {
            domainState.state = 'OPEN';
            console.log(`🚫 Circuit breaker for ${domain} opened after ${domainState.count} failures`);
        }
    }
}

// Global circuit breaker instance
const globalCircuitBreaker = new CircuitBreaker(3, 60000);

function getSiteConfig(url) {
    try {
        const domain = new URL(url).hostname.replace('www.', '');
        return SITE_CONFIGS[domain] || SITE_CONFIGS.default;
    } catch {
        return SITE_CONFIGS.default;
    }
}

function getDomain(url) {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return 'unknown';
    }
}

/**
 * Enhanced scraping function with resilience features
 */
async function scrapeWithResilience(originalScrapeFunction, url, options = {}) {
    const siteConfig = getSiteConfig(url);
    const domain = getDomain(url);
    const retry = new ResilientRetry(siteConfig);
    
    console.log(`🎯 Starting resilient scraping for ${url}`);
    console.log(`📋 Using config:`, {
        maxRetries: siteConfig.maxRetries,
        baseDelay: siteConfig.baseDelay,
        timeout: siteConfig.timeout
    });
    
    return await globalCircuitBreaker.execute(async () => {
        return await retry.execute(async () => {
            // Merge site-specific options
            const enhancedOptions = {
                ...options,
                timeout: siteConfig.timeout,
                userAgent: siteConfig.userAgent,
                waitForNetworkIdle: siteConfig.waitForNetworkIdle,
                extraArgs: siteConfig.extraArgs
            };
            
            return await originalScrapeFunction(url, enhancedOptions);
        }, { url, domain });
    }, domain);
}

/**
 * Enhanced Puppeteer page creation with resilience features
 */
async function createResilientPage(browser, siteConfig) {
    const page = await browser.newPage();
    
    // Set timeouts
    page.setDefaultTimeout(siteConfig.timeout);
    page.setDefaultNavigationTimeout(siteConfig.timeout);
    
    // Set user agent
    await page.setUserAgent(siteConfig.userAgent);
    
    // Set viewport
    await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
    });
    
    // Handle errors gracefully
    page.on('error', (error) => {
        console.warn(`⚠️  Page error: ${error.message}`);
    });
    
    page.on('pageerror', (error) => {
        console.warn(`⚠️  Page script error: ${error.message}`);
    });
    
    // Set request interception for performance
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
        const resourceType = request.resourceType();
        
        // Block heavy resources to improve loading speed
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            request.abort();
        } else {
            // Add custom headers for better compatibility
            const headers = {
                ...request.headers(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            };
            
            request.continue({ headers });
        }
    });
    
    return page;
}

/**
 * Enhanced HTTP fallback with connection pooling
 */
async function enhancedHttpFallback(url, options = {}) {
    const axios = require('axios');
    const siteConfig = getSiteConfig(url);
    
    const axiosConfig = {
        timeout: siteConfig.timeout,
        httpsAgent: url.startsWith('https:') ? httpsAgent : undefined,
        httpAgent: url.startsWith('http:') && !url.startsWith('https:') ? httpAgent : undefined,
        headers: {
            'User-Agent': siteConfig.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 400
    };
    
    console.log(`🌐 Attempting HTTP fallback for ${url}`);
    
    try {
        const response = await axios.get(url, axiosConfig);
        console.log(`✅ HTTP fallback successful, received ${response.data.length} bytes`);
        
        // Parse with cheerio
        const cheerio = require('cheerio');
        const $ = cheerio.load(response.data);
        
        return extractArticlesFromHtml($, url);
    } catch (error) {
        console.error(`❌ HTTP fallback failed: ${error.message}`);
        throw error;
    }
}

/**
 * Extract articles from HTML using multiple selector strategies
 */
function extractArticlesFromHtml($, url) {
    const articles = [];
    const domain = getDomain(url);
    
    // Site-specific selectors
    const selectorStrategies = {
        'khaleejtimes.com': [
            'article h2 a, article h3 a',
            '.story-title a, .headline a',
            'h2.title a, h3.title a',
            '[data-testid="headline"] a',
            '.article-title a'
        ],
        'default': [
            'article h1 a, article h2 a, article h3 a',
            'h1 a, h2 a, h3 a',
            '.headline a, .title a',
            '[class*="title"] a, [class*="headline"] a',
            'a[href*="/news/"], a[href*="/article/"]'
        ]
    };
    
    const selectors = selectorStrategies[domain] || selectorStrategies.default;
    
    for (const selector of selectors) {
        try {
            $(selector).each((i, element) => {
                const $el = $(element);
                const title = $el.text().trim();
                const link = $el.attr('href');
                
                if (title && link && title.length > 10) {
                    const fullLink = link.startsWith('http') ? link : new URL(link, url).href;
                    
                    // Avoid duplicates
                    if (!articles.some(a => a.title === title || a.link === fullLink)) {
                        articles.push({
                            title,
                            link: fullLink,
                            summary: title, // Use title as summary for HTTP fallback
                            image: null,
                            source: domain
                        });
                    }
                }
            });
            
            if (articles.length > 0) {
                console.log(`✅ Found ${articles.length} articles using selector: ${selector}`);
                break;
            }
        } catch (error) {
            console.warn(`⚠️  Selector failed: ${selector} - ${error.message}`);
        }
    }
    
    return articles.slice(0, 10); // Limit to 10 articles
}

/**
 * Patch existing scraping function
 */
function patchScrapingFunction(originalFunction) {
    return async function(url, options = {}) {
        try {
            return await scrapeWithResilience(originalFunction, url, options);
        } catch (error) {
            console.log(`🔄 Primary scraping failed, trying HTTP fallback...`);
            
            try {
                const fallbackResult = await enhancedHttpFallback(url, options);
                if (fallbackResult && fallbackResult.length > 0) {
                    console.log(`✅ HTTP fallback succeeded with ${fallbackResult.length} articles`);
                    return fallbackResult;
                }
            } catch (fallbackError) {
                console.error(`❌ HTTP fallback also failed: ${fallbackError.message}`);
            }
            
            throw error;
        }
    };
}

module.exports = {
    scrapeWithResilience,
    createResilientPage,
    enhancedHttpFallback,
    patchScrapingFunction,
    getSiteConfig,
    ResilientRetry,
    CircuitBreaker,
    SITE_CONFIGS
};

// Usage example:
// const { patchScrapingFunction } = require('./resilient_scraper_patch');
// const enhancedScrapeTopNews = patchScrapingFunction(scrapeTopNews);
// const articles = await enhancedScrapeTopNews('https://www.khaleejtimes.com/');