# iFlytek TTS 403 Forbidden Error - Root Cause Analysis and Fix

## Problem Summary

The iFlytek TTS integration was failing with a **403 Forbidden** error and "not found" message, while the Python script `text_speech_synthesis.py` was working correctly.

## Root Cause Analysis

### The Issue
The problem was a **host configuration mismatch** between different iFlytek services:

- **OTS (Online Translation Service)**: Uses host `ntrans.xfyun.cn`
- **TTS (Text-to-Speech Service)**: Uses host `api-dx.xf-yun.com`

### What Was Wrong
1. The `config.json` file contained only OTS configuration:
   ```json
   "ots": {
     "host": "ntrans.xfyun.cn",
     "hostUrl": "https://ntrans.xfyun.cn/v2/ots",
     "uri": "/v2/ots"
   }
   ```

2. The JavaScript code was using the OTS host for TTS requests
3. iFlytek's TTS service rejected requests to the wrong host with 403 Forbidden

### Why Python Worked
The Python script `text_speech_synthesis.py` had the correct TTS host hardcoded:
```python
HOST = "api-dx.xf-yun.com"  # Correct TTS host
```

## The Fix

### 1. Updated Configuration Structure
Added separate TTS configuration to `config.json`:
```json
{
  "ots": {
    "host": "ntrans.xfyun.cn",
    "hostUrl": "https://ntrans.xfyun.cn/v2/ots",
    "uri": "/v2/ots",
    "_comment": "OTS configuration for translation service"
  },
  "tts": {
    "host": "api-dx.xf-yun.com",
    "appid": "",
    "apiKey": "",
    "apiSecret": "",
    "_comment": "TTS configuration for text-to-speech service"
  }
}
```

### 2. Updated news-to-audio.js
Modified the iFlytek configuration to use the correct TTS host:
```javascript
const iflytekConfig = {
    host: config.tts?.host || 'api-dx.xf-yun.com',  // Use TTS host
    appId: iflytekAppId,
    apiKey: iflytekApiKey,
    apiSecret: iflytekApiSecret
};
```

## Verification Results

### Before Fix
```
❌ HTTP Error: 403 Forbidden
❌ Error Response: { message: 'not found' }
❌ iFlytek TTS conversion failed: Request failed with status code 403
```

### After Fix
```
✅ iFlytek TTS conversion completed successfully!
🎵 Audio file saved: /Users/lihaoran/Documents/projects/snapshot/news_data/news_audio_2025-06-14T12-21-31-587Z.mp3
✅ News audio generation completed successfully!
```

## Technical Details

### iFlytek Service Architecture
iFlytek provides multiple AI services on different hosts:

| Service | Host | Purpose |
|---------|------|----------|
| OTS | `ntrans.xfyun.cn` | Online Translation Service |
| TTS | `api-dx.xf-yun.cn` | Text-to-Speech Service |
| ASR | `iat-api.xfyun.cn` | Automatic Speech Recognition |

### Authentication
Both services use the same authentication method:
- HMAC-SHA256 signature with API secret
- Base64 encoded authorization header
- Same app ID, API key, and API secret

### Request Endpoints
- **OTS**: `https://ntrans.xfyun.cn/v2/ots`
- **TTS**: `https://api-dx.xf-yun.cn/v1/private/dts_create`

## Files Modified

1. **config.json**: Added separate TTS configuration section
2. **news-to-audio.js**: Updated to use TTS host configuration
3. **Created backup**: `config.json.backup` for safety

## Key Learnings

1. **Service-Specific Hosts**: Different iFlytek services require different hosts
2. **Configuration Separation**: OTS and TTS should have separate configurations
3. **Error Interpretation**: 403 Forbidden can indicate wrong service endpoint
4. **Testing Strategy**: Compare working implementations (Python vs JavaScript)

## Best Practices

1. **Separate Configurations**: Keep different service configurations separate
2. **Fallback Values**: Always provide fallback host values in code
3. **Documentation**: Document which host is for which service
4. **Testing**: Test each service integration independently

## Future Improvements

1. **Validation**: Add host validation in TTS initialization
2. **Error Handling**: Provide more specific error messages for host mismatches
3. **Configuration Schema**: Define JSON schema for service configurations
4. **Environment Variables**: Support environment-specific host overrides

## Conclusion

The 403 Forbidden error was caused by using the wrong host for iFlytek TTS service. The fix involved:
1. Identifying the correct TTS host (`api-dx.xf-yun.cn`)
2. Adding separate TTS configuration to `config.json`
3. Updating the JavaScript code to use the correct host

This fix maintains backward compatibility while ensuring proper service endpoint usage.