#!/usr/bin/env node

/**
 * Enhanced News Scraper with Improved Error Handling and Reliability
 * Addresses socket hang up errors and implements best practices
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const axios = require('axios');

// Enhanced Error Classes
class ScrapingError extends Error {
    constructor(message, type, url, retryable = false) {
        super(message);
        this.name = 'ScrapingError';
        this.type = type;
        this.url = url;
        this.retryable = retryable;
        this.timestamp = new Date().toISOString();
    }
}

// Structured Logger
class Logger {
    constructor(level = 'info') {
        this.level = level;
        this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    }
    
    log(level, message, meta = {}) {
        if (this.levels[level] <= this.levels[this.level]) {
            const logEntry = {
                timestamp: new Date().toISOString(),
                level: level.toUpperCase(),
                message,
                ...meta
            };
            
            console.log(JSON.stringify(logEntry));
        }
    }
    
    error(message, meta) { this.log('error', message, meta); }
    warn(message, meta) { this.log('warn', message, meta); }
    info(message, meta) { this.log('info', message, meta); }
    debug(message, meta) { this.log('debug', message, meta); }
}

const logger = new Logger(process.env.LOG_LEVEL || 'info');

// Browser Pool for Resource Management
class BrowserPool {
    constructor(maxBrowsers = 2) {
        this.maxBrowsers = maxBrowsers;
        this.browsers = [];
        this.activeBrowsers = 0;
        this.queue = [];
    }
    
    async getBrowser() {
        if (this.browsers.length > 0) {
            return this.browsers.pop();
        }
        
        if (this.activeBrowsers < this.maxBrowsers) {
            this.activeBrowsers++;
            return await this.createBrowser();
        }
        
        return new Promise((resolve) => {
            this.queue.push(resolve);
        });
    }
    
    async releaseBrowser(browser) {
        if (this.queue.length > 0) {
            const resolve = this.queue.shift();
            resolve(browser);
        } else {
            this.browsers.push(browser);
        }
    }
    
    async createBrowser() {
        return await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        });
    }
    
    async cleanup() {
        const allBrowsers = [...this.browsers];
        this.browsers = [];
        this.activeBrowsers = 0;
        
        await Promise.all(
            allBrowsers.map(browser => 
                browser.close().catch(err => 
                    logger.error('Error closing browser', { error: err.message })
                )
            )
        );
    }
}

const browserPool = new BrowserPool(parseInt(process.env.MAX_BROWSERS) || 2);

// Error Classification Functions
function isRetryableError(error) {
    const retryableErrors = [
        'socket hang up',
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'net::ERR_',
        'TimeoutError',
        'Navigation timeout',
        'Protocol error'
    ];
    
    return retryableErrors.some(pattern => 
        error.message.includes(pattern)
    );
}

function getErrorType(error) {
    if (error.message.includes('socket hang up')) return 'NETWORK_DISCONNECTION';
    if (error.message.includes('timeout')) return 'TIMEOUT';
    if (error.message.includes('ECONNRESET')) return 'CONNECTION_RESET';
    if (error.message.includes('net::ERR_')) return 'BROWSER_NETWORK_ERROR';
    if (error.message.includes('Protocol error')) return 'BROWSER_PROTOCOL_ERROR';
    return 'UNKNOWN';
}

// Enhanced Scraping with Retry Logic
async function scrapeWithRetry(url, options = {}, maxRetries = 3) {
    const { baseDelay = 1000, maxDelay = 10000 } = options;
    const requestId = Math.random().toString(36).substr(2, 9);
    
    logger.info('Starting scrape operation', {
        url,
        requestId,
        maxRetries,
        options: { ...options, sensitive: '[REDACTED]' }
    });
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const startTime = Date.now();
        
        try {
            logger.debug(`Attempt ${attempt}/${maxRetries}`, { url, requestId, attempt });
            
            const result = await scrapeTopNewsEnhanced(url, { ...options, requestId });
            
            logger.info('Scrape operation completed', {
                url,
                requestId,
                attempt,
                duration: Date.now() - startTime,
                articlesFound: result.length
            });
            
            return result;
            
        } catch (error) {
            const isRetryable = isRetryableError(error);
            const errorType = getErrorType(error);
            
            logger.warn('Scrape attempt failed', {
                url,
                requestId,
                attempt,
                duration: Date.now() - startTime,
                error: error.message,
                errorType,
                isRetryable
            });
            
            if (!isRetryable || attempt === maxRetries) {
                logger.error('Scrape operation failed permanently', {
                    url,
                    requestId,
                    totalAttempts: attempt,
                    finalError: error.message,
                    errorType
                });
                
                throw new ScrapingError(
                    error.message,
                    errorType,
                    url,
                    isRetryable
                );
            }
            
            const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
            logger.info(`Retrying in ${delay}ms`, { url, requestId, attempt, delay });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Enhanced Main Scraping Function
async function scrapeTopNewsEnhanced(url, options = {}) {
    const {
        width = 1920,
        height = 1080,
        waitFor = 3000,
        maxNews = 10,
        timeout = 30000,
        requestId = 'unknown'
    } = options;

    let browser = null;
    let page = null;
    
    try {
        logger.debug('Getting browser from pool', { url, requestId });
        browser = await browserPool.getBrowser();
        
        logger.debug('Creating new page', { url, requestId });
        page = await browser.newPage();
        
        // Enhanced page configuration
        await page.setViewport({ width, height });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set additional headers
        await page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        });
        
        // Enhanced error handling for navigation
        logger.debug('Navigating to URL', { url, requestId, timeout });
        
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: timeout
        });
        
        logger.debug('Page loaded, waiting for content', { url, requestId, waitFor });
        
        // Wait for additional time
        if (waitFor > 0) {
            await new Promise(resolve => setTimeout(resolve, waitFor));
        }
        
        // Handle popups and overlays
        await handlePageOverlays(page, requestId);
        
        // Extract news articles
        logger.debug('Extracting articles', { url, requestId, maxNews });
        const newsArticles = await extractNewsArticles(page, maxNews, requestId);
        
        logger.debug('Articles extracted successfully', {
            url,
            requestId,
            count: newsArticles.length
        });
        
        return newsArticles;
        
    } catch (error) {
        logger.error('Enhanced scraping failed', {
            url,
            requestId,
            error: error.message,
            stack: error.stack
        });
        throw error;
    } finally {
        // Ensure proper cleanup
        if (page) {
            try {
                await page.close();
                logger.debug('Page closed successfully', { url, requestId });
            } catch (err) {
                logger.warn('Error closing page', { url, requestId, error: err.message });
            }
        }
        
        if (browser) {
            try {
                await browserPool.releaseBrowser(browser);
                logger.debug('Browser returned to pool', { url, requestId });
            } catch (err) {
                logger.warn('Error returning browser to pool', { url, requestId, error: err.message });
            }
        }
    }
}

// Enhanced Popup Handling
async function handlePageOverlays(page, requestId) {
    try {
        await page.evaluate(() => {
            // Enhanced popup removal logic
            const overlaySelectors = [
                '[id*="cookie"]',
                '[class*="cookie"]',
                '[id*="consent"]',
                '[class*="consent"]',
                '[id*="popup"]',
                '[class*="popup"]',
                '[id*="modal"]',
                '[class*="modal"]',
                '[id*="subscribe"]',
                '[class*="subscribe"]',
                '.overlay',
                '.modal-backdrop',
                '[role="dialog"]',
                '[role="alertdialog"]'
            ];
            
            const closeSelectors = [
                'button[aria-label*="close"]',
                'button[aria-label*="Close"]',
                'button[title*="close"]',
                'button[title*="Close"]',
                '.close-button',
                '.close-btn',
                '.dismiss-button',
                '.accept-cookies',
                '.accept-all'
            ];
            
            // Try to click close buttons first
            for (const selector of closeSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element && element.offsetParent !== null) {
                        element.click();
                        return;
                    }
                }
            }
            
            // Remove overlays directly
            for (const selector of overlaySelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element && element.offsetParent !== null) {
                        element.style.display = 'none';
                        element.remove();
                    }
                }
            }
        });
        
        logger.debug('Popup handling completed', { requestId });
    } catch (error) {
        logger.warn('Error handling popups', { requestId, error: error.message });
    }
}

// Enhanced Article Extraction
async function extractNewsArticles(page, maxNews, requestId) {
    return await page.evaluate((maxNews) => {
        const articles = [];
        
        // Enhanced selectors for better article detection
        const selectors = [
            'article',
            '.article',
            '.news-item',
            '.story',
            '.post',
            '.entry',
            '[class*="article"]',
            '[class*="story"]',
            '[class*="news"]',
            '[data-testid*="article"]',
            '[data-testid*="story"]',
            'h1, h2, h3',
            '.headline',
            '.title'
        ];
        
        const foundTitles = new Set();
        
        for (const selector of selectors) {
            if (articles.length >= maxNews) break;
            
            const elements = document.querySelectorAll(selector);
            
            for (const element of elements) {
                if (articles.length >= maxNews) break;
                
                // Enhanced title extraction
                let title = '';
                const titleElement = element.querySelector('h1, h2, h3, .headline, .title, [class*="title"], [class*="headline"]') || element;
                if (titleElement) {
                    title = titleElement.textContent?.trim() || titleElement.innerText?.trim() || '';
                }
                
                // Enhanced link extraction
                let link = '';
                const linkElement = element.querySelector('a') || (element.tagName === 'A' ? element : null);
                if (linkElement) {
                    link = linkElement.href || '';
                    // Convert relative URLs to absolute
                    if (link.startsWith('/')) {
                        link = window.location.origin + link;
                    }
                }
                
                // Enhanced summary extraction
                let summary = '';
                const summaryElement = element.querySelector('p, .summary, .excerpt, .description, [class*="summary"], [class*="excerpt"], [class*="description"]');
                if (summaryElement) {
                    summary = summaryElement.textContent?.trim() || summaryElement.innerText?.trim() || '';
                }
                
                // Enhanced image extraction
                let image = '';
                const imageElement = element.querySelector('img');
                if (imageElement) {
                    image = imageElement.src || imageElement.dataset.src || imageElement.getAttribute('data-lazy-src') || '';
                    // Convert relative URLs to absolute
                    if (image.startsWith('/')) {
                        image = window.location.origin + image;
                    }
                }
                
                // Enhanced validation
                if (title && 
                    title.length > 10 && 
                    title.length < 300 &&
                    !title.toLowerCase().includes('cookie') && 
                    !title.toLowerCase().includes('subscribe') &&
                    !title.toLowerCase().includes('javascript') &&
                    !title.toLowerCase().includes('menu') &&
                    !foundTitles.has(title.toLowerCase())) {
                    
                    foundTitles.add(title.toLowerCase());
                    
                    articles.push({
                        title: title.substring(0, 200),
                        link: link,
                        summary: summary.substring(0, 300),
                        image: image,
                        scrapedAt: new Date().toISOString(),
                        method: 'enhanced-puppeteer'
                    });
                }
            }
        }
        
        return articles.slice(0, maxNews);
    }, maxNews);
}

// Enhanced HTTP Fallback Method
async function scrapeWithHttpFallback(url, options = {}) {
    const { maxNews = 10, requestId = 'unknown' } = options;
    
    try {
        logger.info('Using HTTP fallback method', { url, requestId });
        
        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        const html = response.data;
        const articles = [];
        
        // Enhanced regex patterns for title extraction
        const titlePatterns = [
            /<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi,
            /<[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)/gi,
            /<[^>]*class="[^"]*headline[^"]*"[^>]*>([^<]+)/gi,
            /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/gi,
            /<meta[^>]*name="title"[^>]*content="([^"]+)"/gi
        ];
        
        const foundTitles = new Set();
        
        for (const pattern of titlePatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null && articles.length < maxNews) {
                const title = match[1]?.trim()
                    .replace(/&[^;]+;/g, ' ')
                    .replace(/\s+/g, ' ')
                    .replace(/<[^>]*>/g, '');
                
                if (title &&
                    title.length > 15 &&
                    title.length < 200 &&
                    !title.toLowerCase().includes('cookie') &&
                    !title.toLowerCase().includes('subscribe') &&
                    !title.toLowerCase().includes('menu') &&
                    !title.toLowerCase().includes('javascript') &&
                    !foundTitles.has(title.toLowerCase())) {
                    
                    foundTitles.add(title.toLowerCase());
                    articles.push({
                        title: title,
                        link: url,
                        summary: '',
                        image: '',
                        scrapedAt: new Date().toISOString(),
                        method: 'http-regex-enhanced'
                    });
                }
            }
        }
        
        logger.info('HTTP fallback completed', {
            url,
            requestId,
            articlesFound: articles.length
        });
        
        return articles.slice(0, maxNews);
        
    } catch (error) {
        logger.error('HTTP fallback failed', {
            url,
            requestId,
            error: error.message
        });
        
        // Final fallback: create a generic news item
        const domain = new URL(url).hostname;
        return [{
            title: `Latest news from ${domain}`,
            link: url,
            summary: `Unable to fetch specific articles from ${domain} due to technical restrictions.`,
            image: '',
            scrapedAt: new Date().toISOString(),
            method: 'fallback-generic'
        }];
    }
}

// Main Enhanced Scraping Function with Full Fallback Chain
async function scrapeNewsEnhanced(url, options = {}) {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();
    
    logger.info('Starting enhanced news scraping', { url, requestId, options });
    
    try {
        // Primary method: Enhanced Puppeteer with retry
        const articles = await scrapeWithRetry(url, { ...options, requestId });
        
        if (articles.length > 0) {
            logger.info('Primary method successful', {
                url,
                requestId,
                duration: Date.now() - startTime,
                articlesFound: articles.length
            });
            return articles;
        }
        
        logger.warn('Primary method found no articles, trying HTTP fallback', { url, requestId });
        
    } catch (error) {
        logger.warn('Primary method failed, trying HTTP fallback', {
            url,
            requestId,
            error: error.message
        });
    }
    
    // Fallback method: HTTP-based scraping
    try {
        const fallbackArticles = await scrapeWithHttpFallback(url, { ...options, requestId });
        
        logger.info('Fallback method completed', {
            url,
            requestId,
            duration: Date.now() - startTime,
            articlesFound: fallbackArticles.length,
            method: 'http-fallback'
        });
        
        return fallbackArticles;
        
    } catch (error) {
        logger.error('All scraping methods failed', {
            url,
            requestId,
            duration: Date.now() - startTime,
            error: error.message
        });
        
        throw new ScrapingError(
            `All scraping methods failed for ${url}: ${error.message}`,
            'TOTAL_FAILURE',
            url,
            false
        );
    }
}

// Graceful Shutdown Handler
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, cleaning up...');
    await browserPool.cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, cleaning up...');
    await browserPool.cleanup();
    process.exit(0);
});

// Export functions for use in other modules
module.exports = {
    scrapeNewsEnhanced,
    scrapeWithRetry,
    scrapeWithHttpFallback,
    ScrapingError,
    Logger,
    BrowserPool,
    isRetryableError,
    getErrorType
};

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node enhanced_scraper.js <url> [maxNews]');
        console.log('Example: node enhanced_scraper.js https://www.khaleejtimes.com/ 5');
        process.exit(1);
    }
    
    const url = args[0];
    const maxNews = parseInt(args[1]) || 10;
    
    (async () => {
        try {
            const articles = await scrapeNewsEnhanced(url, { maxNews });
            
            console.log('\n=== SCRAPING RESULTS ===');
            console.log(`Found ${articles.length} articles from ${url}`);
            
            articles.forEach((article, index) => {
                console.log(`\n${index + 1}. ${article.title}`);
                if (article.link) console.log(`   Link: ${article.link}`);
                if (article.summary) console.log(`   Summary: ${article.summary.substring(0, 100)}...`);
                console.log(`   Method: ${article.method}`);
            });
            
        } catch (error) {
            logger.error('CLI scraping failed', { error: error.message });
            process.exit(1);
        } finally {
            await browserPool.cleanup();
        }
    })();
}