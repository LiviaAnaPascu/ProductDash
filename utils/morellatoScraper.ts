// Custom scraper configuration for Morellato
// Based on the actual website structure: https://www.morellato.com/catalogo-prodotti-A1_2.htm

import { ScraperConfig, registerBrandScraper } from './advancedScraper';
import * as cheerio from 'cheerio';
import { Product, ProductVariant } from '@/types/product';

// Morellato URL pagination pattern:
// Supports both old pattern (catalogo-prodotti-A1) and new pattern (donna-G2):
// Page 1: catalogo-prodotti-A1.htm or donna-G2.htm
// Page 2: catalogo-prodotti-A1_2.htm or donna-G2_2.htm
// Page 3: catalogo-prodotti-A1_3.htm or donna-G2_3.htm
// etc.

const morellatoUrlBuilder = (baseUrl: string, page: number): string => {
  try {
    // Extract the base URL without the .htm extension
    const urlObj = new URL(baseUrl);
    let pathname = urlObj.pathname;
    
    // Remove existing page number if present (e.g., _2)
    pathname = pathname.replace(/_\d+\.htm$/, '.htm');
    
    // For page 1, use the base URL as-is
    if (page === 1) {
      return `${urlObj.origin}${pathname}`;
    }
    
    // For page 2+, insert _pageNumber before .htm
    pathname = pathname.replace(/\.htm$/, `_${page}.htm`);
    const finalUrl = `${urlObj.origin}${pathname}`;
    
    console.log(`[Morellato URL Builder] Page ${page}: ${finalUrl}`);
    return finalUrl;
  } catch (error: any) {
    console.error(`[Morellato URL Builder] Error building URL for page ${page}:`, error);
    throw new Error(`Invalid base URL: ${baseUrl}`);
  }
};

// Morellato-specific scraper configuration
export const morellatoScraperConfig: ScraperConfig = {
  pagination: {
    type: 'custom',
    customUrlBuilder: morellatoUrlBuilder,
    startPage: 1,
  },
  // Product list selector - based on the actual HTML structure
  // Products are in div.product-layout or div.product-col containers
  productListSelector: '.product-layout, .product-col, [class*="product-layout"], [class*="product-col"]',
  selectors: {
    name: 'h4.name a, .name a, h4 a[href*=".htm"]',
    imageUrl: '.image img, picture img, img[src*="cdn.morellato.com"]',
    price: '.price, p.price',
    description: '.description, [class*="desc"]',
    url: 'h4.name a, .name a, .image a[href*=".htm"]',
    type: '.category, [class*="category"]',
  },
  baseUrl: 'https://www.morellato.com/',
  
  // Custom extraction function for Morellato-specific structure
  extractProduct: ($: cheerio.CheerioAPI, element: any) => {
    const $el = $(element);
    
    // Find product name - in h4.name a or .name a
    let name = $el.find('h4.name a, .name a').first().text().trim();
    if (!name) {
      // Fallback: try to get from any heading or link
      name = $el.find('h2, h3, h4').first().text().trim();
      if (!name) {
        name = $el.find('a[href*=".htm"]').first().text().trim();
      }
    }
    // Remove "Acquista Ora" or similar buttons text
    name = name.replace(/Acquista Ora/gi, '').trim();
    
    // Find image - prioritize main product image (not back-image or placeholder)
    let imageUrl = '';
    
    // Strategy 1: Look for the main image in .image container (not .back-image)
    const $mainImage = $el.find('.image img:not(.back-image)').first();
    if ($mainImage.length > 0) {
      // Prefer src attribute (actual image) over data-src (which might be placeholder)
      const src = $mainImage.attr('src');
      if (src && src.trim() && !src.includes('ph.png') && !src.includes('placeholder')) {
        imageUrl = src.trim();
      } else {
        // Try data-src if src is placeholder
        const dataSrc = $mainImage.attr('data-src');
        if (dataSrc && dataSrc.trim() && !dataSrc.includes('ph.png') && !dataSrc.includes('placeholder')) {
          imageUrl = dataSrc.trim();
        }
      }
      
      // If still no image, try srcset from picture source
      if (!imageUrl) {
        const $source = $el.find('picture source[srcset]').first();
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
    }
    
    // Strategy 2: Fallback - find any img tag (excluding back-image and placeholders)
    if (!imageUrl) {
      $el.find('img:not(.back-image)').each((_, img) => {
        if (imageUrl) return;
        
        const $img = $(img);
        const src = $img.attr('src');
        
        // Skip placeholder images
        if (src && src.trim() && !src.includes('ph.png') && !src.includes('placeholder') && !src.includes('spacer')) {
          imageUrl = src.trim();
        }
      });
    }
    
    // Strategy 3: Look for background images in style attributes
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
    
    // Strategy 4: Look for data attributes that might contain image URLs
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
    
    // Strategy 5: Look in picture/source elements
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
          imageUrl = `https://www.morellato.com${imageUrl}`;
        } else {
          imageUrl = `https://www.morellato.com/${imageUrl}`;
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
      console.warn(`[Morellato Scraper] ⚠️ No image found for product: "${name.substring(0, 50)}"`);
      // Log the HTML structure for debugging
      const htmlSnippet = $el.html()?.substring(0, 200);
      console.warn(`[Morellato Scraper] HTML snippet:`, htmlSnippet);
    }
    
    // Find price - in .price or p.price
    let price = $el.find('.price, p.price').first().text().trim();
    if (!price) {
      // Try to find price in text content (e.g., "109,00 €")
      const text = $el.text();
      const priceMatch = text.match(/(\d+[.,]\d+\s*€)/);
      if (priceMatch) {
        price = priceMatch[1];
      }
    }
    
    // Find product URL - from h4.name a or .image a
    let productUrl = $el.find('h4.name a, .name a').first().attr('href') || '';
    if (!productUrl) {
      // Fallback to image link
      productUrl = $el.find('.image a[href*=".htm"]').first().attr('href') || '';
    }
    if (!productUrl) {
      // Last fallback
      productUrl = $el.find('a[href*=".htm"]').first().attr('href') || '';
    }
    if (productUrl && !productUrl.startsWith('http')) {
      productUrl = `https://www.morellato.com${productUrl.startsWith('/') ? productUrl : '/' + productUrl}`;
    }
    
    // Extract description if available
    const description = $el.find('.description, [class*="desc"]').first().text().trim();
    
    // Try to determine product type from name or categories
    let type = 'Jewelry'; // Default
    const nameLower = name.toLowerCase();
    
    // Helper function to check if name includes any of the given keywords
    const includesAny = (keywords: string[]) => keywords.some(keyword => nameLower.includes(keyword));
    
    if (includesAny(['charm'])) type = 'Charm';
    else if (includesAny(['bracciale', 'bracelet'])) type = 'Bracelet';
    else if (includesAny(['collana', 'necklace'])) type = 'Necklace';
    else if (includesAny(['cavigliera', 'anklet'])) type = 'Anklet';
    else if (includesAny(['anello', 'ring'])) type = 'Ring';
    else if (includesAny(['orecchino', 'orecchini', 'earring', 'earings'])) type = 'Earring';
    else if (includesAny(['orologio', 'watch'])) type = 'Watch';
    else if (includesAny(['ciondolo', 'pendant'])) type = 'Pendant';
    else if (includesAny(['penna', 'pen'])) type = 'Pen';
    else if (includesAny(['spilla', 'brooch'])) type = 'Brooch';
    else if (!includesAny(['bracciale', 'collana', 'anello', 'orecchino', 'orecchini', 'ciondolo',  'penna','spilla'])) type = 'Other';

    // Example: Skip products that don't meet certain criteria
    // Option 1: Return null to skip this product entirely
    if (!imageUrl || name === 'Unknown Product' || type === 'Other') {
      return null; 
    }

    return {
      name: name || 'Unknown Product',
      imageUrl: imageUrl || '',
      gender: 'female',
      price: price || undefined,
      description: description || undefined,
      url: productUrl || 'https://www.morellato.com',
      type,
    };
  },
  
  // Second layer: Extract detailed metadata from individual product page
  extractProductDetails: ($: cheerio.CheerioAPI, productUrl: string, baseProduct: Product) => {
    try {
      const details: Partial<Product['details']> = {};
      
      // Extract SKU/Barcode - usually in product data attributes or meta tags
      const sku = $('[data-product-id], [data-sku], .sku, [class*="sku"]').first().text().trim() ||
                  $('meta[property="product:retailer_item_id"]').attr('content') ||
                  $('meta[property="og:retailer_item_id"]').attr('content') ||
                  '';
      if (sku) details.sku = sku;
      
      // Extract detailed description - look for product description sections
      const detailedDescription = $('.product-description, .description, [class*="description"], [id*="description"]').first().text().trim() ||
                                  $('.product-details, [class*="product-details"]').first().text().trim() ||
                                  '';
      if (detailedDescription) details.detailedDescription = detailedDescription;
      
      // Extract compare-at price (original price if on sale)
      const compareAtPrice = $('.compare-price, .old-price, [class*="compare"], [class*="old-price"], [class*="original-price"]').first().text().trim() ||
                             $('[data-compare-price]').attr('data-compare-price') ||
                             '';
      if (compareAtPrice) {
        details.compareAtPrice = compareAtPrice.replace(/[^\d.,€]/g, '').trim();
      }
      
      // Extract weight - usually in product specifications or details
      const weightText = $('.weight, [class*="weight"], [data-weight]').first().text().trim() ||
                         $('[data-weight]').attr('data-weight') ||
                         '';
      if (weightText) {
        const weightMatch = weightText.match(/(\d+[.,]?\d*)\s*(g|kg|gr|gram|grams)/i);
        if (weightMatch) {
          let weightValue = parseFloat(weightMatch[1].replace(',', '.'));
          const weightUnit = weightMatch[2].toLowerCase();
          
          // Convert kg to grams
          if (weightUnit === 'kg') {
            weightValue = weightValue * 1000;
          }
          
          details.weightValue = Math.round(weightValue);
          details.weightUnit = 'g';
        }
      }
      
      // Extract URL handle (slug) from URL
      const urlParts = productUrl.split('/');
      const urlHandle = urlParts[urlParts.length - 1]?.replace(/\.htm$/, '') || '';
      if (urlHandle) details.urlHandle = urlHandle;
      
      // Extract additional images - product gallery images
      const additionalImages: string[] = [];
      $('.product-gallery img, .product-images img, [class*="gallery"] img, [class*="product-image"] img').each((_, img) => {
        const $img = $(img);
        let imgSrc = $img.attr('src') || 
                    $img.attr('data-src') || 
                    $img.attr('data-lazy-src') ||
                    $img.attr('data-original') ||
                    '';
        
        if (imgSrc && !imgSrc.includes('placeholder') && !imgSrc.includes('ph.png')) {
          // Normalize URL
          if (imgSrc.startsWith('//')) {
            imgSrc = 'https:' + imgSrc;
          } else if (imgSrc.startsWith('/')) {
            imgSrc = `https://www.morellato.com${imgSrc}`;
          } else if (!imgSrc.startsWith('http')) {
            imgSrc = `https://www.morellato.com/${imgSrc}`;
          }
          
          // Skip main image if it's already in baseProduct
          if (imgSrc !== baseProduct.imageUrl && !additionalImages.includes(imgSrc)) {
            additionalImages.push(imgSrc);
          }
        }
      });
      if (additionalImages.length > 0) {
        details.additionalImages = additionalImages;
      }
      
      // Extract tags - usually in meta tags or product attributes
      const tagsText = $('meta[name="keywords"]').attr('content') ||
                       $('[data-tags], [class*="tags"]').attr('data-tags') ||
                       $('.tags, [class*="tags"]').first().text().trim() ||
                       '';
      if (tagsText) {
        const tags = tagsText.split(/[,;]\s*/).map(tag => tag.trim()).filter(Boolean);
        if (tags.length > 0) details.tags = tags;
      }
      
      // Extract SEO title and description
      const seoTitle = $('meta[property="og:title"]').attr('content') ||
                       $('title').text().trim() ||
                       '';
      if (seoTitle) details.seoTitle = seoTitle;
      
      const seoDescription = $('meta[property="og:description"]').attr('content') ||
                             $('meta[name="description"]').attr('content') ||
                             '';
      if (seoDescription) details.seoDescription = seoDescription;
      
      // Extract Google Shopping fields
      const googleGender = $('[data-gender], [class*="gender"]').first().text().trim().toLowerCase();
      if (googleGender === 'male' || googleGender === 'female' || googleGender === 'unisex') {
        details.googleGender = googleGender.charAt(0).toUpperCase() + googleGender.slice(1);
      }
      
      // Extract product category (breadcrumbs or category links)
      const category = $('.breadcrumb a, .category, [class*="breadcrumb"] a').last().text().trim() ||
                       $('[data-category]').attr('data-category') ||
                       '';
      if (category) details.productCategory = category;
      
      // Extract variants (size, color, etc.) if available
      const variants: ProductVariant[] = [];
      $('.product-variants select, [class*="variant"] select, [data-variants]').each((_, select) => {
        const $select = $(select);
        const optionName = $select.attr('name') || $select.find('label').first().text().trim() || '';
        const optionValues: string[] = [];
        
        $select.find('option').each((_, option) => {
          const value = $(option).attr('value') || $(option).text().trim();
          if (value && value !== '') {
            optionValues.push(value);
          }
        });
        
        // For now, create a variant for each option value
        // In a real implementation, you'd need to handle combinations properly
        optionValues.forEach((value, index) => {
          if (index < variants.length) {
            if (optionName.toLowerCase().includes('size')) {
              variants[index].option1Name = 'Size';
              variants[index].option1Value = value;
            } else if (optionName.toLowerCase().includes('color')) {
              variants[index].option2Name = 'Color';
              variants[index].option2Value = value;
            }
          } else {
            variants.push({
              option1Name: optionName.toLowerCase().includes('size') ? 'Size' : undefined,
              option1Value: optionName.toLowerCase().includes('size') ? value : undefined,
              option2Name: optionName.toLowerCase().includes('color') ? 'Color' : undefined,
              option2Value: optionName.toLowerCase().includes('color') ? value : undefined,
            });
          }
        });
      });
      if (variants.length > 0) {
        details.variants = variants;
      }
      
      // Set default values for required fields
      details.requiresShipping = true;
      details.chargeTax = true;
      details.continueSellingWhenOutOfStock = false;
      
      return details;
    } catch (error: any) {
      console.error(`[Morellato Detail Scraper] Error extracting details from ${productUrl}:`, error);
      return null;
    }
  },
};

// Register the scraper
registerBrandScraper('Morellato', morellatoScraperConfig);
