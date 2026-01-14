# Message Queue Development Guide

This guide explains how to set up and use the message queue architecture in development.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installing Redis](#installing-redis)
3. [Starting Redis](#starting-redis)
4. [How the Message Queue Works](#how-the-message-queue-works)
5. [Development Workflow](#development-workflow)
6. [Testing Jobs](#testing-jobs)
7. [Monitoring Jobs](#monitoring-jobs)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Homebrew (for macOS) or package manager for your OS

---

## Installing Redis

### macOS (using Homebrew)

```bash
# Install Redis
brew install redis

# Verify installation
redis-cli --version
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install redis-server
```

### Windows

Download from: https://github.com/microsoftarchive/redis/releases
Or use WSL (Windows Subsystem for Linux)

---

## Starting Redis

### Option 1: Start as Background Service (Recommended)

**macOS (Homebrew):**
```bash
# Start Redis service (runs in background)
brew services start redis

# Stop Redis service
brew services stop redis

# Check if Redis is running
brew services list | grep redis
```

**Linux:**
```bash
# Start Redis service
sudo systemctl start redis-server

# Enable Redis to start on boot
sudo systemctl enable redis-server

# Check status
sudo systemctl status redis-server
```

### Option 2: Run in Foreground (for testing)

```bash
# Start Redis in terminal (press Ctrl+C to stop)
redis-server
```

### Verify Redis is Running

```bash
# Test connection
redis-cli ping
# Should return: PONG

# Check Redis info
redis-cli info server
```

---

## How the Message Queue Works

### Architecture Overview

```
┌──────────────┐
│   Browser    │
│  (Frontend)  │
└──────┬───────┘
       │ GraphQL Request
       ▼
┌──────────────┐
│  GraphQL API │
│  (Next.js)   │
└──────┬───────┘
       │ Enqueue Job
       ▼
┌──────────────┐
│  Redis Queue  │
│  (Job Store)  │
└──────┬───────┘
       │ Pick Job
       ▼
┌──────────────┐
│   Workers    │
│ (Background) │
└──────────────┘
```

### Components

1. **Queues** (`lib/queue.ts`)
   - Three queues: scrape-brand, scrape-product-details, export-csv
   - Jobs are stored in Redis
   - Jobs persist across server restarts

2. **Workers** (`workers/`)
   - Background processes that pick up jobs from queues
   - Process jobs asynchronously
   - Update job status as they progress

3. **Job Store** (`lib/jobStore.ts`)
   - In-memory tracking of job statuses
   - Used for querying job progress
   - Note: In production, use a database

4. **GraphQL API** (`graphql/resolvers.ts`)
   - Enqueues jobs instead of running them directly
   - Returns job IDs immediately
   - Provides queries to check job status

### Job Lifecycle

```
1. Client Request
   └─> GraphQL Mutation (e.g., startScraping)
       └─> Creates Job ID
           └─> Adds Job to Queue (Redis)
               └─> Returns Job ID to Client

2. Worker Processing
   └─> Worker picks up job from queue
       └─> Updates status: pending → active
           └─> Executes job logic
               └─> Updates progress (0-100%)
                   └─> Updates status: active → completed

3. Client Monitoring
   └─> Polls job status via GraphQL query
       └─> Gets progress updates
           └─> Downloads result when complete
```

---

## Development Workflow

### 1. Start Redis

```bash
# Start Redis service
brew services start redis

# Verify it's running
redis-cli ping
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

Workers are automatically initialized when the GraphQL API loads.

### 4. Check Workers are Running

Look for this in your server logs:
```
[Workers] All queue workers initialized
[Worker] Scrape brand worker ready
[Worker] Scrape product details worker ready
[Worker] Export CSV worker ready
```

---

## Testing Jobs

### Test 1: Start a Scraping Job

**GraphQL Mutation:**
```graphql
mutation {
  startScraping(input: { brandId: "your-brand-id" }) {
    id
    status
    brand {
      name
    }
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "startScraping": {
      "id": "scrape-brand-123-1234567890",
      "status": "pending",
      "brand": {
        "name": "Morellato"
      }
    }
  }
}
```

**What Happens:**
1. Job is created and enqueued
2. API returns immediately with job ID
3. Worker picks up job in background
4. Job status changes: `pending` → `active` → `completed`

### Test 2: Check Job Status

**GraphQL Query:**
```graphql
query {
  job(id: "scrape-brand-123-1234567890") {
    id
    type
    status
    progress
    error
    createdAt
    updatedAt
    completedAt
  }
}
```

**Expected Response (while running):**
```json
{
  "data": {
    "job": {
      "id": "scrape-brand-123-1234567890",
      "type": "scrape-brand",
      "status": "active",
      "progress": 45,
      "error": null,
      "createdAt": "2024-01-13T10:00:00.000Z",
      "updatedAt": "2024-01-13T10:05:00.000Z",
      "completedAt": null
    }
  }
}
```

### Test 3: Scrape Product Details

**GraphQL Mutation:**
```graphql
mutation {
  scrapeProductDetails(input: {
    productIds: ["product-1", "product-2", "product-3"]
  }) {
    id
    status
    progress
  }
}
```

**Monitor Progress:**
```graphql
query {
  job(id: "details-brand-123-1234567890") {
    status
    progress
    data
  }
}
```

The `data` field contains progress info:
```json
{
  "data": {
    "current": 2,
    "total": 3,
    "productName": "Product Name"
  }
}
```

### Test 4: Export CSV

**GraphQL Mutation:**
```graphql
mutation {
  exportCSV(input: {
    productIds: ["product-1", "product-2"]
    filename: "my-export.csv"
  }) {
    jobId
    status
  }
}
```

**Check Status:**
```graphql
query {
  job(id: "export-1234567890") {
    status
    progress
    data
  }
}
```

**Download CSV (when completed):**
```bash
# Using curl
curl http://localhost:3000/api/export/export-1234567890 --output export.csv

# Or open in browser
open http://localhost:3000/api/export/export-1234567890
```

---

## Monitoring Jobs

### 1. List All Jobs

**GraphQL Query:**
```graphql
query {
  jobs {
    id
    type
    status
    progress
    createdAt
  }
}
```

**Filter by Type:**
```graphql
query {
  jobs(type: "scrape-brand") {
    id
    status
    progress
  }
}
```

### 2. Monitor Redis Queue Directly

```bash
# Connect to Redis CLI
redis-cli

# List all keys
KEYS *

# Check queue length
LLEN bull:scrape-brand:waiting
LLEN bull:scrape-brand:active
LLEN bull:scrape-brand:completed
LLEN bull:scrape-brand:failed

# View a job
GET bull:scrape-brand:123:data

# Exit Redis CLI
exit
```

### 3. Check Server Logs

Workers log important events:

```
[Worker] Starting scrape job scrape-brand-123 for brand: Morellato
[Worker] Progress: Page 1/10, Products: 20
[Worker] Scrape job scrape-brand-123 completed successfully
```

### 4. Check Job Store

The job store tracks all jobs in memory. You can query it via GraphQL:

```graphql
query {
  jobs {
    id
    status
    progress
    error
  }
}
```

---

## Development Tips

### 1. Restart Workers

Workers auto-start with the server. To restart:

```bash
# Stop dev server (Ctrl+C)
# Start again
npm run dev
```

### 2. Clear Redis Queue

If you need to clear all jobs:

```bash
redis-cli

# Clear all keys (WARNING: deletes everything)
FLUSHALL

# Or clear specific queue
DEL bull:scrape-brand:*

exit
```

### 3. Test Job Failures

To test error handling, you can:

1. Stop Redis while a job is running
2. Cause an error in worker code
3. Check job status shows `failed` with error message

### 4. Monitor Job Retries

Jobs with retry logic will automatically retry on failure:

```typescript
// In resolvers.ts
await scrapeBrandQueue.add(jobId, jobData, {
  attempts: 3, // Will retry 3 times
  backoff: {
    type: 'exponential',
    delay: 2000, // 2 seconds, 4 seconds, 8 seconds...
  },
});
```

### 5. Debug Worker Issues

Add console logs in workers:

```typescript
// In workers/scrapeBrandWorker.ts
console.log('[Worker] Job data:', job.data);
console.log('[Worker] Job ID:', job.id);
console.log('[Worker] Attempt:', job.attemptsMade);
```

---

## Troubleshooting

### Problem: Redis Connection Error

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# If not running, start it
brew services start redis
```

### Problem: Jobs Not Processing

**Symptoms:**
- Jobs stay in `pending` status
- No worker logs

**Solution:**
1. Check workers initialized: Look for `[Workers] All queue workers initialized` in logs
2. Check Redis connection: `redis-cli ping`
3. Restart dev server: `npm run dev`

### Problem: Jobs Failing Immediately

**Symptoms:**
- Jobs go to `failed` status right away
- Error message in job data

**Solution:**
1. Check job error: `query { job(id: "...") { error } }`
2. Check worker logs for detailed error
3. Verify dependencies are installed: `npm install`

### Problem: Export Files Not Found

**Symptoms:**
- Export job completes but file download fails

**Solution:**
1. Check `exports/` directory exists: `ls -la exports/`
2. Check file path in job data: `query { job(id: "...") { data } }`
3. Verify file was created: `ls -la exports/products-export-*.csv`

### Problem: Multiple Jobs Running Simultaneously

**Expected Behavior:**
- Scrape brand: 1 at a time (concurrency: 1)
- Scrape details: 2 at a time (concurrency: 2)
- Export CSV: 3 at a time (concurrency: 3)

**To Change Concurrency:**
Edit worker files:
```typescript
// In workers/scrapeBrandWorker.ts
export const scrapeBrandWorker = new Worker(..., {
  concurrency: 2, // Change from 1 to 2
});
```

---

## Quick Reference

### Start Development Environment

```bash
# Terminal 1: Start Redis
brew services start redis

# Terminal 2: Start Dev Server
npm run dev
```

### Common GraphQL Queries

```graphql
# List all jobs
query { jobs { id status progress } }

# Get specific job
query { job(id: "job-id") { status progress error } }

# Start scraping
mutation { startScraping(input: { brandId: "id" }) { id } }

# Export CSV
mutation { exportCSV(input: { productIds: ["id1"] }) { jobId } }
```

### Redis Commands

```bash
# Check if running
redis-cli ping

# View queue stats
redis-cli KEYS "bull:*"

# Clear all (careful!)
redis-cli FLUSHALL
```

---

## Next Steps

1. ✅ Install Redis
2. ✅ Start Redis service
3. ✅ Start dev server
4. ✅ Test a scraping job
5. ✅ Monitor job progress
6. ✅ Test CSV export

For production deployment, see `QUEUE_ARCHITECTURE.md` for additional considerations.
