const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer');
const axios = require('axios');
const translatte = require('translatte');

// Reddit and Telegram integration
let praw, TelegramClient;
try {
    // Try to load Reddit PRAW (Python Reddit API Wrapper)
    // Note: This requires Python and praw to be installed
    praw = require('child_process');
} catch (error) {
    console.log('Reddit integration requires Python and praw library');
}

try {
    // Try to load Telegram client (requires telethon for Python)
    TelegramClient = require('child_process');
} catch (error) {
    console.log('Telegram integration requires Python and telethon library');
}

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname+"/config", 'config.json'), 'utf8'));

console.log('🚀 Starting news-to-audio.js integration...', config);

// Create news data directory if it doesn't exist
const newsDir = path.join(__dirname, 'news_data');
if (!fs.existsSync(newsDir)) {
    fs.mkdirSync(newsDir, { recursive: true });
}

/**
 * Scrape Reddit posts using Python PRAW library
 * @param {Object} options - Reddit scraping options
 * @returns {Promise<Array>} - Array of Reddit posts
 */
async function scrapeRedditPosts(options = {}) {
    // Get Reddit config from main config
    const redditConfig = config.reddit || {};
    const {
        subreddit = 'dubai',
        limit = redditConfig.limit || 20,
        sort = redditConfig.sort || 'new' // 'hot', 'new', 'top', 'controversial', 'rising'
    } = options;

    // Check if Reddit is enabled
    if (redditConfig.enabled === false) {
        console.log('Reddit integration is disabled in config');
        return [];
    }

    try {
        console.log(`Scraping Reddit r/${subreddit} (${sort}, limit: ${limit})...`);

        // Get credentials from config
        const clientId = redditConfig.client_id || '';
        const clientSecret = redditConfig.client_secret || '';
        const userAgent = redditConfig.user_agent || '';

        // Create a temporary Python script to scrape Reddit
        const pythonScript = `
import praw
import json
import sys
from datetime import datetime

try:
    # Reddit credentials from config
    reddit = praw.Reddit(
        client_id="${clientId}",
        client_secret="${clientSecret}",
        user_agent="${userAgent}"
    )

    subreddit = reddit.subreddit("${subreddit}")
    posts_data = []

    # Get posts based on sort type
    if "${sort}" == "hot":
        posts = subreddit.hot(limit=${limit})
    elif "${sort}" == "new":
        posts = subreddit.new(limit=${limit})
    elif "${sort}" == "top":
        posts = subreddit.top(limit=${limit})
    elif "${sort}" == "controversial":
        posts = subreddit.controversial(limit=${limit})
    else:
        posts = subreddit.rising(limit=${limit})

    for post in posts:
        posts_data.append({
            "title": post.title,
            "score": post.score,
            "num_comments": post.num_comments,
            "url": post.url,
            "selftext": post.selftext,
            "created_utc": post.created_utc,
            "permalink": f"https://reddit.com{post.permalink}",
            "subreddit": "${subreddit}",
            "author": str(post.author) if post.author else "[deleted]",
            "scrapedAt": datetime.now().isoformat()
        })

    print(json.dumps(posts_data, indent=2))

except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

        // Write the Python script to a temporary file
        const scriptPath = path.join(__dirname, 'temp_reddit_scraper.py');
        fs.writeFileSync(scriptPath, pythonScript);

        // Execute the Python script
        const result = execSync(`python3 "${scriptPath}"`, {
            encoding: 'utf8',
            timeout: 30000 // 30 second timeout
        });

        // Clean up the temporary script
        fs.unlinkSync(scriptPath);

        // Parse the JSON result
        const posts = JSON.parse(result);

        console.log(`✅ Successfully scraped ${posts.length} posts from r/${subreddit}`);

        // Convert Reddit posts to our standard article format
        return posts.map(post => ({
            title: post.title,
            link: post.permalink,
            summary: post.selftext ? post.selftext.substring(0, 300) : `Score: ${post.score}, Comments: ${post.num_comments}`,
            image: '', // Reddit posts don't always have images in this format
            scrapedAt: post.scrapedAt,
            source: 'reddit',
            subreddit: post.subreddit,
            score: post.score,
            comments: post.num_comments,
            author: post.author
        }));

    } catch (error) {
        console.error('Error scraping Reddit:', error.message);

        // Check if it's a Python/praw installation issue
        if (error.message.includes('python3') || error.message.includes('praw')) {
            console.log('💡 To enable Reddit integration:');
            console.log('   pip3 install praw');
            console.log('   Or: pip install praw');
        }

        return [];
    }
}

/**
 * Scrape Telegram channel messages using Python Telethon library
 * @param {Object} options - Telegram scraping options
 * @returns {Promise<Array>} - Array of Telegram messages
 */
async function scrapeTelegramMessages(options = {}) {
    // Get Telegram config from main config
    const telegramConfig = config.telegram || {};
    const {
        channel = 'dubaionline',
        limit = telegramConfig.limit || 50
    } = options;

    // Check if Telegram is enabled
    if (telegramConfig.enabled === false) {
        console.log('Telegram integration is disabled in config');
        return [];
    }

    try {
        console.log(`Scraping Telegram @${channel} (limit: ${limit})...`);

        // Get credentials from config
        const apiId = telegramConfig.api_id || '';
        const apiHash = telegramConfig.api_hash || '';
        const phone = telegramConfig.phone || '';

        // Create a temporary Python script to scrape Telegram
        const pythonScript = `
import asyncio
from telethon import TelegramClient
from telethon.tl.types import Channel
import json
import sys
import os
from datetime import datetime

async def scrape_channel():
    try:
        # Telegram credentials
        api_id = ${apiId}
        api_hash = '${apiHash}'
        phone = '${phone}'

        # Use absolute path for session file
        session_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'news_session')

        # Create client
        client = TelegramClient(session_path, api_id, api_hash)

        # Check if session exists
        if not os.path.exists(session_path + '.session'):
            print("Error: Telegram session not found. Please run initial authentication first.", file=sys.stderr)
            print("Run: python3 -c \\\"from telethon import TelegramClient; import asyncio; async def auth(): client = TelegramClient('news_session', ${apiId}, '${apiHash}'); await client.start('${phone}'); await client.disconnect(); asyncio.run(auth())\\\"", file=sys.stderr)
            sys.exit(1)

        # Start client without phone (use existing session)
        await client.start()

        # Check if client is authorized
        if not await client.is_user_authorized():
            print("Error: Telegram session expired. Please re-authenticate.", file=sys.stderr)
            sys.exit(1)

        # Get channel entity
        try:
            entity = await client.get_entity('${channel}')
        except Exception as e:
            print(f"Error: Could not find channel '${channel}'. Make sure it exists and is public. {str(e)}", file=sys.stderr)
            sys.exit(1)

        if isinstance(entity, Channel):
            messages_data = []
            
            # Initialize filtering counters
            total_messages = 0
            filtered_forwarded = 0
            filtered_ads = 0
            filtered_empty = 0
            all_hashtags = []

            # Iterate over messages
            async for message in client.iter_messages(entity, limit=${limit}):
                total_messages += 1
                
                # Filter out forwarded messages
                if message.forward:
                    filtered_forwarded += 1
                    print(f"跳过转发消息: {message.id}", file=sys.stderr)
                    continue
                
                # Filter out messages containing '#广告'
                if message.text and '#广告' in message.text:
                    filtered_ads += 1
                    print(f"跳过广告消息: {message.id}", file=sys.stderr)
                    continue
                
                # Filter out empty messages
                if not message.text or not message.text.strip():
                    filtered_empty += 1
                    print(f"跳过空消息: {message.id}", file=sys.stderr)
                    continue
                
                # Extract hashtags from message text
                import re
                hashtags = re.findall(r'#\\w+', message.text) if message.text else []
                all_hashtags.extend(hashtags)
                
                # Only include valid messages with text
                if message.text and len(message.text.strip()) > 0:
                    message_info = {
                        'id': message.id,
                        'date': message.date.isoformat() if message.date else None,
                        'text': message.text or '',
                        'views': message.views or 0,
                        'post_url': f"https://t.me/${channel}/{message.id}",
                        'channel': '${channel}',
                        'scrapedAt': datetime.now().isoformat(),
                        'is_forwarded': bool(message.forward),
                        'hashtags': hashtags
                    }
                    messages_data.append(message_info)
                    print(f"处理消息: {message.id} - 标签: {hashtags if hashtags else 'None'}", file=sys.stderr)
            
            # Calculate statistics
            valid_messages = len(messages_data)
            filtering_rate = ((total_messages - valid_messages) / total_messages * 100) if total_messages > 0 else 0
            unique_hashtags = list(set(all_hashtags))
            
            # Print filtering statistics
            print(f"\\n=== 过滤统计 ===", file=sys.stderr)
            print(f"总消息数: {total_messages}", file=sys.stderr)
            print(f"转发消息: {filtered_forwarded}", file=sys.stderr)
            print(f"广告消息: {filtered_ads}", file=sys.stderr)
            print(f"空消息: {filtered_empty}", file=sys.stderr)
            print(f"有效消息: {valid_messages}", file=sys.stderr)
            print(f"过滤率: {filtering_rate:.1f}%", file=sys.stderr)
            print(f"\\n=== 标签统计 ===", file=sys.stderr)
            print(f"总标签数: {len(all_hashtags)}", file=sys.stderr)
            print(f"唯一标签数: {len(unique_hashtags)}", file=sys.stderr)
            if unique_hashtags:
                print(f"标签列表: {', '.join(unique_hashtags[:10])}{'...' if len(unique_hashtags) > 10 else ''}", file=sys.stderr)
            else:
                print("标签列表: 无", file=sys.stderr)

            print(json.dumps(messages_data, indent=2))
        else:
            print(f"Error: '{channel}' is not a valid channel", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
    finally:
        try:
            await client.disconnect()
        except:
            pass

if __name__ == '__main__':
    asyncio.run(scrape_channel())
`;

        // Write the Python script to a temporary file
        const scriptPath = path.join(__dirname, 'temp_telegram_scraper.py');
        fs.writeFileSync(scriptPath, pythonScript);

        // Execute the Python script
        const result = execSync(`python3 "${scriptPath}"`, {
            encoding: 'utf8',
            timeout: 45000 // 45 second timeout for Telegram
        });

        // Clean up the temporary script
        fs.unlinkSync(scriptPath);

        // Parse the JSON result
        const messages = JSON.parse(result);

        console.log(`✅ Successfully scraped ${messages.length} valid messages from @${channel} after filtering`);

        // Convert Telegram messages to our standard article format
        return messages
            .filter(msg => msg.text && msg.text.length > 20) // Additional filter for short messages
            .map(msg => ({
                title: msg.text.length > 100 ? msg.text.substring(0, 100) + '...' : msg.text,
                link: msg.post_url,
                summary: msg.text.substring(0, 300),
                image: '', // Telegram messages might have media, but we're focusing on text
                scrapedAt: msg.scrapedAt,
                source: 'telegram',
                channel: msg.channel,
                views: msg.views,
                messageId: msg.id,
                isForwarded: msg.is_forwarded || false,
                hashtags: msg.hashtags || []
            }));

    } catch (error) {
        console.error('Error scraping Telegram:', error.message);

        // Check for specific error types and provide helpful guidance
        if (error.message.includes('session not found')) {
            console.log('💡 Telegram session not found. To set up authentication:');
            console.log('   python3 setup_telegram_auth.py');
            console.log('   Or with custom phone: python3 setup_telegram_auth.py +1234567890');
        } else if (error.message.includes('session expired')) {
            console.log('💡 Telegram session expired. Please re-authenticate:');
            console.log('   python3 setup_telegram_auth.py');
        } else if (error.message.includes('Could not find channel')) {
            console.log('💡 Channel not found. Please check:');
            console.log('   - Channel name is correct (without @)');
            console.log('   - Channel is public or you have access');
        } else if (error.message.includes('python3') || error.message.includes('telethon')) {
            console.log('💡 To enable Telegram integration:');
            console.log('   pip3 install telethon');
            console.log('   Or: pip install telethon');
            console.log('   Then run: python3 setup_telegram_auth.py');
        } else {
            console.log('💡 For Telegram integration help:');
            console.log('   python3 setup_telegram_auth.py --help');
        }

        return [];
    }
}

/**
 * Clean and format text for audio narration
 * @param {string} text - The text to clean
 * @returns {string} - Cleaned text
 */
function cleanTextForAudio(text) {
    if (!text) return '';

    return text
        .replace(/[\r\n]+/g, ' ') // Replace line breaks with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[^a-zA-Z0-9\s.,!?;:()-]/g, '') // Remove special characters except basic punctuation
        .replace(/'/g, "'") // Replace smart quotes
        .replace(/"/g, '"') // Replace smart quotes
        .trim();
}

/**
 * Generate a comprehensive news summary for audio narration
 * @param {Object} newsData - The scraped news data
 * @returns {Promise<string>} - Audio-ready summary in Chinese
 */
// Helper function to remove URLs from text
function removeUrlsFromText(text) {
    // Remove various URL patterns
    return text
        .replace(/https?:\/\/[^\s\)\]\}]+/g, '') // Remove http/https URLs
        .replace(/www\.[^\s\)\]\}]+/g, '') // Remove www URLs
        .replace(/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s\)\]\}]*/g, '') // Remove domain-like patterns
        .replace(/https?:/g, '') // Remove remaining protocol fragments
        .replace(/www\./g, '') // Remove remaining www fragments
        .replace(/\([^)]*\.(com|org|net|gov|edu|co|io|me|ly|tv|fm)[^)]*\)/g, '') // Remove parentheses containing domains
        .replace(/\s+/g, ' ') // Clean up extra spaces
        .replace(/\s+\./g, '.') // Fix spacing before periods
        .replace(/\.\s*\./g, '.') // Remove double periods
        .trim();
}

async function generateAudioSummary(newsData) {
    const timestamp = new Date(newsData.scrapedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    let summary = `News Summary for ${timestamp}. `;

    // Count sources
    const websiteCount = newsData.websites ? newsData.websites.length : 0;
    const redditCount = newsData.reddit ? newsData.reddit.length : 0;
    const telegramCount = newsData.telegram ? newsData.telegram.length : 0;

    summary += `Today we have ${websiteCount} websites`;
    if (redditCount > 0) {
        summary += `, ${redditCount} Reddit communities`;
    }
    if (telegramCount > 0) {
        summary += `, ${telegramCount} Telegram channels`;
    }
    summary += ` with a total of ${newsData.allArticles.length} articles and posts. `;

    // Track mentioned articles to avoid duplicates
    const mentionedArticles = new Set();
    let newsCounter = 1;

    // Group articles by topic/keywords for better organization
    const topicGroups = groupArticlesByTopic(newsData.allArticles);

    // Add breaking news section
    const breakingNews = identifyBreakingNews(newsData.allArticles);
    if (breakingNews.length > 0) {
        summary += 'Breaking News: ';
        breakingNews.forEach((article, index) => {
            const articleKey = `${article.title}_${article.link || ''}`;
            if (!mentionedArticles.has(articleKey)) {
                summary += `${newsCounter}. ${cleanTextForAudio(article.title)}. `;
                if (article.summary && article.summary.trim()) {
                    summary += `${cleanTextForAudio(article.summary)}. `;
                }
                mentionedArticles.add(articleKey);
                newsCounter++;
            }
        });
    }

    // Add main topics
    Object.entries(topicGroups).forEach(([topic, articles]) => {
        if (articles.length > 1) {
            summary += `In ${topic} news: `;
            let addedCount = 0;
            articles.forEach(article => {
                if (addedCount < 3) {
                    const articleKey = `${article.title}_${article.link || ''}`;
                    if (!mentionedArticles.has(articleKey)) {
                        summary += `${newsCounter}. ${cleanTextForAudio(article.title)}. `;
                        mentionedArticles.add(articleKey);
                        addedCount++;
                        newsCounter++;
                    }
                }
            });
        }
    });

    // Add website-specific highlights
    if (newsData.websites) {
        newsData.websites.forEach(website => {
            if (website.success && website.articles.length > 0) {
                const domain = website.domain.replace('www.', '');
                let addedFromWebsite = 0;
                let websiteContent = '';

                website.articles.forEach(article => {
                    if (addedFromWebsite < 2) {
                        const articleKey = `${article.title}_${article.link || ''}`;
                        if (!mentionedArticles.has(articleKey)) {
                            websiteContent += `${newsCounter}. ${cleanTextForAudio(article.title)}. `;
                            mentionedArticles.add(articleKey);
                            addedFromWebsite++;
                            newsCounter++;
                        }
                    }
                });

                if (websiteContent) {
                    summary += `From ${domain}: ${websiteContent}`;
                }
            }
        });
    }

    // Add Reddit highlights
    if (newsData.reddit && newsData.reddit.length > 0) {
        let redditContent = '';
        newsData.reddit.forEach(redditData => {
            if (redditData.success && redditData.articles.length > 0) {
                let addedFromSubreddit = 0;
                let subredditContent = '';

                redditData.articles.forEach(post => {
                    if (addedFromSubreddit < 2) {
                        const articleKey = `${post.title}_${post.link || ''}`;
                        if (!mentionedArticles.has(articleKey)) {
                            subredditContent += `${newsCounter}. ${cleanTextForAudio(post.title)}. `;
                            mentionedArticles.add(articleKey);
                            addedFromSubreddit++;
                            newsCounter++;
                        }
                    }
                });

                if (subredditContent) {
                    redditContent += `In r/${redditData.subreddit}: ${subredditContent}`;
                }
            }
        });

        if (redditContent) {
            summary += `From Reddit communities: ${redditContent}`;
        }
    }

    // Add Telegram highlights
    if (newsData.telegram && newsData.telegram.length > 0) {
        let telegramContent = '';
        newsData.telegram.forEach(telegramData => {
            if (telegramData.success && telegramData.articles.length > 0) {
                let addedFromChannel = 0;
                let channelContent = '';

                telegramData.articles.forEach(message => {
                    if (addedFromChannel < 2) {
                        const articleKey = `${message.title}_${message.link || ''}`;
                        if (!mentionedArticles.has(articleKey)) {
                            channelContent += `${newsCounter}. ${cleanTextForAudio(message.title)}. `;
                            mentionedArticles.add(articleKey);
                            addedFromChannel++;
                            newsCounter++;
                        }
                    }
                });

                if (channelContent) {
                    telegramContent += `From ${telegramData.channel}: ${channelContent}`;
                }
            }
        });

        if (telegramContent) {
            summary += `From Telegram channels: ${telegramContent}`;
        }
    }

    summary += 'This concludes today\'s news summary. Thank you for listening.';

    // Store the original English summary
    const originalSummary = summary;

    try {
        console.log('🔄 Translating summary to Chinese...');

        // Remove URLs from summary before translation
        const summaryForTranslation = removeUrlsFromText(summary);
        console.log('🔗 URLs removed from text before translation');

        // Try iFlytek OTS first (if available)
        try {
            const { translateWithFallback } = require('./ots.js');
            const translated = await translateWithFallback(summaryForTranslation, 'cn');
            console.log('✅ iFlytek OTS translation completed');
            return {
                original: originalSummary,
                translated: translated
            };
        } catch (otsError) {
            console.log('⚠️  iFlytek OTS not available, using fallback translation...');

            // Fallback to translatte library
            const translatedSummary = await translatte(summaryForTranslation, { to: 'zh' });
            console.log('✅ Fallback translation completed');
            return {
                original: originalSummary,
                translated: translatedSummary.text
            };
        }
    } catch (error) {
        console.error('❌ All translation methods failed:', error.message);
        console.log('📝 Using original English summary');
        return {
            original: originalSummary,
            translated: originalSummary
        };
    }
}

/**
 * Group articles by topic based on keywords
 * @param {Array} articles - Array of articles
 * @returns {Object} - Grouped articles by topic
 */
function groupArticlesByTopic(articles) {
    const topics = {
        'Aviation': ['plane', 'flight', 'aircraft', 'airport', 'airline', 'crash', 'aviation'],
        'Business': ['business', 'economy', 'finance', 'company', 'market', 'trade'],
        'Travel': ['travel', 'tourism', 'visa', 'destination', 'hotel'],
        'Technology': ['tech', 'digital', 'ai', 'technology', 'innovation'],
        'Government': ['government', 'minister', 'president', 'policy', 'official'],
        'Sports': ['sports', 'football', 'cricket', 'championship', 'tournament'],
        'Entertainment': ['entertainment', 'movie', 'music', 'show', 'festival']
    };

    const grouped = {};

    articles.forEach(article => {
        const title = article.title.toLowerCase();
        const summary = (article.summary || '').toLowerCase();

        for (const [topic, keywords] of Object.entries(topics)) {
            if (keywords.some(keyword => title.includes(keyword) || summary.includes(keyword))) {
                if (!grouped[topic]) grouped[topic] = [];
                grouped[topic].push(article);
                break;
            }
        }
    });

    return grouped;
}

/**
 * Identify breaking news based on keywords and recency
 * @param {Array} articles - Array of articles
 * @returns {Array} - Breaking news articles
 */
function identifyBreakingNews(articles) {
    const breakingKeywords = ['breaking', 'urgent', 'crash', 'emergency', 'death', 'accident', 'tragedy'];

    return articles.filter(article => {
        const title = article.title.toLowerCase();
        return breakingKeywords.some(keyword => title.includes(keyword));
    }).slice(0, 3); // Limit to top 3 breaking news
}

/**
 * Convert text to speech using Murf.ai API or fallback to system TTS
 * @param {string} text - Text to convert
 * @param {string} outputPath - Output audio file path
 * @returns {Promise<boolean>} - Success status
 */
async function convertToAudio(text, outputPath) {
    // Try iFlytek TTS API first if credentials are available (from config.json or environment variables)
    const iflytekAppId = config.ots?.appid || process.env.IFLYTEK_APP_ID;
    const iflytekApiKey = config.ots?.apiKey || process.env.IFLYTEK_API_KEY;
    const iflytekApiSecret = config.ots?.apiSecret || process.env.IFLYTEK_API_SECRET;

    if (iflytekAppId && iflytekApiKey && iflytekApiSecret) {
        try {
            console.log('Using iFlytek TTS API for high-quality text-to-speech...');
            const { convertWithIFlytekTTS } = require('./iflytek-tts.js');

            // Pass config values to iFlytek TTS
            const iflytekConfig = {
                host: config.tts?.host || 'api-dx.xf-yun.com',
                appId: iflytekAppId,
                apiKey: iflytekApiKey,
                apiSecret: iflytekApiSecret
            };

            const success = await convertWithIFlytekTTS(text, outputPath, { config: iflytekConfig });
            if (success) return true;
        } catch (error) {
            console.log('iFlytek TTS API failed, falling back to system TTS:', error.message);
        }
    }

    // Fallback to Murf.ai if iFlytek is not available
    // if (config.voiceKey && config.voiceKey.trim()) {
    //     try {
    //         console.log('Using Murf.ai API for high-quality text-to-speech...');
    //         const success = await convertWithMurfAI(text, outputPath);
    //         if (success) return true;
    //     } catch (error) {
    //         console.log('Murf.ai API failed, falling back to system TTS:', error.message);
    //     }
    // }

    // Fallback to system TTS
//     try {
//         // For macOS, use built-in say command with Chinese voice support
//         if (process.platform === 'darwin') {
//             try {
//                 // Check if text contains Chinese characters
//                 const containsChinese = /[\u4e00-\u9fff]/.test(text);
//                 let voice = 'Alex'; // Default English voice

//                 if (containsChinese) {
//                     // Use Chinese voice for Chinese text
//                     voice = 'Tingting'; // Chinese (China) voice
//                     console.log('Detected Chinese text, using Chinese voice...');
//                 }

//                 // Convert to AIFF format (native macOS say command format)
//                 const aiffPath = outputPath.replace(/\.(mp3|wav)$/, '.aiff');
//                 execSync(`say -v "${voice}" -o "${aiffPath}" "${text}"`, { stdio: 'inherit' });

//                 // Convert AIFF to MP3/WAV if needed (optional, requires ffmpeg)
//                 if (outputPath.endsWith('.mp3') || outputPath.endsWith('.wav')) {
//                     try {
//                         execSync(`ffmpeg -i "${aiffPath}" "${outputPath}" -y`, { stdio: 'inherit' });
//                         fs.unlinkSync(aiffPath); // Remove temporary AIFF file
//                         console.log(`Audio file created using macOS TTS (${voice}): ${outputPath}`);
//                     } catch (ffmpegError) {
//                         // If ffmpeg is not available, keep the AIFF file
//                         console.log(`Audio file created using macOS TTS (${voice}): ${aiffPath}`);
//                         console.log('Note: Install ffmpeg to convert to MP3/WAV format');
//                     }
//                 } else {
//                     console.log(`Audio file created using macOS TTS (${voice}): ${aiffPath}`);
//                 }
//                 return true;
//             } catch (error) {
//                 console.log('macOS say command failed, trying other options...');
//             }
//         }

//         // Clean text for PowerShell compatibility
//         const cleanText = text.replace(/'/g, "''").replace(/"/g, '""');

//         // Try using Windows built-in TTS
//         if (process.platform === 'win32') {
//             const powershellScript = `
// Add-Type -AssemblyName System.Speech
// $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
// $synth.SetOutputToWaveFile('${outputPath}')
// $synth.Speak('${cleanText}')
// $synth.Dispose()
// `;

//             const scriptPath = path.join(__dirname, 'temp_tts.ps1');
//             fs.writeFileSync(scriptPath, powershellScript);

//             execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { stdio: 'inherit' });

//             // Clean up temp script
//             fs.unlinkSync(scriptPath);

//             console.log(`Audio file created using Windows TTS: ${outputPath}`);
//             return true;
//         } else {
//             // For Linux systems, try using espeak or festival
//             try {
//                 execSync(`espeak "${text}" -w "${outputPath}"`, { stdio: 'inherit' });
//                 console.log(`Audio file created using espeak: ${outputPath}`);
//                 return true;
//             } catch (error) {
//                 console.log('espeak not available, trying festival...');
//                 const textFile = outputPath.replace('.wav', '.txt');
//                 fs.writeFileSync(textFile, text);
//                 execSync(`text2wave "${textFile}" -o "${outputPath}"`, { stdio: 'inherit' });
//                 fs.unlinkSync(textFile);
//                 console.log(`Audio file created using festival: ${outputPath}`);
//                 return true;
//             }
//         }
//     } catch (error) {
//         console.error('Error converting to audio:', error.message);
//         console.log('\nAlternative options:');
//         console.log('1. Install espeak: https://espeak.sourceforge.net/');
//         console.log('2. Use online TTS services like Google Text-to-Speech');
//         console.log('3. Use AI voice services like ElevenLabs or Murf.ai');
//         console.log('4. For Chinese TTS on macOS: Install Chinese voices in System Preferences > Accessibility > Spoken Content');

//         // Save text file as fallback
//          const textPath = outputPath.replace(/\.(wav|mp3)$/, '_audio_script.txt');
//          fs.writeFileSync(textPath, text);
//          console.log(`Audio script saved to: ${textPath}`);

//         return false;
//     }
}

/**
 * Convert text to speech using Murf.ai API
 * @param {string} text - Text to convert
 * @param {string} outputPath - Output audio file path
 * @returns {Promise<boolean>} - Success status
 */
async function convertWithMurfAI(text, outputPath) {
    try {
        // Split text into chunks if it's too long (Murf.ai has character limits)
        const maxChunkLength = 3000;
        const textChunks = splitTextIntoChunks(text, maxChunkLength);

        const audioBuffers = [];

        for (let i = 0; i < textChunks.length; i++) {
            const chunk = textChunks[i];
            console.log(`Processing chunk ${i + 1}/${textChunks.length} (${chunk.length} characters)`);

            const requestData = {
                text: chunk,
                voiceId: "en-US-charles", // Professional male voice
                format: "MP3",
                style: "Conversational",
                sampleRate: 44100,
                encodeAsBase64: true,
            };

            const requestConfig = {
                method: 'post',
                url: 'https://api.murf.ai/v1/speech/generate',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'api-key': config.voiceKey
                },
                data: requestData
                // Remove responseType to get JSON response with base64 data
            };

            const response = await axios(requestConfig);

            if (response.status === 200) {
                // response.data.encodedAudio is a base64 string for an MP3 file
                if (response.data && response.data.encodedAudio) {
                    const audioBuffer = Buffer.from(response.data.encodedAudio, 'base64');
                    audioBuffers.push(audioBuffer);
                    console.log(`✅ Chunk ${i + 1} converted successfully (${audioBuffer.length} bytes, ${response.data.audioLengthInSeconds}s)`);
                } else {
                    console.log('Response data keys:', Object.keys(response.data || {}));
                    throw new Error('No encodedAudio found in response');
                }

                // Add delay between requests to respect rate limits
                if (i < textChunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } else {
                throw new Error(`Murf.ai API returned status ${response.status}`);
            }
        }

        // Combine audio buffers if multiple chunks
        let finalAudioBuffer;
        if (audioBuffers.length === 1) {
            finalAudioBuffer = audioBuffers[0];
        } else {
             // For multiple chunks, we'll save them separately and mention this
             console.log(`Note: Text was split into ${audioBuffers.length} audio files due to length`);
             for (let i = 0; i < audioBuffers.length; i++) {
                 const chunkPath = outputPath.replace('.mp3', `_part${i + 1}.mp3`);
                 fs.writeFileSync(chunkPath, audioBuffers[i]);
                 console.log(`Audio chunk saved: ${chunkPath}`);
             }
             finalAudioBuffer = audioBuffers[0]; // Use first chunk as main file
         }

         // Save the audio file
         fs.writeFileSync(outputPath, finalAudioBuffer);
         console.log(`🎵 High-quality MP3 audio created with Murf.ai: ${outputPath}`);

        return true;

    } catch (error) {
        if (error.response) {
            console.error('Murf.ai API Error:', error.response.status, error.response.statusText);
            if (error.response.data) {
                console.error('Error details:', error.response.data.toString());
            }
        } else {
            console.error('Murf.ai API Error:', error.message);
        }
        throw error;
    }
}

/**
 * Split text into chunks for API processing
 * @param {string} text - Text to split
 * @param {number} maxLength - Maximum length per chunk
 * @returns {Array<string>} - Array of text chunks
 */
function splitTextIntoChunks(text, maxLength) {
    if (text.length <= maxLength) {
        return [text];
    }

    const chunks = [];
    let currentChunk = '';

    // Split by sentences to maintain natural breaks
    const sentences = text.split(/(?<=[.!?])\s+/);

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length <= maxLength) {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = sentence;
            } else {
                // If single sentence is too long, split by words
                const words = sentence.split(' ');
                let wordChunk = '';
                for (const word of words) {
                    if (wordChunk.length + word.length <= maxLength) {
                        wordChunk += (wordChunk ? ' ' : '') + word;
                    } else {
                        if (wordChunk) chunks.push(wordChunk);
                        wordChunk = word;
                    }
                }
                if (wordChunk) currentChunk = wordChunk;
            }
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

/**
 * Scrape news from multiple websites (embedded functionality)
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
        // Reddit and Telegram options
        includeReddit: options.includeReddit !== false && (config.reddit?.enabled !== false), // Default to true if enabled in config
        includeTelegram: options.includeTelegram !== false && (config.telegram?.enabled !== false), // Default to true if enabled in config
        redditSubreddits: options.redditSubreddits || config.reddit?.subreddits || ['dubai', 'UAE', 'worldnews'],
        telegramChannels: options.telegramChannels || config.telegram?.channels || ['dubaionline', 'gulfnewsUAE', 'livemint'],
        redditLimit: options.redditLimit || config.reddit?.limit || 15,
        telegramLimit: options.telegramLimit || config.telegram?.limit || 20,
        ...options
    };

    const results = {
        totalWebsites: urls.length,
        totalSources: urls.length + (mergedOptions.includeReddit ? mergedOptions.redditSubreddits.length : 0) + (mergedOptions.includeTelegram ? mergedOptions.telegramChannels.length : 0),
        scrapedAt: new Date().toISOString(),
        websites: [],
        reddit: [],
        telegram: [],
        allArticles: []
    };

    for (const url of urls) {
        try {
            console.log(`\nScraping: ${url}`);
            const articles = await scrapeTopNews(url, { ...mergedOptions, saveToFile: false });

            // If no articles found, try alternative method
            let finalArticles = articles;
            let fallbackUsed = false;

            if (articles.length === 0) {
                console.log(`No articles found with primary method, trying alternative approach for ${url}...`);
                try {
                    const alternativeArticles = await scrapeWithAlternativeMethod(url, mergedOptions);
                    if (alternativeArticles.length > 0) {
                        finalArticles = alternativeArticles;
                        fallbackUsed = true;
                        console.log(`Alternative method found ${alternativeArticles.length} articles from ${url}`);
                    }
                } catch (altError) {
                    console.warn(`Alternative scraping also failed for ${url}:`, altError.message);
                }
            }

            const websiteData = {
                url: url,
                domain: new URL(url).hostname,
                success: true,
                articleCount: finalArticles.length,
                articles: finalArticles,
                fallbackUsed: fallbackUsed
            };

            results.websites.push(websiteData);
            results.allArticles.push(...finalArticles);

            // Add delay between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, mergedOptions.delayBetweenRequests));

        } catch (error) {
            console.error(`Error scraping ${url}:`, error.message);

            // Try alternative method for specific errors like socket hang up
            let finalArticles = [];
            let fallbackUsed = false;

            if (error.message.includes('socket hang up') ||
                error.message.includes('net::ERR_') ||
                error.message.includes('timeout') ||
                error.message.includes('ECONNRESET')) {

                console.log(`Connection error detected for ${url}, trying alternative HTTP method...`);
                try {
                    const alternativeArticles = await scrapeWithAlternativeMethod(url, mergedOptions);
                    if (alternativeArticles.length > 0) {
                        finalArticles = alternativeArticles;
                        fallbackUsed = true;
                        console.log(`✅ Alternative method successfully found ${alternativeArticles.length} articles from ${url}`);
                    }
                } catch (altError) {
                    console.warn(`Alternative scraping also failed for ${url}:`, altError.message);
                }
            }

            const websiteData = {
                url: url,
                domain: new URL(url).hostname,
                success: finalArticles.length > 0,
                error: finalArticles.length > 0 ? undefined : error.message,
                articleCount: finalArticles.length,
                articles: finalArticles,
                fallbackUsed: fallbackUsed
            };

            results.websites.push(websiteData);
            if (finalArticles.length > 0) {
                results.allArticles.push(...finalArticles);
            }
        }
    }

    // Scrape Reddit subreddits if enabled
    if (mergedOptions.includeReddit) {
        console.log('\n🔴 Starting Reddit integration...');
        for (const subreddit of mergedOptions.redditSubreddits) {
            try {
                const redditPosts = await scrapeRedditPosts({
                    subreddit: subreddit,
                    limit: mergedOptions.redditLimit,
                    sort: 'hot' // Can be made configurable
                });

                const redditData = {
                    subreddit: subreddit,
                    success: true,
                    articleCount: redditPosts.length,
                    articles: redditPosts,
                    source: 'reddit'
                };

                results.reddit.push(redditData);
                results.allArticles.push(...redditPosts);

                console.log(`✅ Reddit r/${subreddit}: ${redditPosts.length} posts`);

                // Add delay between subreddit requests
                await new Promise(resolve => setTimeout(resolve, mergedOptions.delayBetweenRequests));

            } catch (error) {
                console.error(`❌ Error scraping Reddit r/${subreddit}:`, error.message);

                const redditData = {
                    subreddit: subreddit,
                    success: false,
                    error: error.message,
                    articleCount: 0,
                    articles: [],
                    source: 'reddit'
                };

                results.reddit.push(redditData);
            }
        }
    }

    // Scrape Telegram channels if enabled
    if (mergedOptions.includeTelegram) {
        console.log('\n📱 Starting Telegram integration...');
        for (const channel of mergedOptions.telegramChannels) {
            try {
                const telegramMessages = await scrapeTelegramMessages({
                    channel: channel,
                    limit: mergedOptions.telegramLimit
                });

                const telegramData = {
                    channel: channel,
                    success: true,
                    articleCount: telegramMessages.length,
                    articles: telegramMessages,
                    source: 'telegram'
                };

                results.telegram.push(telegramData);
                results.allArticles.push(...telegramMessages);

                console.log(`✅ Telegram @${channel}: ${telegramMessages.length} messages`);

                // Add delay between channel requests
                await new Promise(resolve => setTimeout(resolve, mergedOptions.delayBetweenRequests));

            } catch (error) {
                console.error(`❌ Error scraping Telegram @${channel}:`, error.message);

                const telegramData = {
                    channel: channel,
                    success: false,
                    error: error.message,
                    articleCount: 0,
                    articles: [],
                    source: 'telegram'
                };

                results.telegram.push(telegramData);
            }
        }
    }

    // Update summary statistics
    const successfulWebsites = results.websites.filter(w => w.success).length;
    const successfulReddit = results.reddit.filter(r => r.success).length;
    const successfulTelegram = results.telegram.filter(t => t.success).length;

    console.log('\n📊 Scraping Summary:');
    console.log(`   Websites: ${successfulWebsites}/${results.websites.length} successful`);
    if (mergedOptions.includeReddit) {
        console.log(`   Reddit: ${successfulReddit}/${results.reddit.length} subreddits successful`);
    }
    if (mergedOptions.includeTelegram) {
        console.log(`   Telegram: ${successfulTelegram}/${results.telegram.length} channels successful`);
    }
    console.log(`   Total articles: ${results.allArticles.length}`);

    return results;
}

/**
 * Alternative scraping method using HTTP requests instead of browser automation
 * This method is used as a fallback when Puppeteer fails due to connection issues
 * like socket hang up, timeouts, or network errors.
 *
 * @param {string} url - The URL to scrape
 * @param {Object} options - Scraping options
 * @param {number} options.maxNews - Maximum number of articles to extract (default: 10)
 * @returns {Promise<Array>} - Array of news articles with title, link, summary, image, scrapedAt, and method
 * @throws {Error} - Throws error if HTTP request fails and fallback creation fails
 */
async function scrapeWithAlternativeMethod(url, options = {}) {
    const { maxNews = 10 } = options;

    try {
        console.log(`Using HTTP-based scraping for ${url}`);

        // Use axios to fetch the HTML content
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

        const html = response.data;
        const articles = [];

        // Simple regex-based extraction for news titles
        const titlePatterns = [
            /<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi,
            /<[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)/gi,
            /<[^>]*class="[^"]*headline[^"]*"[^>]*>([^<]+)/gi
            // Removed: /<title>([^<]+)<\/title>/gi - this captures page titles
        ];

        const foundTitles = new Set();

        for (const pattern of titlePatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null && articles.length < maxNews) {
                const title = match[1]?.trim().replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');

                if (title &&
                    title.length > 20 &&
                    title.length < 200 &&
                    !title.toLowerCase().includes('cookie') &&
                    !title.toLowerCase().includes('subscribe') &&
                    !title.toLowerCase().includes('menu') &&
                    !title.toLowerCase().includes('javascript') &&
                    !title.toLowerCase().includes('dubai news') &&
                    !title.toLowerCase().includes('uae news') &&
                    !title.toLowerCase().includes('gulf news') &&
                    !title.toLowerCase().includes('latest news') &&
                    !title.toLowerCase().includes('arab news') &&
                    !title.toLowerCase().includes('breaking news') &&
                    !(title.includes(' - ') && title.split(' - ').length > 2) &&
                    !foundTitles.has(title.toLowerCase())) {

                    foundTitles.add(title.toLowerCase());
                    articles.push({
                        title: title,
                        link: url,
                        summary: '',
                        image: '',
                        scrapedAt: new Date().toISOString(),
                        method: 'http-regex'
                    });
                }
            }
        }

        // If still no articles, try to extract from meta tags
         if (articles.length === 0) {
             const metaPatterns = [
                 /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/gi,
                 /<meta[^>]*name="title"[^>]*content="([^"]+)"/gi,
                 /<meta[^>]*property="twitter:title"[^>]*content="([^"]+)"/gi
             ];

            for (const pattern of metaPatterns) {
                let match;
                while ((match = pattern.exec(html)) !== null && articles.length < 3) {
                    const title = match[1]?.trim().replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');

                    if (title &&
                        title.length > 20 &&
                        title.length < 200 &&
                        !title.toLowerCase().includes('cookie') &&
                        !title.toLowerCase().includes('subscribe') &&
                        !title.toLowerCase().includes('menu') &&
                        !title.toLowerCase().includes('javascript') &&
                        !title.toLowerCase().includes('dubai news') &&
                        !title.toLowerCase().includes('uae news') &&
                        !title.toLowerCase().includes('gulf news') &&
                        !title.toLowerCase().includes('latest news') &&
                        !title.toLowerCase().includes('arab news') &&
                        !title.toLowerCase().includes('breaking news') &&
                        !(title.includes(' - ') && title.split(' - ').length > 2) &&
                        !foundTitles.has(title.toLowerCase())) {
                        foundTitles.add(title.toLowerCase());
                        articles.push({
                            title: title,
                            link: url,
                            summary: '',
                            image: '',
                            scrapedAt: new Date().toISOString(),
                            method: 'meta-tags'
                        });
                    }
                }
            }
        }

        console.log(`HTTP-based method found ${articles.length} articles from ${url}`);
        return articles.slice(0, maxNews);

    } catch (error) {
        console.error('HTTP-based scraping method failed:', error.message);

        // Final fallback: create a generic news item
        const domain = new URL(url).hostname;
        return [{
            title: `Latest news from ${domain}`,
            link: url,
            summary: `Unable to fetch specific articles from ${domain} due to technical restrictions.`,
            image: '',
            scrapedAt: new Date().toISOString(),
            method: 'fallback'
        }];
    }
}

/**
 * Scrape top news from a webpage (embedded functionality)
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
        saveToFile = false
    } = options;

    let browser;
    try {
        console.log(`Scraping top news from: ${url}`);

        // Launch browser with optimized settings
        browser = await puppeteer.launch({
            headless: 'new',
            timeout: 30000, // 30 second timeout for browser launch
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        });

        const page = await browser.newPage();

        // Set page timeout
        page.setDefaultTimeout(30000);
        page.setDefaultNavigationTimeout(30000);

        // Set viewport
        await page.setViewport({ width, height });

        // Set user agent to avoid bot detection
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navigate to the page with retry logic
        let retries = 3;
        while (retries > 0) {
            try {
                await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
                break; // Success, exit retry loop
            } catch (navError) {
                retries--;
                if (retries === 0) {
                    throw navError; // Re-throw if all retries failed
                }
                console.warn(`Navigation failed, retrying... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            }
        }

        // Wait for additional time if specified
        if (waitFor > 0) {
            await new Promise(resolve => setTimeout(resolve, waitFor));
        }

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
                'h1, h2, h3',
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

                    // Only add if we have a meaningful title
                    if (title && title.length > 10 && !title.toLowerCase().includes('cookie') && !title.toLowerCase().includes('subscribe')) {
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

        return newsArticles;

    } catch (error) {
        console.error('Error scraping news:', error.message || error);
        return [];
    } finally {
        if (browser) {
            try {
                // Close all pages first
                const pages = await browser.pages();
                await Promise.all(pages.map(page => page.close().catch(() => {})));

                // Then close the browser
                await browser.close();
            } catch (closeError) {
                console.warn('Warning: Error closing browser:', closeError.message);
                // Force kill the browser process if normal close fails
                try {
                    await browser.process()?.kill('SIGKILL');
                } catch (killError) {
                    // Ignore kill errors
                }
            }
        }
    }
}

/**
 * Main function to scrape news and convert to audio
 * @param {Object} options - Options for scraping and audio generation
 */
async function generateNewsAudio(options = {}) {
    try {
        console.log('Starting news scraping and audio generation...');

        // Scrape news from all configured websites
        const newsData = await scrapeMultipleNews({
            saveToFile: false, // We'll handle file saving ourselves
            ...options
        });

        console.log(`\nScraped ${newsData.totalWebsites} websites with ${newsData.allArticles.length} total articles`);

        // Generate audio-ready summary (original and translated)
        const summaryResult = await generateAudioSummary(newsData);

        // Create timestamp for file naming
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // Save the complete news data
        const jsonPath = path.join(newsDir, `news_audio_${timestamp}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(newsData, null, 2));
        console.log(`News data saved: ${jsonPath}`);

        // Save the original English summary
        const originalSummaryPath = path.join(newsDir, `news_summary_original_${timestamp}.txt`);
        fs.writeFileSync(originalSummaryPath, summaryResult.original);
        console.log(`Original summary saved: ${originalSummaryPath}`);

        // Save the translated Chinese summary
        const translatedSummaryPath = path.join(newsDir, `news_summary_${timestamp}.txt`);
        fs.writeFileSync(translatedSummaryPath, summaryResult.translated);
        console.log(`Translated summary saved: ${translatedSummaryPath}`);

        // Convert to audio using the translated summary
         const audioPath = path.join(newsDir, `news_audio_${timestamp}.mp3`);
         const audioSuccess = await convertToAudio(summaryResult.translated, audioPath);

        if (audioSuccess) {
            console.log('\n✅ News audio generation completed successfully!');
            console.log(`📄 Original Summary: ${originalSummaryPath}`);
            console.log(`📄 Translated Summary: ${translatedSummaryPath}`);
            console.log(`🔊 Audio: ${audioPath}`);
        } else {
            console.log('\n⚠️  Audio generation failed, but text summaries are available.');
            console.log(`📄 Original Summary: ${originalSummaryPath}`);
            console.log(`📄 Translated Summary: ${translatedSummaryPath}`);
        }

        return {
            success: true,
            newsData,
            originalSummaryPath,
            translatedSummaryPath,
            audioPath: audioSuccess ? audioPath : null,
            summaryResult
        };

    } catch (error) {
        console.error('Error in news audio generation:', error);
        throw error;
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].replace('--', '');
            const value = args[i + 1];

            if (key === 'maxNews') {
                options[key] = parseInt(value);
            } else if (key === 'help') {
                console.log('News to Audio Generator');
                console.log('Usage: node news-to-audio.js [options]');
                console.log('');
                console.log('Options:');
                console.log('  --maxNews <number>    Maximum number of news articles per site (default: from config)');
                console.log('  --help               Show this help message');
                console.log('');
                console.log('Examples:');
                console.log('  node news-to-audio.js');
                console.log('  node news-to-audio.js --maxNews 5');
                console.log('  npm run audio');
                console.log('  npm run setup-tts    # Setup TTS dependencies');
                process.exit(0);
            } else {
                options[key] = value;
            }
            i++; // Skip the value
        }
    }

    // Run the news audio generation
    generateNewsAudio(options)
        .then(result => {
            console.log('\n🎉 Process completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Error:', error.message);
            process.exit(1);
        });
}

module.exports = {
    generateNewsAudio,
    generateAudioSummary,
    convertToAudio,
    convertWithMurfAI,
    splitTextIntoChunks,
    cleanTextForAudio,
    scrapeMultipleNews,
    scrapeTopNews,
    scrapeRedditPosts,
    scrapeTelegramMessages
};

// Also export iFlytek TTS functions if available
try {
    const { convertWithIFlytekTTS, IFlytekTTS } = require('./iflytek-tts.js');
    module.exports.convertWithIFlytekTTS = convertWithIFlytekTTS;
    module.exports.IFlytekTTS = IFlytekTTS;
} catch (error) {
    // iFlytek TTS module not available
    console.log('iFlytek TTS module not loaded:', error.message);
}