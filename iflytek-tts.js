/**
 * iFlytek Text-to-Speech Node.js Implementation
 */

const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class IFlytekTTS {
    constructor(config = {}) {
        this.host = config.host || process.env.IFLYTEK_HOST || 'api-dx.xf-yun.com';
        this.appId = config.appId || process.env.IFLYTEK_APP_ID;
        this.apiKey = config.apiKey || process.env.IFLYTEK_API_KEY;
        this.apiSecret = config.apiSecret || process.env.IFLYTEK_API_SECRET;

        // Validate credentials
        if (!this.appId || !this.apiKey || !this.apiSecret) {
            throw new Error('Missing iFlytek credentials. Please set IFLYTEK_APP_ID, IFLYTEK_API_KEY, and IFLYTEK_API_SECRET');
        }

        console.log('✅ iFlytek TTS initialized successfully');
        console.log(`   Host: ${this.host}`);
        console.log(`   App ID: ${this.appId}`);
        console.log(`   API Key: ${this.apiKey.substring(0, 8)}...`);
    }

    /**
     * Generate RFC1123 formatted date
     */
    generateRFC1123Date() {
        return new Date().toUTCString();
    }

    /**
     * Generate authentication parameters
     */
    assembleAuthParams(path) {
        const formatDate = this.generateRFC1123Date();

        // Build signature origin string
        const signatureOrigin = `host: ${this.host}\n` +
                               `date: ${formatDate}\n` +
                               `POST ${path} HTTP/1.1`;

        console.log('🔐 Signature Origin:', JSON.stringify(signatureOrigin));

        // Generate HMAC-SHA256 signature
        const signatureSha = crypto
            .createHmac('sha256', this.apiSecret)
            .update(signatureOrigin)
            .digest('base64');

        console.log('🔑 Generated Signature:', signatureSha);

        // Build authorization string
        const authorizationOrigin = `api_key="${this.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;

        // Base64 encode authorization
        const authorization = Buffer.from(authorizationOrigin).toString('base64');

        return {
            host: this.host,
            date: formatDate,
            authorization: authorization
        };
    }

    /**
     * Generate authenticated URL
     */
    assembleAuthUrl(path) {
        const params = this.assembleAuthParams(path);
        const requestUrl = `http://${this.host}${path}`;
        const queryString = new URLSearchParams(params).toString();
        return `${requestUrl}?${queryString}`;
    }

    /**
     * Create TTS task
     */
    async createTask(text, options = {}) {
        const createPath = '/v1/private/dts_create';
        const authUrl = this.assembleAuthUrl(createPath);

        // Encode text to base64
        const encodedText = Buffer.from(text, 'utf8').toString('base64');

        const requestData = {
            header: {
                app_id: this.appId
            },
            parameter: {
                dts: {
                    vcn: 'x4_lingbosong', // Voice model
                    language: options.language || 'zh',
                    speed: options.speed || 50,
                    volume: options.volume || 50,
                    pitch: options.pitch || 50,
                    rhy: 1,
                    bgs: 0,
                    reg: 0,
                    rdn: 0,
                    scn: 0,
                    audio: {
                        encoding: 'lame', // MP3 format
                        sample_rate: 16000,
                        channels: 1,
                        bit_depth: 16,
                        frame_size: 0
                    },
                    pybuf: {
                        encoding: 'utf8',
                        compress: 'raw',
                        format: 'plain'
                    }
                }
            },
            payload: {
                text: {
                    encoding: 'utf8',
                    compress: 'raw',
                    format: 'plain',
                    text: encodedText
                }
            }
        };

        try {
            console.log('🚀 Creating TTS task...');
            console.log('📝 Request URL:', authUrl);
            console.log('📋 Request Data:', JSON.stringify(requestData, null, 2));

            const response = await axios.post(authUrl, requestData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            console.log('📥 Response Status:', response.status);
            console.log('📄 Response Data:', JSON.stringify(response.data, null, 2));

            if (response.status === 200 && response.data.header.code === 0) {
                const taskId = response.data.header.task_id;
                console.log('✅ Task created successfully, Task ID:', taskId);
                return taskId;
            } else {
                const errorCode = response.data.header?.code || 'unknown';
                const errorMessage = response.data.header?.message || 'Unknown error';
                throw new Error(`Task creation failed: Code ${errorCode}, Message: ${errorMessage}`);
            }
        } catch (error) {
            if (error.response) {
                console.error('❌ HTTP Error:', error.response.status, error.response.statusText);
                console.error('❌ Error Response:', error.response.data);
            } else {
                console.error('❌ Request Error:', error.message);
            }
            throw error;
        }
    }

    /**
     * Query task status and get result
     */
    async queryTask(taskId, maxRetries = 30) {
        const queryPath = '/v1/private/dts_query';
        const authUrl = this.assembleAuthUrl(queryPath);

        const requestData = {
            header: {
                app_id: this.appId,
                task_id: taskId
            }
        };

        for (let i = 0; i < maxRetries; i++) {
            try {
                console.log(`🔍 Querying task status (attempt ${i + 1}/${maxRetries})...`);

                const response = await axios.post(authUrl, requestData, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                });

                console.log('📥 Query Response:', JSON.stringify(response.data, null, 2));

                if (response.status === 200 && response.data.header.code === 0) {
                    const taskStatus = response.data.header.task_status;

                    if (taskStatus === '5') {
                        // Task completed
                        const audioBase64 = response.data.payload.audio.audio;
                        const audioUrl = Buffer.from(audioBase64, 'base64').toString('utf8');
                        console.log('✅ Task completed, Audio URL:', audioUrl);
                        return audioUrl;
                    } else {
                        console.log(`⏳ Task status: ${taskStatus}, waiting...`);
                        // Wait 2 seconds before next query
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } else {
                    const errorCode = response.data.header?.code || 'unknown';
                    const errorMessage = response.data.header?.message || 'Unknown error';
                    throw new Error(`Query failed: Code ${errorCode}, Message: ${errorMessage}`);
                }
            } catch (error) {
                if (error.response) {
                    console.error('❌ Query HTTP Error:', error.response.status, error.response.data);
                } else {
                    console.error('❌ Query Error:', error.message);
                }

                if (i === maxRetries - 1) {
                    throw error;
                }

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        throw new Error('Task query timeout: Maximum retries exceeded');
    }

    /**
     * Download audio file from URL
     */
    async downloadAudio(audioUrl, outputPath) {
        try {
            console.log('📥 Downloading audio from:', audioUrl);

            const response = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Write audio file
            fs.writeFileSync(outputPath, response.data);
            console.log('🎵 Audio file saved:', outputPath);

            return true;
        } catch (error) {
            console.error('❌ Download Error:', error.message);
            throw error;
        }
    }

    /**
     * Convert text to speech (main method)
     * Compatible with Murf.ai interface
     */
    async convertTextToSpeech(text, outputPath, options = {}) {
        try {
            console.log('🎤 Starting iFlytek TTS conversion...');
            console.log(`📝 Text length: ${text.length} characters`);
            console.log(`📁 Output path: ${outputPath}`);

            // Step 1: Create task
            const taskId = await this.createTask(text, options);

            // Step 2: Query task until completion
            const audioUrl = await this.queryTask(taskId);

            // Step 3: Download audio
            await this.downloadAudio(audioUrl, outputPath);

            console.log('✅ iFlytek TTS conversion completed successfully!');
            return true;

        } catch (error) {
            console.error('❌ iFlytek TTS conversion failed:', error.message);
            throw error;
        }
    }
}

/**
 * Drop-in replacement for convertWithMurfAI function
 * Maintains the same interface as the original Murf.ai implementation
 */
async function convertWithIFlytekTTS(text, outputPath, options = {}) {
    try {
        // Use config from options if provided, otherwise fall back to environment variables
        const config = options.config || {
            host: process.env.IFLYTEK_HOST,
            appId: process.env.IFLYTEK_APP_ID,
            apiKey: process.env.IFLYTEK_API_KEY,
            apiSecret: process.env.IFLYTEK_API_SECRET
        };

        const tts = new IFlytekTTS(config);

        // Split text into chunks if too long (iFlytek has character limits)
        const maxChunkLength = 2000; // Conservative limit for iFlytek

        if (text.length <= maxChunkLength) {
            // Single chunk processing
            return await tts.convertTextToSpeech(text, outputPath, options);
        } else {
            // Multi-chunk processing
            console.log(`📄 Text is ${text.length} characters, splitting into chunks...`);

            const chunks = [];
            for (let i = 0; i < text.length; i += maxChunkLength) {
                chunks.push(text.substring(i, i + maxChunkLength));
            }

            console.log(`📋 Processing ${chunks.length} chunks...`);

            const audioFiles = [];

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const chunkPath = outputPath.replace('.mp3', `_part${i + 1}.mp3`);

                console.log(`🔄 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} characters)`);

                await tts.convertTextToSpeech(chunk, chunkPath, options);
                audioFiles.push(chunkPath);

                // Add delay between chunks to respect rate limits
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Use first chunk as main file
            if (audioFiles.length > 0) {
                fs.copyFileSync(audioFiles[0], outputPath);
                console.log(`📁 Main audio file: ${outputPath}`);
                console.log(`📁 Additional parts: ${audioFiles.slice(1).join(', ')}`);
            }

            return true;
        }

    } catch (error) {
        console.error('❌ iFlytek TTS Error:', error.message);
        throw error;
    }
}

/**
 * Utility function to split text into chunks
 */
function splitTextIntoChunks(text, maxLength) {
    const chunks = [];
    const sentences = text.split(/[.!?。！？]\s*/);
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxLength) {
            currentChunk += sentence + '. ';
        } else {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = sentence + '. ';
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
}

module.exports = {
    IFlytekTTS,
    convertWithIFlytekTTS,
    splitTextIntoChunks
};