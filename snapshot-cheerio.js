// Express and CORS removed - CLI only version
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

// Express server removed - CLI only version

// Create news data directory if it doesn't exist
const newsDir = path.join(__dirname, 'news_data');
if (!fs.existsSync(newsDir)) {
    fs.mkdirSync(newsDir, { recursive: true });
}

/**
 * Generate markdown content for a single website's news data
 * @param {Object} newsData - News data object
 * @returns {string} - Markdown formatted content
 */
function generateMarkdown(newsData) {
    const { url, scrapedAt, totalArticles, articles } = newsData;
    const domain = new URL(url).hostname;
    const date = new Date(scrapedAt).toLocaleString();
    
    let markdown = `# News Report: ${domain}\n\n`;
    markdown += `**Source:** ${url}\n`;
    markdown += `**Scraped At:** ${date}\n`;
    markdown += `**Total Articles:** ${totalArticles}\n\n`;
    markdown += `---\n\n`;
    
    if (articles.length === 0) {
        markdown += `No articles found.\n`;
        return markdown;
    }
    
    articles.forEach((article, index) => {
        markdown += `## ${index + 1}. ${article.title}\n\n`;
        
        if (article.link) {
            markdown += `**Link:** [Read Full Article](${article.link})\n\n`;
        }
        
        if (article.summary && article.summary.trim()) {
            markdown += `**Summary:** ${article.summary}\n\n`;
        }
        
        if (article.image) {
            markdown += `**Image:** ![Article Image](${article.image})\n\n`;
        }
        
        markdown += `**Scraped:** ${new Date(article.scrapedAt).toLocaleString()}\n\n`;
        markdown += `---\n\n`;
    });
    
    return markdown;
}

/**
 * Generate text content for single website's news data
 * @param {Object} newsData - News data object
 * @returns {string} - Text formatted content
 */
function generateText(newsData) {
    const { url, scrapedAt, totalArticles, articles } = newsData;
    const domain = url ? new URL(url).hostname : 'Unknown';
    const date = new Date(scrapedAt).toLocaleString();
    
    let text = `NEWS REPORT: ${domain.toUpperCase()}\n`;
    text += `Scraped At: ${date}\n\n`;
    
    if (articles.length === 0) {
        text += `No articles found.\n`;
        return text;
    }
    
    articles.forEach((article, index) => {
        text += `${index + 1}. ${article.title}\n`;
        if (article.summary && article.summary.trim()) {
            text += `   Summary: ${article.summary}\n`;
        }
        if (article.link) {
            text += `   URL: ${article.link}\n`;
        }
        text += `   Time: ${new Date(article.scrapedAt).toLocaleString()}\n\n`;
    });
    
    return text;
}

/**
 * Generate text content for multiple websites' news data
 * @param {Object} results - Combined results object
 * @returns {string} - Text formatted content
 */
function generateMultipleSitesText(results) {
    const { totalWebsites, scrapedAt, websites, allArticles } = results;
    const date = new Date(scrapedAt).toLocaleString();
    
    let text = `MULTI-SITE NEWS REPORT\n`;
    text += `Scraped At: ${date}\n\n`;
    
    // Articles from all websites with just title and time
    websites.forEach((site, siteIndex) => {
        const domain = site.domain || (site.url ? new URL(site.url).hostname : 'Unknown');
        text += `WEBSITE: ${domain.toUpperCase()}\n\n`;
        
        if (!site.success) {
            text += `  Error: Could not retrieve articles\n\n`;
        } else if (site.articles.length > 0) {
            site.articles.forEach((article, index) => {
                text += `  ${index + 1}. ${article.title}\n`;
                if (article.summary && article.summary.trim()) {
                    text += `     Summary: ${article.summary}\n`;
                }
                if (article.link) {
                    text += `     URL: ${article.link}\n`;
                }
                text += `     Time: ${new Date(article.scrapedAt).toLocaleString()}\n\n`;
            });
        } else {
            text += `  No articles found.\n\n`;
        }
    });
    
    return text;
}

/**
 * Generate markdown content for multiple websites' news data
 * @param {Object} results - Combined results object
 * @returns {string} - Markdown formatted content
 */
function generateMultipleSitesMarkdown(results) {
    const { totalWebsites, scrapedAt, websites, allArticles } = results;
    const date = new Date(scrapedAt).toLocaleString();
    
    let markdown = `# Multi-Site News Report\n\n`;
    markdown += `**Scraped At:** ${date}\n`;
    markdown += `**Total Websites:** ${totalWebsites}\n`;
    markdown += `**Total Articles:** ${allArticles.length}\n\n`;
    markdown += `---\n\n`;
    
    // Summary table
    markdown += `## Summary\n\n`;
    markdown += `| Website | Status | Articles |\n`;
    markdown += `|---------|--------|----------|\n`;
    
    websites.forEach(site => {
        const status = site.error ? '❌ Failed' : '✅ Success';
        const articleCount = site.articlesFound || site.articleCount || 0;
        const siteName = site.name || site.domain || new URL(site.url).hostname;
        markdown += `| ${siteName} | ${status} | ${articleCount} |\n`;
    });
    
    markdown += `\n---\n\n`;
    
    // Detailed articles by website
    websites.forEach(site => {
        const siteName = site.name || site.domain || new URL(site.url).hostname;
        markdown += `## ${siteName}\n\n`;
        markdown += `**URL:** ${site.url}\n`;
        
        if (site.error) {
            markdown += `**Status:** ❌ Failed\n`;
            markdown += `**Error:** ${site.error}\n\n`;
            markdown += `---\n\n`;
            return;
        }
        
        markdown += `**Status:** ✅ Success\n`;
        const articleCount = site.articlesFound || site.articleCount || 0;
        markdown += `**Articles Found:** ${articleCount}\n\n`;
        
        if (!site.articles || site.articles.length === 0) {
            markdown += `No articles found.\n\n`;
        } else {
            site.articles.forEach((article, index) => {
                markdown += `### ${index + 1}. ${article.title}\n\n`;
                
                if (article.link) {
                    markdown += `**Link:** [Read Full Article](${article.link})\n\n`;
                }
                
                if (article.summary && article.summary.trim()) {
                    markdown += `**Summary:** ${article.summary}\n\n`;
                }
                
                if (article.image) {
                    markdown += `**Image:** ![Article Image](${article.image})\n\n`;
                }
                
                markdown += `**Scraped:** ${new Date(article.scrapedAt).toLocaleString()}\n\n`;
            });
        }
        
        markdown += `---\n\n`;
    });
    
    return markdown;
}

/**
 * Create HTTP client with proper headers to avoid bot detection
 */
function createHttpClient() {
    return axios.create({
        timeout: 30000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
    });
}

/**
 * Extract absolute URL from relative URL
 * @param {string} baseUrl - The base URL
 * @param {string} relativeUrl - The relative URL
 * @returns {string} - Absolute URL
 */
function getAbsoluteUrl(baseUrl, relativeUrl) {
    if (!relativeUrl) return '';
    try {
        return new URL(relativeUrl, baseUrl).href;
    } catch (error) {
        return relativeUrl;
    }
}

/**
 * Clean and normalize text content
 * @param {string} text - Raw text content
 * @returns {string} - Cleaned text
 */
function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, ' ')
        .trim();
}

/**
 * Check if text content is meaningful (not ads, cookies, etc.)
 * @param {string} text - Text to check
 * @returns {boolean} - True if meaningful
 */
function isMeaningfulContent(text) {
    if (!text || text.length < 10) return false;
    
    const lowercaseText = text.toLowerCase();
    const excludeKeywords = [
        'cookie', 'subscribe', 'newsletter', 'advertisement', 'ad', 'sponsored',
        'follow us', 'share', 'like', 'tweet', 'facebook', 'instagram',
        'privacy policy', 'terms of service', 'accept all', 'manage cookies'
    ];
    
    return !excludeKeywords.some(keyword => lowercaseText.includes(keyword));
}

/**
 * Scrape top news from a webpage using Cheerio
 * @param {string} url - The URL to scrape
 * @param {Object} options - Scraping options
 * @returns {Promise<Array>} - Array of news articles
 */
async function scrapeTopNews(url, options = {}) {
    const {
        maxNews = 10,
        saveToFile = true,
        filename = null,
        waitTime = 1000
    } = options;

    try {
        console.log(`Scraping top news from: ${url}`);
        
        // Add delay to be respectful to the server
        if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        const httpClient = createHttpClient();
        const response = await httpClient.get(url);
        const html = response.data;
        const $ = cheerio.load(html);
        
        const articles = [];
        const baseUrl = new URL(url).origin;
        
        // Common selectors for news articles
        const articleSelectors = [
            'article',
            '.article',
            '.news-item',
            '.story',
            '.post',
            '.entry',
            '[class*="article"]',
            '[class*="story"]',
            '[class*="news"]',
            '.card',
            '.item',
            'h1, h2, h3'
        ];
        
        // Try different selectors to find news articles
        for (const selector of articleSelectors) {
            if (articles.length >= maxNews) break;
            
            $(selector).each((index, element) => {
                if (articles.length >= maxNews) return false;
                
                const $element = $(element);
                
                // Extract title
                let title = '';
                const titleSelectors = ['h1', 'h2', 'h3', '.headline', '.title', '[class*="title"]', '[class*="headline"]'];
                
                for (const titleSelector of titleSelectors) {
                    const titleEl = $element.find(titleSelector).first();
                    if (titleEl.length) {
                        title = cleanText(titleEl.text());
                        break;
                    }
                }
                
                // If no title found in children, check if element itself is a heading
                if (!title && ['H1', 'H2', 'H3'].includes(element.tagName)) {
                    title = cleanText($element.text());
                }
                
                // Extract link
                let link = '';
                const linkEl = $element.find('a').first();
                if (linkEl.length) {
                    link = getAbsoluteUrl(baseUrl, linkEl.attr('href'));
                } else if (element.tagName === 'A') {
                    link = getAbsoluteUrl(baseUrl, $element.attr('href'));
                }
                
                // Extract summary/description
                let summary = '';
                const summarySelectors = ['p', '.summary', '.excerpt', '.description', '[class*="summary"]', '[class*="excerpt"]'];
                
                for (const summarySelector of summarySelectors) {
                    const summaryEl = $element.find(summarySelector).first();
                    if (summaryEl.length) {
                        summary = cleanText(summaryEl.text());
                        if (summary.length > 20) break; // Use first meaningful summary
                    }
                }
                
                // Extract image
                let image = '';
                const imageEl = $element.find('img').first();
                if (imageEl.length) {
                    image = getAbsoluteUrl(baseUrl, imageEl.attr('src') || imageEl.attr('data-src') || imageEl.attr('data-lazy-src'));
                }
                
                // Only add if we have a meaningful title
                if (title && isMeaningfulContent(title)) {
                    // Check for duplicates
                    const isDuplicate = articles.some(article => 
                        article.title === title || 
                        (article.link && link && article.link === link)
                    );
                    
                    if (!isDuplicate) {
                        articles.push({
                            title: title.substring(0, 200), // Limit title length
                            link: link,
                            summary: summary.substring(0, 300), // Limit summary length
                            image: image,
                            scrapedAt: new Date().toISOString()
                        });
                    }
                }
            });
        }
        
        // If we didn't find enough articles with the above selectors, try a more general approach
        if (articles.length < maxNews / 2) {
            $('a').each((index, element) => {
                if (articles.length >= maxNews) return false;
                
                const $element = $(element);
                const title = cleanText($element.text());
                const link = getAbsoluteUrl(baseUrl, $element.attr('href'));
                
                if (title && title.length > 20 && isMeaningfulContent(title) && link) {
                    const isDuplicate = articles.some(article => 
                        article.title === title || article.link === link
                    );
                    
                    if (!isDuplicate) {
                        articles.push({
                            title: title.substring(0, 200),
                            link: link,
                            summary: '',
                            image: '',
                            scrapedAt: new Date().toISOString()
                        });
                    }
                }
            });
        }
        
        // Sort by title length (longer titles are usually more descriptive)
        articles.sort((a, b) => b.title.length - a.title.length);
        
        const finalArticles = articles.slice(0, maxNews);
        console.log(`Found ${finalArticles.length} news articles`);
        
        // Save to file if requested
        if (saveToFile) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const domain = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
            
            const newsData = {
                url: url,
                scrapedAt: new Date().toISOString(),
                totalArticles: finalArticles.length,
                articles: finalArticles
            };
            
            // Save JSON file
            const newsFilename = filename || `news_${domain}_${timestamp}.json`;
            const newsPath = path.join(newsDir, newsFilename);
            fs.writeFileSync(newsPath, JSON.stringify(newsData, null, 2));
            console.log(`News data saved: ${newsPath}`);
            
            // Save Markdown file
            const markdownFilename = filename ? filename.replace('.json', '.md') : `news_${domain}_${timestamp}.md`;
            const markdownPath = path.join(newsDir, markdownFilename);
            const markdownContent = generateMarkdown(newsData);
            fs.writeFileSync(markdownPath, markdownContent);
            console.log(`Markdown report saved: ${markdownPath}`);
            
            // Save Text file
            const textFilename = filename ? filename.replace('.json', '.txt') : `news_${domain}_${timestamp}.txt`;
            const textPath = path.join(newsDir, textFilename);
            const textContent = generateText(newsData);
            fs.writeFileSync(textPath, textContent);
            console.log(`Text report saved: ${textPath}`);
        }
        
        return finalArticles;

    } catch (error) {
        console.error('Error scraping news:', error.message);
        return [];
    }
}

/**
 * Scrape news from multiple websites
 * @param {Object} options - Scraping options
 * @returns {Promise<Object>} - Object containing all scraped news
 */
async function scrapeMultipleNews(options = {}) {
    // Get enabled websites from config
    const enabledWebsites = config.websites.filter(site => site.enabled);
    const urls = enabledWebsites.map(site => site.url);
    
    // Merge config options with provided options
    const mergedOptions = {
        maxNews: config.scraping.maxNews,
        delayBetweenRequests: config.scraping.delayBetweenRequests,
        waitTime: config.scraping.waitTime,
        ...options
    };
    
    const results = {
        totalWebsites: urls.length,
        scrapedAt: new Date().toISOString(),
        websites: [],
        allArticles: []
    };

    console.log(`Starting to scrape ${urls.length} websites...`);

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const websiteName = enabledWebsites[i].name;
        
        try {
            console.log(`\nScraping ${websiteName} (${i + 1}/${urls.length})...`);
            const articles = await scrapeTopNews(url, mergedOptions);
            
            const websiteResult = {
                name: websiteName,
                url: url,
                articlesFound: articles.length,
                articles: articles,
                scrapedAt: new Date().toISOString(),
                error: null
            };
            
            results.websites.push(websiteResult);
            results.allArticles.push(...articles);
            
            console.log(`✓ ${websiteName}: Found ${articles.length} articles`);
            
        } catch (error) {
            console.error(`✗ Error scraping ${websiteName}:`, error.message);
            
            const websiteResult = {
                name: websiteName,
                url: url,
                articlesFound: 0,
                articles: [],
                scrapedAt: new Date().toISOString(),
                error: error.message
            };
            
            results.websites.push(websiteResult);
        }
        
        // Add delay between requests to be respectful
        if (i < urls.length - 1 && mergedOptions.delayBetweenRequests > 0) {
            console.log(`Waiting ${mergedOptions.delayBetweenRequests}ms before next request...`);
            await new Promise(resolve => setTimeout(resolve, mergedOptions.delayBetweenRequests));
        }
    }

    console.log(`\n=== Scraping Summary ===`);
    console.log(`Total websites: ${results.totalWebsites}`);
    console.log(`Total articles found: ${results.allArticles.length}`);
    
    results.websites.forEach(website => {
        const status = website.error ? '✗' : '✓';
        console.log(`${status} ${website.name}: ${website.articlesFound} articles`);
    });

    return results;
}

// API endpoints removed - CLI only version

// Server functionality removed - CLI only version

// Export functions for use as a module
module.exports = {
    scrapeTopNews,
    scrapeMultipleNews
};

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    // Check for --config flag
    const configIndex = args.indexOf('--config');
    const useConfig = configIndex !== -1;
    
    if (useConfig) {
        // Remove --config from args
        args.splice(configIndex, 1);
    }
    
    // Parse other options
    const options = {};
    const urls = [];
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.substring(2);
            const value = args[i + 1];
            if (value && !value.startsWith('--')) {
                if (key === 'maxNews' || key === 'waitFor') {
                    options[key] = parseInt(value);
                } else if (key === 'saveToFile') {
                    options[key] = value.toLowerCase() === 'true';
                } else {
                    options[key] = value;
                }
                i++; // Skip the value
            }
        } else if (arg.startsWith('http')) {
            urls.push(arg);
        }
    }
    
    if (!useConfig && urls.length === 0) {
        console.log('Usage:');
        console.log('  node snapshot-cheerio.js --config [options]                    # Use config.json');
        console.log('  node snapshot-cheerio.js <url1> [url2] ... [options]          # Scrape specific URLs');
        console.log('');
        console.log('Options:');
        console.log('  --maxNews <number>     Maximum number of news articles to scrape (default: 10)');
        console.log('  --waitFor <ms>         Wait time before scraping (default: 1000)');
        console.log('  --saveToFile <bool>    Save results to file (default: true)');
        console.log('  --filename <name>      Custom filename for saved results');
        console.log('');
        console.log('Examples:');
        console.log('  node snapshot-cheerio.js --config --maxNews 5');
        console.log('  node snapshot-cheerio.js https://example.com --maxNews 10');
        process.exit(0);
    }
    
    async function runCLI() {
        try {
            if (useConfig) {
                // Check if there are enabled websites in config
                const enabledWebsites = config.websites.filter(site => site.enabled);
                if (enabledWebsites.length === 0) {
                    console.error('No enabled websites found in config.json. Please enable at least one website.');
                    process.exit(1);
                }
                
                console.log('Using configuration file for scraping...');
                const results = await scrapeMultipleNews(options);
                
                // Save full results to file
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                
                // Save JSON file
                const filename = `news_multiple_sites_${timestamp}.json`;
                const filepath = path.join(newsDir, filename);
                fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
                console.log(`\nFull results saved to: ${filepath}`);
                
                // Save Markdown file
                const markdownFilename = `news_multiple_sites_${timestamp}.md`;
                const markdownPath = path.join(newsDir, markdownFilename);
                const markdownContent = generateMultipleSitesMarkdown(results);
                fs.writeFileSync(markdownPath, markdownContent);
                console.log(`Combined markdown report saved: ${markdownPath}`);
                
                // Save Text file
                const textFilename = `news_multiple_sites_${timestamp}.txt`;
                const textPath = path.join(newsDir, textFilename);
                const textContent = generateMultipleSitesText(results);
                fs.writeFileSync(textPath, textContent);
                console.log(`Combined text report saved: ${textPath}`);
                
            } else if (urls.length === 1) {
                // Single URL scraping
                const articles = await scrapeTopNews(urls[0], options);
                console.log(`\nScraping completed. Found ${articles.length} articles.`);
                
            } else if (urls.length > 1) {
                // Multiple URLs scraping (legacy support)
                const results = {
                    totalWebsites: urls.length,
                    scrapedAt: new Date().toISOString(),
                    websites: [],
                    allArticles: []
                };
                
                for (let i = 0; i < urls.length; i++) {
                    const url = urls[i];
                    try {
                        console.log(`\nScraping ${url} (${i + 1}/${urls.length})...`);
                        const articles = await scrapeTopNews(url, options);
                        
                        results.websites.push({
                            url: url,
                            articlesFound: articles.length,
                            articles: articles,
                            scrapedAt: new Date().toISOString(),
                            error: null
                        });
                        
                        results.allArticles.push(...articles);
                        console.log(`Found ${articles.length} articles`);
                        
                        // Add delay between requests
                        if (i < urls.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                        
                    } catch (error) {
                        console.error(`Error scraping ${url}:`, error.message);
                        results.websites.push({
                            url: url,
                            articlesFound: 0,
                            articles: [],
                            scrapedAt: new Date().toISOString(),
                            error: error.message
                        });
                    }
                }
                
                // Save full results to file
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                
                // Save JSON file
                const filename = `news_multiple_sites_${timestamp}.json`;
                const filepath = path.join(newsDir, filename);
                fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
                console.log(`\nFull results saved to: ${filepath}`);
                
                // Save Markdown file
                const markdownFilename = `news_multiple_sites_${timestamp}.md`;
                const markdownPath = path.join(newsDir, markdownFilename);
                const markdownContent = generateMultipleSitesMarkdown(results);
                fs.writeFileSync(markdownPath, markdownContent);
                console.log(`Combined markdown report saved: ${markdownPath}`);
            }
            
        } catch (error) {
            console.error('CLI Error:', error.message);
            process.exit(1);
        }
    }
    
    runCLI();
}