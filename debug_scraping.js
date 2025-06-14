const puppeteer = require('puppeteer');

async function testScraping() {
    const url = 'https://www.khaleejtimes.com/';
    let browser;
    
    try {
        console.log(`Testing scraping for: ${url}`);
        
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        console.log('Navigating to page...');
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        
        console.log('Page loaded, extracting content...');
        
        // Test different selectors
        const results = await page.evaluate(() => {
            const selectors = [
                'h1', 'h2', 'h3',
                'article',
                '.article',
                '.news-item',
                '.story',
                '[class*="title"]',
                '[class*="headline"]'
            ];
            
            const findings = {};
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                findings[selector] = {
                    count: elements.length,
                    samples: Array.from(elements).slice(0, 3).map(el => ({
                        text: el.textContent?.trim().substring(0, 100),
                        tagName: el.tagName,
                        className: el.className
                    }))
                };
            }
            
            return findings;
        });
        
        console.log('Scraping results:');
        for (const [selector, data] of Object.entries(results)) {
            console.log(`${selector}: ${data.count} elements`);
            if (data.samples.length > 0) {
                data.samples.forEach((sample, i) => {
                    console.log(`  Sample ${i + 1}: ${sample.text}`);
                });
            }
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testScraping();