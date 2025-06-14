const axios = require('axios');
const puppeteer = require('puppeteer');

async function testTheNationalScraping() {
    const url = 'https://www.thenationalnews.com/uae/';
    
    console.log('=== Testing The National News Scraping ===');
    console.log(`URL: ${url}`);
    
    // Test 1: HTTP Request Method
    console.log('\n1. Testing HTTP Request Method...');
    try {
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
        
        console.log(`✅ HTTP Request successful - Status: ${response.status}`);
        console.log(`Content length: ${response.data.length} characters`);
        
        // Extract titles using regex
        const titlePatterns = [
            /<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi,
            /<[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)/gi,
            /<[^>]*class="[^"]*headline[^"]*"[^>]*>([^<]+)/gi,
            /<title>([^<]+)<\/title>/gi
        ];
        
        const foundTitles = new Set();
        const articles = [];
        
        for (const pattern of titlePatterns) {
            let match;
            while ((match = pattern.exec(response.data)) !== null && articles.length < 10) {
                const title = match[1]?.trim().replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
                
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
                        method: 'http-regex'
                    });
                }
            }
        }
        
        console.log(`Found ${articles.length} articles via HTTP method:`);
        articles.forEach((article, index) => {
            console.log(`  ${index + 1}. ${article.title}`);
        });
        
    } catch (error) {
        console.log(`❌ HTTP Request failed: ${error.message}`);
    }
    
    // Test 2: Puppeteer Method
    console.log('\n2. Testing Puppeteer Method...');
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            timeout: 30000,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-default-apps',
                '--disable-background-networking',
                '--disable-sync',
                '--disable-translate',
                '--hide-scrollbars',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-first-run',
                '--safebrowsing-disable-auto-update',
                '--ignore-certificate-errors',
                '--ignore-ssl-errors',
                '--ignore-certificate-errors-spki-list'
            ]
        });
        
        const page = await browser.newPage();
        page.setDefaultTimeout(30000);
        page.setDefaultNavigationTimeout(30000);
        
        await page.setViewport({ width: 1280, height: 720 });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('Navigating to page...');
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        
        console.log('✅ Puppeteer navigation successful');
        
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Extract articles
        const articles = await page.evaluate(() => {
            const results = [];
            const selectors = [
                'h1', 'h2', 'h3',
                '[class*="title"]',
                '[class*="headline"]',
                'article h1', 'article h2', 'article h3',
                '.story-title', '.headline', '.article-title'
            ];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (results.length >= 10) break;
                    
                    const text = element.textContent?.trim();
                    if (text && text.length > 15 && text.length < 200) {
                        const isDuplicate = results.some(article => article.title === text);
                        if (!isDuplicate) {
                            results.push({
                                title: text,
                                method: 'puppeteer'
                            });
                        }
                    }
                }
                if (results.length >= 10) break;
            }
            
            return results;
        });
        
        console.log(`Found ${articles.length} articles via Puppeteer:`);
        articles.forEach((article, index) => {
            console.log(`  ${index + 1}. ${article.title}`);
        });
        
    } catch (error) {
        console.log(`❌ Puppeteer failed: ${error.message}`);
        if (error.message.includes('socket hang up')) {
            console.log('🔍 This is the socket hang up error we\'re investigating!');
        }
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (e) {
                // Ignore close errors
            }
        }
    }
    
    console.log('\n=== Test Complete ===');
}

testTheNationalScraping().catch(console.error);