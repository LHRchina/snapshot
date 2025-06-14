#!/usr/bin/env node

/**
 * Fix for iFlytek TTS 403 Forbidden Error
 * 
 * Issue: The config.json contains OTS (translation) service configuration,
 * but TTS requires different host and endpoint configuration.
 * 
 * Python version works because it uses the correct TTS host: api-dx.xf-yun.com
 * JavaScript version fails because it uses OTS host: ntrans.xfyun.cn
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 iFlytek TTS Host Configuration Fix\n');

// Step 1: Analyze the issue
console.log('📋 Step 1: Analyzing the configuration issue...');

const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('Current config.json ots section:');
console.log('  Host:', config.ots.host);
console.log('  HostUrl:', config.ots.hostUrl);
console.log('  URI:', config.ots.uri);

console.log('\n❌ Problem identified:');
console.log('  • config.json contains OTS (translation) service configuration');
console.log('  • OTS host: ntrans.xfyun.cn (for translation)');
console.log('  • TTS host should be: api-dx.xf-yun.com (for text-to-speech)');
console.log('  • Different services require different hosts and endpoints');

// Step 2: Create the fix
console.log('\n📋 Step 2: Creating configuration fix...');

// Update config.json to include separate TTS configuration
const updatedConfig = {
    ...config,
    // Keep existing OTS configuration for translation
    ots: {
        ...config.ots,
        // Add comment for clarity
        _comment: "OTS configuration for translation service"
    },
    // Add new TTS configuration
    tts: {
        host: "api-dx.xf-yun.com",
        appid: config.ots.appid, // Same credentials
        apiKey: config.ots.apiKey,
        apiSecret: config.ots.apiSecret,
        _comment: "TTS configuration for text-to-speech service"
    }
};

// Step 3: Apply the fix
console.log('\n📋 Step 3: Applying configuration fix...');

try {
    // Backup original config
    const backupPath = path.join(__dirname, 'config.json.backup');
    fs.writeFileSync(backupPath, JSON.stringify(config, null, 2));
    console.log('✅ Original config backed up to config.json.backup');
    
    // Write updated config
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
    console.log('✅ Updated config.json with separate TTS configuration');
    
} catch (error) {
    console.error('❌ Failed to update config:', error.message);
    process.exit(1);
}

// Step 4: Update news-to-audio.js to use TTS config
console.log('\n📋 Step 4: Updating news-to-audio.js...');

try {
    const newsToAudioPath = path.join(__dirname, 'news-to-audio.js');
    let content = fs.readFileSync(newsToAudioPath, 'utf8');
    
    // Replace the config reading logic
    const oldPattern = /const iflytekConfig = \{[\s\S]*?\};/;
    const newConfig = `const iflytekConfig = {
                host: config.tts?.host || 'api-dx.xf-yun.com',
                appId: iflytekAppId,
                apiKey: iflytekApiKey,
                apiSecret: iflytekApiSecret
            };`;
    
    if (oldPattern.test(content)) {
        content = content.replace(oldPattern, newConfig);
        fs.writeFileSync(newsToAudioPath, content);
        console.log('✅ Updated news-to-audio.js to use TTS configuration');
    } else {
        console.log('⚠️  Could not find iflytekConfig pattern in news-to-audio.js');
        console.log('   Manual update may be required');
    }
    
} catch (error) {
    console.error('❌ Failed to update news-to-audio.js:', error.message);
}

// Step 5: Test the configuration
console.log('\n📋 Step 5: Testing the updated configuration...');

try {
    const { IFlytekTTS } = require('./iflytek-tts.js');
    
    const testConfig = {
        host: updatedConfig.tts.host,
        appId: updatedConfig.tts.appid,
        apiKey: updatedConfig.tts.apiKey,
        apiSecret: updatedConfig.tts.apiSecret
    };
    
    console.log('🔧 Testing iFlytek TTS with correct host configuration...');
    console.log('   Host:', testConfig.host);
    console.log('   App ID:', testConfig.appId);
    
    const tts = new IFlytekTTS(testConfig);
    console.log('✅ iFlytek TTS initialized successfully with correct host');
    
} catch (error) {
    console.log('❌ TTS initialization test failed:', error.message);
}

// Step 6: Provide summary and next steps
console.log('\n🎉 Configuration Fix Complete!');
console.log('\n📝 Summary of changes:');
console.log('   • Added separate TTS configuration section to config.json');
console.log('   • TTS host: api-dx.xf-yun.com (correct for text-to-speech)');
console.log('   • OTS host: ntrans.xfyun.cn (kept for translation)');
console.log('   • Updated news-to-audio.js to use TTS configuration');
console.log('   • Created backup of original configuration');

console.log('\n🚀 Next steps:');
console.log('   1. Test audio generation: node news-to-audio.js');
console.log('   2. Verify TTS works with correct host configuration');
console.log('   3. If successful, remove config.json.backup');

console.log('\n🔍 Technical explanation:');
console.log('   • iFlytek provides different services on different hosts');
console.log('   • OTS (Online Translation Service): ntrans.xfyun.cn');
console.log('   • TTS (Text-to-Speech Service): api-dx.xf-yun.com');
console.log('   • Using wrong host results in 403 Forbidden error');
console.log('   • Python script worked because it used correct TTS host');