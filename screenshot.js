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
        height = 1080,
        fullPage = true,
        format = 'png',
        quality = 90,
        waitFor = 2000,
        filename = null
    } = options;

    let browser;
    try {
        console.log(`Taking screenshot of: ${url}`);

        // Launch browser with optimized settings
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                // '--no-sandbox',
                // '--disable-setuid-sandbox',
                // '--disable-dev-shm-usage',
                // '--disable-accelerated-2d-canvas',
                // '--no-first-run',
                // '--no-zygote',
                // '--disable-gpu'
                '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote'
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

        // Additional wait for lazy-loaded content
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const domain = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
        const screenshotFilename = filename || `screenshot_${domain}_${timestamp}.${format}`;
        const screenshotPath = path.join(screenshotsDir, screenshotFilename);

        // Take screenshot
        const screenshotOptions = {
            path: screenshotPath,
            fullPage,
            type: format
        };

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

            if (key === 'width' || key === 'height' || key === 'quality' || key === 'waitFor') {
                options[key] = parseInt(value);
            } else if (key === 'fullPage') {
                options[key] = value === 'true';
            } else {
                options[key] = value;
            }
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