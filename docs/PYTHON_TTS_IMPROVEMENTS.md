# Python Text-to-Speech Synthesis Improvements

This document outlines comprehensive improvements for the `text_speech_synthesis.py` script to enhance code quality, maintainability, and robustness.

## 🐛 Fixed Issues

### 1. NameError: 'query_result' not defined

**Problem**: Variable `query_result` was only defined within an `if` block but used outside its scope.

**Solution**:
- Initialize `query_result = None` before the conditional block
- Add proper error handling for both task creation and query failures
- Ensure all code paths handle the variable appropriately

### 2. Improved Error Handling

**Enhanced `do_create()` function**:
- Added try-catch block for exception handling
- Validate API response format before processing
- Return `None` explicitly on failure
- Include error messages in output

**Enhanced `do_query()` function**:
- Added timeout handling for incomplete tasks
- Return proper URL string instead of bytes
- Handle loop completion without success

## 🔧 Recommended Improvements

### 1. Environment-Based Configuration

**Current Issue**: Hardcoded API credentials in source code

```python
# Current (insecure)
HOST = "api-dx.xf-yun.com"
APP_ID = ""
API_KEY = ""
API_SECRET = ""
```

**Recommended Solution**:

```python
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class TTSConfig:
    def __init__(self):
        self.HOST = os.getenv('TTS_HOST', 'api-dx.xf-yun.com')
        self.APP_ID = os.getenv('TTS_APP_ID')
        self.API_KEY = os.getenv('TTS_API_KEY')
        self.API_SECRET = os.getenv('TTS_API_SECRET')

        if not all([self.APP_ID, self.API_KEY, self.API_SECRET]):
            raise ValueError("Missing required TTS API credentials in environment variables")
```

### 2. Enhanced Input Validation

```python
def validate_input_text(text):
    """Validate input text for TTS processing"""
    if not isinstance(text, str):
        raise TypeError("Input text must be a string")

    if not text.strip():
        raise ValueError("Input text cannot be empty")

    # Check text length limits (adjust based on API requirements)
    max_length = 10000
    if len(text) > max_length:
        raise ValueError(f"Text too long. Maximum {max_length} characters allowed")

    return text.strip()
```

### 3. Robust File Handling

```python
def read_input_file(filename="input.txt"):
    """Safely read input text file"""
    try:
        if not os.path.exists(filename):
            raise FileNotFoundError(f"Input file '{filename}' not found")

        with open(filename, 'r', encoding='utf-8') as file:
            text = file.read()

        return validate_input_text(text)

    except UnicodeDecodeError as e:
        raise ValueError(f"Unable to decode file '{filename}': {e}")
    except Exception as e:
        raise RuntimeError(f"Error reading file '{filename}': {e}")
```

### 4. Improved Download Function

```python
def download_audio(download_url, filename="tts.mp3", timeout=30):
    """Download audio file with proper error handling"""
    try:
        print(f"Downloading audio from: {download_url}")

        response = requests.get(download_url, timeout=timeout, stream=True)
        response.raise_for_status()

        # Ensure output directory exists
        os.makedirs(os.path.dirname(filename) if os.path.dirname(filename) else '.', exist_ok=True)

        with open(filename, 'wb') as file:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file.write(chunk)

        file_size = os.path.getsize(filename)
        print(f"音频保存成功！文件大小: {file_size} bytes")
        return filename

    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"下载失败: {e}")
    except IOError as e:
        raise RuntimeError(f"文件写入失败: {e}")
```

### 5. Logging Implementation

```python
import logging
from datetime import datetime

def setup_logging():
    """Setup logging configuration"""
    log_format = '%(asctime)s - %(levelname)s - %(message)s'
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[
            logging.FileHandler(f'tts_{datetime.now().strftime("%Y%m%d")}.log'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)
```

### 6. Retry Mechanism

```python
import time
from functools import wraps

def retry_on_failure(max_attempts=3, delay=1, backoff=2):
    """Decorator for retry logic with exponential backoff"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            attempts = 0
            current_delay = delay

            while attempts < max_attempts:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    attempts += 1
                    if attempts == max_attempts:
                        raise e

                    print(f"Attempt {attempts} failed: {e}. Retrying in {current_delay} seconds...")
                    time.sleep(current_delay)
                    current_delay *= backoff

            return None
        return wrapper
    return decorator

@retry_on_failure(max_attempts=3, delay=2)
def create_task_with_retry(text):
    """Create TTS task with retry logic"""
    return do_create(text)
```

### 7. Main Function Refactoring

```python
def main():
    """Main execution function with comprehensive error handling"""
    logger = setup_logging()

    try:
        # Initialize configuration
        config = TTSConfig()

        # Read and validate input
        text = read_input_file("input.txt")
        logger.info(f"Processing text of {len(text)} characters")

        # Create task with retry
        task_id = create_task_with_retry(text)
        if not task_id:
            logger.error("Failed to create TTS task after retries")
            return False

        # Query task result
        download_url = do_query(task_id)
        if not download_url:
            logger.error("Failed to get download URL")
            return False

        # Download audio
        filename = download_audio(download_url, "tts.mp3")
        logger.info(f"TTS processing completed successfully: {filename}")
        return True

    except Exception as e:
        logger.error(f"TTS processing failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
```

## 🔒 Security Improvements

### 1. Environment Variables Setup

Create `.env` file:
```env
# iFlytek TTS API Configuration
TTS_HOST=api-dx.xf-yun.com
TTS_APP_ID=your_app_id_here
TTS_API_KEY=your_api_key_here
TTS_API_SECRET=your_api_secret_here

# File Configuration
TTS_INPUT_FILE=input.txt
TTS_OUTPUT_DIR=./audio_output
TTS_LOG_LEVEL=INFO
```

### 2. Credential Validation

```python
def validate_credentials(config):
    """Validate API credentials format"""
    if not config.APP_ID or len(config.APP_ID) < 8:
        raise ValueError("Invalid APP_ID format")

    if not config.API_KEY or len(config.API_KEY) < 20:
        raise ValueError("Invalid API_KEY format")

    if not config.API_SECRET or len(config.API_SECRET) < 20:
        raise ValueError("Invalid API_SECRET format")
```

## 📊 Performance Optimizations

### 1. Async Processing (Optional)

```python
import asyncio
import aiohttp

async def async_query_task(task_id, max_attempts=9):
    """Asynchronous task querying"""
    async with aiohttp.ClientSession() as session:
        for attempt in range(max_attempts):
            await asyncio.sleep(1)
            # Implement async API call
            # ... async implementation
```

### 2. Progress Tracking

```python
from tqdm import tqdm

def query_with_progress(task_id):
    """Query task with progress bar"""
    with tqdm(total=9, desc="Processing TTS") as pbar:
        for i in range(9):
            time.sleep(1)
            pbar.update(1)
            # ... query logic
```

## 🧪 Testing Recommendations

### 1. Unit Tests

```python
import unittest
from unittest.mock import patch, mock_open

class TestTTSFunctions(unittest.TestCase):

    def test_validate_input_text(self):
        # Test valid input
        result = validate_input_text("Hello world")
        self.assertEqual(result, "Hello world")

        # Test empty input
        with self.assertRaises(ValueError):
            validate_input_text("")

    @patch('builtins.open', new_callable=mock_open, read_data='Test content')
    def test_read_input_file(self, mock_file):
        result = read_input_file("test.txt")
        self.assertEqual(result, "Test content")
```

### 2. Integration Tests

```python
def test_full_pipeline():
    """Test complete TTS pipeline with mock API"""
    # Mock API responses and test end-to-end flow
    pass
```

## 📝 Usage Examples

### Basic Usage
```bash
# Set environment variables
export TTS_APP_ID="your_app_id"
export TTS_API_KEY="your_api_key"
export TTS_API_SECRET="your_api_secret"

# Run TTS
python3 text_speech_synthesis.py
```

### Advanced Usage
```python
# Custom configuration
config = TTSConfig()
text = read_input_file("custom_input.txt")
result = process_tts(text, config)
```

## 🔄 Migration Steps

1. **Install dependencies**: `pip install python-dotenv tqdm`
2. **Create `.env` file** with your credentials
3. **Update imports** and add new utility functions
4. **Replace main execution** with improved error handling
5. **Test thoroughly** with various input scenarios
6. **Monitor logs** for any remaining issues

## 📚 Additional Resources

- [iFlytek API Documentation](https://aidocs.xfyun.cn/docs/dts/)
- [Python Logging Best Practices](https://docs.python.org/3/howto/logging.html)
- [Environment Variables in Python](https://python-dotenv.readthedocs.io/)
- [Error Handling Patterns](https://docs.python.org/3/tutorial/errors.html)

---

**Note**: These improvements address the immediate NameError issue while providing a roadmap for comprehensive code quality enhancements. Implement changes incrementally and test thoroughly at each step.