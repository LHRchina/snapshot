const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Import both implementations
const puppeteerScraper = require('./snapshot.js');
const cheerioScraper = require('./snapshot-cheerio.js');

/**
 * Measure memory usage
 */
function getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024) // MB
    };
}

/**
 * Run performance comparison
 */
async function runComparison() {
    console.log('🚀 Performance Comparison: Puppeteer vs Cheerio\n');
    
    const testUrl = 'https://www.khaleejtimes.com/';
    const options = { maxNews: 5, saveToFile: false };
    
    const results = {
        puppeteer: null,
        cheerio: null
    };
    
    // Test Cheerio implementation
    console.log('📊 Testing Cheerio Implementation...');
    const cheerioStartTime = performance.now();
    const cheerioStartMemory = getMemoryUsage();
    
    try {
        const cheerioArticles = await cheerioScraper.scrapeTopNews(testUrl, options);
        const cheerioEndTime = performance.now();
        const cheerioEndMemory = getMemoryUsage();
        
        results.cheerio = {
            success: true,
            articlesFound: cheerioArticles.length,
            executionTime: Math.round(cheerioEndTime - cheerioStartTime),
            memoryUsage: {
                start: cheerioStartMemory,
                end: cheerioEndMemory,
                peak: cheerioEndMemory.rss - cheerioStartMemory.rss
            }
        };
        
        console.log(`✅ Cheerio: Found ${cheerioArticles.length} articles in ${results.cheerio.executionTime}ms`);
        
    } catch (error) {
        results.cheerio = {
            success: false,
            error: error.message,
            executionTime: Math.round(performance.now() - cheerioStartTime)
        };
        console.log(`❌ Cheerio failed: ${error.message}`);
    }
    
    // Wait a bit before testing Puppeteer
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test Puppeteer implementation
    console.log('\n🎭 Testing Puppeteer Implementation...');
    const puppeteerStartTime = performance.now();
    const puppeteerStartMemory = getMemoryUsage();
    
    try {
        const puppeteerArticles = await puppeteerScraper.scrapeTopNews(testUrl, options);
        const puppeteerEndTime = performance.now();
        const puppeteerEndMemory = getMemoryUsage();
        
        results.puppeteer = {
            success: true,
            articlesFound: puppeteerArticles.length,
            executionTime: Math.round(puppeteerEndTime - puppeteerStartTime),
            memoryUsage: {
                start: puppeteerStartMemory,
                end: puppeteerEndMemory,
                peak: puppeteerEndMemory.rss - puppeteerStartMemory.rss
            }
        };
        
        console.log(`✅ Puppeteer: Found ${puppeteerArticles.length} articles in ${results.puppeteer.executionTime}ms`);
        
    } catch (error) {
        results.puppeteer = {
            success: false,
            error: error.message,
            executionTime: Math.round(performance.now() - puppeteerStartTime)
        };
        console.log(`❌ Puppeteer failed: ${error.message}`);
    }
    
    // Display comparison results
    console.log('\n📈 Performance Comparison Results\n');
    console.log('┌─────────────────┬─────────────┬─────────────┬─────────────┐');
    console.log('│ Implementation  │ Articles    │ Time (ms)   │ Memory (MB) │');
    console.log('├─────────────────┼─────────────┼─────────────┼─────────────┤');
    
    if (results.cheerio && results.cheerio.success) {
        console.log(`│ Cheerio         │ ${String(results.cheerio.articlesFound).padEnd(11)} │ ${String(results.cheerio.executionTime).padEnd(11)} │ ${String(results.cheerio.memoryUsage.end.rss).padEnd(11)} │`);
    } else {
        console.log('│ Cheerio         │ Failed      │ -           │ -           │');
    }
    
    if (results.puppeteer && results.puppeteer.success) {
        console.log(`│ Puppeteer       │ ${String(results.puppeteer.articlesFound).padEnd(11)} │ ${String(results.puppeteer.executionTime).padEnd(11)} │ ${String(results.puppeteer.memoryUsage.end.rss).padEnd(11)} │`);
    } else {
        console.log('│ Puppeteer       │ Failed      │ -           │ -           │');
    }
    
    console.log('└─────────────────┴─────────────┴─────────────┴─────────────┘');
    
    // Calculate performance improvements
    if (results.cheerio && results.cheerio.success && results.puppeteer && results.puppeteer.success) {
        const speedImprovement = Math.round((results.puppeteer.executionTime / results.cheerio.executionTime) * 100) / 100;
        const memoryImprovement = Math.round((results.puppeteer.memoryUsage.end.rss / results.cheerio.memoryUsage.end.rss) * 100) / 100;
        
        console.log('\n🎯 Performance Improvements with Cheerio:');
        console.log(`   ⚡ Speed: ${speedImprovement}x faster`);
        console.log(`   💾 Memory: ${memoryImprovement}x less memory usage`);
    }
    
    // Save detailed results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsPath = path.join(__dirname, 'news_data', `performance_comparison_${timestamp}.json`);
    
    const detailedResults = {
        timestamp: new Date().toISOString(),
        testUrl: testUrl,
        testOptions: options,
        results: results,
        nodeVersion: process.version,
        platform: process.platform
    };
    
    fs.writeFileSync(resultsPath, JSON.stringify(detailedResults, null, 2));
    console.log(`\n📄 Detailed results saved to: ${resultsPath}`);
    
    console.log('\n✨ Comparison completed!');
}

// Run the comparison if this script is executed directly
if (require.main === module) {
    runComparison().catch(console.error);
}

module.exports = { runComparison };