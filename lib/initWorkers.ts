// Initialize queue workers when the server starts
// This should be imported in your API route or server startup

// Only initialize workers on the server side (not in browser)
if (typeof window === 'undefined') {
  // Import workers to initialize them
  require('../workers');
  console.log('[Server] Queue workers initialized');
}

export {};
