import { Worker, Job } from 'bullmq';
import { redisConnection, ScrapeProductDetailsJobData, JobType } from '@/lib/queue';
import { scrapeSelectedProductDetails } from '@/services/scraperService';
import { jobStore } from '@/lib/jobStore';

// Create worker for scraping product details (second layer)
export const scrapeProductDetailsWorker = new Worker<ScrapeProductDetailsJobData>(
  JobType.SCRAPE_PRODUCT_DETAILS,
  async (job: Job<ScrapeProductDetailsJobData>) => {
    const { jobId, productIds, brandId } = job.data;
    
    console.log(`[Worker] Starting detail scraping job ${jobId} for ${productIds.length} products`);
    
    // Update job status to active
    jobStore.updateJob(jobId, { status: 'active', progress: 0 });
    
    try {
      // Filter out products that don't exist in store
      const { productStore } = await import('@/lib/productStore');
      const validProductIds = productIds.filter(id => {
        const product = productStore.getProduct(id);
        if (!product) {
          console.warn(`[Worker] Product ${id} not found in store, skipping`);
        }
        return product !== undefined;
      });

      if (validProductIds.length === 0) {
        throw new Error(`None of the ${productIds.length} requested products were found in the store`);
      }

      if (validProductIds.length < productIds.length) {
        console.warn(`[Worker] Only ${validProductIds.length} of ${productIds.length} products found in store`);
      }

      // Progress callback to update job status
      const progressCallback = (progress: { current: number; total: number; productName: string }) => {
        const progressPercent = Math.round((progress.current / progress.total) * 100);
        jobStore.updateJob(jobId, { 
          progress: progressPercent,
          data: { current: progress.current, total: progress.total, productName: progress.productName },
        });
      };

      // Scrape product details (only for valid products)
      const result = await scrapeSelectedProductDetails(validProductIds, progressCallback);
      
      // Update job status to completed
      jobStore.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        data: result,
      });
      
      console.log(`[Worker] Detail scraping job ${jobId} completed: ${result.success} success, ${result.failed} failed`);
      
      return result;
    } catch (error: any) {
      console.error(`[Worker] Detail scraping job ${jobId} failed:`, error);
      
      // Update job status to failed
      jobStore.updateJob(jobId, {
        status: 'failed',
        error: error.message || 'Unknown error',
      });
      
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process 2 detail scraping jobs concurrently
  }
);

// Event handlers
scrapeProductDetailsWorker.on('completed', (job) => {
  console.log(`[Worker] Detail scraping job ${job.id} completed`);
});

scrapeProductDetailsWorker.on('failed', (job, err) => {
  console.error(`[Worker] Detail scraping job ${job?.id} failed:`, err.message);
});

scrapeProductDetailsWorker.on('error', (err) => {
  console.error('[Worker] Scrape product details worker error:', err);
});
