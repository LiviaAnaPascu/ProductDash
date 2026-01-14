import { Worker, Job } from 'bullmq';
import { redisConnection, ScrapeBrandJobData, JobType } from '@/lib/queue';
import { startScrapingJob } from '@/services/scraperService';
import { brandStore } from '@/lib/brandStore';
import { jobStore } from '@/lib/jobStore';

// Create worker for scraping brand products
export const scrapeBrandWorker = new Worker<ScrapeBrandJobData>(
  JobType.SCRAPE_BRAND,
  async (job: Job<ScrapeBrandJobData>) => {
    const { jobId, brandId, brandName, website } = job.data;
    
    console.log(`[Worker] Starting scrape job ${jobId} for brand: ${brandName}`);
    
    // Update job status to active
    jobStore.updateJob(jobId, { status: 'active' });
    
    try {
      // Get brand from store
      const brand = brandStore.getBrand(brandId);
      if (!brand) {
        throw new Error(`Brand not found: ${brandId}`);
      }

      // Start scraping (this will handle progress updates internally)
      await startScrapingJob(jobId, brand);
      
      // Update job status to completed
      jobStore.updateJob(jobId, { 
        status: 'completed',
        progress: 100,
      });
      
      console.log(`[Worker] Scrape job ${jobId} completed successfully`);
      
      return { success: true, jobId };
    } catch (error: any) {
      console.error(`[Worker] Scrape job ${jobId} failed:`, error);
      
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
    concurrency: 1, // Process one scraping job at a time to avoid overwhelming servers
  }
);

// Event handlers
scrapeBrandWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

scrapeBrandWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

scrapeBrandWorker.on('error', (err) => {
  console.error('[Worker] Scrape brand worker error:', err);
});
