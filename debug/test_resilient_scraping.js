#!/usr/bin/env node
/**
 * Test Script for Resilient Scraping
 * Demonstrates the fix for khaleejtimes.com socket hang up issues
 */

const { patchScrapingFunction, getSiteConfig } = require('./resilient_scraper_patch');
const puppeteer = require('puppeteer');

// Mock the original scraping function for testing
async function originalScrapeTopNews(url, options = {}) {
    console.log(`🚀 Original scraping function called for: ${url}`);

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            ...(options.extraArgs || [])
        ]
    });

    try {
        const page = await browser.newPage();

        // Set timeouts
        page.setDefaultTimeout(options.timeout || 30000);
        page.setDefaultNavigationTimeout(options.timeout || 30000);

        // Set user agent if provided
        if (options.userAgent) {
            await page.setUserAgent(options.userAgent);
        }

        // Navigate to the page
        console.log(`📄 Navigating to ${url}...`);
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: options.timeout || 30000
        });

        // Wait for additional network idle time if specified
        if (options.waitForNetworkIdle) {
            await page.waitForTimeout(options.waitForNetworkIdle);
        }

        // Extract articles
        const articles = await page.evaluate(() => {
            const articleElements = document.querySelectorAll(
                'article h2 a, article h3 a, h1 a, h2 a, h3 a, .headline a, .title a'
            );

            const results = [];

            articleElements.forEach((element, index) => {
                if (index < 5) { // Limit to 5 articles
                    const title = element.textContent.trim();
                    const link = element.href;

                    if (title && link && title.length > 10) {
                        results.push({
                            title,
                            link,
                            summary: title,
                            image: null,
                            source: window.location.hostname
                        });
                    }
                }
            });

            return results;
        });

        console.log(`✅ Found ${articles.length} articles`);
        return articles;

    } finally {
        await browser.close();
    }
}

// Test function
async function testResilientScraping() {
    console.log('🧪 Testing Resilient Scraping Patch\n');

    // URLs to test
    const testUrls = [
        'https://www.khaleejtimes.com/',
        'https://www.bbc.com/news',
        'https://www.cnn.com'
    ];

    // Create enhanced scraping function
    const enhancedScrapeTopNews = patchScrapingFunction(originalScrapeTopNews);

    for (const url of testUrls) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎯 Testing: ${url}`);
        console.log(`${'='.repeat(60)}`);

        const siteConfig = getSiteConfig(url);
        console.log(`📋 Site Configuration:`, {
            maxRetries: siteConfig.maxRetries,
            baseDelay: siteConfig.baseDelay,
            timeout: siteConfig.timeout,
            userAgent: siteConfig.userAgent.substring(0, 50) + '...'
        });

        const startTime = Date.now();

        try {
            const articles = await enhancedScrapeTopNews(url);
            const duration = Date.now() - startTime;

            console.log(`\n✅ SUCCESS after ${duration}ms`);
            console.log(`📰 Found ${articles.length} articles:`);

            articles.forEach((article, index) => {
                console.log(`   ${index + 1}. ${article.title.substring(0, 80)}${article.title.length > 80 ? '...' : ''}`);
            });

        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`\n❌ FAILED after ${duration}ms`);
            console.log(`🚫 Error: ${error.message}`);

            // Check if it's a known network error
            if (error.message.includes('socket hang up') ||
                error.message.includes('ECONNRESET') ||
                error.message.includes('timeout')) {
                console.log(`🔍 This appears to be a network connectivity issue`);
                console.log(`💡 The resilient scraper attempted retries but the site may be temporarily unavailable`);
            }
        }

        // Wait between tests
        console.log(`\n⏳ Waiting 3 seconds before next test...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 Testing completed!`);
    console.log(`${'='.repeat(60)}`);
}

// Performance comparison test
async function performanceComparison() {
    console.log('\n📊 Performance Comparison: Original vs Enhanced\n');

    const testUrl = 'https://www.khaleejtimes.com/';
    const iterations = 3;

    console.log(`Testing ${testUrl} with ${iterations} iterations each\n`);

    // Test original function
    console.log('🔵 Testing Original Function:');
    const originalTimes = [];

    for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        try {
            await originalScrapeTopNews(testUrl, { timeout: 30000 });
            const duration = Date.now() - startTime;
            originalTimes.push(duration);
            console.log(`   Iteration ${i + 1}: ${duration}ms ✅`);
        } catch (error) {
            const duration = Date.now() - startTime;
            originalTimes.push(duration);
            console.log(`   Iteration ${i + 1}: ${duration}ms ❌ (${error.message.substring(0, 30)}...)`);
        }

        if (i < iterations - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Test enhanced function
    console.log('\n🟢 Testing Enhanced Function:');
    const enhancedTimes = [];
    const enhancedScrapeTopNews = patchScrapingFunction(originalScrapeTopNews);

    for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        try {
            await enhancedScrapeTopNews(testUrl);
            const duration = Date.now() - startTime;
            enhancedTimes.push(duration);
            console.log(`   Iteration ${i + 1}: ${duration}ms ✅`);
        } catch (error) {
            const duration = Date.now() - startTime;
            enhancedTimes.push(duration);
            console.log(`   Iteration ${i + 1}: ${duration}ms ❌ (${error.message.substring(0, 30)}...)`);
        }

        if (i < iterations - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Calculate statistics
    const originalAvg = originalTimes.reduce((a, b) => a + b, 0) / originalTimes.length;
    const enhancedAvg = enhancedTimes.reduce((a, b) => a + b, 0) / enhancedTimes.length;

    console.log('\n📈 Results Summary:');
    console.log(`   Original Average: ${originalAvg.toFixed(0)}ms`);
    console.log(`   Enhanced Average: ${enhancedAvg.toFixed(0)}ms`);
    console.log(`   Improvement: ${enhancedAvg < originalAvg ? 'Enhanced is faster' : 'Original is faster'} by ${Math.abs(enhancedAvg - originalAvg).toFixed(0)}ms`);
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Resilient Scraping Test Script

Usage:
  node test_resilient_scraping.js [options]

Options:
  --test, -t        Run basic resilient scraping tests
  --performance, -p Run performance comparison
  --all, -a         Run all tests
  --help, -h        Show this help message

Examples:
  node test_resilient_scraping.js --test
  node test_resilient_scraping.js --performance
  node test_resilient_scraping.js --all
`);
        return;
    }

    try {
        if (args.includes('--test') || args.includes('-t') || args.includes('--all') || args.includes('-a') || args.length === 0) {
            await testResilientScraping();
        }

        if (args.includes('--performance') || args.includes('-p') || args.includes('--all') || args.includes('-a')) {
            await performanceComparison();
        }

    } catch (error) {
        console.error('\n💥 Test execution failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Test interrupted by user');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Test terminated');
    process.exit(0);
});

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = {
    testResilientScraping,
    performanceComparison,
    originalScrapeTopNews
};