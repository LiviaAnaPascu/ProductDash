# Setup Guide

## Prerequisites

- Node.js 18+ 
- PostgreSQL (or SQLite for development)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your DATABASE_URL
```

3. Set up the database:
```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Seed the database
npm run db:seed
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Configuration

### PostgreSQL (Recommended for Production)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/productdash?schema=public"
```

### SQLite (Development)
```env
DATABASE_URL="file:./dev.db"
```

## Adding New Brands

To add a new brand to the system:

### Option 1: Using GraphQL API

```graphql
mutation {
  createBrand(input: {
    name: "Your Brand Name"
    website: "https://your-brand-website.com/products"
    baseUrl: "https://your-brand-website.com"
  }) {
    id
    name
  }
}
```

### Option 2: Using Prisma directly

```typescript
import { prisma } from '@/lib/prisma';

await prisma.brand.create({
  data: {
    name: 'Your Brand Name',
    website: 'https://your-brand-website.com/products',
    baseUrl: 'https://your-brand-website.com',
    isActive: true,
  },
});
```

### Creating Custom Scrapers

For complex scraping needs, create a brand-specific scraper:

1. Create a new file: `utils/yourBrandScraper.ts`
2. Define the scraper configuration:

```typescript
import { ScraperConfig, registerBrandScraper } from './advancedScraper';

export const yourBrandScraperConfig: ScraperConfig = {
  pagination: {
    type: 'url-param', // or 'url-path', 'selector'
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
    type: '.category',
  },
  baseUrl: 'https://your-brand-website.com',
  
  // Optional: Custom extraction function
  extractProduct: ($, element) => {
    // Custom logic here
    return { /* product data */ };
  },
};

registerBrandScraper('Your Brand Name', yourBrandScraperConfig);
```

3. Import the scraper in your app initialization (e.g., `app/layout.tsx` or a startup file)

## Starting Scraping Jobs

Once a brand is added, you can start scraping:

### Using GraphQL

```graphql
mutation {
  startScraping(input: { brandId: "brand-id-here" }) {
    id
    status
    brand { name }
  }
}
```

### Monitor Scraping Progress

```graphql
query {
  scraperJobs(brandId: "brand-id-here") {
    id
    status
    currentPage
    totalPages
    productsFound
    error
  }
}
```

## WebSocket Setup

For real-time product updates, you have two options:

### Option 1: Separate WebSocket Server (Recommended for Production)

1. Create a separate WebSocket server file (e.g., `server/websocket-server.ts`)
2. Run it alongside your Next.js app
3. Update the WebSocket URL in your client code

### Option 2: Use a WebSocket Service

For production, consider using services like:
- Pusher
- Socket.io
- AWS API Gateway WebSocket
- Ably

Update the `useWebSocket` hook to connect to your chosen service.

## Project Structure

```
ProductDash/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── graphql/       # GraphQL API endpoint
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Dashboard page
│   └── providers.tsx       # Apollo Provider
├── components/            # React components
│   ├── ProductCard.tsx    # Product card component
│   ├── SearchBar.tsx     # Search bar component
│   ├── FilterBar.tsx     # Filter bar component
│   └── ExportButton.tsx  # CSV export button
├── graphql/               # GraphQL definitions
│   ├── schema.ts         # GraphQL schema
│   ├── resolvers.ts      # GraphQL resolvers
│   └── queries.ts        # GraphQL queries
├── hooks/                 # Custom React hooks
│   └── useWebSocket.ts   # WebSocket hook
├── lib/                   # Library utilities
│   ├── prisma.ts         # Prisma client
│   ├── apollo-client.ts  # Apollo Client setup
│   └── websocket-client.ts # WebSocket client
├── prisma/                # Prisma configuration
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seeding
├── services/              # Business logic
│   └── scraperService.ts # Scraping job management
├── server/                # Server-side utilities
│   └── websocket.ts      # WebSocket server setup
├── types/                 # TypeScript types
│   └── product.ts        # Product types
└── utils/                 # Utility functions
    ├── advancedScraper.ts # Advanced scraping with pagination
    ├── morellatoScraper.ts # Brand-specific scraper example
    ├── brandConfigs.ts   # Brand configurations (legacy)
    ├── csvExport.ts     # CSV export utility
    └── productScraper.ts # Basic product scraping utilities
```

## Features

- ✅ Product grid view with images
- ✅ Search functionality
- ✅ Brand and type filters
- ✅ Product selection
- ✅ CSV export
- ✅ Scalable brand configuration
- ✅ WebSocket support (structure ready)
- ✅ TypeScript for type safety
- ✅ Tailwind CSS for styling
- ✅ Responsive design

## Customization

### Styling
Modify `tailwind.config.ts` to customize the design system.

### Product Fields
Update the `Product` interface in `types/product.ts` to add new fields.

### Export Format
Modify `utils/csvExport.ts` to change CSV export columns or format.

