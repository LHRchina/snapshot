const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer');
const axios = require('axios');

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

// Create news data directory if it doesn't exist
const newsDir = path.join(__dirname, 'news_data');
if (!fs.existsSync(newsDir)) {
    fs.mkdirSync(newsDir, { recursive: true });
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
 * @returns {string} - Audio-ready summary
 */
function generateAudioSummary(newsData) {
    const timestamp = new Date(newsData.scrapedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    let summary = `News Summary for ${timestamp}. `;
    summary += `Today we have ${newsData.totalWebsites} websites with a total of ${newsData.allArticles.length} articles. `;

    // Group articles by topic/keywords for better organization
    const topicGroups = groupArticlesByTopic(newsData.allArticles);
    
    // Add breaking news section
    const breakingNews = identifyBreakingNews(newsData.allArticles);
    if (breakingNews.length > 0) {
        summary += 'Breaking News: ';
        breakingNews.forEach((article, index) => {
            summary += `${cleanTextForAudio(article.title)}. `;
            if (article.summary && article.summary.trim()) {
                summary += `${cleanTextForAudio(article.summary)}. `;
            }
        });
    }

    // Add main topics
    Object.entries(topicGroups).forEach(([topic, articles]) => {
        if (articles.length > 1) {
            summary += `In ${topic} news: `;
            articles.slice(0, 3).forEach(article => {
                summary += `${cleanTextForAudio(article.title)}. `;
            });
        }
    });

    // Add website-specific highlights
    newsData.websites.forEach(website => {
        if (website.success && website.articles.length > 0) {
            const domain = website.domain.replace('www.', '');
            summary += `From ${domain}: `;
            
            // Get top 2 articles from each website
            website.articles.slice(0, 2).forEach(article => {
                summary += `${cleanTextForAudio(article.title)}. `;
            });
        }
    });

    summary += 'This concludes today\'s news summary. Thank you for listening.';
    
    return summary;
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
    // Try Murf.ai API first if voiceKey is available
    if (config.voiceKey && config.voiceKey.trim()) {
        try {
            console.log('Using Murf.ai API for high-quality text-to-speech...');
            const success = await convertWithMurfAI(text, outputPath);
            if (success) return true;
        } catch (error) {
            console.log('Murf.ai API failed, falling back to system TTS:', error.message);
        }
    }
    
    // Fallback to system TTS
    try {
        // Clean text for PowerShell compatibility
        const cleanText = text.replace(/'/g, "''").replace(/"/g, '""');
        
        // Try using Windows built-in TTS first
        if (process.platform === 'win32') {
            const powershellScript = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile('${outputPath}')
$synth.Speak('${cleanText}')
$synth.Dispose()
`;
            
            const scriptPath = path.join(__dirname, 'temp_tts.ps1');
            fs.writeFileSync(scriptPath, powershellScript);
            
            execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { stdio: 'inherit' });
            
            // Clean up temp script
            fs.unlinkSync(scriptPath);
            
            console.log(`Audio file created using Windows TTS: ${outputPath}`);
            return true;
        } else {
            // For non-Windows systems, try using espeak or festival
            try {
                execSync(`espeak "${text}" -w "${outputPath}"`, { stdio: 'inherit' });
                console.log(`Audio file created using espeak: ${outputPath}`);
                return true;
            } catch (error) {
                console.log('espeak not available, trying festival...');
                const textFile = outputPath.replace('.wav', '.txt');
                fs.writeFileSync(textFile, text);
                execSync(`text2wave "${textFile}" -o "${outputPath}"`, { stdio: 'inherit' });
                fs.unlinkSync(textFile);
                console.log(`Audio file created using festival: ${outputPath}`);
                return true;
            }
        }
    } catch (error) {
        console.error('Error converting to audio:', error.message);
        console.log('\nAlternative options:');
        console.log('1. Install espeak: https://espeak.sourceforge.net/');
        console.log('2. Use online TTS services like Google Text-to-Speech');
        console.log('3. Use AI voice services like ElevenLabs or Murf.ai');
        
        // Save text file as fallback
         const textPath = outputPath.replace(/\.(wav|mp3)$/, '_audio_script.txt');
         fs.writeFileSync(textPath, text);
         console.log(`Audio script saved to: ${textPath}`);
        
        return false;
    }
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

    return results;
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
        console.error('Error scraping news:', error);
        return [];
    } finally {
        if (browser) {
            await browser.close();
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
        
        // Generate audio-ready summary
        const audioSummary = generateAudioSummary(newsData);
        
        // Create timestamp for file naming
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Save the complete news data
        const jsonPath = path.join(newsDir, `news_audio_${timestamp}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(newsData, null, 2));
        console.log(`News data saved: ${jsonPath}`);
        
        // Save the audio summary text
        const summaryPath = path.join(newsDir, `news_summary_${timestamp}.txt`);
        fs.writeFileSync(summaryPath, audioSummary);
        console.log(`Audio summary saved: ${summaryPath}`);
        
        // Convert to audio
         const audioPath = path.join(newsDir, `news_audio_${timestamp}.mp3`);
         const audioSuccess = await convertToAudio(audioSummary, audioPath);
        
        if (audioSuccess) {
            console.log('\n✅ News audio generation completed successfully!');
            console.log(`📄 Summary: ${summaryPath}`);
            console.log(`🔊 Audio: ${audioPath}`);
        } else {
            console.log('\n⚠️  Audio generation failed, but text summary is available.');
            console.log(`📄 Summary: ${summaryPath}`);
        }
        
        return {
            success: true,
            newsData,
            summaryPath,
            audioPath: audioSuccess ? audioPath : null,
            audioSummary
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
    scrapeTopNews
};