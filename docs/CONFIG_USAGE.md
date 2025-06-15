# Configuration-Based News Scraping

The news scraping tool now supports configuration-based website management through a `config.json` file.

## Configuration File Structure

The `config.json` file contains:

```json
{
  "websites": [
    {
      "name": "Website Display Name",
      "url": "https://example.com",
      "enabled": true
    }
  ],
  "scraping": {
    "maxNews": 10,
    "delayBetweenRequests": 2000,
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "waitTime": 3000
  }
}
```

### Website Configuration

- **name**: Display name for the website (used in logs)
- **url**: The URL to scrape
- **enabled**: Boolean flag to enable/disable scraping for this website

### Scraping Configuration

- **maxNews**: Maximum number of articles to scrape per website
- **delayBetweenRequests**: Delay in milliseconds between scraping different websites
- **viewport**: Browser viewport dimensions
- **waitTime**: Time to wait for page loading in milliseconds

## Usage

### Command Line

```bash
# Use websites from config.json
node snapshot.js --config

# Use config with custom options
node snapshot.js --config --maxNews 5
node snapshot.js --config --waitFor 5000

# Traditional URL-based approach (still supported)
node snapshot.js https://example.com
node snapshot.js https://site1.com https://site2.com --maxNews 10
```

### API Endpoints

```bash
# Scrape using configuration
curl -X POST http://localhost:3000/scrape-multiple-news \
  -H "Content-Type: application/json" \
  -d '{"options": {"maxNews": 5}}'

# Traditional single site scraping
curl -X POST http://localhost:3000/scrape-news \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "options": {"maxNews": 10}}'
```

## Managing Websites

### Adding a New Website

1. Edit `config.json`
2. Add a new entry to the `websites` array:

```json
{
  "name": "New Site",
  "url": "https://newsite.com",
  "enabled": true
}
```

### Disabling a Website

Set `"enabled": false` for any website you want to temporarily disable:

```json
{
  "name": "Temporarily Disabled Site",
  "url": "https://example.com",
  "enabled": false
}
```

### Updating Scraping Settings

Modify the `scraping` section in `config.json`:

```json
{
  "scraping": {
    "maxNews": 15,
    "delayBetweenRequests": 3000,
    "viewport": {
      "width": 1366,
      "height": 768
    },
    "waitTime": 5000
  }
}
```

## Benefits

1. **Easy Management**: Add/remove websites without modifying code
2. **Flexible Configuration**: Centralized settings for all scraping parameters
3. **Enable/Disable**: Temporarily disable problematic websites
4. **Backward Compatibility**: Original URL-based approach still works
5. **Environment-Specific**: Different configurations for different environments

## Default UAE News Websites

The default configuration includes:

- Khaleej Times
- Gulf News
- The National News
- Timeout Abu Dhabi
- Emirates 247

All websites are enabled by default with optimized scraping settings for UAE news sources.