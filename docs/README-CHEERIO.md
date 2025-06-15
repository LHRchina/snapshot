# News Scraper - Cheerio Implementation

## Overview

This is a lightweight alternative implementation of the news scraper that uses Cheerio and Axios instead of Puppeteer. This implementation offers several advantages:

- **Significantly lower resource usage**: No browser instance required
- **Faster execution**: Direct HTTP requests instead of browser automation
- **Smaller dependencies**: Much smaller node_modules folder
- **Simpler installation**: No Chromium download required

## Comparison with Puppeteer Version

| Feature | Cheerio Implementation | Puppeteer Implementation |
|---------|------------------------|---------------------------|
| Memory Usage | Low (~50-100MB) | High (~300-500MB) |
| Speed | Fast | Slower |
| JavaScript Rendering | No | Yes |
| Installation Size | Small (~5MB) | Large (~300MB) |
| Handles Dynamic Content | Limited | Full support |
| Resource Usage | Very low | High |

## When to Use This Version

The Cheerio implementation is ideal for:

- Scraping static news websites
- Environments with limited resources (low memory, CPU)
- Serverless deployments
- Simple news extraction tasks
- High-volume scraping where performance matters

Stick with the Puppeteer version when:

- Websites heavily rely on JavaScript to render content
- You need to interact with the page (clicking, scrolling)
- Websites have complex anti-bot measures
- You need to handle single-page applications (SPAs)

## Installation

```bash
# Install dependencies
npm install --save axios cheerio cors express

# Or use the provided package.json
npm install
```

## Usage

### Command Line

```bash
# Using configuration file
node snapshot-cheerio.js --config

# Specify maximum news articles
node snapshot-cheerio.js --config --maxNews 5

# Scrape specific URLs
node snapshot-cheerio.js https://example.com --maxNews 10
```

### API Server

```bash
# Start the API server
node snapshot-cheerio.js
```

Then use the API endpoints:

- `POST /scrape-multiple-news` - Scrape multiple websites from config
- `POST /scrape-news` - Scrape a single website
- `GET /health` - Health check endpoint

## Configuration

This implementation uses the same `config.json` file as the Puppeteer version, but some options like `viewport` are ignored since they're browser-specific.

## Limitations

1. **JavaScript Rendering**: Cannot execute JavaScript on the page, so content loaded dynamically may not be scraped
2. **Complex Interactions**: No support for clicking, scrolling, or other interactions
3. **Anti-Bot Measures**: Less effective against sophisticated anti-scraping techniques

## Switching Between Implementations

You can keep both implementations and switch between them as needed:

```bash
# Use Puppeteer version
node snapshot.js --config

# Use Cheerio version
node snapshot-cheerio.js --config
```

## Performance Comparison

The Cheerio implementation typically performs 3-5x faster than the Puppeteer version and uses significantly less memory, making it suitable for resource-constrained environments or high-volume scraping tasks.