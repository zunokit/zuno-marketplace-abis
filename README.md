# Zuno Marketplace ABIs

> **Production-ready ABI marketplace and API service for Ethereum smart contracts**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.0-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A scalable, enterprise-grade marketplace providing API access to Ethereum smart contract ABIs with authentication, rate limiting, IPFS storage, and comprehensive admin interface.

## 🌟 Features

### Core Capabilities

- **🔌 RESTful API**: Version-controlled API endpoints for ABI and contract data
- **🔐 Multi-Auth**: Session-based auth + API key authentication with scoped permissions
- **⚡ Rate Limiting**: Tier-based rate limiting (Public/Free/Pro/Enterprise)
- **📦 IPFS Storage**: Decentralized ABI storage via Pinata
- **💾 Redis Caching**: High-performance caching layer with Upstash
- **📊 Admin Dashboard**: Full-featured admin UI for managing ABIs, contracts, and API keys
- **🔍 Audit Logging**: Complete activity tracking for compliance and debugging
- **🌐 Multi-Network**: Support for Ethereum, Polygon, BSC, Arbitrum, Optimism, and more

### Technical Highlights

- **Clean Architecture**: Hexagonal architecture with DI container
- **Type Safety**: Full TypeScript with generated types from database schema
- **Next.js 15**: App Router, Server Actions, Turbopack, React 19
- **Modern Stack**: Drizzle ORM, Better Auth, TanStack Query, shadcn/ui
- **Production Ready**: Health checks, metrics, graceful shutdown, error tracking

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Database](#-database)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Configuration](#-configuration)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.x or higher
- **pnpm**: 8.x or higher
- **PostgreSQL**: 14.x or higher
- **Redis**: 6.x or higher (or Upstash account)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/zuno-marketplace-abis.git
cd zuno-marketplace-abis

# Install dependencies
pnpm install

# Setup environment variables
cp env.example .env
# Edit .env with your configuration

# Generate authentication types
pnpm auth:generate

# Setup database
pnpm db:generate    # Generate migrations
pnpm db:migrate     # Run migrations
pnpm db:seed        # Seed initial data

# Start development server
pnpm dev
```

### Access Points

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api
- **Admin Dashboard**: http://localhost:3000/admin
- **API Docs**: http://localhost:3000/api/health (includes version info)

### Default Admin Credentials

```
Email: admin@example.com
Password: admin123
```

**⚠️ Change these credentials immediately in production!**

---

## 🏗️ Architecture

### Clean Architecture (Hexagonal)

```
┌─────────────────────────────────────────────────────────┐
│                  Presentation Layer                      │
│  (Next.js App Router, API Routes, Server Actions)       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 Application Layer                        │
│          (Use Cases, Business Logic)                     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   Domain Layer                           │
│     (Entities, Repository Interfaces, Services)         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│               Infrastructure Layer                       │
│  (Database, Cache, Storage, External Services)          │
└─────────────────────────────────────────────────────────┘
```

### Key Design Patterns

- **Dependency Injection**: Centralized DI container for loose coupling
- **Repository Pattern**: Abstract database operations behind interfaces
- **Use Case Pattern**: One class per business operation
- **DTO Pattern**: Type-safe data transfer with validation
- **API Wrapper**: Standardized error handling and validation

### Directory Structure

```
src/
├── core/                    # Domain & Application Logic
│   ├── domain/             # Entities & Repository interfaces
│   ├── services/          # Domain services
│   └── use-cases/         # Business use cases
├── infrastructure/         # External implementations
│   ├── database/          # Drizzle ORM & repositories
│   ├── cache/             # Redis cache
│   ├── storage/           # IPFS/Pinata
│   ├── auth/              # Better Auth
│   └── di/                # Dependency injection container
├── app/                   # Next.js routes & pages
│   ├── api/              # API endpoints
│   ├── admin/            # Admin dashboard
│   └── auth/             # Auth pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── feature/          # Feature components
└── shared/                # Shared utilities
    ├── lib/              # Utils, validation, API helpers
    ├── types/            # TypeScript types
    └── config/           # Configuration
```

**📖 For detailed architecture guide, see [CLAUDE.md](CLAUDE.md)**

---

## 📡 API Documentation

### Base URL

```
Production: https://api.yourservice.com
Development: http://localhost:3000
```

### Authentication

#### 1. API Key Authentication (Recommended for programmatic access)

```bash
curl -H "X-API-Key: your_api_key_here" \
     https://api.yourservice.com/api/abis
```

#### 2. Session Authentication (For web UI)

```bash
# Login
curl -X POST https://api.yourservice.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Use session cookie in subsequent requests
```

### API Versioning

Specify API version via header (defaults to v1):

```bash
curl -H "X-API-Version: v1" \
     -H "X-API-Key: your_key" \
     https://api.yourservice.com/api/abis
```

### Rate Limits

| Tier       | Requests/Hour | Requests/Day |
| ---------- | ------------- | ------------ |
| Public     | 100           | 1,000        |
| Free       | 500           | 5,000        |
| Pro        | 5,000         | 50,000       |
| Enterprise | Unlimited     | Unlimited    |

### Core Endpoints

#### ABIs

```bash
# List ABIs
GET /api/abis?network=ethereum&page=1&limit=20

# Get single ABI
GET /api/abis/:id

# Get ABI by contract address
GET /api/abis/by-address/:address?network=ethereum

# Create ABI (requires authentication)
POST /api/abis
Content-Type: application/json
{
  "contractAddress": "0x...",
  "network": "ethereum",
  "abi": [...],
  "metadata": {...}
}
```

#### Contracts

```bash
# List contracts
GET /api/contracts?network=ethereum&verified=true

# Get contract details
GET /api/contracts/:id

# Search contracts by address
GET /api/contracts/by-address/:address?network=ethereum
```

#### Networks

```bash
# List supported networks
GET /api/networks

# Get network details
GET /api/networks/:id
```

#### System

```bash
# Health check
GET /api/health

# API version info
GET /api/version
```

### Response Format

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "abi_v1_xyz123",
    "contractAddress": "0x...",
    "network": "ethereum",
    "abi": [...],
    "ipfsHash": "Qm...",
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

#### Error Response

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "ABI not found",
    "statusCode": 404,
    "requestId": "req_abc123"
  }
}
```

#### Paginated Response

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

**📖 For complete API reference, see [API Test Files](tests/api/)**

---

## 💻 Development

### Commands

```bash
# Development
pnpm dev                 # Start dev server with Turbopack
pnpm typecheck          # Type checking
pnpm lint               # ESLint
pnpm format             # Prettier formatting

# Database
pnpm db:generate        # Generate migrations & types
pnpm db:migrate         # Run migrations
pnpm db:studio          # Open Drizzle Studio
pnpm db:seed            # Seed database
pnpm db:check           # Validate data integrity

# Authentication
pnpm auth:generate      # Generate Better Auth types
pnpm auth:migrate       # Run auth migrations

# Testing
pnpm test               # Unit tests
pnpm test:watch         # Watch mode
pnpm test:e2e           # E2E tests
pnpm test:coverage      # Coverage report

# Build
pnpm build              # Production build
pnpm start              # Start production server
```

### Environment Variables

Create `.env` file:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/zuno_marketplace"

# Authentication
BETTER_AUTH_SECRET="your-secret-key-min-32-characters"
BETTER_AUTH_URL="http://localhost:3000"

# Cache (Upstash Redis)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# IPFS Storage (Pinata)
PINATA_JWT="your-pinata-jwt-token"
PINATA_GATEWAY_URL="https://gateway.pinata.cloud"

# Optional
NODE_ENV="development"
PUBLIC_API_USER_ID="user_v1_public"
DEFAULT_ADMIN_EMAIL="admin@example.com"
DEFAULT_ADMIN_PASSWORD="admin123"
```

### Code Quality

```bash
# Run all checks before committing
pnpm lint && pnpm typecheck && pnpm test
```

### Git Workflow

```bash
# Branch naming
feature/description
bugfix/description
hotfix/description

# Commit convention
feat(scope): description
fix(scope): description
docs(scope): description
```

**📖 For detailed coding standards, see [CLAUDE.md](CLAUDE.md)**

---

## 🗄️ Database

### Technology

- **ORM**: Drizzle ORM
- **Database**: PostgreSQL 14+
- **Migration Tool**: Drizzle Kit

### Schema Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │────▶│  api_keys   │     │  networks   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐            │
                    │  contracts  │◀───────────┘
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    abis     │
                    └─────────────┘
```

### Migrations

```bash
# Create new migration
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Rollback (manual via Drizzle Studio)
pnpm db:studio
```

### Seeding

```bash
# Seed with default data
pnpm db:seed

# Check data integrity
pnpm db:check
```

### Backup & Restore

```bash
# Backup
pg_dump -h localhost -U user -d zuno_marketplace > backup.sql

# Restore
psql -h localhost -U user -d zuno_marketplace < backup.sql
```

---

## 🧪 Testing

### Test Structure

```
tests/
├── unit/              # Unit tests (Jest)
├── integration/       # Integration tests (Jest)
└── e2e/              # E2E tests (Playwright)
```

### Running Tests

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage

# E2E tests
pnpm test:e2e

# E2E with UI
pnpm test:e2e --ui
```

### Writing Tests

#### Unit Test Example

```typescript
import { AbiService } from "@/core/services/abi/abi.service";

describe("AbiService", () => {
  it("should parse valid ABI", () => {
    const service = new AbiService();
    const result = service.parseAbi(validAbi);
    expect(result).toBeDefined();
  });
});
```

#### E2E Test Example

```typescript
import { test, expect } from "@playwright/test";

test("should display ABIs list", async ({ page }) => {
  await page.goto("/admin/abis");
  await expect(page.locator("h1")).toContainText("ABIs");
});
```

### Test Coverage Goals

- **Unit Tests**: >80% coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user flows

---

## 🚀 Deployment

### Production Checklist

- [ ] Set strong `BETTER_AUTH_SECRET` (min 32 characters)
- [ ] Configure production `DATABASE_URL`
- [ ] Setup Upstash Redis
- [ ] Configure Pinata IPFS
- [ ] Change default admin credentials
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS origins
- [ ] Setup monitoring & logging
- [ ] Configure backup strategy
- [ ] Setup CI/CD pipeline
- [ ] Enable rate limiting
- [ ] Configure error tracking (e.g., Sentry)

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add BETTER_AUTH_SECRET
# ... add all required env vars

# Deploy to production
vercel --prod
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build and run
docker build -t zuno-marketplace .
docker run -p 3000:3000 --env-file .env zuno-marketplace
```

### Environment-Specific Configurations

#### Development

- Debug logging enabled
- Hot reload with Turbopack
- Drizzle Studio available
- Mock external services

#### Staging

- Production-like environment
- Real external services
- Limited rate limits
- Synthetic monitoring

#### Production

- Optimized build
- CDN for static assets
- Database connection pooling
- Full monitoring & alerting
- Automated backups

---

## ⚙️ Configuration

### Application Config

Located at `src/shared/config/app.config.ts`:

```typescript
export const appConfig = {
  // Cache TTLs
  cache: {
    abi: 3600, // 1 hour
    contract: 1800, // 30 minutes
    network: 7200, // 2 hours
  },

  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // Rate limiting
  rateLimit: {
    public: 100, // requests/hour
    free: 500,
    pro: 5000,
    enterprise: -1, // unlimited
  },
};
```

### Environment Configuration

Validated via `@t3-oss/env-nextjs` at `src/shared/config/env.ts`.

### Feature Flags

```typescript
export const features = {
  publicSignup: false, // Disable public registration
  ipfsStorage: true, // Enable IPFS storage
  auditLogging: true, // Enable audit logs
  rateLimiting: true, // Enable rate limiting
  caching: true, // Enable Redis cache
};
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Follow coding standards in [CLAUDE.md](CLAUDE.md)
4. Write tests for new features
5. Ensure all tests pass: `pnpm test`
6. Commit with conventional commits: `feat(scope): description`
7. Push to your fork: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Review Process

1. Automated checks must pass (lint, typecheck, tests)
2. At least one approval required
3. All conversations must be resolved
4. Branch must be up to date with main

### Coding Standards

- Follow TypeScript strict mode
- Use Clean Architecture patterns
- Write self-documenting code
- Add JSDoc for public APIs
- Maintain >80% test coverage

**📖 Full coding standards in [CLAUDE.md](CLAUDE.md)**

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Core Technologies

- [Next.js 15](https://nextjs.org/) - React framework
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [Better Auth](https://better-auth.com/) - Authentication
- [TanStack Query](https://tanstack.com/query) - Data fetching
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Upstash Redis](https://upstash.com/) - Serverless Redis
- [Pinata](https://pinata.cloud/) - IPFS storage

### Inspiration

- Clean Architecture by Robert C. Martin
- Hexagonal Architecture by Alistair Cockburn

---

## 📞 Support

- **Documentation**: [CLAUDE.md](CLAUDE.md)
- **API Tests**: [tests/api/](tests/api/)
- **Issues**: [GitHub Issues](https://github.com/your-org/zuno-marketplace-abis/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/zuno-marketplace-abis/discussions)

---

## 📊 Project Status

- ✅ **Core API**: Production ready
- ✅ **Admin Dashboard**: Production ready
- ✅ **Authentication**: Production ready
- ✅ **IPFS Storage**: Production ready
- ✅ **Rate Limiting**: Production ready
- ✅ **Caching**: Production ready
- ✅ **Audit Logging**: Production ready
- 🚧 **Public Marketplace UI**: In development
- 📋 **Analytics Dashboard**: Planned
- 📋 **GraphQL API**: Planned

---

<div align="center">

**Built with ❤️ by the Zuno Team**

[Website](https://yourwebsite.com) • [Documentation](https://docs.yourwebsite.com) • [API Reference](https://api.yourwebsite.com)

</div>
