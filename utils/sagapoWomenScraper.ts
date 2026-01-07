// Custom scraper configuration for S'agapo Women 
// Based on the actual website structure: https://www.sagapo.it/donna

import { ScraperConfig, registerBrandScraper } from './advancedScraper';
import * as cheerio from 'cheerio';
import { Product } from '@/types/product';

// Sagapo URL pagination pattern:
// Page 1: donna
// Page 2: donna?p=2
// Page 3: donna?p=3
// etc.

const sagapoWomenUrlBuilder = (baseUrl: string, page: number): string => {
  // Extract the base URL
  const urlObj = new URL(baseUrl);
  let pathname = urlObj.pathname;
  
  // Remove existing page number if present (e.g., _2)
  pathname = pathname.replace(/\?p=\d+\$/, '#');
  // For page 1, use the base URL as-is
  if (page === 1) {
    return `${urlObj.origin}${pathname}`;
  }
  
  // For page 2+, insert _pageNumber before .htm
  pathname = pathname.replace(/\d+\$/, `${page}`);
  return `${urlObj.origin}${pathname}`;
};

// Sagapo-specific scraper configuration
export const sagapoWomenScraperConfig: ScraperConfig = {
  pagination: {
    type: 'custom',
    customUrlBuilder: sagapoWomenUrlBuilder,
    startPage: 1,
  },
  // Product list selector - based on the HTML structure
  // Products appear to be in a grid/list format
  // Try multiple selectors to catch all products
  productListSelector: '.product-item , [class*="product"], [data-product], .item, [class*="item"], li[class*="product"], div[class*="product"]',
  selectors: {
    name: '.product-item-name, [class*="name"], a[class*="product-item-link"]',
    imageUrl: '.price, [class*="price"], [data-price]',
    price: '.price, [class*="price"], [data-price]',
    description: '.product sku product-item-sku, [class*="sku"]',
    url: '.product-item-link',
  },
  baseUrl: 'https://www.sagapo.it/donna',
  
  // Custom extraction function for S'agapo-specific structure
  extractProduct: ($: cheerio.CheerioAPI, element: any) => {
    const $el = $(element);
    console.log('hi i found elements element', element);
    // Find product name - in this instance it is a specific class
    let name = $el.find('.product-item-name').first().text().trim();
    if (!name) {
      // Try to get from link text
      name = $el.find('a[href*="/"]').first().text().trim();
    }
    
    // Find image - be very aggressive in finding images
    let imageUrl = '';
    
    // Strategy 1: Find all img tags in the element and try each one
    const $allImages = $el.find('[class*="product-image-photo"]');
    if ($allImages.length > 0) {
      // Try each image in order
      $allImages.each((_, img) => {
        if (imageUrl) return; // Already found one
        
        const $img = $(img);
        
        // Try multiple image source attributes in order of preference
        const imageAttrs = [
          'data-src',      // Lazy loading
          'data-lazy-src', // Alternative lazy loading
          'data-original', // Original image
          'data-image',    // Image data
          'data-lazy',     // Another lazy loading variant
          'src',           // Standard src
        ];
        
        for (const attr of imageAttrs) {
          const url = $img.attr(attr);
          if (url && url.trim() && !url.includes('placeholder') && !url.includes('spacer')) {
            imageUrl = url.trim();
            break;
          }
        }
        
        // If no image found, try srcset
        if (!imageUrl) {
          const srcset = $img.attr('srcset');
          if (srcset) {
            // Get the largest image from srcset (usually the last one)
            const srcsetParts = srcset.split(',');
            if (srcsetParts.length > 0) {
              // Get the last entry (usually highest resolution)
              const lastPart = srcsetParts[srcsetParts.length - 1]?.trim();
              if (lastPart) {
                const firstSrc = lastPart.split(' ')[0];
                if (firstSrc && !firstSrc.includes('placeholder')) {
                  imageUrl = firstSrc;
                }
              }
            }
          }
        }
      });
    }
    
    // Strategy 2: Look for background images in style attributes
    if (!imageUrl) {
      $el.find('[style*="background-image"], [style*="background:"]').each((_, el) => {
        if (imageUrl) return;
        const style = $(el).attr('style') || '';
        const bgMatch = style.match(/url\(['"]?([^'")]+)['"]?\)/);
        if (bgMatch && bgMatch[1]) {
          const url = bgMatch[1].trim();
          if (!url.includes('placeholder') && !url.includes('spacer')) {
            imageUrl = url;
          }
        }
      });
    }
    
    // Strategy 3: Look for data attributes that might contain image URLs
    if (!imageUrl) {
      const dataAttrs = $el.find('[data-image], [data-img], [data-photo], [data-picture]');
      dataAttrs.each((_, el) => {
        if (imageUrl) return;
        const $dataEl = $(el);
        const url = $dataEl.attr('data-image') || 
                   $dataEl.attr('data-img') || 
                   $dataEl.attr('data-photo') ||
                   $dataEl.attr('data-picture');
        if (url && url.trim() && !url.includes('placeholder')) {
          imageUrl = url.trim();
        }
      });
    }
    
    // Strategy 4: Look in picture/source elements
    if (!imageUrl) {
      const $source = $el.find('picture source, source[srcset]').first();
      if ($source.length > 0) {
        const srcset = $source.attr('srcset');
        if (srcset) {
          const parts = srcset.split(',');
          if (parts.length > 0) {
            const lastPart = parts[parts.length - 1]?.trim();
            if (lastPart) {
              imageUrl = lastPart.split(' ')[0];
            }
          }
        }
      }
    }
    
    // Clean up and normalize the URL
    if (imageUrl) {
      // Remove query parameters that might cause issues
      imageUrl = imageUrl.split('?')[0].split('#')[0];
      
      // Handle relative URLs
      if (!imageUrl.startsWith('http')) {
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = `https://www.sagapo.it/${imageUrl}`;
        } else {
          imageUrl = `https://www.sagapo.it/${imageUrl}`;
        }
      }
      
      // Validate URL format
      try {
        new URL(imageUrl);
      } catch {
        // Invalid URL, reset
        imageUrl = '';
      }
    }
    
    // Debug logging for missing images
    if (!imageUrl && name) {
      console.warn(`[Sagapo Scraper] ⚠️ No image found for product: "${name.substring(0, 50)}"`);
      // Log the HTML structure for debugging
      const htmlSnippet = $el.html()?.substring(0, 200);
      console.warn(`[Sagapo Scraper] HTML snippet:`, htmlSnippet);
    }
    
    // If still no image, try to find it in parent elements
    if (!imageUrl && name) {
      let $parent = $el.parent();
      let depth = 0;
      while ($parent.length > 0 && depth < 3) {
        const $parentImg = $parent.find('img').first();
        if ($parentImg.length > 0) {
          const parentImgSrc = $parentImg.attr('src') || 
                              $parentImg.attr('data-src') || 
                              $parentImg.attr('data-lazy-src');
          if (parentImgSrc && parentImgSrc.trim() && !parentImgSrc.includes('placeholder')) {
            imageUrl = parentImgSrc.trim();
            if (!imageUrl.startsWith('http')) {
              if (imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
              } else if (imageUrl.startsWith('/')) {
                imageUrl = `https://www.sagapo.it${imageUrl}`;
              } else {
                imageUrl = `https://www.sagapo.it/${imageUrl}`;
              }
            }
            console.log(`[Sagapo Scraper] ✅ Found image in parent for: ${name.substring(0, 50)}`);
            break;
          }
        }
        $parent = $parent.parent();
        depth++;
      }
    }
    
    // Find price - look for euro symbol or price patterns
    let price = $el.find('.price, [class*="price"]').first().text().trim();
    if (!price) {
      // Try to find price in text content (e.g., "11,70 €")
      const text = $el.text();
      const priceMatch = text.match(/(\d+[.,]\d+\s*€)/);
      if (priceMatch) {
        price = priceMatch[1];
      }
    }
    
    // Find product URL
    let productUrl = $el.find('a[href*="/"]').first().attr('href') || '';
    if (productUrl && !productUrl.startsWith('http')) {
      productUrl = `https://www.sagapo.it${productUrl.startsWith('/') ? productUrl : '/' + productUrl}`;
    }
    
    // Extract description if available
    const description = $el.find('.product-item-link, [class*="name"]').first().text().trim();
    
    // Try to determine product type from name or categories
    let type = 'Jewelry'; // Default
    const nameLower = name.toLowerCase();
    if (nameLower.includes('charm')) type = 'Charm';
    else if (nameLower.includes('bracciale') || nameLower.includes('bracelet')) type = 'Bracelet';
    else if (nameLower.includes('collana') || nameLower.includes('necklace')) type = 'Necklace';
    else if (nameLower.includes('anello') || nameLower.includes('ring')) type = 'Ring';
    else if (nameLower.includes('orecchino') || nameLower.includes('earring')) type = 'Earring';
    else if (nameLower.includes('orologio') || nameLower.includes('watch')) type = 'Watch';
    
    return {
      name: name || 'Unknown Product',
      imageUrl: imageUrl || '',
      price: price || undefined,
      description: description || undefined,
      url: productUrl || 'https://www.sagapo.it',
      type,
    };
  },
};

// Register the scraper
registerBrandScraper('Sagapo', sagapoWomenScraperConfig);
