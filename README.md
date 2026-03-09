# ProductDash

A modern Next.js dashboard application for managing and exporting product catalogs from various brands.

## Features

- **GraphQL API** with Apollo Server for flexible data queries
- **Advanced Scraping System** with pagination and promise chaining
- **Background Job Processing** with BullMQ and Redis
- **Product Management** with search, filters, and CSV export
- **Scraping Job Tracking** with progress monitoring
- **Scalable Architecture** for adding new brands easily
- **Brand-Specific Scrapers** for custom website structures

## Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for detailed setup instructions.

```bash
# Install dependencies
npm install

# Ensure Redis is running
brew services start redis

# Start development server
npm run dev
```

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Apollo Client (GraphQL)

### Backend
- GraphQL (Apollo Server)
- In-memory stores (brandStore, productStore, jobStore)
- BullMQ + Redis (background job processing)
- Cheerio (web scraping)
- PapaParse (CSV export)

## Architecture

- **Data Storage**: In-memory singleton stores for brands, products, and jobs
- **API**: GraphQL with Apollo Server
- **Job Queue**: BullMQ workers for scraping and CSV export
- **Scraping**: Advanced scraper with pagination support
- **Frontend**: React with Apollo Client

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Quick setup guide
- [SETUP.md](./SETUP.md) - Detailed setup and configuration
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture overview
