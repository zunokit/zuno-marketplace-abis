# Zuno Marketplace ABIs

> **Enterprise-grade ABI marketplace and API service for Ethereum smart contracts**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Zuno Marketplace ABIs** is a production-ready, scalable platform providing comprehensive API access to verified Ethereum smart contract ABIs across multiple EVM-compatible networks. Built with Next.js 15, featuring enterprise authentication, IPFS storage, intelligent caching, and a powerful admin interface.

### 🎯 Built For

- **Blockchain Developers**: Instant access to verified contract ABIs without manual etherscan scraping
- **DApp Projects**: Reliable ABI versioning and multi-network support for production applications
- **Development Teams**: Self-hosted ABI repository with audit trails and access control
- **API Consumers**: Tiered API access (Public/Free/Pro/Enterprise) with comprehensive rate limiting

## 🌟 Features

### 🎨 Core Capabilities

| Feature | Description | Status |
|---------|-------------|--------|
| **RESTful API** | Version-controlled endpoints for ABIs, contracts, and networks | ✅ Production |
| **Multi-Authentication** | Session-based (cookies) + API key authentication with scoped permissions | ✅ Production |
| **Tiered Rate Limiting** | Dual-layer rate limiting: IP-based (DDoS protection) + API key tiers | ✅ Production |
| **IPFS Storage** | Decentralized, immutable ABI storage via Pinata with content addressing | ✅ Production |
| **Redis Caching** | High-performance distributed caching with Upstash (60%+ cache hit rate) | ✅ Production |
| **Admin Dashboard** | Full-featured UI for ABIs, contracts, networks, API keys, and user management | ✅ Production |
| **Audit Logging** | Complete activity tracking with timestamp, user, action, and metadata | ✅ Production |
| **Multi-Network** | Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Sepolia + custom networks | ✅ Production |
| **ABI Versioning** | Track multiple ABI versions per contract with rollback capability | ✅ Production |
| **Search & Filter** | Advanced filtering by network, address, name, verification status | ✅ Production |

### 🏗️ Technical Architecture

<table>
<tr>
<td width="50%" valign="top">

**Frontend**
- ⚡ Next.js 15 with Turbopack
- ⚛️ React 19 with Server Components
- 🎨 TailwindCSS v4 + shadcn/ui
- 📊 TanStack React Query v5
- 🎯 TypeScript 5.9 (strict mode)
- 📱 Responsive design with dark mode

</td>
<td width="50%" valign="top">

**Backend**
- 🗄️ PostgreSQL 14+ with Drizzle ORM
- ⚡ Upstash Redis for caching
- 🔐 Better Auth for authentication
- 📦 Pinata for IPFS storage
- 🏗️ Clean Architecture (Hexagonal)
- 🧪 Jest + Playwright for testing

</td>
</tr>
</table>

### 🚀 Production-Ready Features

- ✅ **Health Monitoring**: `/api/health` endpoint with database, cache, and IPFS checks
- ✅ **Error Tracking**: Structured error handling with request IDs for tracing
- ✅ **Database Migrations**: Versioned schema migrations with Drizzle Kit
- ✅ **Type Generation**: Automatic TypeScript types from database schema
- ✅ **Security Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- ✅ **Input Validation**: Zod schemas for all API inputs with detailed error messages
- ✅ **API Versioning**: Header-based versioning with backward compatibility
- ✅ **Backup/Restore**: Database backup and restore endpoints for disaster recovery
- ✅ **Connection Pooling**: Optimized PostgreSQL connection management
- ✅ **Graceful Shutdown**: Clean resource cleanup on deployment updates

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

| Requirement | Minimum Version | Recommended | Purpose |
|-------------|----------------|-------------|---------|
| **Node.js** | 18.x | 20.x LTS | Runtime environment |
| **pnpm** | 8.x | 9.x | Package manager |
| **PostgreSQL** | 14.x | 16.x | Primary database |
| **Upstash Redis** | - | Cloud | Caching & rate limiting |
| **Pinata Account** | - | Cloud | IPFS storage |

### Installation (5 Minutes Setup)

#### 1️⃣ Clone & Install Dependencies

```bash
# Clone repository
git clone https://github.com/ZunoKit/zuno-marketplace-abis.git
cd zuno-marketplace-abis

# Install dependencies (pnpm recommended)
pnpm install
```

#### 2️⃣ Configure Environment Variables

Create `.env` file in project root:

```bash
# Database (Required)
DATABASE_URL="postgresql://user:password@localhost:5432/zuno_marketplace"

# Authentication (Required - Generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET="your-secret-key-min-32-characters-long"
BETTER_AUTH_URL="http://localhost:3000"

# Cache - Upstash Redis (Required - Free tier available)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# IPFS Storage - Pinata (Required - Free tier available)
PINATA_JWT="your-pinata-jwt-token"
PINATA_GATEWAY_URL="https://gateway.pinata.cloud"

# Client-Side (Optional - defaults to localhost:3000)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Admin Account (Optional - for seeding)
DEFAULT_ADMIN_EMAIL="admin@example.com"
DEFAULT_ADMIN_PASSWORD="admin123"
```

**🔑 Get Free Credentials:**
- **Upstash Redis**: [console.upstash.com](https://console.upstash.com) (Free tier: 10K requests/day)
- **Pinata**: [app.pinata.cloud](https://app.pinata.cloud) (Free tier: 1GB storage)

#### 3️⃣ Setup Database

```bash
# Generate authentication types
pnpm auth:generate

# Generate database migrations and TypeScript types
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed database with networks, admin user, and test data
pnpm db:seed
```

#### 4️⃣ Start Development Server

```bash
# Start with Turbopack (fast HMR)
pnpm dev
```

### 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Public marketplace (coming soon) |
| **Admin Dashboard** | http://localhost:3000/admin | ABI management interface |
| **API** | http://localhost:3000/api | RESTful API endpoints |
| **Health Check** | http://localhost:3000/api/health | System status & version |
| **Database Studio** | `pnpm db:studio` | Visual database browser |

### 🔐 Default Admin Credentials

```
Email: admin@example.com
Password: admin123
```

**⚠️ IMPORTANT**: Change these credentials immediately in production!

```bash
# Login at http://localhost:3000/admin
# Go to Settings > Account > Change Password
```

### ✅ Verify Installation

```bash
# Type check
pnpm typecheck

# Run tests
pnpm test

# Health check
curl http://localhost:3000/api/health
```

**Expected Output**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-19T...",
  "version": "v1",
  "services": {
    "database": "connected",
    "cache": "connected",
    "ipfs": "connected"
  }
}
```

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

### 🌐 Base URLs

| Environment | Base URL | Notes |
|-------------|----------|-------|
| **Production** | `https://api.zuno-marketplace.com` | Replace with your domain |
| **Staging** | `https://staging-api.zuno-marketplace.com` | Pre-production testing |
| **Development** | `http://localhost:3000` | Local development |

### 🔐 Authentication Methods

#### 1. API Key Authentication (Recommended for Programmatic Access)

**Header-Based**:
```bash
curl -H "X-API-Key: sk_live_abc123xyz..." \
     https://api.zuno-marketplace.com/api/abis
```

**Query Parameter** (Not recommended for production):
```bash
curl "https://api.zuno-marketplace.com/api/abis?api_key=sk_live_abc123..."
```

**Get Your API Key**:
1. Login to Admin Dashboard: `/admin`
2. Navigate to **API Keys** section
3. Click **Create New Key**
4. Select tier and permissions
5. Copy key immediately (only shown once)

#### 2. Session Authentication (For Web UI)

```bash
# Login (creates session cookie)
curl -X POST https://api.zuno-marketplace.com/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'

# Use session cookie in subsequent requests
curl -H "Cookie: better-auth.session_token=..." \
     https://api.zuno-marketplace.com/api/abis
```

### 🔄 API Versioning

Specify API version via header (defaults to `v1`):

```bash
# Explicit version
curl -H "X-API-Version: v1" \
     -H "X-API-Key: sk_live_..." \
     https://api.zuno-marketplace.com/api/abis

# Alternative header
curl -H "Accept-Version: v1" \
     -H "X-API-Key: sk_live_..." \
     https://api.zuno-marketplace.com/api/abis
```

**Version Behavior**:
- Missing header → defaults to `v1`
- Invalid version → `400 Bad Request`
- Deprecated version → `410 Gone` (with migration guide)

### ⚡ Rate Limits

| Tier | Requests/Hour | Requests/Day | Burst Limit | Price |
|------|---------------|--------------|-------------|-------|
| **Public** | 100 | 1,000 | 10/min | Free |
| **Free** | 500 | 5,000 | 30/min | Free |
| **Pro** | 5,000 | 50,000 | 100/min | $29/mo |
| **Enterprise** | Unlimited | Unlimited | Unlimited | Custom |

**Rate Limit Headers** (included in every response):
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1642589432
X-RateLimit-Tier: free
```

**Rate Limit Exceeded Response**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Upgrade to Pro for higher limits.",
    "statusCode": 429,
    "details": {
      "limit": 500,
      "remaining": 0,
      "resetAt": "2025-01-19T15:30:00Z",
      "tier": "free"
    }
  }
}
```

### 📚 Core Endpoints

#### ABIs

<details>
<summary><b>GET /api/abis</b> - List ABIs (paginated)</summary>

**Query Parameters**:
```
network     : string   (ethereum, polygon, bsc, arbitrum, optimism, base, sepolia)
page        : number   (default: 1)
limit       : number   (default: 20, max: 100)
verified    : boolean  (filter by verification status)
```

**Example Request**:
```bash
curl -H "X-API-Key: sk_live_..." \
     "https://api.zuno-marketplace.com/api/abis?network=ethereum&page=1&limit=20"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "abi_v1_xyz123",
      "contractAddress": "0x1234...",
      "network": "ethereum",
      "abiHash": "Qm...",
      "ipfsUrl": "https://gateway.pinata.cloud/ipfs/Qm...",
      "verified": true,
      "createdAt": "2025-01-19T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```
</details>

<details>
<summary><b>GET /api/abis/{id}</b> - Get single ABI</summary>

**Example Request**:
```bash
curl -H "X-API-Key: sk_live_..." \
     "https://api.zuno-marketplace.com/api/abis/abi_v1_xyz123"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "abi_v1_xyz123",
    "contractAddress": "0x1234...",
    "network": "ethereum",
    "abi": [...],
    "abiHash": "Qm...",
    "ipfsUrl": "https://gateway.pinata.cloud/ipfs/Qm...",
    "verified": true,
    "metadata": {
      "compiler": "0.8.19",
      "optimization": true
    },
    "createdAt": "2025-01-19T10:00:00Z",
    "updatedAt": "2025-01-19T10:00:00Z"
  }
}
```
</details>

<details>
<summary><b>POST /api/abis</b> - Create new ABI (requires authentication)</summary>

**Request Body**:
```json
{
  "contractAddress": "0x1234567890abcdef...",
  "network": "ethereum",
  "abi": [
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [{"type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ],
  "metadata": {
    "compiler": "0.8.19",
    "optimization": true,
    "runs": 200
  }
}
```

**Example Request**:
```bash
curl -X POST https://api.zuno-marketplace.com/api/abis \
  -H "X-API-Key: sk_live_..." \
  -H "Content-Type: application/json" \
  -d @abi-payload.json
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "abi_v1_xyz123",
    "contractAddress": "0x1234...",
    "abiHash": "Qm...",
    "ipfsUrl": "https://gateway.pinata.cloud/ipfs/Qm...",
    "createdAt": "2025-01-19T10:00:00Z"
  }
}
```
</details>

#### Contracts

<details>
<summary><b>GET /api/contracts</b> - List contracts</summary>

**Query Parameters**:
```
network     : string   (filter by network)
verified    : boolean  (filter by verification)
page        : number
limit       : number
```

**Example Request**:
```bash
curl -H "X-API-Key: sk_live_..." \
     "https://api.zuno-marketplace.com/api/contracts?network=ethereum&verified=true"
```
</details>

<details>
<summary><b>GET /api/contracts/{address}</b> - Get contract by address</summary>

**Example Request**:
```bash
curl -H "X-API-Key: sk_live_..." \
     "https://api.zuno-marketplace.com/api/contracts/0x1234...?network=ethereum"
```
</details>

<details>
<summary><b>GET /api/contracts/{address}/abi</b> - Get contract's current ABI</summary>

**Example Request**:
```bash
curl -H "X-API-Key: sk_live_..." \
     "https://api.zuno-marketplace.com/api/contracts/0x1234.../abi?network=ethereum"
```
</details>

<details>
<summary><b>GET /api/contracts/{address}/versions</b> - List ABI versions for contract</summary>

**Example Request**:
```bash
curl -H "X-API-Key: sk_live_..." \
     "https://api.zuno-marketplace.com/api/contracts/0x1234.../versions?network=ethereum"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "versionId": "v1.0.0",
      "abiId": "abi_v1_xyz123",
      "createdAt": "2025-01-19T10:00:00Z",
      "changes": "Initial version"
    },
    {
      "versionId": "v1.1.0",
      "abiId": "abi_v1_abc456",
      "createdAt": "2025-01-20T11:00:00Z",
      "changes": "Added new functions"
    }
  ]
}
```
</details>

#### Networks

<details>
<summary><b>GET /api/networks</b> - List supported networks</summary>

**Example Request**:
```bash
curl "https://api.zuno-marketplace.com/api/networks"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "network_v1_eth",
      "name": "Ethereum Mainnet",
      "chainId": 1,
      "rpcUrl": "https://eth.llamarpc.com",
      "explorerUrl": "https://etherscan.io",
      "nativeCurrency": {
        "name": "Ether",
        "symbol": "ETH",
        "decimals": 18
      },
      "isTestnet": false
    }
  ]
}
```
</details>

<details>
<summary><b>GET /api/networks/{chainId}/contracts</b> - Get contracts by network</summary>

**Example Request**:
```bash
curl -H "X-API-Key: sk_live_..." \
     "https://api.zuno-marketplace.com/api/networks/1/contracts"
```
</details>

#### System

<details>
<summary><b>GET /api/health</b> - Health check</summary>

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-19T10:00:00Z",
  "version": "v1",
  "services": {
    "database": "connected",
    "cache": "connected",
    "ipfs": "connected"
  },
  "uptime": 3600
}
```
</details>

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

### 📋 Pre-Deployment Checklist

#### Security & Configuration
- [ ] Generate strong `BETTER_AUTH_SECRET` (use: `openssl rand -base64 32`)
- [ ] Update `BETTER_AUTH_URL` to production domain
- [ ] Configure production `DATABASE_URL` with SSL (`?sslmode=require`)
- [ ] Setup Upstash Redis (production instance)
- [ ] Configure Pinata IPFS with sufficient quota
- [ ] Change default admin credentials immediately
- [ ] Rotate all API keys from development
- [ ] Configure CORS origins (whitelist only trusted domains)
- [ ] Enable security headers (CSP, HSTS, X-Frame-Options)
- [ ] Review and restrict database permissions

#### Infrastructure
- [ ] PostgreSQL database provisioned (recommended: 14+ with 2GB+ RAM)
- [ ] Upstash Redis instance created (Pro tier recommended for production)
- [ ] Pinata account with production plan (Free tier: 1GB, consider Pro)
- [ ] SSL certificate configured (automatic with Vercel)
- [ ] CDN configured for static assets
- [ ] Backup strategy implemented (daily automated backups)
- [ ] Monitoring tools integrated (Sentry, DataDog, etc.)
- [ ] Log aggregation configured (optional: Logtail, Papertrail)

#### Code Quality
- [ ] All tests passing (`pnpm test && pnpm test:e2e`)
- [ ] Type checking clean (`pnpm typecheck`)
- [ ] Linting clean (`pnpm lint`)
- [ ] No console.log statements in production code
- [ ] Environment variables documented

#### Database
- [ ] All migrations applied (`pnpm db:migrate`)
- [ ] Better Auth migrations applied (`pnpm auth:migrate`)
- [ ] Database seeded with networks (`pnpm db:seed`)
- [ ] Database indexes created on frequently queried columns
- [ ] Connection pool size configured appropriately
- [ ] Database backup tested and verified

### 🟢 Vercel Deployment (Recommended)

Vercel provides zero-config deployment for Next.js apps with automatic HTTPS, CDN, and edge functions.

#### 1️⃣ Install Vercel CLI

```bash
npm i -g vercel
```

#### 2️⃣ Deploy to Staging

```bash
# Deploy to preview environment
vercel

# Follow prompts to link project
```

#### 3️⃣ Configure Environment Variables

**Via Vercel Dashboard**:
1. Go to Project Settings → Environment Variables
2. Add all required variables from your `.env` file
3. Select environments (Production, Preview, Development)

**Via CLI**:
```bash
# Add production environment variables
vercel env add DATABASE_URL production
vercel env add BETTER_AUTH_SECRET production
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
vercel env add PINATA_JWT production
vercel env add PINATA_GATEWAY_URL production
vercel env add NEXT_PUBLIC_APP_URL production
# ... add remaining variables
```

#### 4️⃣ Deploy to Production

```bash
# Deploy to production
vercel --prod

# Or use GitHub integration for automatic deployments
```

#### 5️⃣ Post-Deployment

```bash
# Run migrations on production database
# Connect to production DB and run:
pnpm db:migrate

# Seed networks
pnpm db:seed

# Verify deployment
curl https://your-domain.vercel.app/api/health
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database-url",
    "BETTER_AUTH_SECRET": "@better-auth-secret"
  }
}
```

### 🐳 Docker Deployment

For self-hosted environments or cloud platforms (AWS ECS, Google Cloud Run, etc.)

#### Dockerfile (Production-Optimized)

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Rebuild the source code only when needed
FROM base AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

# Build Next.js application
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### Docker Compose (with PostgreSQL & Redis)

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/zuno_marketplace
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: http://localhost:3000
      UPSTASH_REDIS_REST_URL: ${UPSTASH_REDIS_REST_URL}
      UPSTASH_REDIS_REST_TOKEN: ${UPSTASH_REDIS_REST_TOKEN}
      PINATA_JWT: ${PINATA_JWT}
      PINATA_GATEWAY_URL: ${PINATA_GATEWAY_URL}
    depends_on:
      - db
    networks:
      - app-network

  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: zuno_marketplace
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
```

#### Build & Run

```bash
# Build image
docker build -t zuno-marketplace-abis .

# Run with environment file
docker run -p 3000:3000 --env-file .env zuno-marketplace-abis

# Or use Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app

# Run migrations
docker-compose exec app pnpm db:migrate
docker-compose exec app pnpm db:seed
```

### 🌥️ Cloud Platform Deployments

<details>
<summary><b>AWS (Elastic Container Service)</b></summary>

1. Push Docker image to ECR
2. Create ECS task definition
3. Configure RDS PostgreSQL instance
4. Setup ElastiCache Redis (optional)
5. Configure ALB for load balancing
6. Setup Auto Scaling group

**Recommended AWS Services**:
- **Compute**: ECS Fargate
- **Database**: RDS PostgreSQL (db.t3.medium minimum)
- **Cache**: ElastiCache Redis (cache.t3.micro minimum)
- **Storage**: S3 (for backups)
- **CDN**: CloudFront
- **Monitoring**: CloudWatch

</details>

<details>
<summary><b>Google Cloud Platform</b></summary>

1. Build and push to Google Container Registry
2. Deploy to Cloud Run
3. Setup Cloud SQL PostgreSQL
4. Configure Memorystore Redis (optional)
5. Setup Cloud CDN

```bash
# Deploy to Cloud Run
gcloud run deploy zuno-marketplace \
  --image gcr.io/PROJECT_ID/zuno-marketplace-abis \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=... \
  --memory 2Gi \
  --cpu 2
```

</details>

<details>
<summary><b>Railway</b></summary>

1. Connect GitHub repository
2. Add PostgreSQL plugin
3. Add Redis plugin
4. Configure environment variables
5. Deploy automatically on push

Railway provides automatic HTTPS and managed databases.

</details>

### 🔧 Post-Deployment Configuration

#### 1️⃣ Verify Health Check

```bash
curl https://your-domain.com/api/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-19T10:00:00Z",
  "version": "v1",
  "services": {
    "database": "connected",
    "cache": "connected",
    "ipfs": "connected"
  }
}
```

#### 2️⃣ Update Admin Password

1. Login to `/admin` with default credentials
2. Navigate to **Settings** → **Account**
3. Change password immediately
4. Logout and login with new password

#### 3️⃣ Generate Production API Keys

1. Go to `/admin/api-keys`
2. Click **Create New Key**
3. Select tier (Free/Pro/Enterprise)
4. Set permissions and expiration
5. Save key securely (only shown once)

#### 4️⃣ Configure Monitoring

**Setup Error Tracking (Sentry)**:
```bash
# Install Sentry
pnpm add @sentry/nextjs

# Initialize
npx @sentry/wizard@latest -i nextjs

# Add SENTRY_DSN to environment variables
```

**Setup Uptime Monitoring**:
- Use UptimeRobot, Pingdom, or Checkly
- Monitor `/api/health` endpoint every 5 minutes
- Alert on downtime or slow response times

#### 5️⃣ Setup Backups

**Automated Daily Backups** (PostgreSQL):
```bash
# Create backup script (backup.sh)
#!/bin/bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
# Upload to S3, Google Cloud Storage, etc.

# Add to crontab for daily execution at 2 AM
0 2 * * * /path/to/backup.sh
```

**Test Restore**:
```bash
# Test backup restoration
psql $DATABASE_URL < backup-20250119.sql
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

## 📊 Project Status & Roadmap

### Current Status (v0.1.0)

| Component | Status | Notes |
|-----------|--------|-------|
| **Core API** | ✅ Production Ready | RESTful API with versioning |
| **Admin Dashboard** | ✅ Production Ready | Full CRUD operations |
| **Authentication** | ✅ Production Ready | Session + API key auth |
| **IPFS Storage** | ✅ Production Ready | Pinata integration |
| **Rate Limiting** | ✅ Production Ready | Dual-layer protection |
| **Caching** | ✅ Production Ready | Redis-backed |
| **Audit Logging** | ✅ Production Ready | Complete activity tracking |
| **Multi-Network** | ✅ Production Ready | 8+ networks supported |
| **ABI Versioning** | ✅ Production Ready | Full version history |
| **Database Backups** | ✅ Production Ready | Automated backups |

### Roadmap

#### v0.2.0 (Q1 2025) - Public Marketplace
- 🚧 Public marketplace UI for browsing ABIs
- 🚧 Advanced search with filters
- 🚧 Contract verification workflow
- 🚧 User documentation portal

#### v0.3.0 (Q2 2025) - Analytics & Insights
- 📋 Analytics dashboard for API usage
- 📋 Contract popularity metrics
- 📋 Network usage statistics
- 📋 Real-time monitoring dashboard

#### v0.4.0 (Q3 2025) - Enhanced Features
- 📋 GraphQL API endpoint
- 📋 Webhook notifications for contract updates
- 📋 Contract change detection
- 📋 Automated ABI imports from verified contracts

#### v1.0.0 (Q4 2025) - Enterprise Features
- 📋 Multi-tenancy support
- 📋 Custom branding for enterprise
- 📋 Advanced RBAC (Role-Based Access Control)
- 📋 SLA-backed uptime guarantees
- 📋 Priority support tiers

**Legend**: ✅ Complete | 🚧 In Progress | 📋 Planned

---

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### How to Contribute

1. **Fork the Repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/zuno-marketplace-abis.git
   cd zuno-marketplace-abis
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   # or
   git checkout -b bugfix/fix-issue-123
   ```

3. **Make Your Changes**
   - Follow coding standards in [CLAUDE.md](CLAUDE.md)
   - Write tests for new features
   - Update documentation as needed
   - Follow commit message conventions

4. **Test Your Changes**
   ```bash
   pnpm typecheck  # Type checking
   pnpm lint       # Linting
   pnpm test       # Unit tests
   pnpm test:e2e   # E2E tests (optional)
   ```

5. **Commit Your Changes**
   ```bash
   # Use conventional commits format
   git commit -m "feat(abis): add bulk import functionality"
   git commit -m "fix(auth): resolve session timeout issue"
   git commit -m "docs(readme): update installation instructions"
   ```

6. **Push and Create Pull Request**
   ```bash
   git push origin feature/amazing-feature
   # Open PR on GitHub
   ```

### Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions or changes
- `chore`: Build process or tooling changes

**Examples**:
```
feat(api): add contract search endpoint
fix(cache): resolve Redis connection timeout
docs(contributing): add code review guidelines
refactor(repositories): extract common query logic
```

### Code Review Process

1. ✅ Automated checks must pass (lint, typecheck, tests)
2. 👀 At least one approval required from maintainers
3. 💬 All conversations must be resolved
4. 🔄 Branch must be up to date with `main`
5. ✨ Changes must follow architecture guidelines

### Development Guidelines

- **Follow Clean Architecture**: See [CLAUDE.md](CLAUDE.md) for patterns
- **Write Type-Safe Code**: Use TypeScript strict mode
- **Test Your Code**: Aim for >80% coverage
- **Document Public APIs**: Add JSDoc comments
- **Keep PRs Focused**: One feature/fix per PR
- **Update Tests**: Update or add tests for changes

### Areas We Need Help

- 🐛 Bug fixes and issue resolution
- 📝 Documentation improvements
- 🧪 Test coverage expansion
- 🌐 Multi-language support
- ♿ Accessibility improvements
- 🎨 UI/UX enhancements
- 🔧 Performance optimizations

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### What This Means

✅ **You can**:
- Use this software commercially
- Modify and distribute the software
- Use this software privately
- Use this software for patent purposes

❌ **You cannot**:
- Hold the authors liable
- Use contributors' names for endorsement

📋 **You must**:
- Include the original license and copyright notice
- State significant changes made to the software

---

## 🙏 Acknowledgments

### Core Technologies

This project is built on the shoulders of giants:

| Technology | Purpose | Why We Chose It |
|------------|---------|-----------------|
| [Next.js 15](https://nextjs.org/) | React framework | Best-in-class DX, Turbopack, Server Components |
| [Drizzle ORM](https://orm.drizzle.team/) | Database ORM | Type-safe, lightweight, excellent migration system |
| [Better Auth](https://better-auth.com/) | Authentication | Modern auth with API keys, admin features built-in |
| [TanStack Query](https://tanstack.com/query) | Data fetching | Industry-standard React data management |
| [shadcn/ui](https://ui.shadcn.com/) | UI components | Beautiful, accessible, customizable components |
| [Upstash Redis](https://upstash.com/) | Caching | Serverless Redis with generous free tier |
| [Pinata](https://pinata.cloud/) | IPFS storage | Reliable IPFS pinning with excellent API |
| [PostgreSQL](https://www.postgresql.org/) | Database | Rock-solid reliability, rich feature set |

### Inspiration & Resources

- **Clean Architecture** by Robert C. Martin - Architecture patterns
- **Hexagonal Architecture** by Alistair Cockburn - Domain-driven design
- **T3 Stack** - TypeScript, tRPC, Tailwind inspiration
- **Ethereum Community** - Contract standards and best practices

### Contributors

Thanks to all contributors who have helped shape this project:

<!-- Contributors will be auto-generated here -->

---

## 📞 Support & Community

### 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** - Complete architecture guide for developers
- **[API Documentation](#-api-documentation)** - Comprehensive API reference
- **[Deployment Guide](#-deployment)** - Production deployment instructions
- **Tests** - `tests/` directory contains usage examples

### 🐛 Bug Reports & Feature Requests

Found a bug? Have a feature idea?

1. **Search existing issues** to avoid duplicates
2. **Open a new issue** with detailed description:
   - Bug reports: Include steps to reproduce, expected vs actual behavior
   - Feature requests: Describe use case and proposed solution
3. **Use issue templates** for consistency

[Open an Issue](https://github.com/ZunoKit/zuno-marketplace-abis/issues/new)

### 💬 Get Help

- **GitHub Discussions**: Ask questions, share ideas
- **Discord**: [Coming Soon] Real-time community chat
- **Stack Overflow**: Tag questions with `zuno-marketplace`

### 🌟 Stay Updated

- ⭐ **Star this repo** to show support and get updates
- 👀 **Watch releases** for version updates
- 🐦 **Follow us** on Twitter [@ZunoKit](https://twitter.com/ZunoKit) (update with actual handle)

### 📧 Commercial Support

For enterprise support, custom development, or consulting:

- **Email**: support@zuno-marketplace.com (update with actual email)
- **Website**: https://zuno-marketplace.com (update with actual URL)

---

## 🔒 Security

### Reporting Security Vulnerabilities

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, email us at: **security@zuno-marketplace.com** (update with actual email)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

We'll acknowledge receipt within 48 hours and provide a detailed response within 7 days.

### Security Best Practices

When deploying:
- ✅ Use strong, randomly generated secrets
- ✅ Enable database SSL connections
- ✅ Keep dependencies updated (`pnpm update`)
- ✅ Run security audits (`pnpm audit`)
- ✅ Use environment variables for secrets (never commit)
- ✅ Enable rate limiting in production
- ✅ Monitor error logs for suspicious activity
- ✅ Implement automated backups

---

<div align="center">

## 🚀 Ready to Get Started?

```bash
git clone https://github.com/ZunoKit/zuno-marketplace-abis.git
cd zuno-marketplace-abis
pnpm install
pnpm dev
```

---

### **Built with ❤️ by the Zuno Team**

[Website](https://zuno-marketplace.com) • [Documentation](CLAUDE.md) • [API Reference](#-api-documentation) • [GitHub](https://github.com/ZunoKit/zuno-marketplace-abis)

**Star ⭐ this repo if you find it useful!**

---

**License**: MIT | **Version**: 0.1.0 | **Last Updated**: January 2025

</div>
