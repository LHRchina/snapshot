# Reddit and Telegram Integration for News-to-Audio

This document describes the new Reddit and Telegram integration features added to the news-to-audio.js system.

## Overview

The news-to-audio system now supports scraping content from:
- **Traditional websites** (existing functionality)
- **Reddit subreddits** (new)
- **Telegram channels** (new)

All sources are integrated into a unified news summary and audio generation workflow.

## Features

### Reddit Integration
- Scrape posts from multiple subreddits
- Support for different sorting methods (hot, new, top, controversial, rising)
- Configurable post limits
- Integration with existing audio summary generation

### Telegram Integration
- Scrape messages from public Telegram channels
- Configurable message limits
- Filter out short messages automatically
- Integration with existing audio summary generation

## Prerequisites

### Python Dependencies
The integration requires Python and specific libraries:## Prerequisites

```bash
# For Reddit integration
pip3 install praw

# For Telegram integration
pip3 install telethon

# Set up Telegram authentication (required for first-time use)
python3 setup_telegram_auth.py
```

### API Credentials

#### Reddit API
1. Create a Reddit app at https://www.reddit.com/prefs/apps
2. Get your `client_id` and `client_secret`
3. Update the configuration in `config/config.json`

#### Telegram API
1. Create a Telegram app at https://my.telegram.org/apps
2. Get your `api_id` and `api_hash`
3. Update the configuration in `config/config.json`

## Configuration

Update your `config/config.json` file:

```json
{
  "reddit": {
    "enabled": true,
    "client_id": "your_reddit_client_id",
    "client_secret": "your_reddit_client_secret",
    "user_agent": "CogNews-Integration",
    "subreddits": ["dubai", "UAE", "worldnews"],
    "limit": 15,
    "sort": "hot"
  },
  "telegram": {
    "enabled": true,
    "api_id": "your_telegram_api_id",
    "api_hash": "your_telegram_api_hash",
    "phone": "+your_phone_number",
    "channels": ["dubaionline", "uaenews"],
    "limit": 20
  }
}
```

## Usage

### Basic Usage

```javascript
const { generateNewsAudio } = require('./news-to-audio.js');

// Generate news audio with all sources (websites + Reddit + Telegram)
const result = await generateNewsAudio();
```

### Advanced Usage

```javascript
const { 
    generateNewsAudio, 
    scrapeRedditPosts, 
    scrapeTelegramMessages 
} = require('./news-to-audio.js');

// Scrape only Reddit
const redditPosts = await scrapeRedditPosts({
    subreddit: 'dubai',
    limit: 10,
    sort: 'hot'
});

// Scrape only Telegram
const telegramMessages = await scrapeTelegramMessages({
    channel: 'dubaionline',
    limit: 20
});

// Custom integration
const result = await generateNewsAudio({
    includeReddit: true,
    includeTelegram: true,
    redditSubreddits: ['dubai', 'technology'],
    telegramChannels: ['dubaionline'],
    redditLimit: 10,
    telegramLimit: 15
});
```

### Command Line Usage

```bash
# Generate news audio with all sources
node news-to-audio.js

# Test the integration
node test_integration.js

# Disable specific sources
node news-to-audio.js --includeReddit false
node news-to-audio.js --includeTelegram false
```

## Testing

Run the integration test:

```bash
node test_integration.js
```

This will test:
1. Reddit scraping functionality
2. Telegram scraping functionality
3. Integrated scraping (all sources)
4. Full news-to-audio generation

## Output Format

The integrated system produces:

### JSON Output Structure
```json
{
  "totalWebsites": 5,
  "totalSources": 8,
  "scrapedAt": "2024-01-15T10:30:00.000Z",
  "websites": [...],
  "reddit": [
    {
      "subreddit": "dubai",
      "success": true,
      "articleCount": 15,
      "articles": [...],
      "source": "reddit"
    }
  ],
  "telegram": [
    {
      "channel": "dubaionline",
      "success": true,
      "articleCount": 20,
      "articles": [...],
      "source": "telegram"
    }
  ],
  "allArticles": [...]
}
```

### Audio Summary
The generated audio summary includes:
- Website news highlights
- Reddit community discussions
- Telegram channel updates
- Organized by topic and source

## Error Handling

The system gracefully handles:
- Missing Python dependencies
- API authentication failures
- Network connectivity issues
- Invalid subreddit/channel names

If Reddit or Telegram scraping fails, the system continues with available sources.

## Troubleshooting

### Common Issues

1. **Python not found**
   ```
   Error: python3: command not found
   ```
   Solution: Install Python 3 and ensure it's in your PATH

2. **Missing praw library**
   ```
   ModuleNotFoundError: No module named 'praw'
   ```
   Solution: `pip3 install praw`

3. **Missing telethon library**
   ```
   ModuleNotFoundError: No module named 'telethon'
   ```
   Solution: `pip3 install telethon`

4. **Reddit API authentication failed**
   ```
   Error: 401 Unauthorized
   ```
   Solution: Check your Reddit API credentials in config.json

5. **Telegram authentication required**
   ```
   Error: EOF when reading a line
   Error: Telegram session not found
   ```
   Solution: Run the authentication setup script:
   ```bash
   python3 setup_telegram_auth.py
   ```
   This will guide you through the one-time authentication process.

6. **Telegram session expired**
   ```
   Error: Telegram session expired
   ```
   Solution: Re-authenticate using:
   ```bash
   python3 setup_telegram_auth.py
   ```

7. **Telegram channel not found**
   ```
   Error: Could not find channel
   ```
   Solution: 
   - Ensure the channel name is correct (without @)
   - Verify the channel is public or you have access
   - Check the channel exists on Telegram

### Disabling Integration

To disable Reddit or Telegram integration:

```json
{
  "reddit": {
    "enabled": false
  },
  "telegram": {
    "enabled": false
  }
}
```

Or via command line:
```bash
node news-to-audio.js --includeReddit false --includeTelegram false
```

## Security Notes

- Keep your API credentials secure
- Don't commit credentials to version control
- Use environment variables for sensitive data
- The Telegram session file (`news_session.session`) contains authentication data

## Performance Considerations

- Reddit and Telegram scraping adds processing time
- Adjust limits based on your needs
- Consider running integration during off-peak hours
- Monitor API rate limits

## Future Enhancements

- Support for private Reddit communities
- Telegram bot integration
- Real-time streaming updates
- Advanced content filtering
- Multi-language support for social media content