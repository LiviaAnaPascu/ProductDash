# Architecture Overview

## Backend Structure

### In-Memory Stores (Default)
The application uses **in-memory stores** by default for fast development and testing:

- **Brand Store** (`lib/brandStore.ts`): Manages brands in memory
- **Product Store** (`lib/productStore.ts`): Manages scraped products in memory
- **Auto-Initialization**: Morellato brand is automatically added on server start
- **Auto-Scraping**: Automatically starts scraping for brands with no products (development mode)

### Database (Prisma ORM) - Optional
Database support is available but commented out by default:

- **Brand**: Stores brand information and configuration
- **Product**: Stores product data with relationships to brands
- **ScraperJob**: Tracks scraping jobs with progress and status

To enable database, uncomment the Prisma code in:
- `prisma/schema.prisma`
- `lib/prisma.ts`
- `graphql/resolvers.ts`
- `services/scraperService.ts`

### GraphQL API
- **Apollo Server v5**: Handles all GraphQL queries and mutations
- **Resolvers**: Business logic for fetching and manipulating data (uses in-memory stores)
- **Schema**: Type definitions for all entities

### Scraping System
- **Advanced Scraper**: Handles pagination, promise chaining, and product extraction
- **Brand-Specific Scrapers**: Custom scrapers registered per brand
- **Scraper Service**: Manages scraping jobs and progress tracking

## Frontend Features

### 1. Virtualized Product Grid
- **Lazy Loading**: Items after index 50 use intersection observer for lazy loading
- **Performance**: Only renders visible items + buffer for smooth scrolling
- **Placeholders**: Shows skeleton loaders for items not yet in viewport
- **Staggered Animations**: Smooth fade-in animations for items entering viewport

### 2. Infinite Scroll
- **Auto-Load**: Automatically loads more products when scrolling near bottom (300px threshold)
- **Scroll Preservation**: Maintains scroll position when new items are appended
- **Loading Indicator**: Shows "Loading more products..." at the bottom during fetch
- **Product Accumulation**: New products are appended to existing list (not replaced)

### 3. Back to Top Button
- **Auto-Show**: Appears when user scrolls down 300px
- **Smooth Scroll**: Smoothly scrolls to top when clicked
- **Fixed Position**: Always accessible in bottom-right corner

## Backend Features

### 1. Pagination Support
The scraper handles different pagination types:
- URL parameters (`?page=1`)
- URL paths (`/page/1`)
- Custom URL builders (e.g., Morellato's `_2`, `_3` pattern)

### 2. Promise Chaining
Products from multiple pages are scraped concurrently using `Promise.all()` for better performance.

### 3. Progress Tracking
Scraping jobs track:
- Current page
- Total pages
- Products found
- Status (pending, running, completed, failed)

### 4. Brand-Specific Scrapers
Each brand can have a custom scraper configuration:
```typescript
registerBrandScraper('BrandName', {
  pagination: { ... },
  productListSelector: '...',
  selectors: { ... },
  extractProduct: customFunction,
});
```

### 5. Auto-Scraping
The application automatically starts scraping on server start:
- **Development Mode**: Auto-scrapes by default
- **Production Mode**: Requires `AUTO_SCRAPE=true` environment variable
- **Smart Detection**: Only scrapes brands that have no products
- **Non-Blocking**: Scraping runs asynchronously without blocking server startup

## Adding a New Brand

1. **Create Brand** (via GraphQL or in-memory store):
```graphql
mutation {
  createBrand(input: {
    name: "New Brand"
    website: "https://example.com"
    baseUrl: "https://example.com"
  }) {
    id
    name
  }
}
```

2. **Create Custom Scraper** (if needed):
```typescript
// utils/newBrandScraper.ts
import { ScraperConfig, registerBrandScraper } from './advancedScraper';

const newBrandConfig: ScraperConfig = {
  // ... configuration
};

registerBrandScraper('New Brand', newBrandConfig);
```

3. **Start Scraping**:
```graphql
mutation {
  startScraping(input: { brandId: "..." }) {
    id
    status
  }
}
```

## Database Setup

1. Set up your database (PostgreSQL recommended):
```bash
# Create .env file with DATABASE_URL
DATABASE_URL="postgresql://user:password@localhost:5432/productdash?schema=public"
```

2. Run migrations:
```bash
npm run db:migrate
```

3. Seed database (optional):
```bash
npm run db:seed
```

## GraphQL Queries

### Get Products with Filters
```graphql
query {
  products(filters: {
    search: "watch"
    brandId: "..."
    type: "Jewelry"
    page: 1
    pageSize: 20
  }) {
    products {
      id
      name
      brand { name }
      price
      imageUrl
    }
    totalCount
    hasMore
  }
}
```

### Start Scraping
```graphql
mutation {
  startScraping(input: { brandId: "..." }) {
    id
    status
    brand { name }
  }
}
```

### Get Scraping Jobs
```graphql
query {
  scraperJobs(brandId: "...") {
    id
    status
    currentPage
    totalPages
    productsFound
  }
}
```

## File Structure

```
ProductDash/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding
├── graphql/
│   ├── schema.ts          # GraphQL type definitions
│   ├── resolvers.ts       # GraphQL resolvers
│   └── queries.ts         # GraphQL query definitions
├── services/
│   └── scraperService.ts  # Scraping job management
├── utils/
│   ├── advancedScraper.ts # Main scraping logic
│   └── morellatoScraper.ts # Brand-specific example
├── lib/
│   ├── brandStore.ts      # In-memory brand store
│   ├── productStore.ts    # In-memory product store
│   ├── autoScraper.ts    # Auto-scraping on server start
│   ├── prisma.ts          # Prisma client (commented out)
│   └── apollo-client.ts   # Apollo Client setup
├── components/
│   ├── VirtualizedProductGrid.tsx # Virtualized grid with lazy loading
│   ├── BackToTopButton.tsx       # Back to top functionality
│   ├── ProductCard.tsx            # Individual product card
│   ├── SearchBar.tsx              # Search input
│   ├── FilterBar.tsx              # Brand/type filters
│   └── ExportButton.tsx          # CSV export
└── app/
    ├── api/
    │   └── graphql/        # GraphQL API endpoint (Apollo Server v5)
    └── page.tsx            # Dashboard with infinite scroll
```

