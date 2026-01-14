import { Worker, Job } from 'bullmq';
import { redisConnection, ExportCSVJobData, JobType } from '@/lib/queue';
import { generateCSV } from '@/utils/csvExportServer';
import { productStore } from '@/lib/productStore';
import { Product } from '@/types/product';
import { jobStore } from '@/lib/jobStore';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Create worker for exporting CSV
export const exportCSVWorker = new Worker<ExportCSVJobData>(
  JobType.EXPORT_CSV,
  async (job: Job<ExportCSVJobData>) => {
    const { jobId, productIds, filename } = job.data;
    
    // Use BullMQ job ID if available, otherwise use jobId from data
    // BullMQ job.id should match the jobId we set when adding the job
    // Store in a variable accessible throughout the function
    const actualJobId: string = (job.id as string) || jobId;
    
    console.log(`[Export Worker] 🚀 Starting CSV export job`);
    console.log(`[Export Worker] BullMQ job.id: ${job.id}`);
    console.log(`[Export Worker] Data jobId: ${jobId}`);
    console.log(`[Export Worker] Using jobId: ${actualJobId}`);
    console.log(`[Export Worker] Products: ${productIds.length}, filename: ${filename}`);
    
    // Update job status to active - try both IDs to be safe
    let updated = jobStore.updateJob(actualJobId, { status: 'active', progress: 0 });
    if (!updated && actualJobId !== jobId) {
      // Fallback: try the jobId from data
      updated = jobStore.updateJob(jobId, { status: 'active', progress: 0 });
      if (updated) {
        console.log(`[Export Worker] ⚠️ Job found using data jobId instead of BullMQ job.id`);
      }
    }
    
    if (!updated) {
      console.error(`[Export Worker] ❌ Failed to update job status - job not found in store!`);
      console.error(`[Export Worker] Tried IDs: ${actualJobId}, ${jobId}`);
      const allJobs = jobStore.getAllJobs();
      console.error(`[Export Worker] Available jobs:`, allJobs.map(j => j.id));
      
      // Fallback: Create the job if it doesn't exist (shouldn't happen, but handle it)
      console.log(`[Export Worker] ⚠️ Creating missing job in store as fallback`);
      const { JobType: JobTypeEnum } = await import('@/lib/queue');
      jobStore.createJob(actualJobId, JobTypeEnum.EXPORT_CSV, {
        productIds,
        filename,
      });
      updated = jobStore.updateJob(actualJobId, { status: 'active', progress: 0 });
      if (updated) {
        console.log(`[Export Worker] ✅ Created and activated job ${actualJobId}`);
      }
    }
    
    try {
      // Get products from store
      const products: Product[] = [];
      const missingProductIds: string[] = [];
      
      // Get brandStore to resolve brand names
      const { brandStore } = await import('@/lib/brandStore');
      
      for (let i = 0; i < productIds.length; i++) {
        const productId = productIds[i];
        const storedProduct = productStore.getProduct(productId);
        
        if (storedProduct) {
          // Get brand name from brandStore
          const brand = brandStore.getBrand(storedProduct.brandId);
          const brandName = brand?.name || storedProduct.brandId;
          
          // Map stored product to Product format
          products.push({
            id: storedProduct.id,
            name: storedProduct.name,
            brand: brandName, // Use actual brand name, not ID
            type: storedProduct.type || 'General',
            gender: storedProduct.gender || 'female',
            price: storedProduct.price || undefined,
            imageUrl: storedProduct.imageUrl,
            description: storedProduct.description || undefined,
            url: storedProduct.url,
            metadata: storedProduct.metadata,
            details: storedProduct.details || undefined,
          });
        } else {
          missingProductIds.push(productId);
          console.warn(`[Worker] Product ${productId} not found in store, skipping from export`);
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / productIds.length) * 100);
        jobStore.updateJob(jobId, { progress });
      }
      
      if (products.length === 0) {
        throw new Error(
          `No products found to export. Requested ${productIds.length} products, ` +
          `but none were found in store. Missing IDs: ${missingProductIds.slice(0, 5).join(', ')}${missingProductIds.length > 5 ? '...' : ''}`
        );
      }
      
      if (missingProductIds.length > 0) {
        console.warn(`[Worker] Exporting ${products.length} of ${productIds.length} products (${missingProductIds.length} not found)`);
      }
      
      // Generate filename if not provided
      const exportFilename = filename || `products-export-${Date.now()}.csv`;
      
      // Generate CSV content
      const csvContent = generateCSV(products);
      
      // Save CSV to file (optional - you can also just return the content)
      // Create exports directory if it doesn't exist
      const exportsDir = join(process.cwd(), 'exports');
      try {
        await mkdir(exportsDir, { recursive: true });
      } catch (error) {
        // Directory might already exist, ignore
      }
      
      const filePath = join(exportsDir, exportFilename);
      await writeFile(filePath, csvContent, 'utf-8');
      
      // Update job status to completed - use the actual job ID
      let updatedJob = jobStore.updateJob(actualJobId, {
        status: 'completed',
        progress: 100,
        data: {
          productCount: products.length,
          filename: exportFilename,
          filePath: filePath,
          // CSV content is also available if needed
          csvContent: csvContent.substring(0, 1000), // First 1000 chars for preview
        },
      });
      
      // Fallback: try the jobId from data if update failed
      if (!updatedJob && actualJobId !== jobId) {
        updatedJob = jobStore.updateJob(jobId, {
          status: 'completed',
          progress: 100,
          data: {
            productCount: products.length,
            filename: exportFilename,
            filePath: filePath,
            csvContent: csvContent.substring(0, 1000),
          },
        });
      }
      
      // Verify the update worked
      if (updatedJob) {
        console.log(`[Export Worker] ✅ Job ${updatedJob.id} status updated to: ${updatedJob.status}`);
        console.log(`[Export Worker] File path: ${filePath}`);
      } else {
        console.error(`[Export Worker] ❌ Failed to update job - job not found in store!`);
        console.error(`[Export Worker] Tried IDs: ${actualJobId}, ${jobId}`);
        // Try to find the job
        const allJobs = jobStore.getAllJobs();
        console.error(`[Export Worker] Available jobs:`, allJobs.map(j => ({ id: j.id, status: j.status })));
      }
      
      console.log(`[Export Worker] CSV export job completed: ${products.length} products exported to ${filePath}`);
      
      // Double-check the job was updated - check both IDs
      const finalJob1 = jobStore.getJob(actualJobId);
      const finalJob2 = actualJobId !== jobId ? jobStore.getJob(jobId) : null;
      const finalJob = finalJob1 || finalJob2;
      
      if (finalJob) {
        console.log(`[Export Worker] ✅ Final job status check: ${finalJob.id} = ${finalJob.status}, progress: ${finalJob.progress}`);
      } else {
        console.error(`[Export Worker] ❌ Job not found in store after completion! Tried: ${actualJobId}, ${jobId}`);
      }
      
      return {
        success: true,
        productCount: products.length,
        filename: exportFilename,
        filePath: filePath,
      };
    } catch (error: any) {
      console.error(`[Export Worker] ❌ CSV export job failed:`, error);
      console.error(`[Export Worker] Error stack:`, error.stack);
      
      // Update job status to failed - try both IDs
      const actualJobId = job.id || job.data.jobId;
      let updated = jobStore.updateJob(actualJobId, {
        status: 'failed',
        error: error.message || 'Unknown error',
      });
      
      if (!updated && actualJobId !== job.data.jobId) {
        updated = jobStore.updateJob(job.data.jobId, {
          status: 'failed',
          error: error.message || 'Unknown error',
        });
      }
      
      if (!updated) {
        console.error(`[Export Worker] ❌ Failed to update job status to failed!`);
      }
      
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 3, // Process 3 export jobs concurrently
  }
);

// Event handlers
exportCSVWorker.on('completed', (job) => {
  console.log(`[Export Worker] ✅ CSV export job ${job.id} completed`);
});

exportCSVWorker.on('failed', (job, err) => {
  console.error(`[Export Worker] ❌ CSV export job ${job?.id} failed:`, err.message);
  console.error(`[Export Worker] Error stack:`, err.stack);
});

exportCSVWorker.on('error', (err) => {
  console.error('[Export Worker] 💥 Export CSV worker error:', err);
  console.error('[Export Worker] Error details:', err.message, err.stack);
});

exportCSVWorker.on('ready', () => {
  console.log('[Export Worker] ✅ Export CSV worker is ready and listening for jobs');
});

exportCSVWorker.on('active', (job) => {
  console.log(`[Export Worker] 🔄 Processing job ${job.id}`);
});
