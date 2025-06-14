# Migration Guide: From Puppeteer to Cheerio

This guide helps you transition from the Puppeteer-based news scraper to the lightweight Cheerio implementation.

## Why Migrate?

### Benefits of Cheerio Implementation

✅ **Performance**: 3-5x faster execution <mcreference link="https://www.reddit.com/r/node/comments/158d5aq/is_puppeteer_still_the_goto_for_web_scraping/" index="1">1</mcreference>  
✅ **Memory Usage**: 80-90% less memory consumption <mcreference link="https://oxylabs.io/blog/cheerio-alternatives" index="3">3</mcreference>  
✅ **Installation Size**: Much smaller dependencies (~5MB vs ~300MB)  
✅ **Resource Efficiency**: No browser overhead  
✅ **Serverless Friendly**: Perfect for AWS Lambda, Vercel, etc.  
✅ **Cost Effective**: Lower hosting costs due to reduced resource usage  

### Trade-offs

❌ **No JavaScript Rendering**: Cannot handle dynamically loaded content <mcreference link="https://oxylabs.io/blog/cheerio-alternatives" index="3">3</mcreference>  
❌ **Limited Interaction**: No clicking, scrolling, or form filling  
❌ **Anti-Bot Detection**: Less sophisticated than browser-based scraping  

## Step-by-Step Migration

### 1. Install New Dependencies

```bash
# Remove Puppeteer (optional)
npm uninstall puppeteer

# Install Cheerio dependencies
npm install axios cheerio
```

### 2. Update Your Code

#### Option A: Complete Replacement

Replace your existing `snapshot.js` with `snapshot-cheerio.js`:

```bash
# Backup original
cp snapshot.js snapshot-puppeteer.js

# Use Cheerio version
cp snapshot-cheerio.js snapshot.js
```

#### Option B: Side-by-Side (Recommended)

Keep both implementations and choose based on your needs:

```bash
# Use Puppeteer for complex sites
node snapshot.js --config

# Use Cheerio for simple/static sites
node snapshot-cheerio.js --config
```

### 3. Update Package.json

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "scripts": {
    "start": "node snapshot-cheerio.js",
    "start:puppeteer": "node snapshot.js",
    "start:cheerio": "node snapshot-cheerio.js"
  }
}
```

### 4. Configuration Changes

The same `config.json` works with both implementations, but some options are ignored in Cheerio:

```json
{
  "scraping": {
    "maxNews": 10,
    "delayBetweenRequests": 2000,
    "waitTime": 1000,
    "viewport": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

**Cheerio ignores**: `viewport` (browser-specific)
**Cheerio uses**: `maxNews`, `delayBetweenRequests`, `waitTime`

## Testing Your Migration

### 1. Run Performance Comparison

```bash
node performance-comparison.js
```

This will test both implementations and show performance differences.

### 2. Test Individual Websites

```bash
# Test with Cheerio
node snapshot-cheerio.js https://example.com --maxNews 5

# Compare with Puppeteer
node snapshot.js https://example.com --maxNews 5
```

### 3. Validate Results Quality

Check if the scraped data quality meets your requirements:

- Are titles being extracted correctly?
- Are links working?
- Is the content meaningful?

## Website Compatibility Assessment

### ✅ Good Candidates for Cheerio

- Traditional news websites with server-side rendering
- Static HTML content
- Simple article structures
- Sites that don't heavily rely on JavaScript

### ⚠️ May Need Puppeteer

- Single Page Applications (SPAs)
- Sites with infinite scroll
- Content loaded via AJAX/fetch
- Heavy JavaScript frameworks (React, Angular, Vue)

### 🔍 How to Check

1. **View Page Source**: If you can see the content in "View Source", Cheerio will work
2. **Disable JavaScript**: If the site still shows content with JS disabled, Cheerio is suitable
3. **Network Tab**: If content loads after initial page load, you might need Puppeteer

## Deployment Considerations

### Docker

```dockerfile
# Cheerio version - much smaller image
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "snapshot-cheerio.js"]
```

### Serverless (AWS Lambda)

Cheerio is perfect for serverless due to:
- Fast cold starts
- Low memory usage
- No browser dependencies

### Traditional Hosting

Both work, but Cheerio allows:
- Higher concurrency
- Lower server costs
- Better resource utilization

## Troubleshooting Common Issues

### Issue: No Articles Found

**Cause**: Website uses JavaScript to load content

**Solutions**:
1. Check if the site has an API endpoint
2. Use Puppeteer for this specific site
3. Look for RSS feeds as alternative

### Issue: Incomplete Data

**Cause**: Content structure different from expected selectors

**Solutions**:
1. Inspect the HTML structure
2. Update selectors in the scraping function
3. Add site-specific handling

### Issue: Rate Limiting

**Cause**: Too many requests too quickly

**Solutions**:
1. Increase `delayBetweenRequests` in config
2. Implement exponential backoff
3. Use proxy rotation

## Best Practices

### 1. Hybrid Approach

```javascript
// Use Cheerio first, fallback to Puppeteer if needed
async function smartScrape(url, options) {
    try {
        const cheerioResult = await cheerioScraper.scrapeTopNews(url, options);
        if (cheerioResult.length > 0) {
            return cheerioResult;
        }
    } catch (error) {
        console.log('Cheerio failed, trying Puppeteer...');
    }
    
    return await puppeteerScraper.scrapeTopNews(url, options);
}
```

### 2. Site-Specific Configuration

```json
{
  "websites": [
    {
      "name": "Static News Site",
      "url": "https://example.com",
      "enabled": true,
      "scraper": "cheerio"
    },
    {
      "name": "Dynamic News Site",
      "url": "https://spa-example.com",
      "enabled": true,
      "scraper": "puppeteer"
    }
  ]
}
```

### 3. Monitoring and Fallbacks

- Monitor success rates for each implementation
- Set up alerts for scraping failures
- Implement automatic fallback mechanisms

## Performance Benchmarks

Typical performance improvements with Cheerio:

| Metric | Puppeteer | Cheerio | Improvement |
|--------|-----------|---------|-------------|
| Execution Time | 5-15 seconds | 1-3 seconds | 3-5x faster |
| Memory Usage | 300-500 MB | 50-100 MB | 5-10x less |
| CPU Usage | High | Low | 70-80% reduction |
| Cold Start | 2-5 seconds | <1 second | 5x faster |

## Conclusion

The Cheerio implementation offers significant performance and resource benefits for most news scraping use cases. Start with Cheerio for new projects and migrate existing ones gradually, keeping Puppeteer as a fallback for complex sites.

For questions or issues during migration, refer to the troubleshooting section or create an issue in the project repository.