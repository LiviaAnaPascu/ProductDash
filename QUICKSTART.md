# Quick Start Guide

## 1. Install Dependencies

```bash
npm install
```

**Note**: The project uses Apollo Server v5, React 18, Next.js 14, and includes virtualization libraries for optimal performance.

## 2. Start Redis

BullMQ requires Redis for background job processing:

```bash
brew services start redis
```

## 3. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

**Auto-Scraping**: On server start, the application automatically checks for active brands and starts scraping if no products exist. This happens in development mode by default, or if `AUTO_SCRAPE=true` is set in production.

## 4. View Available Brands

The Morellato brand is **automatically initialized** when the server starts. You can query it immediately:

### Query Brands via GraphQL

Open your browser console or use a GraphQL client and run:

```graphql
query {
  brands {
    id
    name
    website
    baseUrl
    isActive
  }
}
```

Or use curl:

```bash
curl -X POST http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ brands { id name website } }"}'
```

You should see the Morellato brand with `id: "brand-1"`.

## 5. Start Scraping Products

Once you have a brand ID, you can start scraping:

```graphql
mutation {
  startScraping(input: { brandId: "brand-1" }) {
    id
    status
    brand {
      name
    }
  }
}
```

The scraper will:
- Automatically detect pagination (Morellato has 12 pages)
- Scrape products from all pages concurrently
- Extract product names, images, prices, descriptions
- Log progress to the console

**Note:** Products are automatically saved to the in-memory product store when scraping completes. Check the server console for scraping progress.

**Auto-Scraping**: The application automatically starts scraping for brands that have no products when the server starts (in development mode or if `AUTO_SCRAPE=true`).

## 6. Add More Brands

### Option A: Via GraphQL Mutation

```graphql
mutation {
  createBrand(input: {
    name: "Your Brand Name"
    website: "https://example.com/products"
    baseUrl: "https://example.com"
  }) {
    id
    name
  }
}
```

### Option B: Edit `lib/brandStore.ts`

Add brands directly in the `BrandStore` constructor:

```typescript
constructor() {
  this.addBrand({
    name: 'Morellato',
    website: 'https://www.morellato.com/catalogo-prodotti-A1.htm',
    baseUrl: 'https://www.morellato.com',
    isActive: true,
  });

  // Add more brands here
  this.addBrand({
    name: 'Another Brand',
    website: 'https://another-brand.com',
    baseUrl: 'https://another-brand.com',
    isActive: true,
  });
}
```

## 7. Create Custom Scrapers

The Morellato scraper is already set up in `utils/morellatoScraper.ts`. To add scrapers for other brands:

1. **Create a new scraper file** (e.g., `utils/yourBrandScraper.ts`):

```typescript
import { ScraperConfig, registerBrandScraper } from './advancedScraper';

export const yourBrandScraperConfig: ScraperConfig = {
  pagination: {
    type: 'url-param', // or 'url-path', 'custom'
    paramName: 'page',
    startPage: 1,
  },
  productListSelector: '.product-item',
  selectors: {
    name: '.product-name',
    imageUrl: 'img',
    price: '.price',
    description: '.description',
    url: 'a',
  },
  baseUrl: 'https://your-brand.com',
};

registerBrandScraper('Your Brand Name', yourBrandScraperConfig);
```

2. **Import it in `app/api/graphql/route.ts`**:

```typescript
import '@/utils/morellatoScraper';
import '@/utils/yourBrandScraper'; // Add this
```

3. **The scraper will automatically be used** when you start scraping that brand.

## 8. View Products

Products are automatically saved to an **in-memory product store** when scraping completes. You can query them immediately:

```graphql
query {
  products(filters: {
    page: 1
    pageSize: 20
  }) {
    products {
      id
      name
      brand { name }
      price
      imageUrl
      type
    }
    totalCount
    hasMore
  }
}
```

### Filter Products

```graphql
query {
  products(filters: {
    brandId: "brand-1"
    search: "charm"
    type: "Charm"
    page: 1
    pageSize: 20
  }) {
    products {
      id
      name
      price
      imageUrl
    }
    totalCount
  }
}
```

**Note:** Products are stored in memory and will persist until the server restarts.

### Dashboard Features

The dashboard includes:

- **Infinite Scroll**: Automatically loads more products as you scroll down
- **Virtualized Grid**: Optimized rendering for large product lists (lazy loading after 50 items)
- **Back to Top Button**: Appears when you scroll down 300px
- **Product Accumulation**: "Load More" appends products instead of replacing them
- **Scroll Position Preservation**: Maintains your scroll position when new items load
- **Loading Indicators**: Shows "Loading more products..." at the bottom when fetching

## 9. Understanding the Store System

The application uses **in-memory stores** to manage brands and products:

### Brand Store (`lib/brandStore.ts`)

- **Automatic Initialization**: Morellato brand is added on server start
- **CRUD Operations**: Create, read, update, and delete brands
- **Singleton Pattern**: Single instance shared across the application

### Product Store (`lib/productStore.ts`)

- **Automatic Saving**: Products are saved when scraping completes
- **Filtering**: Search by brand, type, or text
- **Pagination**: Built-in pagination support
- **Brand Association**: Products are linked to their brands

### Store Lifecycle

1. **Server Start**: Brand store initializes with Morellato brand
2. **Scraping**: Products are automatically saved to product store
3. **Querying**: GraphQL resolvers read from stores
4. **Server Restart**: All data is reset (stores are in-memory only)

## Troubleshooting

### No Brands Showing

- The Morellato brand is automatically initialized on server start
- If you don't see it, check that `lib/brandStore.ts` is being imported
- Restart the dev server to reinitialize brands

### GraphQL Errors

- Check the server console for detailed error messages
- Ensure the GraphQL query syntax is correct
- Verify brand IDs exist before starting scraping jobs

### Scraping Not Working

- Check the server console for scraping progress and errors
- Verify the brand website URL is correct
- Ensure the scraper configuration matches the website structure
- Check network connectivity to the target website
- Ensure Redis is running (`brew services start redis`)

## Example GraphQL Queries

### Get All Brands
```graphql
query {
  brands {
    id
    name
    website
    isActive
  }
}
```

### Get Single Brand
```graphql
query {
  brand(id: "brand-1") {
    id
    name
    website
    productCount
  }
}
```

### Start Scraping
```graphql
mutation {
  startScraping(input: { brandId: "brand-1" }) {
    id
    status
    brand {
      name
    }
  }
}
```

### Create New Brand
```graphql
mutation {
  createBrand(input: {
    name: "New Brand"
    website: "https://example.com"
    baseUrl: "https://example.com"
  }) {
    id
    name
    website
  }
}
```
