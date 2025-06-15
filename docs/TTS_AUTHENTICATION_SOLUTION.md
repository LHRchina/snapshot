# iFlytek TTS Authentication Issue Resolution

## 🔍 Problem Identified

The debug output clearly shows the authentication failure:
```
响应状态码: 401
响应内容: {"message":"HMAC signature cannot be verified: fail to retrieve credential"}
```

## 🎯 Root Cause Analysis

The error "fail to retrieve credential" indicates that iFlytek's server cannot find the credentials associated with the provided `APP_ID`. This suggests:

1. **Invalid APP_ID**: The APP_ID `` may not exist or be inactive
2. **Incorrect API credentials**: The API_KEY or API_SECRET may be wrong
3. **Account status issues**: The iFlytek account may be suspended or expired
4. **Service not enabled**: The DTS (Dynamic Text-to-Speech) service may not be enabled for this account

## ✅ Signature Format Verification

The signature generation format is **CORRECT**. The debug output shows:
```
'host: api-dx.xf-yun.com\ndate: Sat, 14 Jun 2025 09:47:34 GMT\nPOST /v1/private/dts_create HTTP/1.1'
```

This matches the required format exactly:
- ✅ `host: api-dx.xf-yun.com`
- ✅ `date: [RFC1123 format]`
- ✅ `POST /v1/private/dts_create HTTP/1.1`

## 🔧 Immediate Solutions

### 1. Verify iFlytek Account Credentials

**Action Required**: Log into your iFlytek console and verify:

1. **Account Status**: Ensure your account is active and not suspended
2. **Service Activation**: Confirm that the "语音合成" (Speech Synthesis) service is enabled
3. **App Configuration**: Check that your app has the correct permissions
4. **Credential Accuracy**: Verify APP_ID, API_KEY, and API_SECRET are correct

### 2. Get Fresh Credentials

**Steps to obtain new credentials**:

1. Visit [iFlytek Console](https://console.xfyun.cn/)
2. Log in to your account
3. Navigate to "我的应用" (My Applications)
4. Create a new application or select existing one
5. Enable "语音合成" service
6. Copy the new APP_ID, API_KEY, and API_SECRET

### 3. Test with Minimal Configuration

```python
# Test script with new credentials
if __name__ == "__main__":
    # Replace with your actual credentials from iFlytek console
    HOST = "api-dx.xf-yun.com"
    APP_ID = "your_new_app_id_here"  # Get from console
    API_KEY = "your_new_api_key_here"  # Get from console
    API_SECRET = "your_new_api_secret_here"  # Get from console

    # Test with simple text
    test_text = "你好，这是一个测试。"

    try:
        task_id = do_create(test_text)
        if task_id:
            print(f"✅ 认证成功！任务ID: {task_id}")
        else:
            print("❌ 认证失败")
    except Exception as e:
        print(f"❌ 错误: {e}")
```

### 4. Environment Variables Setup

**For security, use environment variables**:

```bash
# Add to your .env file or export directly
export IFLYTEK_HOST="api-dx.xf-yun.com"
export IFLYTEK_APP_ID="your_app_id"
export IFLYTEK_API_KEY="your_api_key"
export IFLYTEK_API_SECRET="your_api_secret"
```

```python
# Update the script to use environment variables
import os

HOST = os.getenv('IFLYTEK_HOST', 'api-dx.xf-yun.com')
APP_ID = os.getenv('IFLYTEK_APP_ID')
API_KEY = os.getenv('IFLYTEK_API_KEY')
API_SECRET = os.getenv('IFLYTEK_API_SECRET')

if not all([APP_ID, API_KEY, API_SECRET]):
    print("❌ 错误: 请设置环境变量 IFLYTEK_APP_ID, IFLYTEK_API_KEY, IFLYTEK_API_SECRET")
    sys.exit(1)
```

## 🔍 Debugging Steps

### Step 1: Verify Network Connectivity
```bash
# Test DNS resolution
nslookup api-dx.xf-yun.com

# Test HTTP connectivity
curl -I https://api-dx.xf-yun.com
```

### Step 2: Validate Credentials Format
```python
# Add this validation to your script
def validate_credentials():
    print(f"APP_ID length: {len(APP_ID)} (should be 8)")
    print(f"API_KEY length: {len(API_KEY)} (should be 32)")
    print(f"API_SECRET length: {len(API_SECRET)} (should be 32)")

    if len(APP_ID) != 8:
        print("❌ APP_ID格式错误")
    if len(API_KEY) != 32:
        print("❌ API_KEY格式错误")
    if len(API_SECRET) != 32:
        print("❌ API_SECRET格式错误")
```

### Step 3: Test with iFlytek's Official Example

Download and test with iFlytek's official Python SDK to confirm your credentials work.

## 🚀 Alternative Solutions

### Option 1: Use Different Voice Service

If iFlytek continues to have issues, consider alternatives:

```javascript
// Use the existing Node.js implementation with Murf.ai
node enhanced_translation_tts.js "测试文本"
```

### Option 2: Hybrid Approach

```python
# Fallback to system TTS if iFlytek fails
import subprocess

def fallback_tts(text, output_file="fallback.mp3"):
    try:
        # macOS built-in TTS
        subprocess.run(["say", "-o", output_file, text], check=True)
        print(f"✅ 使用系统TTS生成: {output_file}")
        return True
    except:
        print("❌ 系统TTS也失败了")
        return False
```

## 📋 Action Checklist

- [ ] **Verify iFlytek account status**
- [ ] **Get fresh credentials from console**
- [ ] **Enable speech synthesis service**
- [ ] **Test with minimal script**
- [ ] **Set up environment variables**
- [ ] **Validate credential formats**
- [ ] **Test network connectivity**
- [ ] **Consider alternative TTS services**

## 🎯 Expected Results

After updating credentials, you should see:
```
✅ Initialized iFlytek TTS with:
  Host: api-dx.xf-yun.com
  App ID: [your_app_id]
  API Key: [first_8_chars]...
  API Secret: [first_8_chars]...

响应状态码: 200
响应内容: {"header":{"code":0,"message":"success","task_id":"..."}}
```

## 🔗 Useful Resources

- [iFlytek Console](https://console.xfyun.cn/)
- [iFlytek DTS API Documentation](https://aidocs.xfyun.cn/docs/dts/)
- [iFlytek Python SDK](https://github.com/iFLYTEK-OP/websdk-python)

---

**Next Steps**: Update your credentials and test again. The signature generation is working correctly - the issue is purely with credential authentication.