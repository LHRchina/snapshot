// Express and CORS removed - CLI only version
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

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
    const domain = new URL(url).hostname;
    const date = new Date(scrapedAt).toLocaleString();
    
    let text = `NEWS REPORT: ${domain.toUpperCase()}\n`;
    text += `${'='.repeat(50)}\n\n`;
    text += `Source: ${url}\n`;
    text += `Scraped At: ${date}\n`;
    text += `Total Articles: ${totalArticles}\n\n`;
    text += `${'='.repeat(50)}\n\n`;
    
    if (articles.length === 0) {
        text += `No articles found.\n`;
        return text;
    }
    
    articles.forEach((article, index) => {
        text += `${index + 1}. ${article.title}\n`;
        text += `${'-'.repeat(article.title.length + 3)}\n\n`;
        
        if (article.link) {
            text += `Link: ${article.link}\n\n`;
        }
        
        if (article.summary && article.summary.trim()) {
            text += `Summary: ${article.summary}\n\n`;
        }
        
        if (article.image) {
            text += `Image: ${article.image}\n\n`;
        }
        
        text += `Scraped: ${new Date(article.scrapedAt).toLocaleString()}\n\n`;
        text += `${'='.repeat(50)}\n\n`;
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
    text += `${'='.repeat(50)}\n\n`;
    text += `Scraped At: ${date}\n`;
    text += `Total Websites: ${totalWebsites}\n`;
    text += `Total Articles: ${allArticles.length}\n\n`;
    text += `${'='.repeat(50)}\n\n`;
    
    // Summary section
    text += `SUMMARY\n`;
    text += `${'='.repeat(50)}\n\n`;
    
    websites.forEach(site => {
        const status = site.success ? 'SUCCESS' : 'FAILED';
        text += `${site.domain}: ${status} (${site.articleCount} articles)\n`;
    });
    
    text += `\n${'='.repeat(50)}\n\n`;
    
    // Detailed results for each website
    websites.forEach((site, siteIndex) => {
        text += `WEBSITE ${siteIndex + 1}: ${site.domain.toUpperCase()}\n`;
        text += `${'-'.repeat(50)}\n\n`;
        text += `URL: ${site.url}\n`;
        text += `Status: ${site.success ? 'SUCCESS' : 'FAILED'}\n`;
        text += `Articles Found: ${site.articleCount}\n\n`;
        
        if (!site.success) {
            text += `Error: ${site.error}\n\n`;
        } else if (site.articles.length > 0) {
            site.articles.forEach((article, index) => {
                text += `  ${index + 1}. ${article.title}\n`;
                
                if (article.link) {
                    text += `     Link: ${article.link}\n`;
                }
                
                if (article.summary && article.summary.trim()) {
                    text += `     Summary: ${article.summary}\n`;
                }
                
                if (article.image) {
                    text += `     Image: ${article.image}\n`;
                }
                
                text += `     Scraped: ${new Date(article.scrapedAt).toLocaleString()}\n\n`;
            });
        } else {
            text += `  No articles found.\n\n`;
        }
        
        text += `${'='.repeat(50)}\n\n`;
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
        const status = site.success ? '✅ Success' : '❌ Failed';
        markdown += `| ${site.domain} | ${status} | ${site.articleCount} |\n`;
    });
    
    markdown += `\n---\n\n`;
    
    // Detailed articles by website
    websites.forEach(site => {
        markdown += `## ${site.domain}\n\n`;
        markdown += `**URL:** ${site.url}\n`;
        
        if (!site.success) {
            markdown += `**Status:** ❌ Failed\n`;
            markdown += `**Error:** ${site.error}\n\n`;
            markdown += `---\n\n`;
            return;
        }
        
        markdown += `**Status:** ✅ Success\n`;
        markdown += `**Articles Found:** ${site.articleCount}\n\n`;
        
        if (site.articles.length === 0) {
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
 * Scrape top 10 news from a webpage
 * @param {string} url - The URL to scrape
 * @param {Object} options - Scraping options
 * @returns {Promise<Array>} - Array of news articles
 */
async function scrapeTopNews(url, options = {}) {
    const {
        width = 1920,
        height = 1080,
        waitFor = 3000,
        maxNews = 10,
        saveToFile = true,
        filename = null
    } = options;

    let browser;
    try {
        console.log(`Scraping top news from: ${url}`);

        // Launch browser with optimized settings
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();

        // Set viewport
        await page.setViewport({ width, height });

        // Set user agent to avoid bot detection
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navigate to the page
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for additional time if specified
        if (waitFor > 0) {
            await new Promise(resolve => setTimeout(resolve, waitFor));
        }

        // Handle cookie policies, subscription popups, and other overlays
        await page.evaluate(() => {
            // Common cookie banner selectors
            const cookieSelectors = [
                '[id*="cookie"]',
                '[class*="cookie"]',
                '[id*="consent"]',
                '[class*="consent"]',
                '[id*="gdpr"]',
                '[class*="gdpr"]',
                '[id*="privacy"]',
                '[class*="privacy"]',
                '[data-testid*="cookie"]',
                '[data-testid*="consent"]',
                '.cookie-banner',
                '.cookie-notice',
                '.cookie-popup',
                '.consent-banner',
                '.privacy-banner',
                '#cookieConsent',
                '#cookie-consent',
                '#gdpr-consent',
                '.cc-banner',
                '.cc-window',
                '[role="dialog"]',
                '[role="alertdialog"]'
            ];

            // Subscription and newsletter popup selectors
            const subscriptionSelectors = [
                '[id*="subscribe"]',
                '[class*="subscribe"]',
                '[id*="newsletter"]',
                '[class*="newsletter"]',
                '[id*="signup"]',
                '[class*="signup"]',
                '[id*="email"]',
                '[class*="email"]',
                '[id*="popup"]',
                '[class*="popup"]',
                '[id*="modal"]',
                '[class*="modal"]',
                '.subscription-popup',
                '.newsletter-popup',
                '.email-signup',
                '.subscribe-modal',
                '.newsletter-modal',
                '.popup-modal',
                '.subscription-banner',
                '.newsletter-banner',
                '.email-popup',
                '.signup-popup',
                '.promo-popup',
                '.offer-popup',
                '[data-testid*="subscribe"]',
                '[data-testid*="newsletter"]',
                '[data-testid*="popup"]',
                '[data-testid*="modal"]',
                // OneSignal notification popups
                '.onesignal-slidedown-container',
                '[class*="onesignal"]',
                '.onesignal-reset',
                '.slide-down',
                '[id*="onesignal"]'
            ];

            // Advertisement selectors
            const advertisementSelectors = [
                '[id*="ad"]',
                '[class*="ad"]',
                '[id*="ads"]',
                '[class*="ads"]',
                '[id*="advertisement"]',
                '[class*="advertisement"]',
                '[id*="banner"]',
                '[class*="banner"]',
                '[id*="promo"]',
                '[class*="promo"]',
                '[id*="sponsor"]',
                '[class*="sponsor"]',
                '.ad-container',
                '.ad-wrapper',
                '.ad-banner',
                '.ad-block',
                '.ad-unit',
                '.advertisement',
                '.ads-container',
                '.banner-ad',
                '.promo-banner',
                '.sponsored-content',
                '.sponsor-banner',
                '.google-ads',
                '.adsense',
                '.adsbygoogle',
                '[data-ad-slot]',
                '[data-google-ad]',
                '[data-ad-client]',
                '.dfp-ad',
                '.gpt-ad',
                '.ad-placement',
                '.commercial',
                '.promotion',
                '.promotional',
                '.marketing-banner',
                '.affiliate-banner',
                '.sidebar-ad',
                '.header-ad',
                '.footer-ad',
                '.inline-ad',
                '.native-ad',
                '.display-ad',
                '.video-ad',
                '.text-ad',
                '.image-ad',
                '.popup-ad',
                '.overlay-ad',
                '.floating-ad',
                '.sticky-ad',
                '.interstitial-ad',
                '[class*="advert"]',
                '[id*="advert"]',
                '[class*="commercial"]',
                '[id*="commercial"]',
                '[data-testid*="ad"]',
                '[data-testid*="advertisement"]',
                '[data-testid*="banner"]',
                '[data-testid*="promo"]',
                '[data-testid*="sponsor"]'
            ];

            // Common accept button selectors
            const acceptSelectors = [
                'button[id*="accept"]',
                'button[class*="accept"]',
                'button[id*="agree"]',
                'button[class*="agree"]',
                'button[id*="consent"]',
                'button[class*="consent"]',
                'button[id*="allow"]',
                'button[class*="allow"]',
                'button[id*="ok"]',
                'button[class*="ok"]',
                'a[id*="accept"]',
                'a[class*="accept"]',
                'a[id*="agree"]',
                'a[class*="agree"]',
                '.accept-cookies',
                '.accept-all',
                '.agree-cookies',
                '.cookie-accept',
                '.consent-accept',
                '[data-testid*="accept"]',
                '[data-testid*="agree"]',
                '[data-testid*="consent"]'
            ];

            // Close and dismiss button selectors for popups
            const closeSelectors = [
                'button[id*="close"]',
                'button[class*="close"]',
                'button[id*="dismiss"]',
                'button[class*="dismiss"]',
                'button[id*="cancel"]',
                'button[class*="cancel"]',
                'button[id*="no"]',
                'button[class*="no"]',
                'a[id*="close"]',
                'a[class*="close"]',
                'a[id*="dismiss"]',
                'a[class*="dismiss"]',
                '.close-button',
                '.close-btn',
                '.dismiss-button',
                '.dismiss-btn',
                '.cancel-button',
                '.cancel-btn',
                '.no-thanks',
                '.close-popup',
                '.close-modal',
                '.popup-close',
                '.modal-close',
                '[data-testid*="close"]',
                '[data-testid*="dismiss"]',
                '[data-testid*="cancel"]',
                '[aria-label*="close"]',
                '[aria-label*="Close"]',
                '[title*="close"]',
                '[title*="Close"]',
                '.fa-times',
                '.fa-close',
                '.icon-close',
                '.icon-times',
                'button[aria-label="Close"]',
                'button[title="Close"]'
            ];

            // First, try to close subscription popups with close buttons
            for (const selector of closeSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element && element.offsetParent !== null) {
                        console.log(`Clicking close button: ${selector}`);
                        element.click();
                        // Small delay to allow popup to close
                        setTimeout(() => {}, 500);
                    }
                }
            }

            // Then try to click accept buttons for cookie banners
            for (const selector of acceptSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element && element.offsetParent !== null) {
                        console.log(`Clicking accept button: ${selector}`);
                        element.click();
                        return;
                    }
                }
            }

            // Remove subscription popups directly if close buttons didn't work
            for (const selector of subscriptionSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element && element.offsetParent !== null) {
                        console.log(`Removing subscription popup: ${selector}`);
                        element.style.display = 'none';
                        element.style.visibility = 'hidden';
                        element.remove();
                    }
                }
            }

            // If no accept button found, try to hide cookie banners
            for (const selector of cookieSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element && element.offsetParent !== null) {
                        console.log(`Hiding cookie banner: ${selector}`);
                        element.style.display = 'none';
                        element.style.visibility = 'hidden';
                        element.remove();
                    }
                }
            }

            // Remove advertisements and promotional content
            for (const selector of advertisementSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element && element.offsetParent !== null) {
                        console.log(`Removing advertisement: ${selector}`);
                        element.style.display = 'none';
                        element.style.visibility = 'hidden';
                        element.remove();
                    }
                }
            }

            // Additional cleanup for overlay elements
            const overlaySelectors = [
                '.overlay',
                '.modal-backdrop',
                '.popup-overlay',
                '[style*="position: fixed"]',
                '[style*="z-index"]'
            ];

            for (const selector of overlaySelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const style = window.getComputedStyle(element);
                    if (style.position === 'fixed' && parseInt(style.zIndex) > 1000) {
                        console.log(`Removing overlay: ${selector}`);
                        element.style.display = 'none';
                        element.remove();
                    }
                }
            }
        });

        // Wait a bit more after handling popups
        await new Promise(resolve => setTimeout(resolve, 500));

        // Scrape news articles
        const newsArticles = await page.evaluate((maxNews) => {
            const articles = [];
            
            // Common news article selectors for various news websites
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
                // 'h1, h2, h3', // Removed - too broad, captures page titles
                '.headline',
                '.title'
            ];
            
            // Try different selectors to find news articles
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                
                for (const element of elements) {
                    if (articles.length >= maxNews) break;
                    
                    // Extract title
                    let title = '';
                    const titleElement = element.querySelector('h1, h2, h3, .headline, .title, [class*="title"], [class*="headline"]') || element;
                    if (titleElement) {
                        title = titleElement.textContent?.trim() || titleElement.innerText?.trim() || '';
                    }
                    
                    // Extract link
                    let link = '';
                    const linkElement = element.querySelector('a') || (element.tagName === 'A' ? element : null);
                    if (linkElement) {
                        link = linkElement.href || '';
                    }
                    
                    // Extract summary/description
                    let summary = '';
                    const summaryElement = element.querySelector('p, .summary, .excerpt, .description, [class*="summary"], [class*="excerpt"]');
                    if (summaryElement) {
                        summary = summaryElement.textContent?.trim() || summaryElement.innerText?.trim() || '';
                    }
                    
                    // Extract image
                    let image = '';
                    const imageElement = element.querySelector('img');
                    if (imageElement) {
                        image = imageElement.src || imageElement.dataset.src || '';
                    }
                    
                    // Check if this looks like a page title rather than article title
                    const isPageTitle = title.toLowerCase().includes('dubai news') ||
                                       title.toLowerCase().includes('uae news') ||
                                       title.toLowerCase().includes('gulf news') ||
                                       title.toLowerCase().includes('latest news') ||
                                       title.toLowerCase().includes('arab news') ||
                                       title.toLowerCase().includes('breaking news') ||
                                       (title.includes(' - ') && title.split(' - ').length > 2);

                    // Only add if we have a meaningful article title (not page title)
                    if (title && 
                        title.length > 20 && 
                        title.length < 150 &&
                        !title.toLowerCase().includes('cookie') && 
                        !title.toLowerCase().includes('subscribe') &&
                        !isPageTitle) {
                        // Check if this article is already added (avoid duplicates)
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
                }
                
                if (articles.length >= maxNews) break;
            }
            
            return articles.slice(0, maxNews);
        }, maxNews);

        console.log(`Found ${newsArticles.length} news articles`);
        
        // Save to file if requested
        if (saveToFile) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const domain = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
            
            const newsData = {
                url: url,
                scrapedAt: new Date().toISOString(),
                totalArticles: newsArticles.length,
                articles: newsArticles
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
        
        return newsArticles;

    } catch (error) {
        console.error('Error scraping news:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Scrape news from multiple websites
 * @param {Array} urls - Array of URLs to scrape
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
        viewport: config.scraping.viewport,
        waitTime: config.scraping.waitTime,
        ...options
    };
    
    const results = {
        totalWebsites: urls.length,
        scrapedAt: new Date().toISOString(),
        websites: [],
        allArticles: []
    };

    for (const url of urls) {
        try {
            console.log(`\nScraping: ${url}`);
            const articles = await scrapeTopNews(url, { ...mergedOptions, saveToFile: false });
            
            const websiteData = {
                url: url,
                domain: new URL(url).hostname,
                success: true,
                articleCount: articles.length,
                articles: articles
            };
            
            results.websites.push(websiteData);
            results.allArticles.push(...articles);
            
            // Add delay between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, mergedOptions.delayBetweenRequests));
            
        } catch (error) {
            console.error(`Error scraping ${url}:`, error.message);
            results.websites.push({
                url: url,
                domain: new URL(url).hostname,
                success: false,
                error: error.message,
                articleCount: 0,
                articles: []
            });
        }
    }

    // Save combined results to file
    if (options.saveToFile !== false) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Save JSON file
        const filename = options.filename || `news_multiple_sites_${timestamp}.json`;
        const filePath = path.join(newsDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
        console.log(`\nCombined news data saved: ${filePath}`);
        
        // Save Markdown file
        const markdownFilename = options.filename ? options.filename.replace('.json', '.md') : `news_multiple_sites_${timestamp}.md`;
        const markdownPath = path.join(newsDir, markdownFilename);
        const markdownContent = generateMultipleSitesMarkdown(results);
        fs.writeFileSync(markdownPath, markdownContent);
        console.log(`Combined markdown report saved: ${markdownPath}`);
        
        // Save Text file
        const textFilename = options.filename ? options.filename.replace('.json', '.txt') : `news_multiple_sites_${timestamp}.txt`;
        const textPath = path.join(newsDir, textFilename);
        const textContent = generateMultipleSitesText(results);
        fs.writeFileSync(textPath, textContent);
        console.log(`Combined text report saved: ${textPath}`);
    }

    return results;
}

// API endpoints removed - CLI only version

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // Server functionality removed - CLI only version
        console.log('Usage:');
        console.log('  node snapshot.js --config [options]                    # Use websites from config.json');
        console.log('  node snapshot.js <url1> [url2] [url3] ... [options]   # Use specific URLs');
        process.exit(1);
    } else {
        // Command line mode
        const options = {};
        const urls = [];
        let useConfig = false;
        let currentArg = 0;

        // Check for --config flag first
        if (args.includes('--config')) {
            useConfig = true;
        }

        // Collect URLs (arguments without -- prefix, excluding --config)
        while (currentArg < args.length && !args[currentArg].startsWith('--')) {
            urls.push(args[currentArg]);
            currentArg++;
        }

        // Parse options
        for (let i = currentArg; i < args.length; i++) {
            if (args[i] === '--config') {
                useConfig = true;
                continue;
            }
            
            if (args[i].startsWith('--')) {
                const key = args[i].replace('--', '');
                const value = args[i + 1];
                
                if (key === 'width' || key === 'height' || key === 'waitFor' || key === 'maxNews') {
                    options[key] = parseInt(value);
                } else if (key === 'saveToFile') {
                    options[key] = value === 'true';
                } else {
                    options[key] = value;
                }
                i++; // Skip the value
            }
        }

        // Check for special --config flag to use configuration file
        if (useConfig || urls.length === 0) {
            if (urls.length === 0 && !useConfig) {
                console.log('Usage:');
                console.log('  node snapshot.js --config [options]                    # Use websites from config.json');
                console.log('  node snapshot.js <url1> [url2] [url3] ... [options]   # Use specific URLs');
                console.log('');
                console.log('Options:');
                console.log('  --width <number>        Viewport width (default: from config or 1920)');
                console.log('  --height <number>       Viewport height (default: from config or 1080)');
                console.log('  --waitFor <number>      Wait time in ms (default: from config or 3000)');
                console.log('  --maxNews <number>      Maximum number of news articles per site (default: from config or 10)');
                console.log('  --saveToFile <true|false> Save results to JSON file (default: true)');
                console.log('  --filename <string>     Custom filename for saved data');
                console.log('');
                console.log('Examples:');
                console.log('  node snapshot.js --config');
                console.log('  node snapshot.js --config --maxNews 5');
                console.log('  node snapshot.js https://gulfnews.com');
                console.log('  node snapshot.js https://gulfnews.com https://khaleejtimes.com --maxNews 5');
                process.exit(1);
            }
            
            // Use configuration file mode
            const enabledWebsites = config.websites.filter(site => site.enabled);
            if (enabledWebsites.length === 0) {
                console.error('No enabled websites found in config.json');
                process.exit(1);
            }
            
            console.log(`Using ${enabledWebsites.length} websites from configuration:`);
            enabledWebsites.forEach(site => console.log(`  - ${site.name}: ${site.url}`));
            
            scrapeMultipleNews(options)
                .then(results => {
                    console.log(`\nScraped ${results.totalWebsites} websites with ${results.allArticles.length} total articles`);
                    
                    results.websites.forEach(site => {
                        console.log(`\n--- ${site.domain} (${site.articleCount} articles) ---`);
                        if (!site.success) {
                            console.log(`   Error: ${site.error}`);
                            return;
                        }
                        
                        site.articles.forEach((article, index) => {
                            console.log(`   ${index + 1}. ${article.title}`);
                        });
                    });
                    
                    console.log(`\nFull results saved to: ${path.join(newsDir, options.filename || 'news_multiple_sites_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json')}`);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('Error:', error.message);
                    process.exit(1);
                });
            return;
        }

        // If only one URL, use scrapeTopNews
        if (urls.length === 1) {
            scrapeTopNews(urls[0], options)
                .then(newsArticles => {
                    console.log(`\nScraped ${newsArticles.length} news articles:`);
                    newsArticles.forEach((article, index) => {
                        console.log(`\n${index + 1}. ${article.title}`);
                        if (article.link) console.log(`   Link: ${article.link}`);
                        if (article.summary) console.log(`   Summary: ${article.summary.substring(0, 100)}...`);
                    });
                    process.exit(0);
                })
                .catch(error => {
                    console.error('Error:', error.message);
                    process.exit(1);
                });
        } else {
            // Multiple URLs, use scrapeMultipleNews with URLs (backward compatibility)
            // Create a temporary function that accepts URLs for CLI usage
            const scrapeMultipleNewsWithUrls = async (urls, options = {}) => {
                const results = {
                    totalWebsites: urls.length,
                    scrapedAt: new Date().toISOString(),
                    websites: [],
                    allArticles: []
                };

                for (const url of urls) {
                    try {
                        console.log(`\nScraping: ${url}`);
                        const articles = await scrapeTopNews(url, { ...options, saveToFile: false });
                        
                        const websiteData = {
                            url: url,
                            domain: new URL(url).hostname,
                            success: true,
                            articleCount: articles.length,
                            articles: articles
                        };
                        
                        results.websites.push(websiteData);
                        results.allArticles.push(...articles);
                        
                        // Add delay between requests
                        await new Promise(resolve => setTimeout(resolve, options.delayBetweenRequests || 2000));
                        
                    } catch (error) {
                        console.error(`Error scraping ${url}:`, error.message);
                        results.websites.push({
                            url: url,
                            domain: new URL(url).hostname,
                            success: false,
                            error: error.message,
                            articleCount: 0,
                            articles: []
                        });
                    }
                }

                // Save combined results to file
                if (options.saveToFile !== false) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const filename = options.filename || `news_multiple_sites_${timestamp}.json`;
                    const filepath = path.join(newsDir, filename);
                    
                    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
                    console.log(`\nResults saved to: ${filepath}`);
                }

                return results;
            };
            
            scrapeMultipleNewsWithUrls(urls, options)
                .then(results => {
                    console.log(`\nScraped ${results.totalWebsites} websites with ${results.allArticles.length} total articles`);
                    
                    results.websites.forEach(site => {
                        console.log(`\n--- ${site.domain} (${site.articleCount} articles) ---`);
                        if (!site.success) {
                            console.log(`   Error: ${site.error}`);
                            return;
                        }
                        
                        site.articles.forEach((article, index) => {
                            console.log(`   ${index + 1}. ${article.title}`);
                        });
                    });
                    
                    console.log(`\nFull results saved to: ${path.join(newsDir, options.filename || 'news_multiple_sites_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json')}`);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('Error:', error.message);
                    process.exit(1);
                });
        }
    }
}

module.exports = { scrapeTopNews, scrapeMultipleNews, app };