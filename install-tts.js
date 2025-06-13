const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Install Text-to-Speech dependencies and setup script
 */
function installTTSDependencies() {
    console.log('🔧 Setting up Text-to-Speech dependencies...');
    
    try {
        // Check if we're on Windows
        if (process.platform === 'win32') {
            console.log('✅ Windows detected - using built-in Speech Synthesis');
            console.log('No additional dependencies required for Windows TTS');
            
            // Test Windows TTS
            console.log('🧪 Testing Windows TTS...');
            const testScript = `
                Add-Type -AssemblyName System.Speech;
                $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
                $synth.Speak('Text to speech test successful');
                $synth.Dispose();
            `;
            
            const scriptPath = path.join(__dirname, 'test_tts.ps1');
            fs.writeFileSync(scriptPath, testScript);
            
            try {
                execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { stdio: 'inherit' });
                console.log('✅ Windows TTS test successful!');
            } catch (error) {
                console.log('⚠️  Windows TTS test failed, but should work during actual usage');
            } finally {
                if (fs.existsSync(scriptPath)) {
                    fs.unlinkSync(scriptPath);
                }
            }
            
        } else if (process.platform === 'linux') {
            console.log('🐧 Linux detected - installing espeak...');
            
            try {
                // Try to install espeak
                execSync('sudo apt-get update && sudo apt-get install -y espeak espeak-data', { stdio: 'inherit' });
                console.log('✅ espeak installed successfully');
                
                // Test espeak
                execSync('espeak "Text to speech test successful"', { stdio: 'inherit' });
                console.log('✅ espeak test successful!');
                
            } catch (error) {
                console.log('⚠️  Failed to install espeak automatically');
                console.log('Please install manually: sudo apt-get install espeak espeak-data');
            }
            
        } else if (process.platform === 'darwin') {
            console.log('🍎 macOS detected - using built-in say command');
            
            try {
                // Test macOS say command
                execSync('say "Text to speech test successful"', { stdio: 'inherit' });
                console.log('✅ macOS TTS test successful!');
            } catch (error) {
                console.log('⚠️  macOS TTS test failed');
            }
        }
        
        // Install optional Node.js TTS packages
        console.log('\n📦 Installing optional Node.js TTS packages...');
        
        try {
            // Install say package for cross-platform TTS
            execSync('npm install say --save-optional', { stdio: 'inherit' });
            console.log('✅ say package installed');
        } catch (error) {
            console.log('⚠️  Failed to install say package (optional)');
        }
        
        try {
            // Install google-tts-api for Google TTS
            execSync('npm install google-tts-api --save-optional', { stdio: 'inherit' });
            console.log('✅ google-tts-api package installed');
        } catch (error) {
            console.log('⚠️  Failed to install google-tts-api package (optional)');
        }
        
        console.log('\n🎉 TTS setup completed!');
        console.log('\nYou can now run: node news-to-audio.js');
        
    } catch (error) {
        console.error('❌ Error during TTS setup:', error.message);
        console.log('\n📋 Manual installation options:');
        console.log('Windows: Built-in (no installation needed)');
        console.log('Linux: sudo apt-get install espeak espeak-data');
        console.log('macOS: Built-in say command (no installation needed)');
        console.log('\nOptional Node.js packages:');
        console.log('npm install say google-tts-api');
    }
}

// Run if called directly
if (require.main === module) {
    installTTSDependencies();
}

module.exports = { installTTSDependencies };