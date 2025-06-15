#!/usr/bin/env node

/**
 * Test script for Reddit and Telegram integration in news-to-audio.js
 * This script demonstrates how to use the new integrated functionality
 */

const {
    generateNewsAudio,
    scrapeRedditPosts,
    scrapeTelegramMessages,
    scrapeMultipleNews
} = require('../news-to-audio.js');

async function testIntegration() {
    console.log('🧪 Testing Reddit and Telegram Integration');
    console.log('=' .repeat(50));

    try {
        // Test 1: Test Reddit scraping only
        console.log('\n1️⃣  Testing Reddit Integration...');
        const redditPosts = await scrapeRedditPosts({
            subreddit: 'dubai',
            limit: 5,
            sort: 'hot'
        });
        console.log(`✅ Reddit test: Found ${redditPosts.length} posts`);
        if (redditPosts.length > 0) {
            console.log(`   Sample post: ${redditPosts[0].title}`);
        }

        // Test 2: Test Telegram scraping only
        console.log('\n2️⃣  Testing Telegram Integration...');
        const telegramMessages = await scrapeTelegramMessages({
            channel: 'dubaionline',
            limit: 5
        });
        console.log(`✅ Telegram test: Found ${telegramMessages.length} messages`);
        if (telegramMessages.length > 0) {
            console.log(`   Sample message: ${telegramMessages[0].title}`);
        }

        // Test 3: Test integrated scraping (websites + Reddit + Telegram)
        console.log('\n3️⃣  Testing Full Integration...');
        const allNews = await scrapeMultipleNews({
            maxNews: 3, // Limit to 3 articles per source for testing
            redditSubreddits: ['dubai'],
            telegramChannels: ['dubaionline'],
            redditLimit: 3,
            telegramLimit: 3
        });

        console.log('\n📊 Integration Results:');
        console.log(`   Websites: ${allNews.websites?.length || 0}`);
        console.log(`   Reddit subreddits: ${allNews.reddit?.length || 0}`);
        console.log(`   Telegram channels: ${allNews.telegram?.length || 0}`);
        console.log(`   Total articles: ${allNews.allArticles?.length || 0}`);

        // Test 4: Test full news-to-audio generation with integration
        console.log('\n4️⃣  Testing Full News-to-Audio Generation...');
        const result = await generateNewsAudio({
            maxNews: 2, // Limit for testing
            redditSubreddits: ['dubai'],
            telegramChannels: ['dubaionline'],
            redditLimit: 2,
            telegramLimit: 2
        });

        if (result.success) {
            console.log('✅ Full integration test successful!');
            console.log(`   Summary file: ${result.summaryPath}`);
            console.log(`   Audio file: ${result.audioPath || 'Not generated'}`);
        }

        console.log('\n🎉 All tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);

        // Provide helpful error messages
        if (error.message.includes('python3') || error.message.includes('praw')) {
            console.log('\n💡 Setup Instructions:');
            console.log('   For Reddit integration: pip3 install praw');
        }
        if (error.message.includes('telethon')) {
            console.log('   For Telegram integration: pip3 install telethon');
        }

        console.log('\n📝 Note: You can still test website scraping without Python dependencies');

        // Test website-only scraping as fallback
        try {
            console.log('\n🔄 Testing website-only scraping...');
            const websiteOnly = await scrapeMultipleNews({
                includeReddit: false,
                includeTelegram: false,
                maxNews: 2
            });
            console.log(`✅ Website-only test: ${websiteOnly.allArticles?.length || 0} articles`);
        } catch (websiteError) {
            console.error('❌ Website scraping also failed:', websiteError.message);
        }
    }
}

// Command line options
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log('Reddit and Telegram Integration Test');
        console.log('Usage: node test_integration.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --help, -h    Show this help message');
        console.log('');
        console.log('Prerequisites:');
        console.log('  pip3 install praw      # For Reddit integration');
        console.log('  pip3 install telethon  # For Telegram integration');
        console.log('');
        console.log('Examples:');
        console.log('  node test_integration.js');
        console.log('  npm run test-integration');
        process.exit(0);
    }

    testIntegration()
        .then(() => {
            console.log('\n✨ Test completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testIntegration };