// Initialize all workers
// This file should be imported when the server starts to ensure workers are running

console.log('[Workers] 🚀 Initializing queue workers...');

try {
  require('./scrapeBrandWorker');
  console.log('[Workers] ✅ Scrape brand worker loaded');
} catch (error: any) {
  console.error('[Workers] ❌ Failed to load scrape brand worker:', error);
}

try {
  require('./scrapeProductDetailsWorker');
  console.log('[Workers] ✅ Scrape product details worker loaded');
} catch (error: any) {
  console.error('[Workers] ❌ Failed to load scrape product details worker:', error);
}

try {
  require('./exportCSVWorker');
  console.log('[Workers] ✅ Export CSV worker loaded');
} catch (error: any) {
  console.error('[Workers] ❌ Failed to load export CSV worker:', error);
  console.error('[Workers] Error details:', error.message, error.stack);
}

console.log('[Workers] ✅ All queue workers initialization complete');
