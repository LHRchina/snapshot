# Markdown Output Feature

Both news scraping implementations now automatically generate markdown reports alongside JSON files, providing human-readable news summaries.

## 📋 What's Generated

### For Single Website Scraping:
- **JSON File**: `news_<domain>_<timestamp>.json`
- **Markdown File**: `news_<domain>_<timestamp>.md`

### For Multiple Website Scraping:
- **JSON File**: `news_multiple_sites_<timestamp>.json`
- **Markdown File**: `news_multiple_sites_<timestamp>.md`

## 📖 Markdown Report Structure

### Single Website Report
```markdown
# News Report: example.com

**Source:** https://example.com/
**Scraped At:** 6/12/2025, 4:30:37 PM
**Total Articles:** 5

---

## 1. Article Title

**Link:** [Read Full Article](https://example.com/article1)
**Summary:** Article summary text...
**Image:** ![Article Image](https://example.com/image.jpg)
**Scraped:** 6/12/2025, 4:30:37 PM

---
```

### Multiple Website Report
```markdown
# Multi-Site News Report

**Scraped At:** 6/12/2025, 4:30:37 PM
**Total Websites:** 5
**Total Articles:** 15

---

## Summary

| Website | Status | Articles |
|---------|--------|----------|
| Site 1  | ✅ Success | 3 |
| Site 2  | ❌ Failed  | 0 |

---

## Site 1

**URL:** https://site1.com/
**Status:** ✅ Success
**Articles Found:** 3

### 1. Article Title
...
```

## 🚀 Usage

Markdown files are automatically generated when running either scraper:

```bash
# Puppeteer version
node snapshot.js --config --maxNews 5

# Cheerio version
node snapshot-cheerio.js --config --maxNews 5
```

## 📁 Output Location

All files are saved to the `news_data/` directory:
```
news_data/
├── news_khaleejtimes_com_2025-06-12T16-30-13-510Z.json
├── news_khaleejtimes_com_2025-06-12T16-30-13-510Z.md
├── news_multiple_sites_2025-06-12T16-30-37-544Z.json
└── news_multiple_sites_2025-06-12T16-30-37-544Z.md
```

## ✨ Benefits

### Human-Readable Format
- Easy to read and share
- Professional presentation
- Clickable links to original articles

### Rich Content
- Article titles as headers
- Embedded images
- Summary tables for multiple sites
- Status indicators (✅/❌)

### Version Control Friendly
- Plain text format
- Diff-friendly for tracking changes
- Easy to include in documentation

### Multiple Use Cases
- **Reports**: Share with team members
- **Documentation**: Include in project docs
- **Analysis**: Quick overview of scraped content
- **Archival**: Human-readable backup format

## 🔧 Technical Details

### Markdown Generation Functions
- `generateMarkdown(newsData)` - Single website reports
- `generateMultipleSitesMarkdown(results)` - Multi-site reports

### File Naming Convention
- Timestamps in ISO format with special characters replaced
- Domain names sanitized for filesystem compatibility
- Consistent `.md` extension for markdown files

### Content Features
- Proper markdown formatting
- Responsive tables
- Image embedding
- Link formatting
- Status indicators
- Timestamp formatting

## 📊 Example Output

The markdown reports include:

1. **Header Section**: Site info, scraping timestamp, article count
2. **Summary Table**: Quick overview of all sites (multi-site only)
3. **Detailed Articles**: Full article information with links
4. **Status Indicators**: Visual success/failure indicators
5. **Metadata**: Scraping timestamps and source URLs

## 🔄 Backward Compatibility

- JSON files are still generated (unchanged format)
- All existing functionality preserved
- No breaking changes to CLI arguments
- Same configuration file support

The markdown feature enhances the existing functionality without replacing the structured JSON output, providing the best of both worlds for different use cases.