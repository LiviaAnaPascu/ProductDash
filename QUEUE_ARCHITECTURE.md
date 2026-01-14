# Message Queue Architecture

This document describes the message queue architecture implemented for scraping, second-layer scraping, and CSV export functionality.

## Overview

The system uses **BullMQ** with **Redis** to manage job queues. This provides:

- **Asynchronous processing**: Jobs run in the background without blocking the API
- **Job persistence**: Jobs survive server restarts
- **Retry logic**: Failed jobs can be automatically retried
- **Progress tracking**: Real-time job status and progress updates
- **Scalability**: Multiple workers can process jobs concurrently

## Architecture Components

### 1. Queue Service (`lib/queue.ts`)

Defines three main queues:

- **`scrapeBrandQueue`**: For initial brand scraping (first layer)
- **`scrapeProductDetailsQueue`**: For second-layer detail scraping
- **`exportCSVQueue`**: For CSV export generation

Each queue has:
- Job type enum
- Job data interfaces
- Queue events for monitoring

### 2. Job Store (`lib/jobStore.ts`)

In-memory store for tracking job statuses. Provides:

- `createJob()`: Create a new job
- `getJob()`: Get job by ID
- `updateJob()`: Update job status/progress
- `getAllJobs()`: List all jobs (optionally filtered by type)

**Note**: In production, consider replacing this with a database-backed solution.

### 3. Workers (`workers/`)

Three worker files process jobs:

#### `scrapeBrandWorker.ts`
- Processes brand scraping jobs
- Concurrency: 1 (one brand at a time)
- Retries: 3 attempts with exponential backoff

#### `scrapeProductDetailsWorker.ts`
- Processes product detail scraping (second layer)
- Concurrency: 2 (two jobs concurrently)
- Retries: 2 attempts

#### `exportCSVWorker.ts`
- Generates CSV files server-side
- Saves files to `exports/` directory
- Concurrency: 3 (three exports concurrently)
- Retries: 1 attempt (exports typically don't need retries)

### 4. GraphQL Integration

Updated resolvers to use queues:

- **`startScraping`**: Enqueues scraping job instead of running directly
- **`scrapeProductDetails`**: Enqueues detail scraping job, returns job ID
- **`exportCSV`**: Enqueues export job, returns job ID

New queries:

- **`job(id)`**: Get job status by ID
- **`jobs(type)`**: List all jobs (optionally filtered by type)

## Setup

### 1. Install Dependencies

```bash
npm install bullmq ioredis
npm install --save-dev @types/ioredis
```

### 2. Redis Configuration

Set environment variables (optional, defaults shown):

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional
```

### 3. Start Redis

Make sure Redis is running:

```bash
# Using Docker
docker run -d -p 6379:6379 redis:latest

# Or install locally
# macOS: brew install redis && redis-server
# Linux: sudo apt-get install redis-server && redis-server
```

### 4. Workers Auto-Start

Workers are automatically initialized when the GraphQL API route loads (see `app/api/graphql/route.ts`).

## Usage

### Starting a Scraping Job

```graphql
mutation {
  startScraping(input: { brandId: "brand-id" }) {
    id
    status
    brand {
      name
    }
  }
}
```

This enqueues a job and returns immediately. The job runs in the background.

### Scraping Product Details

```graphql
mutation {
  scrapeProductDetails(input: { productIds: ["id1", "id2"] }) {
    id
    status
    progress
  }
}
```

Returns a job ID. Poll the job status to check completion.

### Exporting CSV

```graphql
mutation {
  exportCSV(input: { 
    productIds: ["id1", "id2"]
    filename: "my-export.csv"  # Optional
  }) {
    jobId
    status
  }
}
```

### Checking Job Status

```graphql
query {
  job(id: "job-id") {
    id
    type
    status
    progress
    error
    completedAt
  }
}
```

### Downloading Exported CSV

Once an export job is completed, download the file:

```
GET /api/export/{jobId}
```

The file is automatically downloaded with the correct filename.

## Job Statuses

- **`pending`**: Job is queued, waiting to be processed
- **`active`**: Job is currently being processed
- **`completed`**: Job completed successfully
- **`failed`**: Job failed (check `error` field)
- **`delayed`**: Job is scheduled for later execution

## Progress Tracking

Jobs can include a `progress` field (0-100) to track completion:

```typescript
jobStore.updateJob(jobId, { progress: 50 }); // 50% complete
```

## Error Handling

Failed jobs include an `error` field with the error message. Jobs can be configured with retry logic:

```typescript
await queue.add(jobId, jobData, {
  attempts: 3, // Retry up to 3 times
  backoff: {
    type: 'exponential',
    delay: 2000, // Start with 2 second delay
  },
});
```

## Client-Side Integration

The `ExportButton` component demonstrates queue-based export:

1. Enqueues detail scraping job
2. Waits for completion (simplified polling)
3. Enqueues export job
4. Polls export job status
5. Downloads CSV when complete

## File Storage

Exported CSV files are saved to:

```
/exports/products-export-{timestamp}.csv
```

Files can be downloaded via the `/api/export/{jobId}` endpoint.

## Monitoring

### Queue Events

Each queue has events you can listen to:

```typescript
import { scrapeBrandQueueEvents } from '@/lib/queue';

scrapeBrandQueueEvents.on('completed', (job) => {
  console.log('Job completed:', job.jobId);
});

scrapeBrandQueueEvents.on('failed', (job, err) => {
  console.error('Job failed:', job?.id, err.message);
});
```

### Job Store Queries

Query all jobs:

```graphql
query {
  jobs(type: "scrape-brand") {
    id
    status
    progress
    createdAt
  }
}
```

## Production Considerations

1. **Job Store**: Replace in-memory store with database (PostgreSQL, MongoDB, etc.)
2. **Redis Persistence**: Configure Redis for persistence (AOF or RDB)
3. **Worker Scaling**: Run workers in separate processes/containers
4. **Monitoring**: Add monitoring tools (Bull Board, Grafana, etc.)
5. **Error Notifications**: Send notifications for failed jobs
6. **Rate Limiting**: Add rate limiting to prevent queue overload
7. **Job Cleanup**: Implement job cleanup for old completed/failed jobs

## Troubleshooting

### Redis Connection Issues

If you see connection errors, ensure Redis is running:

```bash
redis-cli ping
# Should return: PONG
```

### Jobs Not Processing

1. Check workers are initialized (check server logs)
2. Verify Redis connection
3. Check job status: `query { jobs { id status } }`
4. Review worker logs for errors

### Export Files Not Found

1. Check `exports/` directory exists and is writable
2. Verify job completed successfully
3. Check file path in job data

## Future Enhancements

- WebSocket updates for real-time job progress
- Job prioritization
- Scheduled jobs (cron-like)
- Job dependencies (chain jobs)
- Distributed workers across multiple servers
- Job result storage in database
