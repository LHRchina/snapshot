const puppeteer = require('puppeteer');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

/**
 * Take a screenshot of a webpage
 * @param {string} url - The URL to screenshot
 * @param {Object} options - Screenshot options
 * @returns {Promise<string>} - Path to the screenshot file
 */
async function takeScreenshot(url, options = {}) {
    const {
        width = 1920,
        height = 500,
        fullPage = true,
        format = 'png',
        quality = 90,
        waitFor = 2,
        filename = null,
        skipElement = 'home-page-mast', // CSS selector for element to skip (e.g., 'home-page-mast')
        startFromPixel = null, // Start screenshot from specific pixel position (e.g., 500)
        endAtPixel = null, // End screenshot at specific pixel position (e.g., 1500)
        leftBorder = null, // Left border position in pixels (e.g., 100)
        rightBorder = null, // Right border position in pixels (e.g., 1800)
    } = options;

    let browser;
    try {
        console.log(`Taking screenshot of: ${url}`);

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

        // Skip waiting for lazy-loaded content for faster screenshots
        // await new Promise(resolve => setTimeout(resolve, 5));

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

        // Handle positioning - either from pixel position or skipping elements
        if (startFromPixel !== null) {
            // Scroll to specific pixel position
            await page.evaluate((pixelPosition) => {
                console.log(`Scrolling to pixel position: ${pixelPosition}px`);
                window.scrollTo({
                    top: pixelPosition,
                    behavior: 'smooth'
                });
            }, startFromPixel);

            // Wait for scroll to complete
            await new Promise(resolve => setTimeout(resolve, 300));
        } else if (skipElement) {
            // Handle skipping specific elements (e.g., header/masthead)
            await page.evaluate((selector) => {
                // First try to find R-SNG class element
                let element = document.querySelector('.R-SNG');

                // If R-SNG not found, fall back to original selector logic
                if (!element) {
                    element = document.querySelector(selector) ||
                             document.querySelector(`#${selector}`) ||
                             document.querySelector(`.${selector}`);
                }

                if (element) {
                    console.log(`Found element to skip: ${element.className || selector}`);
                    const rect = element.getBoundingClientRect();
                    const scrollY = rect.bottom + window.scrollY; // Position directly under the R-SNG element

                    // Scroll to position directly under the R-SNG element
                    window.scrollTo({
                        top: scrollY,
                        behavior: 'smooth'
                    });

                    console.log(`Scrolled to position under element: ${element.className || selector}, scrolled to: ${scrollY}px`);
                } else {
                    console.log(`Element not found: ${selector}`);
                }
            }, skipElement);

            // Wait for scroll to complete
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const domain = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
        const screenshotFilename = filename || `screenshot_${domain}_${timestamp}.${format}`;
        const screenshotPath = path.join(screenshotsDir, screenshotFilename);

        // Take screenshot
        const screenshotOptions = {
            path: screenshotPath,
            type: format
        };

        // Handle pixel-based clipping
        if (startFromPixel !== null || endAtPixel !== null || leftBorder !== null || rightBorder !== null) {
            // Use clip region for specific pixel range
            const viewport = await page.viewport();
            const x = leftBorder !== null ? leftBorder : 0;
            const y = startFromPixel !== null ? startFromPixel : 0;
            const width = rightBorder !== null ? (rightBorder - x) : (viewport.width - x);
            const height = endAtPixel !== null ? (endAtPixel - y) : (viewport.height - y);
            
            screenshotOptions.clip = {
                x: x,
                y: y,
                width: width,
                height: height
            };
            console.log(`Taking clipped screenshot: x=${x}px, y=${y}px, width=${width}px, height=${height}px`);
        } else if (startFromPixel !== null) {
            // Start from pixel and go to bottom (existing behavior)
            screenshotOptions.fullPage = fullPage;
        } else {
            // Default behavior
            screenshotOptions.fullPage = fullPage;
        }

        if (format === 'jpeg' && quality) {
            screenshotOptions.quality = quality;
        }

        await page.screenshot(screenshotOptions);

        console.log(`Screenshot saved: ${screenshotPath}`);
        return screenshotPath;

    } catch (error) {
        console.error('Error taking screenshot:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// API endpoint for taking screenshots
app.post('/screenshot', async (req, res) => {
    try {
        const { url, options = {} } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const screenshotPath = await takeScreenshot(url, options);
        const filename = path.basename(screenshotPath);

        res.json({
            success: true,
            message: 'Screenshot taken successfully',
            filename,
            path: screenshotPath,
            url: `/screenshots/${filename}`
        });

    } catch (error) {
        console.error('Screenshot API error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Serve screenshot files
app.use('/screenshots', express.static(screenshotsDir));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Screenshot Service' });
});

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // Start as web service
        app.listen(PORT, () => {
            console.log(`Screenshot service running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
            console.log(`API endpoint: POST http://localhost:${PORT}/screenshot`);
        });
    } else {
        // Command line mode
        const url = args[0];
        const options = {};

        // Parse command line options
        for (let i = 1; i < args.length; i += 2) {
            const key = args[i].replace('--', '');
            const value = args[i + 1];

            if (key === 'width' || key === 'height' || key === 'quality' || key === 'waitFor' || key === 'startFromPixel' || key === 'endAtPixel' || key === 'leftBorder' || key === 'rightBorder') {
                options[key] = parseInt(value);
            } else if (key === 'fullPage') {
                options[key] = value === 'true';
            } else {
                options[key] = value;
            }
        }

        // Show usage help if no URL provided
        if (!url) {
            console.log('Usage: node snapshot.js <url> [options]');
            console.log('Options:');
            console.log('  --width <number>        Viewport width (default: 1920)');
            console.log('  --height <number>       Viewport height (default: 1080)');
            console.log('  --fullPage <true|false> Take full page screenshot (default: true)');
            console.log('  --format <png|jpeg>     Image format (default: png)');
            console.log('  --quality <number>      JPEG quality 1-100 (default: 90)');
            console.log('  --waitFor <number>      Wait time in ms (default: 2000)');
            console.log('  --filename <string>     Custom filename');
            console.log('  --skipElement <string>  CSS selector to skip (e.g., home-page-mast)');
            console.log('  --startFromPixel <number> Start from specific pixel position (e.g., 500)');
            console.log('  --endAtPixel <number>   End at specific pixel position (e.g., 1500)');
            console.log('  --leftBorder <number>   Left border position in pixels (e.g., 100)');
            console.log('  --rightBorder <number>  Right border position in pixels (e.g., 1800)');
            console.log('');
            console.log('Examples:');
            console.log('  node snapshot.js https://example.com --skipElement home-page-mast');
            console.log('  node snapshot.js https://example.com --startFromPixel 500');
            console.log('  node snapshot.js https://example.com --startFromPixel 500 --endAtPixel 1500');
            console.log('  node snapshot.js https://example.com --startFromPixel 500 --endAtPixel 1500 --leftBorder 100 --rightBorder 1800');
            process.exit(1);
        }

        takeScreenshot(url, options)
            .then(screenshotPath => {
                console.log(`Screenshot saved to: ${screenshotPath}`);
                process.exit(0);
            })
            .catch(error => {
                console.error('Error:', error.message);
                process.exit(1);
            });
    }
}

module.exports = { takeScreenshot, app };