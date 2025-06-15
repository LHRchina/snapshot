#!/usr/bin/env node
/**
 * Audio Generation Fix Script
 * Implements immediate fixes for TTS failures with robust fallback system
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Enhanced TTS Service Manager with Circuit Breaker
 */
class EnhancedTTSManager {
    constructor() {
        this.services = new Map();
        this.circuitBreakers = new Map();
        this.metrics = new Map();
        this.initializeServices();
    }

    initializeServices() {
        // iFlytek TTS Service
        this.services.set('iflytek', {
            name: 'iFlytek TTS',
            priority: 1,
            available: this.checkIFlytekCredentials(),
            convert: this.convertWithIFlytek.bind(this)
        });

        // System TTS Service
        this.services.set('system', {
            name: 'System TTS',
            priority: 2,
            available: true,
            convert: this.convertWithSystemTTS.bind(this)
        });

        // Initialize circuit breakers
        for (const [key] of this.services) {
            this.circuitBreakers.set(key, {
                failures: 0,
                lastFailure: null,
                state: 'CLOSED',
                threshold: 3,
                timeout: 60000
            });

            this.metrics.set(key, {
                attempts: 0,
                successes: 0,
                failures: 0,
                totalTime: 0
            });
        }
    }

    checkIFlytekCredentials() {
        return !!(process.env.IFLYTEK_APP_ID &&
                 process.env.IFLYTEK_API_KEY &&
                 process.env.IFLYTEK_API_SECRET);
    }

    async convertToAudio(text, outputPath) {
        console.log('🎵 Starting enhanced TTS conversion...');

        const availableServices = Array.from(this.services.entries())
            .filter(([key, service]) => service.available && this.isServiceHealthy(key))
            .sort(([, a], [, b]) => a.priority - b.priority);

        if (availableServices.length === 0) {
            console.error('❌ No healthy TTS services available');
            return false;
        }

        for (const [key, service] of availableServices) {
            try {
                console.log(`🔄 Attempting TTS with ${service.name}...`);
                const startTime = Date.now();

                const success = await service.convert(text, outputPath);

                if (success) {
                    this.recordSuccess(key, Date.now() - startTime);
                    console.log(`✅ ${service.name} completed successfully`);
                    return true;
                }

            } catch (error) {
                this.recordFailure(key, error);
                console.log(`⚠️  ${service.name} failed: ${error.message}`);

                // Continue to next service
                continue;
            }
        }

        console.error('❌ All TTS services failed');
        return false;
    }

    async convertWithIFlytek(text, outputPath) {
        try {
            const { convertWithIFlytekTTS } = require('../iflytek-tts.js');
            return await convertWithIFlytekTTS(text, outputPath);
        } catch (error) {
            console.error('iFlytek TTS error:', error.message);
            throw error;
        }
    }

    async convertWithSystemTTS(text, outputPath) {
        try {
            console.log('🔊 Using system TTS fallback...');

            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            if (process.platform === 'darwin') {
                return await this.convertWithMacOSTTS(text, outputPath);
            } else if (process.platform === 'win32') {
                return await this.convertWithWindowsTTS(text, outputPath);
            } else {
                return await this.convertWithLinuxTTS(text, outputPath);
            }

        } catch (error) {
            console.error('System TTS error:', error.message);
            throw error;
        }
    }

    async convertWithMacOSTTS(text, outputPath) {
        try {
            // Detect language and select appropriate voice
            const containsChinese = /[\u4e00-\u9fff]/.test(text);
            const voice = containsChinese ? 'Ting-Ting' : 'Alex';

            console.log(`🍎 Using macOS TTS with voice: ${voice}`);

            // Create temporary AIFF file
            const tempPath = outputPath.replace(/\.[^.]+$/, '.aiff');

            // Use say command with timeout
            execSync(`say -v "${voice}" -o "${tempPath}" "${text.replace(/"/g, '\\"')}"`, {
                timeout: 30000,
                stdio: 'pipe'
            });

            // Check if file was created
            if (!fs.existsSync(tempPath)) {
                throw new Error('macOS TTS failed to create audio file');
            }

            // Try to convert to MP3 using ffmpeg
            try {
                execSync(`ffmpeg -i "${tempPath}" -y "${outputPath}" -loglevel quiet`, {
                    timeout: 15000,
                    stdio: 'pipe'
                });

                // Clean up temp file
                fs.unlinkSync(tempPath);
                console.log(`✅ Audio converted to MP3: ${outputPath}`);

            } catch (ffmpegError) {
                // Keep AIFF if MP3 conversion fails
                const aiffOutput = outputPath.replace(/\.[^.]+$/, '.aiff');
                fs.renameSync(tempPath, aiffOutput);
                console.log(`✅ Audio saved as AIFF: ${aiffOutput}`);
            }

            return true;

        } catch (error) {
            console.error('macOS TTS failed:', error.message);
            throw error;
        }
    }

    async convertWithWindowsTTS(text, outputPath) {
        try {
            console.log('🪟 Using Windows TTS...');

            const wavPath = outputPath.replace(/\.[^.]+$/, '.wav');
            const script = `
                Add-Type -AssemblyName System.Speech
                $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
                $synth.SetOutputToWaveFile('${wavPath}')
                $synth.Speak('${text.replace(/'/g, "''")}')
                $synth.Dispose()
            `;

            const scriptPath = path.join(__dirname, 'temp_tts.ps1');
            fs.writeFileSync(scriptPath, script);

            execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, {
                timeout: 30000,
                stdio: 'pipe'
            });

            // Clean up script
            fs.unlinkSync(scriptPath);

            if (!fs.existsSync(wavPath)) {
                throw new Error('Windows TTS failed to create audio file');
            }

            console.log(`✅ Audio saved as WAV: ${wavPath}`);
            return true;

        } catch (error) {
            console.error('Windows TTS failed:', error.message);
            throw error;
        }
    }

    async convertWithLinuxTTS(text, outputPath) {
        try {
            console.log('🐧 Using Linux TTS (espeak)...');

            const wavPath = outputPath.replace(/\.[^.]+$/, '.wav');

            execSync(`espeak "${text.replace(/"/g, '\\"')}" -w "${wavPath}"`, {
                timeout: 30000,
                stdio: 'pipe'
            });

            if (!fs.existsSync(wavPath)) {
                throw new Error('Linux TTS failed to create audio file');
            }

            console.log(`✅ Audio saved as WAV: ${wavPath}`);
            return true;

        } catch (error) {
            console.error('Linux TTS failed:', error.message);
            throw error;
        }
    }

    isServiceHealthy(serviceKey) {
        const breaker = this.circuitBreakers.get(serviceKey);

        if (breaker.state === 'OPEN') {
            if (Date.now() - breaker.lastFailure > breaker.timeout) {
                breaker.state = 'HALF_OPEN';
                console.log(`🔄 Circuit breaker for ${serviceKey} is now HALF_OPEN`);
            } else {
                return false;
            }
        }

        return true;
    }

    recordSuccess(serviceKey, responseTime) {
        const breaker = this.circuitBreakers.get(serviceKey);
        const metrics = this.metrics.get(serviceKey);

        breaker.failures = 0;
        breaker.state = 'CLOSED';

        metrics.attempts++;
        metrics.successes++;
        metrics.totalTime += responseTime;
    }

    recordFailure(serviceKey, error) {
        const breaker = this.circuitBreakers.get(serviceKey);
        const metrics = this.metrics.get(serviceKey);

        breaker.failures++;
        breaker.lastFailure = Date.now();

        if (breaker.failures >= breaker.threshold) {
            breaker.state = 'OPEN';
            console.log(`🚫 Circuit breaker for ${serviceKey} is now OPEN`);
        }

        metrics.attempts++;
        metrics.failures++;
    }

    getHealthStatus() {
        const status = {};

        for (const [key, service] of this.services) {
            const breaker = this.circuitBreakers.get(key);
            const metrics = this.metrics.get(key);

            status[key] = {
                name: service.name,
                available: service.available,
                healthy: this.isServiceHealthy(key),
                circuitState: breaker.state,
                failures: breaker.failures,
                successRate: metrics.attempts > 0 ?
                    ((metrics.successes / metrics.attempts) * 100).toFixed(1) + '%' : 'N/A',
                avgResponseTime: metrics.successes > 0 ?
                    (metrics.totalTime / metrics.successes).toFixed(0) + 'ms' : 'N/A'
            };
        }

        return status;
    }
}

/**
 * Test the enhanced TTS system
 */
async function testEnhancedTTS() {
    console.log('🧪 Testing Enhanced TTS System\n');

    const ttsManager = new EnhancedTTSManager();

    // Test text
    const testText = "This is a test of the enhanced text-to-speech system with robust fallback capabilities.";
    const outputPath = path.join(__dirname, 'test_audio', 'enhanced_tts_test.mp3');

    // Ensure test directory exists
    const testDir = path.dirname(outputPath);
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }

    try {
        const success = await ttsManager.convertToAudio(testText, outputPath);

        if (success) {
            console.log('\n✅ Enhanced TTS test completed successfully!');

            // Check if audio file exists
            const audioFiles = fs.readdirSync(testDir).filter(f =>
                f.startsWith('enhanced_tts_test') &&
                (f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.aiff'))
            );

            if (audioFiles.length > 0) {
                console.log(`🎵 Audio file created: ${audioFiles[0]}`);
                console.log(`📁 Location: ${path.join(testDir, audioFiles[0])}`);
            }
        } else {
            console.log('\n❌ Enhanced TTS test failed');
        }

        // Display health status
        console.log('\n📊 TTS Service Health Status:');
        const status = ttsManager.getHealthStatus();

        for (const [service, info] of Object.entries(status)) {
            const healthIcon = info.healthy ? '✅' : '❌';
            const availableIcon = info.available ? '🟢' : '🔴';

            console.log(`   ${healthIcon} ${info.name}:`);
            console.log(`      Available: ${availableIcon}`);
            console.log(`      Circuit: ${info.circuitState}`);
            console.log(`      Success Rate: ${info.successRate}`);
            console.log(`      Avg Response: ${info.avgResponseTime}`);
        }

        return success;

    } catch (error) {
        console.error('\n💥 Test failed with error:', error.message);
        return false;
    }
}

/**
 * Apply fixes to existing news-to-audio.js
 */
function applyTTSFixes() {
    console.log('🔧 Applying TTS fixes to news-to-audio.js...');

    const newsToAudioPath = path.join(__dirname, 'news-to-audio.js');

    if (!fs.existsSync(newsToAudioPath)) {
        console.error('❌ news-to-audio.js not found!');
        return false;
    }

    try {
        // Create backup
        const backupPath = newsToAudioPath + '.backup.' + Date.now();
        fs.copyFileSync(newsToAudioPath, backupPath);
        console.log(`💾 Backup created: ${backupPath}`);

        // Read current content
        let content = fs.readFileSync(newsToAudioPath, 'utf8');

        // Add enhanced TTS manager import
        if (!content.includes('EnhancedTTSManager')) {
            const importStatement = `const { EnhancedTTSManager } = require('./fix_audio_generation.js');\n`;
            content = importStatement + content;
        }

        // Replace convertToAudio function
        const enhancedConvertFunction = `
// Enhanced convertToAudio function with robust fallback
async function convertToAudio(text, outputPath) {
    const ttsManager = new EnhancedTTSManager();
    return await ttsManager.convertToAudio(text, outputPath);
}
`;

        // Find and replace the existing convertToAudio function
        const functionRegex = /async function convertToAudio\([^}]+\}(?:\s*\/\/[^\n]*\n)*(?:\s*\/\*[\s\S]*?\*\/)*(?:\s*\/\/[^\n]*\n)*/;

        if (functionRegex.test(content)) {
            content = content.replace(functionRegex, enhancedConvertFunction);
            console.log('✅ convertToAudio function replaced with enhanced version');
        } else {
            console.log('⚠️  Could not find convertToAudio function to replace');
        }

        // Write updated content
        fs.writeFileSync(newsToAudioPath, content);
        console.log('✅ TTS fixes applied successfully');

        return true;

    } catch (error) {
        console.error('❌ Failed to apply TTS fixes:', error.message);
        return false;
    }
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'test';

    console.log('🎵 Enhanced TTS Audio Generation Fix\n');

    switch (command) {
        case 'test':
            await testEnhancedTTS();
            break;

        case 'apply':
            const applied = applyTTSFixes();
            if (applied) {
                console.log('\n🎉 TTS fixes applied! You can now run your news-to-audio script.');
            }
            break;

        case 'status':
            const ttsManager = new EnhancedTTSManager();
            const status = ttsManager.getHealthStatus();

            console.log('📊 TTS Service Status:\n');
            for (const [service, info] of Object.entries(status)) {
                console.log(`${info.available ? '✅' : '❌'} ${info.name}: ${info.available ? 'Available' : 'Unavailable'}`);
            }
            break;

        default:
            console.log(`
Usage: node fix_audio_generation.js <command>

Commands:
  test     Test the enhanced TTS system
  apply    Apply fixes to news-to-audio.js
  status   Show TTS service status

Examples:
  node fix_audio_generation.js test
  node fix_audio_generation.js apply
  node fix_audio_generation.js status
`);
    }
}

// Export for use in other modules
module.exports = {
    EnhancedTTSManager
};

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Script failed:', error.message);
        process.exit(1);
    });
}