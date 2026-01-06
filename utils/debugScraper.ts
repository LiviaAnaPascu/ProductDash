// Debug utility to inspect what the scraper is finding
// Use this to test and improve selectors

import * as cheerio from 'cheerio';

export async function debugMorellatoPage(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log('=== DEBUGGING MORELLATO PAGE ===');
    console.log('URL:', url);
    
    // Check product list selectors
    const selectors = [
      'article',
      '.product-item',
      '[class*="product"]',
      '[data-product]',
      '.item',
      '[class*="item"]',
      'li[class*="product"]',
      'div[class*="product"]',
    ];
    
    selectors.forEach(selector => {
      const count = $(selector).length;
      if (count > 0) {
        console.log(`✅ Selector "${selector}": Found ${count} elements`);
        
        // Check first element for image
        const $first = $(selector).first();
        const $img = $first.find('img').first();
        const imgSrc = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src');
        console.log(`   First element image: ${imgSrc || 'NOT FOUND'}`);
      } else {
        console.log(`❌ Selector "${selector}": Found 0 elements`);
      }
    });
    
    // Find all images on the page
    const allImages = $('img').length;
    console.log(`\nTotal images on page: ${allImages}`);
    
    // Check for common image patterns
    const imagePatterns = [
      { attr: 'src', count: $('img[src]').length },
      { attr: 'data-src', count: $('img[data-src]').length },
      { attr: 'data-lazy-src', count: $('img[data-lazy-src]').length },
      { attr: 'data-original', count: $('img[data-original]').length },
      { attr: 'srcset', count: $('img[srcset]').length },
    ];
    
    console.log('\nImage attribute usage:');
    imagePatterns.forEach(pattern => {
      console.log(`  ${pattern.attr}: ${pattern.count} images`);
    });
    
    // Sample first few product-like elements
    console.log('\n=== SAMPLE PRODUCT ELEMENTS ===');
    const productCandidates = $('article, [class*="product"], [class*="item"]').slice(0, 3);
    productCandidates.each((index, el) => {
      const $el = $(el);
      const name = $el.find('h2, h3, h4, a').first().text().trim().substring(0, 50);
      const $img = $el.find('img').first();
      const imgSrc = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || 'NOT FOUND';
      
      console.log(`\nProduct ${index + 1}:`);
      console.log(`  Name: ${name}`);
      console.log(`  Image: ${imgSrc}`);
      console.log(`  HTML snippet: ${$el.html()?.substring(0, 150)}...`);
    });
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

// Usage: Call this in browser console or Node.js
// debugMorellatoPage('https://www.morellato.com/catalogo-prodotti-A1.htm');

