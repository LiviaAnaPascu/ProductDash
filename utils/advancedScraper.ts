import * as cheerio from 'cheerio';
import { Product } from '@/types/product';
// Database imports commented out
// import { Brand } from '@prisma/client';
import { ScrapingProgress } from '@/services/scraperService';
import { Brand } from '@/lib/brandStore';

export interface ScraperConfig {
  // Pagination configuration
  pagination?: {
    type: 'url-param' | 'url-path' | 'selector' | 'custom'; // How pagination works
    paramName?: string; // e.g., 'page', 'p'
    pathPattern?: string; // e.g., '/page/{page}'
    selector?: string; // CSS selector for pagination links
    startPage?: number; // Starting page number
    customUrlBuilder?: (baseUrl: string, page: number) => string; // Custom URL builder function
  };
  
  // Product list selector
  productListSelector: string; // CSS selector for product container
  
  // Product field selectors
  selectors: {
    name: string;
    imageUrl: string;
    price?: string;
    description?: string;
    url?: string;
    type?: string;
  };
  
  // URL building
  baseUrl?: string;
  productUrlPrefix?: string; // If product URLs are relative
  
  // Custom extraction function (optional)
  // Return null or undefined to skip the product
  extractProduct?: ($: cheerio.CheerioAPI, element: any) => Partial<Product> | null | undefined;
  
  // Optional filter function to skip products based on extracted data
  // Return false to skip the product, true to include it
  shouldIncludeProduct?: (product: Partial<Product>) => boolean;
  
  // Second layer: Extract detailed metadata from individual product page
  // This function will be called for each product's detail page URL
  // Return null/undefined if details couldn't be extracted
  extractProductDetails?: (
    $: cheerio.CheerioAPI,
    productUrl: string,
    baseProduct: Product
  ) => Partial<Product['details']> | null | undefined;
}

// Generic pagination handler
async function fetchPage(url: string, page: number, config: ScraperConfig): Promise<string> {
  let pageUrl = url;
  
  if (config.pagination) {
    const { type, paramName = 'page', pathPattern, startPage = 1, customUrlBuilder } = config.pagination;
    
    if (type === 'url-param') {
      const urlObj = new URL(url);
      urlObj.searchParams.set(paramName, String(page + startPage - 1));
      pageUrl = urlObj.toString();
    } else if (type === 'url-path' && pathPattern) {
      pageUrl = url.replace(/\{page\}/g, String(page + startPage - 1));
    } else if (type === 'custom' && customUrlBuilder) {
      pageUrl = customUrlBuilder(url, page);
    }
    // For selector-based pagination, we'd need to extract from previous page
  }
  
  const response = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch page ${page}: ${response.statusText}`);
  }
  
  return response.text();
}

// Extract products from a single page
function extractProductsFromPage(
  html: string,
  config: ScraperConfig,
  brand: Brand
): Product[] {
  const $ = cheerio.load(html);
  const products: Product[] = [];
  
  $(config.productListSelector).each((index, element) => {
    try {
      const $el = $(element);
      let product: Partial<Product> | null = null;
      
      // Use custom extractor if provided
      if (config.extractProduct) {
        const extracted = config.extractProduct($, element);
        // Skip product if extractor returns null/undefined
        if (!extracted) {
          return; // Skip this iteration
        }
        product = extracted;
      } else {
        // Default extraction using selectors
        const name = $el.find(config.selectors.name).first().text().trim();
        let imageUrl = $el.find(config.selectors.imageUrl).first().attr('src') || 
                      $el.find(config.selectors.imageUrl).first().attr('data-src') || '';
        
        // Handle relative URLs
        if (imageUrl && !imageUrl.startsWith('http')) {
          const base = config.baseUrl || brand.website;
          imageUrl = new URL(imageUrl, base).toString();
        }
        
        const price = config.selectors.price 
          ? $el.find(config.selectors.price).first().text().trim() 
          : undefined;
        
        const description = config.selectors.description
          ? $el.find(config.selectors.description).first().text().trim()
          : undefined;
        
        let productUrl = config.selectors.url
          ? $el.find(config.selectors.url).first().attr('href') || ''
          : '';
        
        if (productUrl && !productUrl.startsWith('http')) {
          const base = config.baseUrl || brand.website;
          productUrl = new URL(productUrl, base).toString();
        }
        
        const type = config.selectors.type
          ? $el.find(config.selectors.type).first().text().trim()
          : 'General';
        
        product = {
          name,
          imageUrl,
          price,
          description,
          url: productUrl || brand.website,
          type,
        };
      }
      
      // Skip if no product was extracted
      if (!product) {
        return; // Skip this iteration
      }
      
      // Apply filter function if provided
      if (config.shouldIncludeProduct && !config.shouldIncludeProduct(product)) {
        return; // Skip this product
      }
      
      // Allow products without images (they'll show placeholder)
      if (product.name) {
        products.push({
          id: `${brand.id}-${index}-${Date.now()}`,
          name: product.name!,
          brand: brand.name,
          type: product.type || 'General',
          gender: product.gender || 'female',
          price: product.price,
          imageUrl: product.imageUrl || '', // Allow empty string for placeholder
          description: product.description,
          url: product.url || brand.website,
          metadata: product.metadata,
        });
        
        // Log if image is missing
        if (!product.imageUrl) {
          console.warn(`[Scraper] Product "${product.name.substring(0, 50)}" has no image URL`);
        }
      }
    } catch (error) {
      console.error('Error extracting product:', error);
    }
  });
  
  return products;
}

// Get total number of pages
async function getTotalPages(html: string, config: ScraperConfig): Promise<number> {
  if (!config.pagination) {
    return 1; // Single page
  }
  
  const $ = cheerio.load(html);
  
  // Try to find pagination info - Morellato specific pattern
  // Look for "Pagina X di Y" pattern
  const pageInfoText = $('body').text();
  const pageMatch = pageInfoText.match(/Pagina\s+\d+\s+di\s+(\d+)/i);
  if (pageMatch && pageMatch[1]) {
    return parseInt(pageMatch[1]);
  }
  
  // Try to find pagination links
  const paginationSelectors = [
    '.pagination a',
    '[class*="pagination"] a',
    '.pager a',
    '[class*="pager"] a',
    'a[href*="donna-G2"]', // Morellato specific (new pattern)
    'a[href*="catalogo-prodotti-A1"]', // Morellato specific (old pattern)
  ];
  
  let maxPage = 1;
  for (const selector of paginationSelectors) {
    $(selector).each((_, el) => {
      const $link = $(el);
      const href = $link.attr('href') || '';
      const text = $link.text().trim();
      
      // Extract page number from URL patterns:
      // - donna-G2_12.htm (new pattern)
      // - catalogo-prodotti-A1_12.htm (old pattern)
      // - Any pattern with _N.htm where N is a number
      const urlMatch = href.match(/_(\d+)\.htm/);
      if (urlMatch && urlMatch[1]) {
        const pageNum = parseInt(urlMatch[1]);
        if (pageNum > maxPage) maxPage = pageNum;
      }
      
      // Or extract from link text if it's a number
      const textNum = parseInt(text);
      if (!isNaN(textNum) && textNum > maxPage) {
        maxPage = textNum;
      }
    });
  }
  
  return maxPage > 1 ? maxPage : 1;
}

// Main scraping function with pagination and promise chaining
export async function scrapeBrandProducts(
  brand: Brand,
  progressCallback?: (progress: ScrapingProgress) => Promise<void>
): Promise<Product[]> {
  const config = getScraperConfig(brand);
  const allProducts: Product[] = [];
  
  try {
    // Fetch first page to determine total pages
    const firstPageHtml = await fetchPage(brand.website, 1, config);
    const totalPages = await getTotalPages(firstPageHtml, config);
    
    if (progressCallback) {
      await progressCallback({
        jobId: '', // Will be set by caller
        currentPage: 0,
        totalPages,
        productsFound: 0,
        status: 'running',
      });
    }
    
    // Extract products from first page
    const firstPageProducts = extractProductsFromPage(firstPageHtml, config, brand);
    allProducts.push(...firstPageProducts);
    
    if (progressCallback) {
      await progressCallback({
        jobId: '',
        currentPage: 1,
        totalPages,
        productsFound: allProducts.length,
        status: 'running',
      });
    }
    
    // Chain promises for remaining pages
    const pagePromises: Promise<Product[]>[] = [];
    
    for (let page = 2; page <= totalPages; page++) {
      const pagePromise = fetchPage(brand.website, page, config)
        .then((html) => {
          const products = extractProductsFromPage(html, config, brand);
          
          if (progressCallback) {
            progressCallback({
              jobId: '',
              currentPage: page,
              totalPages,
              productsFound: allProducts.length + products.length,
              status: 'running',
            }).catch(console.error);
          }
          
          return products;
        })
        .catch((error) => {
          console.error(`Error fetching page ${page}:`, error);
          return [];
        });
      
      pagePromises.push(pagePromise);
    }
    
    // Wait for all pages to be scraped
    const pageResults = await Promise.all(pagePromises);
    
    // Flatten results
    for (const pageProducts of pageResults) {
      allProducts.push(...pageProducts);
    }
    
    if (progressCallback) {
      await progressCallback({
        jobId: '',
        currentPage: totalPages,
        totalPages,
        productsFound: allProducts.length,
        status: 'completed',
      });
    }
    
    // Note: Second layer (detail scraping) is now separate and must be triggered manually
    // via scrapeProductDetails function
    
    if (progressCallback) {
      await progressCallback({
        jobId: '',
        currentPage: totalPages,
        totalPages: totalPages,
        productsFound: allProducts.length,
        status: 'completed',
      });
    }
    
    return allProducts;
  } catch (error: any) {
    if (progressCallback) {
      await progressCallback({
        jobId: '',
        currentPage: 0,
        totalPages: 0,
        productsFound: allProducts.length,
        status: 'failed',
        error: error.message,
      });
    }
    throw error;
  }
}

// Separate function to scrape product details for selected products
// This runs asynchronously and doesn't block the main scraping flow
export async function scrapeProductDetails(
  products: Product[],
  config: ScraperConfig,
  progressCallback?: (progress: { current: number; total: number; productName: string }) => void
): Promise<Product[]> {
  if (!config.extractProductDetails) {
    console.warn('[Scraper] No extractProductDetails function configured, skipping detail scraping');
    return products;
  }
  
  if (products.length === 0) {
    return products;
  }
  
  console.log(`[Scraper] Starting detail scraping for ${products.length} products`);
  
  const updatedProducts: Product[] = [];
  const batchSize = 5; // Number of concurrent detail requests
  
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    
    // Scrape details for this batch concurrently
    const detailPromises = batch.map(async (product) => {
      try {
        if (!product.url) {
          console.warn(`[Scraper] Product "${product.name}" has no URL, skipping detail scraping`);
          return product;
        }
        
        if (progressCallback) {
          progressCallback({
            current: i + batch.indexOf(product) + 1,
            total: products.length,
            productName: product.name,
          });
        }
        
        // Fetch product detail page
        const detailHtml = await fetch(product.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }).then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch: ${res.statusText}`);
          }
          return res.text();
        });
        
        const $ = cheerio.load(detailHtml);
        const details = config.extractProductDetails!($, product.url, product);
        
        if (details) {
          product.details = details;
          console.log(`[Scraper] ✅ Extracted details for: ${product.name}`);
        } else {
          console.warn(`[Scraper] ⚠️ No details extracted for: ${product.name}`);
        }
        
        return product;
      } catch (error: any) {
        console.error(`[Scraper] ❌ Error scraping details for "${product.name}":`, error.message);
        return product; // Return product without details
      }
    });
    
    // Wait for batch to complete
    const batchResults = await Promise.all(detailPromises);
    updatedProducts.push(...batchResults);
    
    // Small delay between batches to be respectful
    if (i + batchSize < products.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }
  
  console.log(`[Scraper] ✅ Detail scraping completed for ${updatedProducts.length} products`);
  return updatedProducts;
}

// Get scraper configuration for a brand
// This should be customized per brand
export function getScraperConfig(brand: Brand): ScraperConfig {
  // Check if there's a registered scraper for this brand
  const customConfig = brandScrapers.get(brand.name);
  if (customConfig) {
    return { ...customConfig, baseUrl: brand.baseUrl || brand.website };
  }
  
  // Default configuration - should be customized per brand
  return {
    pagination: {
      type: 'url-param',
      paramName: 'page',
      startPage: 1,
    },
    productListSelector: '.product, [class*="product"], [data-product]',
    selectors: {
      name: 'h1, h2, h3, .name, [class*="name"]',
      imageUrl: 'img',
      price: '.price, [class*="price"]',
      description: '.description, [class*="description"]',
      url: 'a',
      type: '.type, [class*="type"]',
    },
    baseUrl: brand.baseUrl || brand.website,
  };
}

// Export function to register brand-specific scrapers
export const brandScrapers: Map<string, ScraperConfig> = new Map();

export function registerBrandScraper(brandName: string, config: ScraperConfig) {
  brandScrapers.set(brandName, config);
}

// Get scraper config for a brand (with fallback to default)
export function getBrandScraperConfig(brand: Brand): ScraperConfig {
  const customConfig = brandScrapers.get(brand.name);
  if (customConfig) {
    return { ...customConfig, baseUrl: brand.baseUrl || brand.website };
  }
  return getScraperConfig(brand);
}

