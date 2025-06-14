#!/usr/bin/env node

/**
 * Enhanced Translation and TTS Implementation
 * Demonstrates integration of premium and free translation/TTS services
 * with automatic fallback mechanisms
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const translatte = require('translatte');
const { execSync } = require('child_process');

// Configuration for enhanced services
const enhancedConfig = {
    translation: {
        provider: process.env.TRANSLATION_PROVIDER || 'free', // 'deepl', 'google', 'azure', 'free'
        apiKey: process.env.TRANSLATION_API_KEY || '',
        region: process.env.TRANSLATION_REGION || 'eastus',
        fallback: 'free'
    },
    tts: {
        provider: process.env.TTS_PROVIDER || 'system', // 'elevenlabs', 'azure', 'google', 'system'
        apiKey: process.env.TTS_API_KEY || '',
        voice: process.env.TTS_VOICE || 'pNInz6obpgDQGcFmaJgB',
        fallback: 'system'
    }
};

/**
 * Enhanced Free Translator with improved logic
 */
class ImprovedFreeTranslator {
    async translateWithRetry(text, targetLang = 'zh', maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                console.log(`🔄 Translation attempt ${i + 1}/${maxRetries}...`);
                
                // Pre-process text for better translation
                const cleanText = this.preprocessText(text);
                
                const result = await translatte(cleanText, {
                    to: targetLang,
                    from: 'auto',
                    raw: false,
                    domain: 'translate.google.com',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
                    }
                });
                
                const finalText = this.postprocessText(result.text);
                console.log('✅ Free translation completed successfully');
                return finalText;
                
            } catch (error) {
                console.log(`⚠️  Translation attempt ${i + 1} failed:`, error.message);
                if (i === maxRetries - 1) {
                    console.log('❌ All translation attempts failed, returning original text');
                    return text;
                }
                await this.delay(1000 * (i + 1)); // Exponential backoff
            }
        }
    }

    preprocessText(text) {
        // Clean and prepare text for better translation
        return text
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Fix sentence spacing
            .replace(/\n+/g, '. ') // Convert newlines to periods
            .trim();
    }

    postprocessText(text) {
        // Fix common translation issues
        return text
            .replace(/\s+([,.!?])/g, '$1') // Fix punctuation spacing
            .replace(/([。！？])\s*([\u4e00-\u9fff])/g, '$1$2') // Fix Chinese punctuation
            .replace(/\s+/g, ' ') // Normalize spacing
            .trim();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * DeepL Translator (Premium)
 */
class DeepLTranslator {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api-free.deepl.com/v2'; // Use api.deepl.com for paid plans
    }

    async translateNews(text, targetLang = 'zh') {
        try {
            console.log('🚀 Using DeepL API for translation...');
            
            const response = await axios({
                method: 'POST',
                url: `${this.baseUrl}/translate`,
                headers: {
                    'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: new URLSearchParams({
                    text: text,
                    target_lang: targetLang.toUpperCase(),
                    formality: 'default',
                    split_sentences: 'nonewlines',
                    preserve_formatting: '1'
                })
            });

            const translatedText = response.data.translations[0].text;
            console.log('✅ DeepL translation completed successfully');
            return translatedText;
            
        } catch (error) {
            console.error('❌ DeepL translation failed:', error.message);
            throw error;
        }
    }

    async getUsage() {
        try {
            const response = await axios({
                method: 'GET',
                url: `${this.baseUrl}/usage`,
                headers: {
                    'Authorization': `DeepL-Auth-Key ${this.apiKey}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Failed to get DeepL usage:', error.message);
            return null;
        }
    }
}

/**
 * ElevenLabs TTS (Premium)
 */
class ElevenLabsTTS {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.elevenlabs.io/v1';
    }

    async generateSpeech(text, outputPath, voiceId = 'pNInz6obpgDQGcFmaJgB') {
        try {
            console.log('🎵 Using ElevenLabs API for TTS...');
            
            const response = await axios({
                method: 'POST',
                url: `${this.baseUrl}/text-to-speech/${voiceId}`,
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': this.apiKey
                },
                data: {
                    text: text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.5,
                        use_speaker_boost: true
                    }
                },
                responseType: 'arraybuffer'
            });

            fs.writeFileSync(outputPath, Buffer.from(response.data));
            console.log('✅ ElevenLabs TTS completed successfully');
            return true;
            
        } catch (error) {
            console.error('❌ ElevenLabs TTS failed:', error.message);
            throw error;
        }
    }

    async getVoices() {
        try {
            const response = await axios({
                method: 'GET',
                url: `${this.baseUrl}/voices`,
                headers: {
                    'xi-api-key': this.apiKey
                }
            });
            return response.data.voices;
        } catch (error) {
            console.error('Failed to get ElevenLabs voices:', error.message);
            return [];
        }
    }

    getChineseVoices() {
        return {
            'female_news': 'pNInz6obpgDQGcFmaJgB', // Professional female
            'male_news': 'VR6AewLTigWG4xSOukaG',   // Professional male
            'young_female': 'EXAVITQu4vr4xnSDxMaL'  // Younger female
        };
    }
}

/**
 * Improved System TTS
 */
class ImprovedSystemTTS {
    async getAvailableVoices() {
        if (process.platform === 'darwin') {
            try {
                const voices = execSync('say -v ?', { encoding: 'utf8' });
                return this.parseVoices(voices);
            } catch (error) {
                console.error('Failed to get system voices:', error.message);
                return ['Tingting', 'Sinji'];
            }
        }
        return ['default'];
    }

    parseVoices(voiceList) {
        const lines = voiceList.split('\n');
        const chineseVoices = lines
            .filter(line => line.includes('zh_') || line.includes('Chinese'))
            .map(line => {
                const match = line.match(/^([^\s]+)/);
                return match ? match[1] : null;
            })
            .filter(Boolean);
        
        return chineseVoices.length > 0 ? chineseVoices : ['Tingting', 'Sinji'];
    }

    async synthesizeWithBestVoice(text, outputPath) {
        try {
            console.log('🔊 Using improved system TTS...');
            
            const voices = await this.getAvailableVoices();
            const bestVoice = voices[0] || 'Tingting';
            
            console.log(`Using voice: ${bestVoice}`);
            
            if (process.platform === 'darwin') {
                // macOS with enhanced parameters
                const tempAiff = outputPath.replace('.mp3', '.aiff');
                
                execSync(`say -v "${bestVoice}" -r 180 -o "${tempAiff}" "${text}"`, 
                        { stdio: 'inherit' });
                
                // Convert to MP3 if ffmpeg is available
                try {
                    execSync(`which ffmpeg`, { stdio: 'ignore' });
                    execSync(`ffmpeg -i "${tempAiff}" -acodec mp3 -ab 192k "${outputPath}" -y`, 
                            { stdio: 'inherit' });
                    fs.unlinkSync(tempAiff);
                } catch {
                    // If ffmpeg not available, keep AIFF
                    fs.renameSync(tempAiff, outputPath.replace('.mp3', '.aiff'));
                    console.log('⚠️  ffmpeg not found, saved as AIFF format');
                }
                
            } else if (process.platform === 'win32') {
                // Windows TTS
                const script = `
                    Add-Type -AssemblyName System.Speech
                    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
                    $synth.SetOutputToWaveFile("${outputPath}")
                    $synth.Speak("${text.replace(/"/g, '""')}")
                    $synth.Dispose()
                `;
                
                const scriptPath = path.join(__dirname, 'temp_tts.ps1');
                fs.writeFileSync(scriptPath, script);
                execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, 
                        { stdio: 'inherit' });
                fs.unlinkSync(scriptPath);
                
            } else {
                // Linux with espeak
                execSync(`espeak -s 150 -v zh "${text}" -w "${outputPath}"`, 
                        { stdio: 'inherit' });
            }
            
            console.log('✅ System TTS completed successfully');
            return true;
            
        } catch (error) {
            console.error('❌ System TTS failed:', error.message);
            throw error;
        }
    }
}

/**
 * Service Factory for creating translation and TTS instances
 */
class ServiceFactory {
    static createTranslator(config) {
        switch (config.provider) {
            case 'deepl':
                if (!config.apiKey) {
                    console.log('⚠️  DeepL API key not provided, falling back to free translator');
                    return new ImprovedFreeTranslator();
                }
                return new DeepLTranslator(config.apiKey);
            
            case 'free':
            default:
                return new ImprovedFreeTranslator();
        }
    }

    static createTTS(config) {
        switch (config.provider) {
            case 'elevenlabs':
                if (!config.apiKey) {
                    console.log('⚠️  ElevenLabs API key not provided, falling back to system TTS');
                    return new ImprovedSystemTTS();
                }
                return new ElevenLabsTTS(config.apiKey);
            
            case 'system':
            default:
                return new ImprovedSystemTTS();
        }
    }
}

/**
 * Enhanced Translation and TTS Manager
 */
class EnhancedTranslationTTS {
    constructor(config = enhancedConfig) {
        this.config = config;
        this.translator = ServiceFactory.createTranslator(config.translation);
        this.tts = ServiceFactory.createTTS(config.tts);
    }

    async translateText(text, targetLang = 'zh') {
        try {
            // Try primary translator
            if (this.translator instanceof DeepLTranslator) {
                return await this.translator.translateNews(text, targetLang);
            } else {
                return await this.translator.translateWithRetry(text, targetLang);
            }
        } catch (error) {
            console.log('⚠️  Primary translator failed, using fallback...');
            
            // Fallback to free translator
            const fallbackTranslator = new ImprovedFreeTranslator();
            return await fallbackTranslator.translateWithRetry(text, targetLang);
        }
    }

    async generateAudio(text, outputPath) {
        try {
            // Try primary TTS
            if (this.tts instanceof ElevenLabsTTS) {
                await this.tts.generateSpeech(text, outputPath, this.config.tts.voice);
            } else {
                await this.tts.synthesizeWithBestVoice(text, outputPath);
            }
            return true;
        } catch (error) {
            console.log('⚠️  Primary TTS failed, using fallback...');
            
            // Fallback to system TTS
            const fallbackTTS = new ImprovedSystemTTS();
            await fallbackTTS.synthesizeWithBestVoice(text, outputPath);
            return true;
        }
    }

    async processNewsToAudio(text, outputDir = './news_data') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseName = `enhanced_news_${timestamp}`;
        
        try {
            console.log('🚀 Starting enhanced news-to-audio processing...');
            
            // Step 1: Translate
            console.log('\n📝 Step 1: Translation');
            const translatedText = await this.translateText(text);
            
            // Save translated text
            const textPath = path.join(outputDir, `${baseName}.txt`);
            fs.writeFileSync(textPath, translatedText);
            console.log(`💾 Translated text saved: ${textPath}`);
            
            // Step 2: Generate Audio
            console.log('\n🎵 Step 2: Audio Generation');
            const audioPath = path.join(outputDir, `${baseName}.mp3`);
            await this.generateAudio(translatedText, audioPath);
            console.log(`🔊 Audio saved: ${audioPath}`);
            
            // Step 3: Create summary
            const summary = {
                timestamp: new Date().toISOString(),
                originalLength: text.length,
                translatedLength: translatedText.length,
                translationProvider: this.config.translation.provider,
                ttsProvider: this.config.tts.provider,
                files: {
                    text: textPath,
                    audio: audioPath
                },
                preview: {
                    original: text.substring(0, 200) + '...',
                    translated: translatedText.substring(0, 200) + '...'
                }
            };
            
            const summaryPath = path.join(outputDir, `${baseName}_summary.json`);
            fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
            console.log(`📊 Summary saved: ${summaryPath}`);
            
            console.log('\n✅ Enhanced news-to-audio processing completed successfully!');
            return summary;
            
        } catch (error) {
            console.error('❌ Enhanced processing failed:', error.message);
            throw error;
        }
    }

    async testServices() {
        console.log('🧪 Testing enhanced translation and TTS services...');
        
        const testText = "Breaking news: The latest developments in technology are reshaping our world. Artificial intelligence and machine learning continue to advance at an unprecedented pace.";
        
        try {
            // Test translation
            console.log('\n📝 Testing Translation:');
            console.log('Original:', testText);
            const translated = await this.translateText(testText);
            console.log('Translated:', translated);
            
            // Test TTS
            console.log('\n🎵 Testing TTS:');
            const testAudioPath = path.join(__dirname, 'test_enhanced_audio.mp3');
            await this.generateAudio(translated, testAudioPath);
            
            console.log('\n✅ All services tested successfully!');
            return { success: true, translated, audioPath: testAudioPath };
            
        } catch (error) {
            console.error('❌ Service test failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    async getServiceInfo() {
        const info = {
            translation: {
                provider: this.config.translation.provider,
                hasApiKey: !!this.config.translation.apiKey,
                fallback: this.config.translation.fallback
            },
            tts: {
                provider: this.config.tts.provider,
                hasApiKey: !!this.config.tts.apiKey,
                voice: this.config.tts.voice,
                fallback: this.config.tts.fallback
            }
        };

        // Get usage info for premium services
        if (this.translator instanceof DeepLTranslator) {
            try {
                const usage = await this.translator.getUsage();
                info.translation.usage = usage;
            } catch (error) {
                info.translation.usageError = error.message;
            }
        }

        if (this.tts instanceof ElevenLabsTTS) {
            try {
                const voices = await this.tts.getVoices();
                info.tts.availableVoices = voices.length;
            } catch (error) {
                info.tts.voicesError = error.message;
            }
        }

        return info;
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';

    const enhancedService = new EnhancedTranslationTTS();

    switch (command) {
        case 'test':
            enhancedService.testServices()
                .then(result => {
                    console.log('\n📊 Test Results:', result);
                    process.exit(result.success ? 0 : 1);
                })
                .catch(error => {
                    console.error('Test failed:', error.message);
                    process.exit(1);
                });
            break;

        case 'info':
            enhancedService.getServiceInfo()
                .then(info => {
                    console.log('\n📊 Service Information:');
                    console.log(JSON.stringify(info, null, 2));
                })
                .catch(error => {
                    console.error('Failed to get service info:', error.message);
                });
            break;

        case 'process':
            const inputText = args[1];
            if (!inputText) {
                console.error('❌ Please provide text to process');
                console.log('Usage: node enhanced_translation_tts.js process "Your text here"');
                process.exit(1);
            }
            
            enhancedService.processNewsToAudio(inputText)
                .then(result => {
                    console.log('\n📊 Processing Results:', result);
                })
                .catch(error => {
                    console.error('Processing failed:', error.message);
                    process.exit(1);
                });
            break;

        case 'help':
        default:
            console.log(`
🚀 Enhanced Translation & TTS Service

Usage:
  node enhanced_translation_tts.js <command> [options]

Commands:
  test                    Test translation and TTS services
  info                    Show service configuration and status
  process "text"          Process text through translation and TTS
  help                    Show this help message

Environment Variables:
  TRANSLATION_PROVIDER    Translation service (deepl, free)
  TRANSLATION_API_KEY     API key for translation service
  TTS_PROVIDER           TTS service (elevenlabs, system)
  TTS_API_KEY            API key for TTS service
  TTS_VOICE              Voice ID for TTS service

Examples:
  node enhanced_translation_tts.js test
  node enhanced_translation_tts.js info
  node enhanced_translation_tts.js process "Breaking news story"
  
  # With environment variables:
  TRANSLATION_PROVIDER=deepl TRANSLATION_API_KEY=your-key node enhanced_translation_tts.js test
`);
            break;
    }
}

module.exports = {
    EnhancedTranslationTTS,
    ServiceFactory,
    ImprovedFreeTranslator,
    DeepLTranslator,
    ElevenLabsTTS,
    ImprovedSystemTTS,
    enhancedConfig
};