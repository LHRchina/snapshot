const fs = require('fs');
const path = require('path');

// Function to convert JSON file to formatted text file
function convertJsonToTxt(jsonFilePath) {
  try {
    // Read the JSON file
    const jsonData = fs.readFileSync(jsonFilePath, 'utf8');
    const data = JSON.parse(jsonData);
    
    // Create a formatted text representation
    const txtContent = formatJsonAsText(data);
    
    // Generate output path (same name but .txt extension)
    const txtFilePath = jsonFilePath.replace('.json', '.txt');
    
    // Write to text file
    fs.writeFileSync(txtFilePath, txtContent, 'utf8');
    
    console.log(`Conversion complete: ${jsonFilePath} → ${txtFilePath}`);
    return txtFilePath;
  } catch (error) {
    console.error(`Error converting JSON to text: ${error.message}`);
    return null;
  }
}

// Function to format JSON data as readable text
function formatJsonAsText(data) {
  let text = '';
  
  // Add header information
  text += `NEWS REPORT\n`;
  text += `===========\n\n`;
  text += `Total Websites: ${data.totalWebsites}\n`;
  text += `Scraped At: ${data.scrapedAt}\n\n`;
  
  // Process each website
  data.websites.forEach(website => {
    text += `WEBSITE: ${website.name}\n`;
    text += `URL: ${website.url}\n`;
    text += `Articles Found: ${website.articlesFound}\n\n`;
    
    // Process each article
    website.articles.forEach((article, index) => {
      text += `Article ${index + 1}:\n`;
      text += `  Title: ${article.title}\n`;
      text += `  Link: ${article.link}\n`;
      if (article.summary) {
        text += `  Summary: ${article.summary}\n`;
      }
      if (article.image) {
        text += `  Image: ${article.image}\n`;
      }
      text += `  Scraped At: ${article.scrapedAt}\n\n`;
    });
    
    text += `-----------------------------------\n\n`;
  });
  
  return text;
}

// Get the JSON file path from command line arguments or use default
const jsonFilePath = process.argv[2] || 'news_data/news_multiple_sites_2025-06-12T16-36-06-362Z.json';

// Convert the file
convertJsonToTxt(jsonFilePath);