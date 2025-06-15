#!/usr/bin/env node

/**
 * Integration Script for Enhanced Translation & TTS
 * This script demonstrates how to integrate enhanced services into the existing news-to-audio.js
 */

const fs = require('fs');
const path = require('path');
const { EnhancedTranslationTTS } = require('./enhanced_translation_tts');

/**
 * Enhanced version of the generateAudioSummary function
 * Replaces the existing function in news-to-audio.js
 */
async function generateEnhancedAudioSummary(newsData, options = {}) {
    console.log('🚀 Generating enhanced audio summary...');

    // Initialize enhanced services
    const enhancedService = new EnhancedTranslationTTS();

    let summary = '';

    // Add introduction
    summary += '今日新闻摘要。'; // "Today's news summary" in Chinese

    // Group articles by source
    const articlesBySource = {};
    newsData.forEach(sourceData => {
        if (sourceData.articles && sourceData.articles.length > 0) {
            articlesBySource[sourceData.source] = sourceData.articles;
        }
    });

    // Generate summary for each source
    Object.entries(articlesBySource).forEach(([source, articles]) => {
        if (articles.length > 0) {
            summary += `来自${source}的新闻：`; // "News from [source]:"

            articles.slice(0, options.maxNews || 10).forEach((article, index) => {
                if (article.title) {
                    summary += `${cleanTextForAudio(article.title)}。`;
                }
                if (article.summary) {
                    summary += `${cleanTextForAudio(article.summary)}。`;
                }
            });
        }
    });

    // If no articles found, create a fallback summary
    if (summary === '今日新闻摘要。') {
        summary += '今天暂无新闻更新。请稍后再试。'; // "No news updates today. Please try again later."
    }

    try {
        // Use enhanced translation service
        console.log('📝 Using enhanced translation service...');
        const translatedSummary = await enhancedService.translateText(summary, 'zh');
        console.log('✅ Enhanced translation completed successfully.');
        return translatedSummary;
    } catch (error) {
        console.error('❌ Enhanced translation failed:', error.message);
        console.log('🔄 Falling back to original summary...');
        return summary;
    }
}

/**
 * Enhanced version of the convertToAudio function
 * Replaces the existing function in news-to-audio.js
 */
async function convertToEnhancedAudio(text, outputPath) {
    console.log('🎵 Converting to enhanced audio...');

    try {
        // Initialize enhanced TTS service
        const enhancedService = new EnhancedTranslationTTS();

        // Use enhanced audio generation
        await enhancedService.generateAudio(text, outputPath);
        console.log('✅ Enhanced audio generation completed successfully.');
        return true;

    } catch (error) {
        console.error('❌ Enhanced audio generation failed:', error.message);
        console.log('🔄 Falling back to original audio method...');

        // Fallback to original convertToAudio function
        const originalModule = require('../news-to-audio.js');
        return await originalModule.convertToAudio(text, outputPath);
    }
}

/**
 * Clean text for audio narration (from original)
 */
function cleanTextForAudio(text) {
    if (!text) return '';

    return text
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[""'']/g, '')
        .replace(/[\[\](){}]/g, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/www\.[^\s]+/g, '')
        .trim();
}

/**
 * Integration function that patches the existing news-to-audio.js
 */
function integrateEnhancedServices() {
    console.log('🔧 Integrating enhanced translation and TTS services...');

    const newsToAudioPath = path.join(__dirname, 'news-to-audio.js');

    if (!fs.existsSync(newsToAudioPath)) {
        console.error('❌ news-to-audio.js not found!');
        return false;
    }

    // Read the original file
    let content = fs.readFileSync(newsToAudioPath, 'utf8');

    // Create backup
    const backupPath = path.join(__dirname, 'news-to-audio.js.backup');
    if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, content);
        console.log('💾 Backup created: news-to-audio.js.backup');
    }

    // Add import for enhanced services at the top
    const importStatement = `const { EnhancedTranslationTTS } = require('./enhanced_translation_tts');\n`;

    if (!content.includes('enhanced_translation_tts')) {
        // Find the first require statement and add our import after it
        const firstRequire = content.indexOf('const');
        if (firstRequire !== -1) {
            content = content.slice(0, firstRequire) + importStatement + content.slice(firstRequire);
        } else {
            content = importStatement + content;
        }
    }

    // Replace the generateAudioSummary function
    const audioSummaryRegex = /async function generateAudioSummary\([^}]+\}\s*\}\s*\}/s;
    const enhancedAudioSummaryFunction = `
// Enhanced audio summary generation with improved translation
async function generateAudioSummary(newsData) {
    console.log('🚀 Generating enhanced audio summary...');

    // Initialize enhanced services
    const enhancedService = new EnhancedTranslationTTS();

    let summary = '';

    // Group articles by source
    const articlesBySource = {};
    newsData.forEach(sourceData => {
        if (sourceData.articles && sourceData.articles.length > 0) {
            articlesBySource[sourceData.source] = sourceData.articles;
        }
    });

    // Generate summary for each source
    Object.entries(articlesBySource).forEach(([source, articles]) => {
        if (articles.length > 0) {
            summary += \`News from \${source}: \`;

            articles.slice(0, 10).forEach((article, index) => {
                if (article.title) {
                    summary += \`\${cleanTextForAudio(article.title)}. \`;
                }
                if (article.summary) {
                    summary += \`\${cleanTextForAudio(article.summary)}. \`;
                }
            });
        }
    });

    // If no articles found, create a fallback summary
    if (!summary.trim()) {
        summary = 'No news updates available today. Please try again later.';
    }

    try {
        // Use enhanced translation service
        console.log('📝 Using enhanced translation service...');
        const translatedSummary = await enhancedService.translateText(summary, 'zh');
        console.log('✅ Enhanced translation completed successfully.');
        return translatedSummary;
    } catch (error) {
        console.error('❌ Enhanced translation failed:', error.message);
        console.log('🔄 Falling back to original translation...');

        // Fallback to original translation method
        try {
            const translatte = require('translatte');
            const translatedSummary = await translatte(summary, { to: 'zh' });
            return translatedSummary.text;
        } catch (fallbackError) {
            console.error('❌ Fallback translation also failed:', fallbackError.message);
            return summary; // Return English if all translation fails
        }
    }
}`;

    if (audioSummaryRegex.test(content)) {
        content = content.replace(audioSummaryRegex, enhancedAudioSummaryFunction);
        console.log('✅ generateAudioSummary function updated');
    } else {
        console.log('⚠️  Could not find generateAudioSummary function to replace');
    }

    // Replace the convertToAudio function
    const convertToAudioRegex = /async function convertToAudio\([^}]+\}\s*\}\s*\}/s;
    const enhancedConvertToAudioFunction = `
// Enhanced audio conversion with improved TTS
async function convertToAudio(text, outputPath) {
    console.log('🎵 Converting to enhanced audio...');

    try {
        // Initialize enhanced TTS service
        const enhancedService = new EnhancedTranslationTTS();

        // Use enhanced audio generation
        await enhancedService.generateAudio(text, outputPath);
        console.log('✅ Enhanced audio generation completed successfully.');
        return true;

    } catch (error) {
        console.error('❌ Enhanced audio generation failed:', error.message);
        console.log('🔄 Falling back to original audio method...');

        // Fallback to original system TTS
        try {
            const { execSync } = require('child_process');
            const fs = require('fs');

            if (process.platform === 'darwin') {
                // macOS fallback
                const voice = /[\u4e00-\u9fff]/.test(text) ? 'Tingting' : 'Alex';
                const aiffPath = outputPath.replace('.mp3', '.aiff');
                execSync(\`say -v "\${voice}" -o "\${aiffPath}" "\${text}"\`, { stdio: 'inherit' });

                // Try to convert to MP3
                try {
                    execSync(\`ffmpeg -i "\${aiffPath}" -acodec mp3 -ab 192k "\${outputPath}" -y\`, { stdio: 'inherit' });
                    fs.unlinkSync(aiffPath);
                } catch {
                    // Keep AIFF if conversion fails
                    fs.renameSync(aiffPath, outputPath.replace('.mp3', '.aiff'));
                }

                console.log('✅ Fallback audio generation completed');
                return true;
            } else {
                // Other platforms - save as text file
                const textPath = outputPath.replace(/\.(wav|mp3)$/, '_audio_script.txt');
                fs.writeFileSync(textPath, text);
                console.log(\`📝 Audio script saved to: \${textPath}\`);
                return false;
            }
        } catch (fallbackError) {
            console.error('❌ Fallback audio generation also failed:', fallbackError.message);

            // Final fallback - save as text
            const textPath = outputPath.replace(/\.(wav|mp3)$/, '_audio_script.txt');
            require('fs').writeFileSync(textPath, text);
            console.log(\`📝 Audio script saved to: \${textPath}\`);
            return false;
        }
    }
}`;

    if (convertToAudioRegex.test(content)) {
        content = content.replace(convertToAudioRegex, enhancedConvertToAudioFunction);
        console.log('✅ convertToAudio function updated');
    } else {
        console.log('⚠️  Could not find convertToAudio function to replace');
    }

    // Write the updated content
    fs.writeFileSync(newsToAudioPath, content);
    console.log('✅ news-to-audio.js has been enhanced!');

    return true;
}

/**
 * Restore the original news-to-audio.js from backup
 */
function restoreOriginal() {
    console.log('🔄 Restoring original news-to-audio.js...');

    const newsToAudioPath = path.join(__dirname, 'news-to-audio.js');
    const backupPath = path.join(__dirname, 'news-to-audio.js.backup');

    if (!fs.existsSync(backupPath)) {
        console.error('❌ Backup file not found!');
        return false;
    }

    const backupContent = fs.readFileSync(backupPath, 'utf8');
    fs.writeFileSync(newsToAudioPath, backupContent);

    console.log('✅ Original news-to-audio.js restored from backup');
    return true;
}

/**
 * Test the enhanced integration
 */
async function testIntegration() {
    console.log('🧪 Testing enhanced integration...');

    try {
        // Test enhanced services directly
        const enhancedService = new EnhancedTranslationTTS();

        const testText = "Breaking news: Technology advances continue to reshape our world.";
        console.log('\n📝 Testing translation:');
        console.log('Original:', testText);

        const translated = await enhancedService.translateText(testText);
        console.log('Translated:', translated);

        console.log('\n🎵 Testing audio generation:');
        const testAudioPath = path.join(__dirname, 'test_integration_audio.mp3');
        await enhancedService.generateAudio(translated, testAudioPath);
        console.log('Audio saved to:', testAudioPath);

        console.log('\n✅ Integration test completed successfully!');
        return true;

    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
        return false;
    }
}

/**
 * Show current configuration and service status
 */
async function showStatus() {
    console.log('📊 Enhanced Services Status\n');

    try {
        const enhancedService = new EnhancedTranslationTTS();
        const info = await enhancedService.getServiceInfo();

        console.log('🔤 Translation Service:');
        console.log(`  Provider: ${info.translation.provider}`);
        console.log(`  API Key: ${info.translation.hasApiKey ? '✅ Configured' : '❌ Not configured'}`);
        console.log(`  Fallback: ${info.translation.fallback}`);

        if (info.translation.usage) {
            console.log(`  Usage: ${info.translation.usage.character_count}/${info.translation.usage.character_limit} characters`);
        }

        console.log('\n🎵 TTS Service:');
        console.log(`  Provider: ${info.tts.provider}`);
        console.log(`  API Key: ${info.tts.hasApiKey ? '✅ Configured' : '❌ Not configured'}`);
        console.log(`  Voice: ${info.tts.voice}`);
        console.log(`  Fallback: ${info.tts.fallback}`);

        if (info.tts.availableVoices) {
            console.log(`  Available Voices: ${info.tts.availableVoices}`);
        }

        console.log('\n💡 To configure premium services:');
        console.log('  export TRANSLATION_PROVIDER=deepl');
        console.log('  export TRANSLATION_API_KEY=your-deepl-key');
        console.log('  export TTS_PROVIDER=elevenlabs');
        console.log('  export TTS_API_KEY=your-elevenlabs-key');

    } catch (error) {
        console.error('❌ Failed to get status:', error.message);
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';

    switch (command) {
        case 'integrate':
            if (integrateEnhancedServices()) {
                console.log('\n🎉 Integration completed! Your news-to-audio.js now uses enhanced services.');
                console.log('\n📝 Next steps:');
                console.log('1. Run: node news-to-audio.js (to test with current settings)');
                console.log('2. Configure premium APIs for better quality (see status command)');
                console.log('3. Run: node upgrade_integration.js test (to test integration)');
            }
            break;

        case 'restore':
            if (restoreOriginal()) {
                console.log('\n✅ Original news-to-audio.js restored.');
            }
            break;

        case 'test':
            testIntegration()
                .then(success => {
                    process.exit(success ? 0 : 1);
                })
                .catch(error => {
                    console.error('Test failed:', error.message);
                    process.exit(1);
                });
            break;

        case 'status':
            showStatus()
                .catch(error => {
                    console.error('Failed to show status:', error.message);
                });
            break;

        case 'help':
        default:
            console.log(`
🚀 Enhanced Translation & TTS Integration

Usage:
  node upgrade_integration.js <command>

Commands:
  integrate    Integrate enhanced services into news-to-audio.js
  restore      Restore original news-to-audio.js from backup
  test         Test the enhanced integration
  status       Show current service configuration and status
  help         Show this help message

Workflow:
  1. node upgrade_integration.js integrate    # Upgrade your existing script
  2. node upgrade_integration.js status       # Check configuration
  3. node upgrade_integration.js test         # Test the integration
  4. node news-to-audio.js                    # Run with enhanced services

To use premium services:
  export TRANSLATION_PROVIDER=deepl
  export TRANSLATION_API_KEY=your-deepl-key
  export TTS_PROVIDER=elevenlabs
  export TTS_API_KEY=your-elevenlabs-key
  node news-to-audio.js

To restore original:
  node upgrade_integration.js restore
`);
            break;
    }
}

module.exports = {
    integrateEnhancedServices,
    restoreOriginal,
    testIntegration,
    showStatus,
    generateEnhancedAudioSummary,
    convertToEnhancedAudio
};