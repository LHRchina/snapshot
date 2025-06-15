#!/usr/bin/env node
/**
 * Script to modify JSON file by adding summaries to allArticles
 * and creating an overall summary section
 */

const fs = require('fs');
const path = require('path');

// Function to generate meaningful summary from title
function generateSummary(title, domain) {
    // Clean up the title
    let cleanTitle = title.trim();
    
    // Remove common website suffixes
    cleanTitle = cleanTitle.replace(/\s*-\s*(Dubai News|UAE News|Gulf News|Latest news|Arab news|Breaking News|World News|Headlines).*$/i, '');
    cleanTitle = cleanTitle.replace(/\s*\|\s*Emirates24\|7$/i, '');
    cleanTitle = cleanTitle.replace(/\s*-\s*Khaleej Times$/i, '');
    
    // If title is still too generic or empty, create a domain-based summary
    if (cleanTitle.length < 10 || 
        cleanTitle.toLowerCase().includes('breaking news') ||
        cleanTitle.toLowerCase().includes('latest news') ||
        cleanTitle.toLowerCase().includes('world news')) {
        
        const domainSummaries = {
            'khaleejtimes.com': 'Latest news and updates from Khaleej Times covering Dubai, UAE, and Gulf region',
            'gulfnews.com': 'Breaking news and current affairs from Gulf News covering Middle East and international stories',
            'thenationalnews.com': 'Comprehensive news coverage from The National including UAE, regional and global developments',
            'timeoutabudhabi.com': 'Lifestyle, entertainment and cultural news from Timeout Abu Dhabi',
            'emirates247.com': 'Latest breaking news and headlines from Emirates 24|7 covering UAE and regional updates'
        };
        
        const domain = new URL(`https://${Object.keys(domainSummaries).find(d => title.toLowerCase().includes(d.split('.')[0])) || 'unknown.com'}`).hostname;
        return domainSummaries[domain] || `News article from ${domain}`;
    }
    
    // For meaningful titles, create a proper summary
    if (cleanTitle.length > 50) {
        // Truncate long titles and add context
        return cleanTitle.substring(0, 100) + (cleanTitle.length > 100 ? '...' : '') + ` - Latest news update`;
    }
    
    return cleanTitle + ` - Breaking news story covering recent developments`;
}

// Function to create overall summary
function createOverallSummary(data) {
    const date = new Date(data.scrapedAt);
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const totalArticles = data.allArticles.length;
    const successfulWebsites = data.websites.filter(w => w.success).length;
    const totalWebsites = data.totalWebsites;
    
    // Categorize articles by topic
    const topics = {
        politics: 0,
        business: 0,
        technology: 0,
        sports: 0,
        lifestyle: 0,
        breaking: 0,
        regional: 0
    };
    
    data.allArticles.forEach(article => {
        const title = article.title.toLowerCase();
        if (title.includes('israel') || title.includes('iran') || title.includes('politics') || title.includes('government')) {
            topics.politics++;
        } else if (title.includes('business') || title.includes('economy') || title.includes('market')) {
            topics.business++;
        } else if (title.includes('tech') || title.includes('ai') || title.includes('digital')) {
            topics.technology++;
        } else if (title.includes('sport') || title.includes('football') || title.includes('cricket')) {
            topics.sports++;
        } else if (title.includes('lifestyle') || title.includes('travel') || title.includes('culture')) {
            topics.lifestyle++;
        } else if (title.includes('breaking') || title.includes('urgent') || title.includes('alert')) {
            topics.breaking++;
        } else {
            topics.regional++;
        }
    });
    
    // Find top topics
    const topTopics = Object.entries(topics)
        .filter(([_, count]) => count > 0)
        .sort(([_, a], [__, b]) => b - a)
        .slice(0, 3)
        .map(([topic, count]) => `${count} ${topic} ${count === 1 ? 'story' : 'stories'}`)
        .join(', ');
    
    const summary = {
        generatedAt: new Date().toISOString(),
        scrapingDate: formattedDate,
        totalArticles,
        successfulWebsites,
        totalWebsites,
        successRate: `${Math.round((successfulWebsites / totalWebsites) * 100)}%`,
        topTopics: topTopics || 'General news coverage',
        textSummary: `News summary for ${formattedDate}. Successfully scraped ${totalArticles} articles from ${successfulWebsites} out of ${totalWebsites} news sources (${Math.round((successfulWebsites / totalWebsites) * 100)}% success rate). Coverage includes: ${topTopics || 'regional and international news'}. Sources include major UAE and Gulf news outlets providing comprehensive coverage of current events.`,
        sources: data.websites.filter(w => w.success).map(w => ({
            domain: w.domain,
            articleCount: w.articleCount,
            fallbackUsed: w.fallbackUsed || false
        }))
    };
    
    return summary;
}

// Main function to modify the JSON
function modifyJsonSummary(filePath) {
    try {
        console.log(`📖 Reading JSON file: ${filePath}`);
        
        // Read the JSON file
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log(`📝 Processing ${jsonData.allArticles.length} articles...`);
        
        // Add summaries to all articles
        jsonData.allArticles.forEach((article, index) => {
            if (!article.summary || article.summary.trim() === '') {
                article.summary = generateSummary(article.title, article.link);
                console.log(`   ${index + 1}. Updated summary for: ${article.title.substring(0, 50)}...`);
            }
        });
        
        // Create overall summary
        console.log(`📊 Creating overall summary...`);
        jsonData.summary = createOverallSummary(jsonData);
        
        // Create backup
        const backupPath = filePath.replace('.json', '_backup.json');
        fs.writeFileSync(backupPath, JSON.stringify(jsonData, null, 2));
        console.log(`💾 Backup created: ${backupPath}`);
        
        // Write modified JSON
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
        console.log(`✅ Successfully updated JSON file with summaries`);
        
        // Display summary
        console.log(`\n📋 Summary:`);
        console.log(`   Total Articles: ${jsonData.allArticles.length}`);
        console.log(`   Success Rate: ${jsonData.summary.successRate}`);
        console.log(`   Top Topics: ${jsonData.summary.topTopics}`);
        console.log(`   Text Summary: ${jsonData.summary.textSummary}`);
        
        return jsonData;
        
    } catch (error) {
        console.error(`❌ Error modifying JSON:`, error.message);
        throw error;
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
Usage: node modify_json_summary.js <json_file_path>

Example:
  node modify_json_summary.js news_data/news_audio_2025-06-14T10-56-27-141Z.json
`);
        process.exit(1);
    }
    
    const filePath = args[0];
    
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
    }
    
    try {
        modifyJsonSummary(filePath);
        console.log(`\n🎉 JSON modification completed successfully!`);
    } catch (error) {
        console.error(`💥 Failed to modify JSON:`, error.message);
        process.exit(1);
    }
}

module.exports = {
    modifyJsonSummary,
    generateSummary,
    createOverallSummary
};