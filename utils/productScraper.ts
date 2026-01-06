import * as cheerio from 'cheerio';
import { Product } from '@/types/product';

// Generic scraper function - can be extended for specific websites
export const genericScraper = async (url: string): Promise<Product[]> => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const products: Product[] = [];

    // This is a generic scraper - you'll need to customize selectors for specific websites
    // Example: looking for common product patterns
    $('.product, [class*="product"], [data-product]').each((index, element) => {
      const $el = $(element);
      const name = $el.find('h1, h2, h3, .name, [class*="name"]').first().text().trim();
      const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
      const price = $el.find('.price, [class*="price"]').first().text().trim();
      const description = $el.find('.description, [class*="description"]').first().text().trim();
      const productUrl = $el.find('a').first().attr('href') || url;

      if (name && imageUrl) {
        products.push({
          id: `${url}-${index}`,
          name,
          brand: extractBrandFromUrl(url),
          type: 'General',
          price: price || undefined,
          imageUrl: imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, url).toString(),
          description: description || undefined,
          url: productUrl.startsWith('http') ? productUrl : new URL(productUrl, url).toString(),
        });
      }
    });

    return products;
  } catch (error) {
    console.error('Error scraping products:', error);
    return [];
  }
};

const extractBrandFromUrl = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch {
    return 'Unknown';
  }
};

// Brand configurations are now in utils/brandConfigs.ts for better organization

