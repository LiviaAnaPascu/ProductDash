// Database imports commented out
// import { Brand } from '@prisma/client';
// import { prisma } from '@/lib/prisma';
import { scrapeBrandProducts } from '@/utils/advancedScraper';
import { Brand } from '@/lib/brandStore';
import { productStore } from '@/lib/productStore';

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

