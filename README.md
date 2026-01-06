# ProductDash

A modern Next.js dashboard application for managing and exporting product catalogs from various brands.

## Features

- **GraphQL API** with Apollo Server for flexible data queries
- **Prisma ORM** for type-safe database access
- **Advanced Scraping System** with pagination and promise chaining
- **Product Management** with search, filters, and CSV export
- **Scraping Job Tracking** with progress monitoring
- **Scalable Architecture** for adding new brands easily
- **Brand-Specific Scrapers** for custom website structures

## Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for detailed setup instructions.

```bash
# Install dependencies
npm install

# Set up database (configure DATABASE_URL in .env)
npm run db:generate
npm run db:migrate
npm run db:seed

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
- Prisma ORM
- PostgreSQL / SQLite
- Cheerio (web scraping)
- PapaParse (CSV export)

## Architecture

- **Database**: Prisma ORM with PostgreSQL/SQLite
- **API**: GraphQL with Apollo Server
- **Scraping**: Advanced scraper with pagination support
- **Frontend**: React with Apollo Client

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Documentation

- [QUICKSTART.md](./QUICKSTART.md) - Quick setup guide
- [SETUP.md](./SETUP.md) - Detailed setup and configuration
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture overview

