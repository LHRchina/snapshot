# iFlytek TTS Signature Generation Fix

## Issue Analysis

The current `text_speech_synthesis.py` implementation has the correct signature generation format according to the iFlytek API documentation. The signature_origin string format matches the provided example:

```
host: api-dx.xf-yun.com
date: Thu, 09 Feb 2023 03:37:55 GMT
POST /v1/private/dts_create HTTP/1.1
```

## Current Implementation Status

✅ **Correct signature_origin format**: The code already follows the proper format
✅ **Proper HMAC-SHA256 encryption**: Using the correct algorithm
✅ **Base64 encoding**: Properly implemented
✅ **Authorization header construction**: Following the API specification

## Debugging Recommendations

### 1. Add Debug Logging

```python
def assemble_auth_params(self, path):
    # 生成RFC1123格式的时间戳
    format_date = format_date_time(mktime(datetime.now().timetuple()))
    
    # 拼接字符串 - 按照官方示例格式
    signature_origin = "host: " + self.host + "\n"
    signature_origin += "date: " + format_date + "\n"
    signature_origin += "POST " + path + " HTTP/1.1"
    
    # Debug: Print signature_origin
    print("=== DEBUG: Signature Origin ===")
    print(repr(signature_origin))
    print("=== End Debug ===")
    
    # 进行hmac-sha256加密
    signature_sha = hmac.new(self.api_secret.encode('utf-8'), signature_origin.encode('utf-8'),
                             digestmod=hashlib.sha256).digest()
    signature_sha = base64.b64encode(signature_sha).decode(encoding='utf-8')
    
    # Debug: Print signature
    print(f"Generated signature: {signature_sha}")
    
    # 构建请求参数
    authorization_origin = 'api_key="%s", algorithm="%s", headers="%s", signature="%s"' % (
        self.api_key, "hmac-sha256", "host date request-line", signature_sha)
    
    # Debug: Print authorization
    print(f"Authorization origin: {authorization_origin}")
    
    # 将请求参数使用base64编码
    authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode(encoding='utf-8')
    
    # 将请求的鉴权参数组合为字典
    params = {
        "host": self.host,
        "date": format_date,
        "authorization": authorization
    }
    return params
```

### 2. Credential Validation

```python
def __init__(self):
    self.host = HOST
    self.app_id = APP_ID
    self.api_key = API_KEY
    self.api_secret = API_SECRET
    
    # Validate credentials
    if not all([self.host, self.app_id, self.api_key, self.api_secret]):
        raise ValueError("Missing required credentials. Please check HOST, APP_ID, API_KEY, and API_SECRET.")
    
    print(f"Initialized with host: {self.host}")
    print(f"App ID: {self.app_id}")
    print(f"API Key: {self.api_key[:8]}...")
    print(f"API Secret: {self.api_secret[:8]}...")
```

### 3. Enhanced Error Handling

```python
def test_create(self, text):
    try:
        # 创建任务的路由
        create_path = "/v1/private/dts_create"
        # 拼接鉴权参数后生成的url
        auth_url = self.assemble_auth_url(create_path)
        
        print(f"Request URL: {auth_url}")
        
        # 合成文本
        encode_str = base64.encodebytes(text.encode("UTF8"))
        txt = encode_str.decode()
        
        # 请求头
        headers = {'Content-Type': 'application/json'}
        
        # 请求参数
        data = {
            "header": {
                "app_id": self.app_id,
            },
            "parameter": {
                "dts": {
                    "vcn": "x4_mingge",
                    "language": "zh",
                    "speed": 50,
                    "volume": 50,
                    "pitch": 50,
                    "rhy": 1,
                    "bgs": 0,
                    "reg": 0,
                    "rdn": 0,
                    "scn": 0,
                    "audio": {
                        "encoding": "lame",
                        "sample_rate": 16000,
                        "channels": 1,
                        "bit_depth": 16,
                        "frame_size": 0
                    },
                    "pybuf": {
                        "encoding": "utf8",
                        "compress": "raw",
                        "format": "plain"
                    }
                }
            },
            "payload": {
                "data": {
                    "text": txt,
                    "status": 3
                }
            }
        }
        
        print(f"Request data: {json.dumps(data, indent=2, ensure_ascii=False)}")
        
        response = requests.post(url=auth_url, data=json.dumps(data), headers=headers, timeout=30)
        
        print(f"Response status code: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        print(f"Response content: {response.text}")
        
        return response
        
    except Exception as e:
        print(f"Error in test_create: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
```

## Common Issues and Solutions

### 1. Time Synchronization
- Ensure system time is synchronized
- The date format must be RFC1123 compliant

### 2. Credential Issues
- Verify APP_ID, API_KEY, and API_SECRET are correct
- Check if the account has sufficient permissions
- Ensure the voice model (x4_mingge) is enabled in your account

### 3. Network Issues
- Check firewall settings
- Verify DNS resolution for api-dx.xf-yun.com
- Test with different network connections

### 4. Encoding Issues
- Ensure UTF-8 encoding for Chinese text
- Verify base64 encoding is correct

## Testing Steps

1. **Add debug logging** to see the exact signature_origin being generated
2. **Compare with working examples** from iFlytek documentation
3. **Test with minimal text** to isolate issues
4. **Verify credentials** are active and have proper permissions
5. **Check account status** in iFlytek console

## Environment Variables Migration

For better security, consider moving to environment variables:

```python
import os

# Replace hardcoded values with:
HOST = os.getenv('IFLYTEK_HOST', 'api-dx.xf-yun.com')
APP_ID = os.getenv('IFLYTEK_APP_ID')
API_KEY = os.getenv('IFLYTEK_API_KEY')
API_SECRET = os.getenv('IFLYTEK_API_SECRET')
```

## Conclusion

The signature generation format in the current code is correct. The authentication failures are likely due to:
1. Invalid or expired credentials
2. Account permission issues
3. Network connectivity problems
4. Time synchronization issues

Use the debug logging above to identify the exact cause of the authentication failure.