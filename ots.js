
/**
 * iFlytek OTS (Online Translation Service) Integration
 * Provides high-quality translation using iFlytek's API
 * Can be integrated with the news-to-audio project
 */

const CryptoJS = require('crypto-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Load configuration from config.json
 */
function loadConfig() {
    try {
        const configPath = path.join(__dirname, 'config', 'config.json');
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return configData.ots;
    } catch (error) {
        console.error('Error loading config.json:', error.message);
        // Fallback to default config if file doesn't exist
        return {
            hostUrl: "https://ntrans.xfyun.cn/v2/ots",
            host: "ntrans.xfyun.cn",
            appid: "",
            apiSecret: "",
            apiKey: "",
            uri: "/v2/ots"
        };
    }
}

/**
 * iFlytek OTS Configuration
 * Loaded from config/config.json
 */
const config = loadConfig();

/**
 * iFlytek OTS Translator Class
 */
class IFlytekOTSTranslator {
    constructor(customConfig = {}) {
        this.config = { ...config, ...customConfig };
    }

    /**
     * Generate POST body for translation request
     * @param {string} text - Text to translate
     * @param {string} from - Source language code
     * @param {string} to - Target language code
     * @returns {Object} - Request body object
     */
    getPostBody(text, from, to) {
        return {
            common: {
                app_id: this.config.appid
            },
            business: {
                from: from,
                to: to
            },
            data: {
                text: CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text))
            }
        };
    }

    /**
     * Generate digest for request authentication
     * @param {Object} body - Request body
     * @returns {string} - SHA-256 digest
     */
    getDigest(body) {
        return 'SHA-256=' + CryptoJS.enc.Base64.stringify(CryptoJS.SHA256(JSON.stringify(body)));
    }

    /**
     * Generate authorization string
     * @param {string} date - RFC1123 format date
     * @param {string} digest - Request digest
     * @returns {string} - Authorization header value
     */
    getAuthStr(date, digest) {
        const signatureOrigin = `host: ${this.config.host}\ndate: ${date}\nPOST ${this.config.uri} HTTP/1.1\ndigest: ${digest}`;
        const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, this.config.apiSecret);
        const signature = CryptoJS.enc.Base64.stringify(signatureSha);
        const authorizationOrigin = `api_key="${this.config.apiKey}", algorithm="hmac-sha256", headers="host date request-line digest", signature="${signature}"`;
        return authorizationOrigin;
    }

    /**
     * Translate text using iFlytek OTS API
     * @param {string} text - Text to translate
     * @param {string} from - Source language (default: 'en')
     * @param {string} to - Target language (default: 'cn')
     * @returns {Promise<Object>} - Translation result
     */
    async translate(text, from = 'en', to = 'cn') {
        try {
            console.log(`🔄 Translating with iFlytek OTS: ${from} → ${to}`);
            console.log(`📝 Text length: ${text.length} characters`);

            // Validate input
            if (!text || text.trim().length === 0) {
                throw new Error('Text cannot be empty');
            }

            if (text.length > 5000) {
                console.log('⚠️  Text too long, splitting into chunks...');
                return await this.translateLongText(text, from, to);
            }

            // Generate request components
            const date = new Date().toUTCString();
            const postBody = this.getPostBody(text, from, to);
            const digest = this.getDigest(postBody);

            // Prepare request options
            const options = {
                method: 'POST',
                url: this.config.hostUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json,version=1.0',
                    'Host': this.config.host,
                    'Date': date,
                    'Digest': digest,
                    'Authorization': this.getAuthStr(date, digest)
                },
                data: postBody,
                timeout: 30000 // 30 second timeout
            };

            // Make the request
            const response = await axios(options);
            const body = response.data;

            // Log success without exposing sensitive data
            console.log('✅ iFlytek API request completed successfully');
            console.log(`📊 Response status: ${response.status}, Session ID: ${body.sid || 'N/A'}`);

            // Check for API errors
            if (body.code !== 0) {
                throw new Error(`iFlytek API Error: ${body.code} - ${body.message}`);
            }

            // Extract translation result
            const result = {
                success: true,
                original: body.data.result.trans_result.src,
                translated: body.data.result.trans_result.dst,
                from: body.data.result.from,
                to: body.data.result.to,
                sid: body.sid,
                provider: 'iflytek-ots'
            };

            console.log('✅ iFlytek translation completed successfully');
            console.log(`📤 Original [${result.from}]: ${result.original.substring(0, 100)}...`);
            console.log(`📥 Translated [${result.to}]: ${result.translated.substring(0, 100)}...`);

            return result;

        } catch (error) {
            console.error('❌ iFlytek translation failed:', error.message);

            return {
                success: false,
                error: error.message,
                original: text,
                translated: text, // Fallback to original text
                provider: 'iflytek-ots'
            };
        }
    }

    /**
     * Translate long text by splitting into chunks
     * @param {string} text - Long text to translate
     * @param {string} from - Source language
     * @param {string} to - Target language
     * @returns {Promise<Object>} - Combined translation result
     */
    async translateLongText(text, from, to) {
        const maxChunkSize = 4000;
        const sentences = text.split(/[.!?。！？]\s*/);
        const chunks = [];
        let currentChunk = '';

        // Group sentences into chunks
        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > maxChunkSize) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }
            }
            currentChunk += sentence + '. ';
        }

        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        console.log(`📄 Splitting text into ${chunks.length} chunks`);

        // Translate each chunk
        const translatedChunks = [];
        for (let i = 0; i < chunks.length; i++) {
            console.log(`🔄 Translating chunk ${i + 1}/${chunks.length}`);

            const result = await this.translate(chunks[i], from, to);
            if (result.success) {
                translatedChunks.push(result.translated);
            } else {
                translatedChunks.push(chunks[i]); // Fallback to original
            }

            // Add delay between requests to respect rate limits
            if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return {
            success: true,
            original: text,
            translated: translatedChunks.join(' '),
            from: from,
            to: to,
            chunks: chunks.length,
            provider: 'iflytek-ots'
        };
    }

    /**
     * Get supported language pairs
     * @returns {Object} - Supported language mappings
     */
    getSupportedLanguages() {
        return {
            'en': 'English',
            'cn': 'Chinese (Simplified)',
            'ja': 'Japanese',
            'ko': 'Korean',
            'es': 'Spanish',
            'fr': 'French',
            'th': 'Thai',
            'ar': 'Arabic',
            'ru': 'Russian',
            'pt': 'Portuguese',
            'de': 'German',
            'it': 'Italian',
            'tr': 'Turkish',
            'vi': 'Vietnamese',
            'ms': 'Malay',
            'id': 'Indonesian'
        };
    }

    /**
     * Test the translation service
     * @returns {Promise<boolean>} - Test result
     */
    async testConnection() {
        console.log('🧪 Testing iFlytek OTS connection...');

        const testText = "Hello, this is a test message for translation service.";
        const result = await this.translate(testText, 'en', 'cn');

        if (result.success) {
            console.log('✅ iFlytek OTS connection test successful');
            return true;
        } else {
            console.log('❌ iFlytek OTS connection test failed');
            return false;
        }
    }
}

/**
 * Integration function for news-to-audio project
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language (default: 'cn')
 * @returns {Promise<string>} - Translated text
 */
async function translateForNewsAudio(text, targetLang = 'cn') {
    const translator = new IFlytekOTSTranslator();

    try {
        const result = await translator.translate(text, 'en', targetLang);
        return result.success ? result.translated : text;
    } catch (error) {
        console.error('Translation integration failed:', error.message);
        return text; // Return original text as fallback
    }
}

/**
 * Enhanced translation function with multiple fallbacks
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language
 * @returns {Promise<string>} - Translated text
 */
async function translateWithFallback(text, targetLang = 'cn') {
    console.log('🚀 Starting translation with iFlytek OTS...');

    // Try iFlytek OTS first
    try {
        const translator = new IFlytekOTSTranslator();
        const result = await translator.translate(text, 'en', targetLang);

        if (result.success) {
            console.log('✅ iFlytek OTS translation successful');
            return result.translated;
        }
    } catch (error) {
        console.log('⚠️  iFlytek OTS failed, trying fallback...');
    }

    // Fallback to translatte library
    try {
        const translatte = require('translatte');
        const result = await translatte(text, { to: targetLang === 'cn' ? 'zh' : targetLang });
        console.log('✅ Fallback translation successful');
        return result.text;
    } catch (error) {
        console.error('❌ All translation methods failed:', error.message);
        return text; // Return original text
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';

    const translator = new IFlytekOTSTranslator();

    switch (command) {
        case 'test':
            translator.testConnection()
                .then(success => {
                    process.exit(success ? 0 : 1);
                })
                .catch(error => {
                    console.error('Test failed:', error.message);
                    process.exit(1);
                });
            break;

        case 'translate':
            const text = args[1];
            const from = args[2] || 'en';
            const to = args[3] || 'cn';

            if (!text) {
                console.error('❌ Please provide text to translate');
                console.log('Usage: node ots.js translate "Your text here" [from] [to]');
                process.exit(1);
            }

            translator.translate(text, from, to)
                .then(result => {
                    if (result.success) {
                        console.log('\n📊 Translation Result:');
                        console.log(`Original [${result.from}]: ${result.original}`);
                        console.log(`Translated [${result.to}]: ${result.translated}`);
                        console.log(`Session ID: ${result.sid}`);
                    } else {
                        console.error('Translation failed:', result.error);
                        process.exit(1);
                    }
                })
                .catch(error => {
                    console.error('Translation failed:', error.message);
                    process.exit(1);
                });
            break;

        case 'languages':
            console.log('\n🌐 Supported Languages:');
            const languages = translator.getSupportedLanguages();
            Object.entries(languages).forEach(([code, name]) => {
                console.log(`  ${code}: ${name}`);
            });
            break;

        case 'help':
        default:
            console.log(`
🚀 iFlytek OTS Translation Service

Usage:
  node ots.js <command> [options]

Commands:
  test                           Test connection to iFlytek OTS
  translate "text" [from] [to]    Translate text (default: en → cn)
  languages                      Show supported languages
  help                          Show this help message

Examples:
  node ots.js test
  node ots.js translate "Hello world" en cn
  node ots.js translate "你好世界" cn en
  node ots.js languages

Configuration:
  Edit the config object in this file with your iFlytek credentials:
  - appid: Your application ID
  - apiSecret: Your API secret
  - apiKey: Your API key

Integration:
  const { translateForNewsAudio } = require('./ots.js');
  const translated = await translateForNewsAudio('Your text here');
`);
            break;
    }
}

module.exports = {
    IFlytekOTSTranslator,
    translateForNewsAudio,
    translateWithFallback,
    config
};