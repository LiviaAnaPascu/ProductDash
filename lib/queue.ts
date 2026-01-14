import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

// Redis connection - can be configured via environment variables
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.warn(`[Redis] Connection attempt ${times}, retrying in ${delay}ms...`);
    return delay;
  },
  enableReadyCheck: true,
});

// Handle Redis connection errors
redisConnection.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
  console.error('[Redis] Make sure Redis is running: brew services start redis');
});

redisConnection.on('connect', () => {
  console.log('[Redis] Connecting to Redis...');
});

redisConnection.on('ready', () => {
  console.log('[Redis] ✅ Connected to Redis successfully');
});

redisConnection.on('close', () => {
  console.warn('[Redis] Connection closed');
});

// Job types
export enum JobType {
  SCRAPE_BRAND = 'scrape-brand',
  SCRAPE_PRODUCT_DETAILS = 'scrape-product-details',
  EXPORT_CSV = 'export-csv',
}

// Job data interfaces
export interface ScrapeBrandJobData {
  jobId: string;
  brandId: string;
  brandName: string;
  website: string;
}

export interface ScrapeProductDetailsJobData {
  jobId: string;
  productIds: string[];
  brandId: string;
}

export interface ExportCSVJobData {
  jobId: string;
  productIds: string[];
  filename?: string;
}

export type JobData = ScrapeBrandJobData | ScrapeProductDetailsJobData | ExportCSVJobData;

// Job status
export interface JobStatus {
  id: string;
  type: JobType;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'delayed';
  progress?: number;
  data?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Queue instances
export const scrapeBrandQueue = new Queue<ScrapeBrandJobData>(JobType.SCRAPE_BRAND, {
  connection: redisConnection,
});

export const scrapeProductDetailsQueue = new Queue<ScrapeProductDetailsJobData>(
  JobType.SCRAPE_PRODUCT_DETAILS,
  {
    connection: redisConnection,
  }
);

export const exportCSVQueue = new Queue<ExportCSVJobData>(JobType.EXPORT_CSV, {
  connection: redisConnection,
});

// Queue events for monitoring
export const scrapeBrandQueueEvents = new QueueEvents(JobType.SCRAPE_BRAND, {
  connection: redisConnection,
});

export const scrapeProductDetailsQueueEvents = new QueueEvents(JobType.SCRAPE_PRODUCT_DETAILS, {
  connection: redisConnection,
});

export const exportCSVQueueEvents = new QueueEvents(JobType.EXPORT_CSV, {
  connection: redisConnection,
});

// Helper function to get queue by job type
export function getQueue(jobType: JobType): Queue {
  switch (jobType) {
    case JobType.SCRAPE_BRAND:
      return scrapeBrandQueue;
    case JobType.SCRAPE_PRODUCT_DETAILS:
      return scrapeProductDetailsQueue;
    case JobType.EXPORT_CSV:
      return exportCSVQueue;
    default:
      throw new Error(`Unknown job type: ${jobType}`);
  }
}

// Helper function to get queue events by job type
export function getQueueEvents(jobType: JobType): QueueEvents {
  switch (jobType) {
    case JobType.SCRAPE_BRAND:
      return scrapeBrandQueueEvents;
    case JobType.SCRAPE_PRODUCT_DETAILS:
      return scrapeProductDetailsQueueEvents;
    case JobType.EXPORT_CSV:
      return exportCSVQueueEvents;
    default:
      throw new Error(`Unknown job type: ${jobType}`);
  }
}

// Export redis connection for workers
export { redisConnection };
