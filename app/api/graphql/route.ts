import { ApolloServer } from '@apollo/server';
import { HeaderMap } from '@apollo/server';
import { NextRequest } from 'next/server';
import { typeDefs } from '@/graphql/schema';
import { resolvers } from '@/graphql/resolvers';

// Import brand scrapers to register them
// This ensures scrapers are registered when the module loads
import '@/utils/morellatoScraper';

// Import brand store to initialize brands
import '@/lib/brandStore';

// Import auto-scraper to start scraping automatically
import { startAutoScraping } from '@/lib/autoScraper';

// Initialize queue workers
if (typeof window === 'undefined') {
  // Only run on server side
  require('@/lib/initWorkers');
  startAutoScraping().catch(console.error);
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
});

// Start the server
let serverStarted = false;
let serverStartPromise: Promise<void> | null = null;

const startServer = async () => {
  if (!serverStarted) {
    if (!serverStartPromise) {
      serverStartPromise = server.start().then(() => {
        serverStarted = true;
      }).catch((error) => {
        console.error('Failed to start Apollo Server:', error);
        serverStartPromise = null;
        throw error;
      });
    }
    await serverStartPromise;
  }
};

export async function GET(request: NextRequest) {
  try {
    await startServer();
    
    // Return simple info page for GET requests
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GraphQL API</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            code { background: #e0e0e0; padding: 2px 6px; border-radius: 3px; }
            pre { background: #e0e0e0; padding: 10px; border-radius: 5px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="info">
            <h1>GraphQL API</h1>
            <p>Send POST requests to this endpoint with a JSON body:</p>
            <pre><code>{
  "query": "query { brands { id name } }",
  "variables": {}
}</code></pre>
            <p>Or use a GraphQL client like Apollo Client.</p>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error: any) {
    console.error('GET request error:', error);
    return new Response(
      JSON.stringify({ 
        errors: [{ message: error.message || 'Internal server error' }] 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await startServer();
    
    // Get raw body text for debugging
    const rawBody = await request.text();
    let body: any;
    
    try {
      body = JSON.parse(rawBody);
    } catch (parseError: any) {
      console.error('[GraphQL] Failed to parse request body:', parseError);
      console.error('[GraphQL] Raw body:', rawBody.substring(0, 500));
      return new Response(
        JSON.stringify({ 
          errors: [{ 
            message: 'Invalid JSON in request body',
            ...(process.env.NODE_ENV === 'development' && { 
              details: parseError.message,
              rawBody: rawBody.substring(0, 200)
            })
          }] 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    const { query, variables, operationName } = body;
    
    if (!query) {
      console.error('[GraphQL] Missing query in request body');
      return new Response(
        JSON.stringify({ errors: [{ message: 'Query is required' }] }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Ensure variables is an object if provided, or undefined if not
    let parsedVariables: Record<string, any> | undefined;
    if (variables !== undefined && variables !== null) {
      if (typeof variables === 'string') {
        try {
          parsedVariables = JSON.parse(variables);
        } catch {
          return new Response(
            JSON.stringify({ errors: [{ message: 'Invalid variables JSON string' }] }),
            { 
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      } else if (typeof variables === 'object') {
        parsedVariables = variables;
      } else {
        return new Response(
          JSON.stringify({ errors: [{ message: 'Variables must be an object' }] }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }
    
    // Use executeHTTPGraphQLRequest for proper Apollo Server v5 integration
    // Convert Next.js Headers to Apollo Server v5 HeaderMap
    const headerMap = new HeaderMap();
    request.headers.forEach((value, key) => {
      headerMap.set(key, value);
    });
    
    try {
      const httpResponse = await server.executeHTTPGraphQLRequest({
        httpGraphQLRequest: {
          method: 'POST',
          headers: headerMap,
          search: '',
          body: { 
            query, 
            ...(parsedVariables !== undefined && { variables: parsedVariables }),
            ...(operationName && { operationName }),
          },
        },
        context: async () => ({}),
      });
      
      let responseBody: string;
      if (httpResponse.body.kind === 'complete') {
        responseBody = httpResponse.body.string;
      } else {
        // Handle chunked response (shouldn't happen in this case)
        const chunks: string[] = [];
        for await (const chunk of httpResponse.body.asyncIterator) {
          chunks.push(chunk);
        }
        responseBody = chunks.join('');
      }
      
      // Log response status for debugging
      if (httpResponse.status && httpResponse.status >= 400) {
        console.error('[GraphQL] Apollo Server returned error status:', httpResponse.status);
        console.error('[GraphQL] Response body:', responseBody.substring(0, 500));
      }
      
      return new Response(responseBody, {
        status: httpResponse.status || 200,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(httpResponse.headers),
        },
      });
    } catch (apolloError: any) {
      console.error('[GraphQL] Apollo Server execution error:', apolloError);
      console.error('[GraphQL] Error stack:', apolloError.stack);
      return new Response(
        JSON.stringify({ 
          errors: [{ 
            message: apolloError.message || 'GraphQL execution error',
            ...(process.env.NODE_ENV === 'development' && { 
              stack: apolloError.stack,
              details: apolloError.toString()
            })
          }] 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error: any) {
    console.error('POST request error:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        errors: [{ 
          message: error.message || 'Internal server error',
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        }] 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
