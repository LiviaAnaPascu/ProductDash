# Troubleshooting Guide

## Common Issues and Solutions

### Issue: Jobs Stay in "Pending" Status

**Symptoms:**
- Jobs are created but never move from "pending" to "active"
- Console shows polling attempts but status never changes
- No worker logs appear

**Cause:** Redis is not running or not accessible.

**Solution:**

1. **Check if Redis is running:**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. **If Redis is not running, start it:**
   ```bash
   # macOS (Homebrew)
   brew services start redis
   
   # Or run in foreground
   redis-server
   ```

3. **Verify Redis is accessible:**
   ```bash
   redis-cli ping
   ```

4. **Restart your Next.js dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

5. **Check server logs for worker initialization:**
   Look for these messages when the server starts:
   ```
   [Workers] All queue workers initialized
   [Worker] Scrape brand worker ready
   [Worker] Scrape product details worker ready
   [Worker] Export CSV worker ready
   ```

6. **If you see Redis connection errors:**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:6379
   ```
   This confirms Redis isn't running. Start it with `brew services start redis`.

### Issue: "Product not found" Error

**Symptoms:**
- Error when trying to scrape product details or export
- Error message: "Product not found"

**Solution:**
- The system now tries all product IDs until it finds valid ones
- Check that products are actually loaded in the store
- Verify product IDs match what's in the store

### Issue: Export Job Completes But No Download

**Symptoms:**
- Console shows job completed
- No file download starts
- Polling keeps retrying

**Solution:**
1. Check browser console for download errors
2. Verify the export API endpoint is accessible: `/api/export/{jobId}`
3. Check that the file was created in the `exports/` directory
4. Try manually accessing: `http://localhost:3000/api/export/{jobId}`

### Issue: Workers Not Initializing

**Symptoms:**
- No worker logs in server console
- Jobs never process

**Solution:**
1. **Check Redis connection:**
   ```bash
   redis-cli ping
   ```

2. **Check server logs for errors:**
   Look for Redis connection errors or worker initialization failures

3. **Verify workers are imported:**
   Check `app/api/graphql/route.ts` includes:
   ```typescript
   require('@/lib/initWorkers');
   ```

4. **Check `lib/initWorkers.ts` exists and imports workers:**
   ```typescript
   require('../workers');
   ```

### Issue: Redis Connection Errors

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
1. Install Redis if not installed:
   ```bash
   brew install redis
   ```

2. Start Redis:
   ```bash
   brew services start redis
   ```

3. Verify it's running:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

4. Check Redis is listening on the correct port:
   ```bash
   lsof -i :6379
   ```

### Issue: Jobs Process But Fail Immediately

**Symptoms:**
- Job moves to "active" then "failed"
- Error message in job data

**Solution:**
1. Check job error: Query the job to see the error message
2. Check server logs for detailed error
3. Verify all dependencies are installed: `npm install`
4. Check that product data is valid

### Issue: Multiple Jobs Running Simultaneously

**Expected Behavior:**
- Scrape brand: 1 at a time
- Scrape details: 2 at a time
- Export CSV: 3 at a time

**To Change:**
Edit worker files and change the `concurrency` option:
```typescript
// In workers/scrapeBrandWorker.ts
export const scrapeBrandWorker = new Worker(..., {
  concurrency: 2, // Change from 1 to 2
});
```

### Issue: Export Files Not Found

**Symptoms:**
- Export job completes
- Download fails with "file not found"

**Solution:**
1. Check `exports/` directory exists:
   ```bash
   ls -la exports/
   ```

2. Check file path in job data:
   ```graphql
   query {
     job(id: "export-job-id") {
       data
     }
   }
   ```

3. Verify file was created:
   ```bash
   ls -la exports/products-export-*.csv
   ```

4. Check file permissions:
   ```bash
   chmod 644 exports/*.csv
   ```

## Quick Diagnostic Commands

```bash
# Check Redis
redis-cli ping

# Check Redis is running
brew services list | grep redis

# Check if workers are processing
# Look in server logs for: [Worker] messages

# Check job status via GraphQL
# Query: { jobs { id status progress } }

# Check exports directory
ls -la exports/

# Check server logs
# Look for: [Workers] All queue workers initialized
```

## Still Having Issues?

1. **Check server logs** for detailed error messages
2. **Check browser console** for client-side errors
3. **Verify Redis is running**: `redis-cli ping`
4. **Restart everything:**
   ```bash
   # Stop Redis
   brew services stop redis
   
   # Start Redis
   brew services start redis
   
   # Restart dev server
   npm run dev
   ```

5. **Check the DEVELOPMENT_GUIDE.md** for setup instructions
