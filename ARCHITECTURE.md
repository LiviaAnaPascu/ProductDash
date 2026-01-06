# Architecture Overview

## Backend Structure

### Database (Prisma ORM)
- **Brand**: Stores brand information and configuration
- **Product**: Stores product data with relationships to brands
- **ScraperJob**: Tracks scraping jobs with progress and status

### GraphQL API
- **Apollo Server**: Handles all GraphQL queries and mutations
- **Resolvers**: Business logic for fetching and manipulating data
- **Schema**: Type definitions for all entities

### Scraping System
- **Advanced Scraper**: Handles pagination, promise chaining, and product extraction
- **Brand-Specific Scrapers**: Custom scrapers registered per brand
- **Scraper Service**: Manages scraping jobs and progress tracking

## Key Features

### 1. Pagination Support
The scraper handles different pagination types:
- URL parameters (`?page=1`)
- URL paths (`/page/1`)
- Selector-based (extract from page)

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

## Adding a New Brand

1. **Create Brand in Database** (via GraphQL or Prisma):
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
│   ├── prisma.ts          # Prisma client
│   └── apollo-client.ts   # Apollo Client setup
└── app/
    ├── api/
    │   └── graphql/        # GraphQL API endpoint
    └── page.tsx            # Dashboard (uses GraphQL)
```

