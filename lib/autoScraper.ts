// Automatic scraping initialization
// This will automatically start scraping for brands on server start

import { brandStore } from './brandStore';
import { productStore } from './productStore';
import { startScrapingJob } from '@/services/scraperService';

let autoScrapingStarted = false;

export const startAutoScraping = async () => {
  // Only run once
  if (autoScrapingStarted) {
    return;
  }
  autoScrapingStarted = true;

  // Check if we should auto-scrape (only in development or if explicitly enabled)
  const shouldAutoScrape = 
    process.env.NODE_ENV === 'development' || 
    process.env.AUTO_SCRAPE === 'true';

  if (!shouldAutoScrape) {
    console.log('[AutoScraper] Auto-scraping disabled (set AUTO_SCRAPE=true to enable)');
    return;
  }

  console.log('[AutoScraper] Starting automatic scraping for all active brands...');

  const brands = brandStore.getAllBrands().filter(b => b.isActive);
  
  if (brands.length === 0) {
    console.log('[AutoScraper] No active brands found');
    return;
  }

  // Check if products already exist
  const totalProducts = productStore.getProductCount();
  if (totalProducts > 0) {
    console.log(`[AutoScraper] Found ${totalProducts} existing products. Skipping auto-scrape.`);
    return;
  }

  // Start scraping for each brand
  for (const brand of brands) {
    const brandProductCount = productStore.getProductCount(brand.id);
    
    // Only scrape if brand has no products
    if (brandProductCount === 0) {
      console.log(`[AutoScraper] Starting scraping for ${brand.name}...`);
      const jobId = `auto-${brand.id}-${Date.now()}`;
      
      // Start scraping asynchronously (don't wait)
      startScrapingJob(jobId, brand).catch((error) => {
        console.error(`[AutoScraper] Failed to scrape ${brand.name}:`, error);
      });
      
      // Small delay between brands to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log(`[AutoScraper] Brand ${brand.name} already has ${brandProductCount} products. Skipping.`);
    }
  }
};

