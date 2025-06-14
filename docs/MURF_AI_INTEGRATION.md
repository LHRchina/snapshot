# Murf.ai Text-to-Speech Integration

This document explains how to use the integrated Murf.ai API for high-quality text-to-speech conversion in the news scraping system.

## Features

### 🎵 High-Quality Voice Synthesis
- Professional voice quality using Murf.ai's advanced AI
- Conversational style for natural-sounding news delivery
- Automatic fallback to system TTS if API fails

### 📝 Smart Text Processing
- Automatic text chunking for long content (3000 character limit per request)
- Sentence-aware splitting to maintain natural speech flow
- Multiple audio files for very long summaries

### 🔧 Configuration
- Uses `voiceKey` from `config.json` for API authentication
- Configurable voice settings (currently set to "en-US-charles")
- Rate limiting with 1-second delays between API calls

## Setup

### 1. API Key Configuration
Add your Murf.ai API key to `config.json`:
```json
{
  "voiceKey": "your-murf-ai-api-key-here",
  "websites": [...]
}
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Test the Integration
```bash
# Generate news audio with Murf.ai
node news-to-audio.js --maxNews 3

# Or use npm script
npm run audio
```

## Usage Examples

### Basic Usage
```bash
# Generate audio summary with default settings
node news-to-audio.js
```

### Custom Settings
```bash
# Limit to 5 articles per website
node news-to-audio.js --maxNews 5
```

### Programmatic Usage
```javascript
const { generateNewsAudio, convertWithMurfAI } = require('./news-to-audio.js');

// Generate complete news audio
const result = await generateNewsAudio({ maxNews: 5 });

// Convert specific text to audio
const success = await convertWithMurfAI('Hello world', './output.wav');
```

## API Details

### Murf.ai Configuration
- **Endpoint**: `https://api.murf.ai/v1/speech/generate`
- **Voice**: `en-US-charles` (Professional male voice)
- **Style**: `Conversational`
- **Format**: WAV audio files

### Request Structure
```javascript
{
  "text": "Your text content here",
  "voiceId": "en-US-charles",
  "style": "Conversational"
}
```

### Headers
```javascript
{
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'api-key': 'your-api-key'
}
```

## Output Files

The system generates multiple files:

1. **JSON Data**: `news_audio_[timestamp].json`
   - Complete scraped news data
   - Metadata and article details

2. **Text Summary**: `news_summary_[timestamp].txt`
   - Human-readable news summary
   - Audio script content

3. **Audio File**: `news_audio_[timestamp].mp3`
   - High-quality MP3 audio
   - Generated using Murf.ai or system TTS

4. **Multiple Parts** (if text is long): `news_audio_[timestamp]_part[N].mp3`
   - Separate files for each text chunk
   - Maintains audio quality for long content

## Error Handling

### Automatic Fallback
If Murf.ai API fails, the system automatically falls back to:
1. Windows built-in TTS (System.Speech)
2. Linux/macOS espeak or festival
3. Text file output as last resort

### Common Issues

#### API Key Issues
```
Murf.ai API Error: 401 Unauthorized
```
**Solution**: Check your API key in `config.json`

#### Rate Limiting
```
Murf.ai API Error: 429 Too Many Requests
```
**Solution**: The system includes automatic delays, but you may need to wait before retrying

#### Text Too Long
```
Note: Text was split into 3 audio files due to length
```
**Solution**: This is normal behavior - check for `_part1.wav`, `_part2.wav`, etc.

## Voice Options

You can modify the voice settings in the `convertWithMurfAI` function:

```javascript
const requestData = {
    text: chunk,
    voiceId: "en-US-charles",    // Change voice here
    style: "Conversational"      // Change style here
};
```

### Available Voices (examples)
- `en-US-charles` - Professional male
- `en-US-sarah` - Professional female
- `en-US-mike` - Casual male
- `en-US-emma` - Casual female

### Available Styles
- `Conversational` - Natural, friendly tone
- `Newscast` - Professional news delivery
- `Narrative` - Storytelling style

## Performance

### Processing Time
- ~2-3 seconds per text chunk (3000 characters)
- Additional 1-second delay between chunks
- Total time depends on summary length

### Quality Comparison
- **Murf.ai**: Professional, natural-sounding
- **Windows TTS**: Basic but functional
- **espeak/festival**: Basic quality, good for testing

## Troubleshooting

### Check API Status
```bash
# Test with minimal text
node -e "const {convertWithMurfAI} = require('./news-to-audio.js'); convertWithMurfAI('Test', './test.wav').then(console.log).catch(console.error);"
```

### Verify Dependencies
```bash
npm list axios
npm list puppeteer
```

### Debug Mode
Add console logs to see detailed API responses:
```javascript
console.log('API Response:', response.status, response.headers);
```

## Cost Considerations

- Murf.ai charges per character processed
- Typical news summary: 500-2000 characters
- Consider using `--maxNews` to limit content length
- Monitor your API usage through Murf.ai dashboard

## Integration Benefits

1. **Professional Quality**: Much better than system TTS
2. **Reliability**: Automatic fallback ensures audio is always generated
3. **Flexibility**: Easy to customize voice and style
4. **Scalability**: Handles long content automatically
5. **User Experience**: Natural-sounding news delivery

For more information about Murf.ai API, visit: https://murf.ai/api-documentation