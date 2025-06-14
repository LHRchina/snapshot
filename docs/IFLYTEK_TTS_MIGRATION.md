# iFlytek TTS Migration Guide

## 🚀 Overview

This guide explains how to migrate from Murf.ai to iFlytek TTS for text-to-speech conversion in the news-to-audio project. The new implementation provides:

- **Cost-effective solution**: iFlytek offers competitive pricing
- **Chinese language support**: Native support for Chinese text-to-speech
- **High-quality audio**: Professional voice synthesis
- **Seamless integration**: Drop-in replacement for Murf.ai

## 📋 Migration Steps

### Step 1: Set Up iFlytek Credentials

1. **Create iFlytek Account**:
   - Visit [iFlytek Console](https://console.xfyun.cn/)
   - Register and verify your account
   - Navigate to "我的应用" (My Applications)

2. **Create Application**:
   - Click "创建新应用" (Create New Application)
   - Enable "语音合成" (Speech Synthesis) service
   - Note down your credentials:
     - APP_ID
     - API_KEY
     - API_SECRET

3. **Configure Environment Variables**:
   ```bash
   # Add to your .env file
   IFLYTEK_APP_ID=your_app_id_here
   IFLYTEK_API_KEY=your_api_key_here
   IFLYTEK_API_SECRET=your_api_secret_here
   IFLYTEK_HOST=api-dx.xf-yun.com
   ```

### Step 2: Install Dependencies

The iFlytek implementation uses existing dependencies:
- `axios` - HTTP requests
- `crypto` - HMAC signature generation
- `fs` - File system operations

No additional packages required!

### Step 3: Test the Implementation

```bash
# Test iFlytek TTS directly
node iflytek-tts.js

# Test with the news-to-audio integration
node news-to-audio.js "你好，这是一个测试。"
```

## 🔧 Usage Examples

### Basic Usage

```javascript
const { convertWithIFlytekTTS } = require('./iflytek-tts.js');

// Convert text to speech
async function example() {
    try {
        const success = await convertWithIFlytekTTS(
            '你好，欢迎使用iFlytek语音合成服务。',
            './output.mp3',
            {
                voice: 'x4_mingge',    // Voice model
                language: 'zh',        // Chinese
                speed: 50,             // Speech speed (0-100)
                volume: 50,            // Volume (0-100)
                pitch: 50              // Pitch (0-100)
            }
        );
        
        if (success) {
            console.log('✅ Audio generated successfully!');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}
```

### Advanced Usage with Custom Options

```javascript
const { IFlytekTTS } = require('./iflytek-tts.js');

async function advancedExample() {
    const tts = new IFlytekTTS({
        host: 'api-dx.xf-yun.com',
        appId: process.env.IFLYTEK_APP_ID,
        apiKey: process.env.IFLYTEK_API_KEY,
        apiSecret: process.env.IFLYTEK_API_SECRET
    });
    
    const options = {
        voice: 'x4_mingge',      // 明哥 (Male voice)
        language: 'zh',          // Chinese
        speed: 60,               // Slightly faster
        volume: 70,              // Louder
        pitch: 45                // Slightly lower pitch
    };
    
    await tts.convertTextToSpeech(
        '这是一个高级配置的语音合成示例。',
        './advanced_output.mp3',
        options
    );
}
```

### Integration with News Processing

```javascript
const { generateNewsAudio } = require('./news-to-audio.js');

// The system will automatically use iFlytek if credentials are available
async function processNews() {
    const newsData = {
        title: '今日新闻标题',
        content: '这里是新闻内容...'
    };
    
    await generateNewsAudio(newsData, './news_audio.mp3');
}
```

## 🎛️ Voice Configuration

### Available Voice Models

| Voice ID | Description | Language | Gender |
|----------|-------------|----------|---------|
| `x4_mingge` | 明哥 (Default) | Chinese | Male |
| `x2_xiaofeng` | 小峰 | Chinese | Male |
| `x4_lingfei` | 凌飞 | Chinese | Male |
| `x2_xiaoqian` | 小倩 | Chinese | Female |

### Parameter Ranges

- **Speed**: 0-100 (50 = normal)
- **Volume**: 0-100 (50 = normal)
- **Pitch**: 0-100 (50 = normal)

## 🔄 Fallback Strategy

The system implements a smart fallback strategy:

1. **Primary**: iFlytek TTS (if credentials available)
2. **Secondary**: Murf.ai (if API key available)
3. **Tertiary**: System TTS (built-in fallback)

```javascript
// Automatic fallback in news-to-audio.js
async function convertToAudio(text, outputPath) {
    // 1. Try iFlytek TTS first
    if (process.env.IFLYTEK_APP_ID) {
        try {
            return await convertWithIFlytekTTS(text, outputPath);
        } catch (error) {
            console.log('iFlytek failed, trying Murf.ai...');
        }
    }
    
    // 2. Fallback to Murf.ai
    if (config.voiceKey) {
        try {
            return await convertWithMurfAI(text, outputPath);
        } catch (error) {
            console.log('Murf.ai failed, using system TTS...');
        }
    }
    
    // 3. Final fallback to system TTS
    return await convertWithSystemTTS(text, outputPath);
}
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Authentication Errors
```
Error: HMAC signature cannot be verified: fail to retrieve credential
```

**Solution**:
- Verify your iFlytek credentials are correct
- Check that the Speech Synthesis service is enabled in your iFlytek console
- Ensure your account has sufficient credits

#### 2. Network Connectivity
```
Error: connect ECONNREFUSED
```

**Solution**:
- Check internet connection
- Verify firewall settings
- Test DNS resolution: `nslookup api-dx.xf-yun.com`

#### 3. Text Length Limits
```
Error: Text too long
```

**Solution**:
- The system automatically splits long text into chunks
- Maximum chunk size: 2000 characters
- Multiple audio files will be generated for very long text

### Debug Mode

Enable detailed logging:

```javascript
// Set environment variable for debug output
process.env.DEBUG = 'iflytek:*';

// Or add console.log statements in iflytek-tts.js
```

## 📊 Performance Comparison

| Feature | iFlytek TTS | Murf.ai | System TTS |
|---------|-------------|---------|------------|
| **Quality** | High | Very High | Medium |
| **Chinese Support** | Excellent | Good | Basic |
| **Cost** | Low | Medium | Free |
| **Speed** | Fast | Medium | Very Fast |
| **Customization** | High | Very High | Low |
| **Reliability** | High | High | Very High |

## 🚀 Advanced Features

### Batch Processing

```javascript
const { IFlytekTTS } = require('./iflytek-tts.js');

async function batchConvert() {
    const tts = new IFlytekTTS();
    const texts = [
        '第一段文本',
        '第二段文本',
        '第三段文本'
    ];
    
    for (let i = 0; i < texts.length; i++) {
        await tts.convertTextToSpeech(
            texts[i],
            `./batch_${i + 1}.mp3`
        );
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}
```

### Custom Voice Settings

```javascript
const voiceProfiles = {
    news: { voice: 'x4_mingge', speed: 55, volume: 60, pitch: 50 },
    story: { voice: 'x2_xiaoqian', speed: 45, volume: 50, pitch: 55 },
    announcement: { voice: 'x4_lingfei', speed: 50, volume: 70, pitch: 45 }
};

async function convertWithProfile(text, outputPath, profileName) {
    const profile = voiceProfiles[profileName] || voiceProfiles.news;
    return await convertWithIFlytekTTS(text, outputPath, profile);
}
```

## 📝 Migration Checklist

- [ ] **iFlytek account created and verified**
- [ ] **Speech synthesis service enabled**
- [ ] **Credentials added to .env file**
- [ ] **Test basic TTS functionality**
- [ ] **Test news-to-audio integration**
- [ ] **Verify fallback mechanisms work**
- [ ] **Update documentation and scripts**
- [ ] **Monitor usage and costs**

## 🔗 Resources

- [iFlytek Console](https://console.xfyun.cn/)
- [iFlytek TTS API Documentation](https://aidocs.xfyun.cn/docs/dts/)
- [Voice Model Samples](https://aidocs.xfyun.cn/docs/dts/voice_list.html)
- [Pricing Information](https://www.xfyun.cn/services/voiceTTS)

## 🎯 Next Steps

1. **Test the implementation** with your iFlytek credentials
2. **Customize voice settings** for your use case
3. **Monitor performance** and adjust parameters
4. **Consider upgrading** iFlytek plan for higher limits
5. **Implement caching** for frequently used audio

---

**Note**: Keep your Murf.ai configuration as a fallback option until you're fully satisfied with the iFlytek implementation.