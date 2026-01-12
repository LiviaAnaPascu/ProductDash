// Database imports commented out
// import { Brand } from '@prisma/client';
// import { prisma } from '@/lib/prisma';
import { scrapeBrandProducts, scrapeProductDetails, getScraperConfig } from '@/utils/advancedScraper';
import { Brand } from '@/lib/brandStore';
import { productStore, StoredProduct } from '@/lib/productStore';
import { Product } from '@/types/product';

export interface ScrapingProgress {
  jobId: string;
  currentPage: number;
  totalPages: number;
  productsFound: number;
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

export const startScrapingJob = async (jobId: string, brand: Brand) => {
  try {
    // Database operations commented out
    // Update job status to running
    // await prisma.scraperJob.update({
    //   where: { id: jobId },
    //   data: {
    //     status: 'running',
    //     startedAt: new Date(),
    //   },
    // });
    console.log(`[${jobId}] Scraping job started for brand: ${brand.name}`);

    // Start scraping with progress callback
    const progressCallback = async (progress: ScrapingProgress) => {
      // Database operations commented out
      // await prisma.scraperJob.update({
      //   where: { id: jobId },
      //   data: {
      //     currentPage: progress.currentPage,
      //     totalPages: progress.totalPages,
      //     productsFound: progress.productsFound,
      //     status: progress.status,
      //     error: progress.error,
      //   },
      // });
      console.log(`[${jobId}] Progress: Page ${progress.currentPage}/${progress.totalPages}, Products: ${progress.productsFound}`);
    };

    // Scrape products
    console.log(`[${jobId}] Starting to scrape products from: ${brand.website}`);
    const products = await scrapeBrandProducts(brand, progressCallback);
    console.log(`[${jobId}] Scraping completed. Found ${products.length} products`);

    if (products.length === 0) {
      console.warn(`[${jobId}] WARNING: No products were scraped! Check the scraper configuration.`);
    }

    // Save products to in-memory store
    const savedProducts = productStore.addProducts(products, brand.id);
    console.log(`[${jobId}] ✅ Saved ${savedProducts.length} products to memory store`);
    
    // Verify products were saved
    const verifyCount = productStore.getProductCount(brand.id);
    console.log(`[${jobId}] ✅ Verified: ${verifyCount} products now in store for brand ${brand.name}`);

    // Database operations commented out
    // Mark job as completed
    // await prisma.scraperJob.update({
    //   where: { id: jobId },
    //   data: {
    //     status: 'completed',
    //     completedAt: new Date(),
    //     productsFound: products.length,
    //   },
    // });
    console.log(`[${jobId}] Scraping job completed`);
  } catch (error: any) {
    console.error('Scraping job error:', error);
    // Database operations commented out
    // await prisma.scraperJob.update({
    //   where: { id: jobId },
    //   data: {
    //     status: 'failed',
    //     error: error.message,
    //     completedAt: new Date(),
    //   },
    // });
    console.error(`[${jobId}] Scraping job failed: ${error.message}`);
  }
};

// Scrape details for selected products (runs asynchronously)
export const scrapeSelectedProductDetails = async (
  productIds: string[],
  progressCallback?: (progress: { current: number; total: number; productName: string }) => void
): Promise<{ success: number; failed: number }> => {
  try {
    console.log(`[Detail Scraper] Starting detail scraping for ${productIds.length} products`);
    
    // Get products from store
    const products = productIds
      .map(id => productStore.getProduct(id))
      .filter((p): p is StoredProduct => p !== undefined) as StoredProduct[];
    
    if (products.length === 0) {
      console.warn('[Detail Scraper] No products found for detail scraping');
      return { success: 0, failed: 0 };
    }
    
    // Get brand for scraper config
    const brandId = products[0].brandId;
    // We need to get the brand - for now, we'll get it from the first product
    // In a real scenario, you'd get the brand from brandStore
    // For now, we'll use a workaround
    
    // Get scraper config (we need brand name, but we only have brandId)
    // We'll need to pass brand or get it differently
    // For now, let's get products by brand and use the first product's brand
    const allBrandProducts = productStore.getProductsByBrand(brandId);
    if (allBrandProducts.length === 0) {
      throw new Error('Brand not found');
    }
    
    // We need the brand object - let's import brandStore
    const { brandStore } = await import('@/lib/brandStore');
    const brand = brandStore.getBrand(brandId);
    if (!brand) {
      throw new Error('Brand not found');
    }
    
    const config = getScraperConfig(brand);
    
    // Scrape details
    const updatedProducts = await scrapeProductDetails(products, config, progressCallback);
    
    // Update products in store
    const updates = new Map<string, Partial<Product>>();
    for (const product of updatedProducts) {
      updates.set(product.id, { details: product.details });
    }
    
    const successCount = productStore.updateProducts(updates);
    const failedCount = products.length - successCount;
    
    console.log(`[Detail Scraper] ✅ Completed: ${successCount} updated, ${failedCount} failed`);
    
    return { success: successCount, failed: failedCount };
  } catch (error: any) {
    console.error('[Detail Scraper] Error:', error);
    throw error;
  }
};
