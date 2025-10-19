# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Zuno Marketplace ABIs** is an enterprise-grade Next.js 15 application providing a comprehensive marketplace and API service for Ethereum smart contract ABIs. The platform enables developers to discover, access, and integrate verified smart contract interfaces across multiple EVM-compatible networks.

### Core Value Proposition

- **Centralized ABI Repository**: Single source of truth for verified smart contract ABIs across Ethereum, Polygon, BSC, Arbitrum, Optimism, and more
- **Version Management**: Track multiple ABI versions per contract with full audit history
- **Developer API**: RESTful API with tiered access (Public/Free/Pro/Enterprise) for programmatic integration
- **IPFS-Backed Storage**: Decentralized, immutable ABI storage with content-addressed retrieval
- **Production-Ready Infrastructure**: Enterprise authentication, rate limiting, caching, and monitoring

**Stack**: Next.js 15 (App Router + Turbopack), React 19, TypeScript, PostgreSQL (Drizzle ORM), Better Auth, Upstash Redis, Pinata (IPFS), TailwindCSS v4 + shadcn/ui, TanStack React Query v5

## Development Commands

```bash
# Development
pnpm dev                 # Start dev server with Turbopack (hot reload enabled)
pnpm typecheck          # Type check without emitting files
pnpm lint               # Run ESLint with Next.js config

# Database Management
pnpm db:generate        # Generate Drizzle migrations and TypeScript types
pnpm db:migrate         # Run database migrations
pnpm db:studio          # Open Drizzle Studio (GUI database browser)
pnpm db:seed            # Seed database with networks, contracts, and test data
pnpm db:check           # Validate database data integrity and relationships

# Authentication
pnpm auth:generate      # Generate Better Auth TypeScript types
pnpm auth:migrate       # Run Better Auth database migrations

# Testing
pnpm test               # Run Jest unit tests
pnpm test:watch         # Run Jest in watch mode
pnpm test:e2e           # Run Playwright E2E tests (requires running dev server)

# Build & Deploy
pnpm build              # Production build with Turbopack (optimized bundle)
pnpm start              # Start production server (requires build first)

# Utility Scripts
pnpm script:test        # Run complete integration test suite
```

## Architecture & Design Patterns

### Clean Architecture (Hexagonal Architecture)

The codebase follows **Clean Architecture** with clear separation of concerns:

```
src/
├── core/                    # Domain layer (business logic)
│   ├── domain/             # Entities & Repository interfaces
│   │   ├── abi/           # ABI entity & repository interface
│   │   ├── contract/      # Contract entity & repository interface
│   │   └── network/       # Network entity & repository interface
│   ├── services/          # Domain services (query builders, auth context)
│   ├── use-cases/         # Application use cases (orchestrate domain logic)
│   └── ports/             # Port interfaces for external dependencies
│
├── infrastructure/          # Infrastructure layer (implementations)
│   ├── database/
│   │   ├── drizzle/       # Database schema & migrations
│   │   └── repositories/  # Repository implementations
│   ├── storage/ipfs/      # IPFS/Pinata storage adapters
│   ├── cache/             # Redis cache adapter
│   ├── auth/              # Better Auth configuration
│   ├── services/          # Infrastructure services (rate limit, API keys)
│   └── di/container.ts    # Dependency Injection container
│
├── app/                    # Next.js App Router (presentation layer)
│   ├── api/               # API routes
│   └── admin/             # Admin UI pages
│
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   └── feature/           # Feature-specific components
│
└── shared/                 # Shared utilities
    ├── lib/               # Utilities (validation, ABI parsing, error handling)
    ├── types/             # Shared TypeScript types
    ├── dto/               # Data Transfer Objects
    └── config/            # App configuration & environment variables
```

### Key Architectural Decisions

1. **Dependency Injection (DI)**

   - Centralized DI container at `src/infrastructure/di/container.ts`
   - Repositories and services are resolved via factory functions
   - Use helper functions like `getAbiRepository()`, `getCacheService()` instead of direct instantiation
   - Enables easy testing with mock implementations

2. **Repository Pattern**

   - Domain defines repository interfaces (`core/domain/*/repository.ts`)
   - Infrastructure provides implementations (`infrastructure/database/repositories/*`)
   - All database operations go through repositories, never direct DB access in use cases

3. **Use Case Pattern**

   - Each business operation is a separate use case class
   - Use cases orchestrate domain logic and coordinate between repositories/services
   - Example: `CreateAbiUseCase` handles ABI creation, IPFS storage, and caching

4. **API Handler Wrapper**
   - `ApiWrapper.create()` provides standardized error handling, validation, auth, and rate limiting
   - All API routes use this wrapper for consistency
   - Located at: `src/shared/lib/api/api-handler.ts`

### API Versioning & Multi-Network Support

#### API Versioning System

The application supports **API versioning** via headers and ID prefixes:

- **Client sends version**: `X-API-Version: v1` or `Accept-Version: v1` (defaults to v1)
- **Middleware validates**: `src/middleware.ts` validates version against database
- **ID prefixes**: All entities use versioned IDs (e.g., `abi_v1_xyz123`, `contract_v1_abc456`)
- **Database tracking**: API versions stored in `api_versions` table with enabled/deprecated flags

When working with versioning:

- Always include version in entity ID generation
- Use `IdGenerator.generate({ prefix, apiVersion })` from `src/shared/lib/utils/id-generator.ts`
- Respect `X-Internal-API-Version` header in route handlers

#### Multi-Network Architecture

Supports multiple EVM-compatible networks with chain-specific configurations:

- **Supported Networks**: Ethereum Mainnet, Sepolia, Polygon, BSC, Arbitrum, Optimism, Base, and more
- **Chain ID Validation**: Strict validation of contract addresses per network
- **Network Metadata**: RPC URLs, block explorers, native currencies stored in database
- **Contract Grouping**: Contracts organized by network and searchable by chain ID
- **API Endpoints**: Network-specific querying (`/api/networks/{chainId}/contracts`)

### Authentication & Authorization

**Better Auth** is used for authentication with multiple methods:

1. **Session Authentication** (Cookie or Bearer token)

   - For web UI and server-side requests
   - Supports email/password login
   - Admin-only signup (public signup disabled)

2. **API Key Authentication**

   - For programmatic access
   - Supports permissions and scopes (e.g., `abis:read`, `write:contracts`)
   - **Tier-based rate limiting** via Redis (Free/Pro/Enterprise)
   - Public API keys available for read-only access

3. **Rate Limiting (Dual Layer)**
   - **Layer 1 (Better Auth)**: Global rate limiting per IP (enabled, database-backed)
     - Protects against DDoS and brute force attacks
     - 100 requests per minute per IP
   - **Layer 2 (Custom Redis)**: API key tier-based rate limiting
     - Implemented in `src/infrastructure/services/rate-limit.service.ts`
     - Uses Upstash Redis for distributed rate limiting
     - Tiers: Public (100/hr), Free (500/hr), Pro (5000/hr), Enterprise (unlimited)
     - Supports IP whitelisting and origin restrictions
     - Better Auth's API key rate limiting is DISABLED (we use this custom implementation)

### Storage & Caching Strategy

#### IPFS Storage (Pinata)

- **Location**: `src/infrastructure/storage/ipfs/pinata.adapter.ts`
- **Purpose**: Immutable, decentralized ABI storage
- **Features**:
  - Group organization for efficient management
  - Content-addressed retrieval via CID (Content Identifier)
  - Automatic pinning for guaranteed availability
  - Gateway-based public access
- **Integration**: ABIs uploaded to IPFS on creation, CID stored in database

#### Redis Cache (Upstash)

- **Location**: `src/infrastructure/cache/cache.adapter.ts`
- **Purpose**: High-performance query result caching
- **Cache Layers**:
  - ABI queries: 1 hour TTL
  - Contract metadata: 30 minutes TTL
  - Network list: 2 hours TTL
  - Search results: 15 minutes TTL
- **Cache Keys**: Structured keys with version prefix for easy invalidation
- **Invalidation**: Automatic on entity updates/deletes

#### Cache Configuration

All cache TTLs and strategies defined in `src/shared/config/app.config.ts`:

### Admin UI & Frontend Architecture

The application includes a full-featured admin interface with modern React patterns:

1. **Server Actions Pattern**

   - Server actions in `src/app/admin/*/actions.ts` provide type-safe server operations
   - Eliminates need for API routes for CRUD operations
   - Automatic serialization/deserialization with `"use server"`
   - Example: `src/app/admin/abis/actions.ts`

2. **React Query Integration**

   - TanStack React Query for data fetching and caching
   - Custom hooks in `src/hooks/use-*.ts`
   - Centralized query keys factory: `src/shared/constants/query-keys.ts`
   - Cache configuration: `src/shared/constants/cache-config.ts`
   - QueryProvider setup: `src/components/query-provider.tsx`

3. **Admin Layout & Authentication**

   - Server-side authentication check in `src/app/admin/layout.tsx`
   - Admin-only access with role validation
   - Automatic redirect to signin if unauthorized
   - Persistent sidebar navigation

4. **Feature Components**

   - Data tables with TanStack Table (`@tanstack/react-table`)
   - Reusable dialogs for create/edit/delete/view operations
   - Located in `src/components/feature/`
   - Examples: `abi-form-dialog.tsx`, `abi-table-columns.tsx`, `data-table.tsx`

5. **UI Component Library**

   - shadcn/ui components in `src/components/ui/`
   - Customized with Tailwind CSS v4
   - Sonner for toast notifications
   - Radix UI primitives for accessibility

6. **Type-Safe Data Flow**

   - Server Actions → React Query → Components
   - DTOs for request/response validation
   - Shared types in `src/shared/types/`
   - Full type inference from database schema

## Next.js 15 & React 19 Features

This project leverages cutting-edge Next.js 15 and React 19 features:

### Next.js 15 Features

1. **Turbopack (Stable)**

   - Used for both `dev` and `build` scripts
   - Significantly faster build times and HMR
   - Enable with `--turbopack` flag

2. **Server Actions (Stable)**

   - Type-safe server-side operations with `"use server"`
   - Used extensively in admin UI (`src/app/admin/*/actions.ts`)
   - Eliminates need for API routes in many cases
   - Automatic request deduplication

3. **Server Components by Default**

   - All components are Server Components unless marked with `"use client"`
   - Admin layout handles authentication server-side
   - Reduces client-side JavaScript bundle

4. **Async Request APIs**
   - `headers()`, `cookies()`, `params` are now async
   - Must use `await` when accessing request context

### React 19 Features

1. **React Compiler Ready**

   - Automatic memoization optimization
   - Improved performance without manual optimization

2. **Enhanced Hooks**

   - `useActionState` for form actions (can replace react-hook-form in simple cases)
   - Better async rendering support

3. **Improved Error Handling**
   - Better error boundaries with server components
   - Streamlined error reporting

### Best Practices for Next.js 15

- Always `await` params in route handlers: `const params = await context.params`
- Use Server Actions for mutations in admin UI
- Keep API routes for public API (better caching control)
- Minimize `"use client"` boundaries for better performance
- Leverage React Query for client-side data fetching

## Important Coding Standards

### TypeScript Path Aliases

Always use path aliases defined in `tsconfig.json`:

```typescript
import { AbiRepository } from "@/core/domain/abi/abi.repository";
import { getAbiRepository } from "@/infrastructure/di/container";
import { Button } from "@/components/ui/button";
```

### Database Operations

1. **Never access database directly in use cases or API routes**

   - Always use repository pattern
   - Get repositories from DI container

2. **After schema changes**:

   ```bash
   pnpm db:generate  # Generates migrations and TypeScript types
   pnpm db:migrate
   ```

3. **Schema location**: `src/infrastructure/database/drizzle/schema/index.ts`

### Error Handling

- Use `ApiError` class for API errors with proper error codes
- Error codes defined in `src/shared/types/index.ts`
- User-friendly error formatting via `src/shared/lib/api/error-formatter.ts`
- Always include `requestId` for tracing

### Validation

- **Zod schemas** for all input validation
- DTOs in `src/shared/lib/validation/*.dto.ts`
- API routes validate via `ApiWrapper` config:
  ```typescript
  validation: {
    body: CreateAbiSchema,
    query: ListAbisSchema,
  }
  ```

### Testing Strategy

- **Unit tests**: Jest (`tests/unit/**/*.test.ts`)
- **E2E tests**: Playwright (`tests/e2e/**/*.spec.ts`)
- Test configuration:
  - Jest: `jest.config.js`
  - Playwright: `playwright.config.ts`
- Always mock external dependencies (IPFS, Redis) in unit tests

## Environment Configuration

### Required Environment Variables

All environment variables are validated using `@t3-oss/env-nextjs` at `src/shared/config/env.ts`.

#### Production-Critical Variables

```bash
# Database (Required)
DATABASE_URL="postgresql://user:password@host:5432/database"

# Authentication (Required)
BETTER_AUTH_SECRET="your-secret-key-minimum-32-characters-long"  # CRITICAL: Use strong random value
BETTER_AUTH_URL="https://yourdomain.com"  # Production URL

# Cache - Upstash Redis (Required)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# IPFS Storage - Pinata (Required)
PINATA_JWT="your-pinata-jwt-token"
PINATA_GATEWAY_URL="https://gateway.pinata.cloud"

# Client-Side (Required)
NEXT_PUBLIC_APP_URL="https://yourdomain.com"  # Public app URL
```

#### Optional Configuration Variables

```bash
# Node Environment
NODE_ENV="production"  # development | test | production

# Public API Access
PUBLIC_API_USER_ID="user_v1_public"  # User ID for public API key generation

# Admin Account Setup (for initial seed)
DEFAULT_ADMIN_EMAIL="admin@yourdomain.com"
DEFAULT_ADMIN_PASSWORD="secure-password-here"

# Foundry Integration (for contract ABI seeding)
FOUNDRY_OUT_DIR="../zuno-marketplace-contracts/out"
FOUNDRY_BROADCAST_DIR="../zuno-marketplace-contracts/broadcast"

# Monitoring (Optional - commented examples)
# SENTRY_DSN="https://...@sentry.io/..."  # Error tracking
# LOGTAIL_TOKEN="..."  # Log aggregation
```

#### Environment Variable Validation

- **Runtime Validation**: All variables validated on app startup
- **Type Safety**: Full TypeScript typing with autocomplete
- **Error Messages**: Clear error messages for missing/invalid variables
- **Skip Validation**: Set `SKIP_ENV_VALIDATION=1` for build-time only (not recommended for production)

## Common Workflows

### Adding a New API Endpoint

1. Define Zod validation schema in `src/shared/lib/validation/*.dto.ts`
2. Create use case in `src/core/use-cases/`
3. Create API route in `src/app/api/*/route.ts` using `ApiWrapper.create()`
4. Add DTO mapper in `src/shared/dto/` if needed
5. Test with unit and E2E tests

### Adding a New Admin Feature

1. Create server actions in `src/app/admin/[feature]/actions.ts`
2. Define validation schemas with Zod
3. Create React Query hooks in `src/hooks/use-[feature].ts`
4. Add query keys to `src/shared/constants/query-keys.ts`
5. Build UI components in `src/app/admin/[feature]/page.tsx`
6. Create feature components in `src/components/feature/`
7. Add to admin sidebar navigation

### Adding a New Entity

1. Define entity interface in `src/core/domain/*/entity.ts`
2. Define repository interface in `src/core/domain/*/repository.ts`
3. Add database schema in `src/infrastructure/database/drizzle/schema/*.schema.ts`
4. Implement repository in `src/infrastructure/database/repositories/*.repository.impl.ts`
5. Register in DI container: `src/infrastructure/di/container.ts`
6. Run `pnpm db:generate && pnpm db:migrate`

### Working with Better Auth

- Configuration: `src/infrastructure/auth/better-auth.config.ts`
- Auth helpers: `src/infrastructure/auth/auth-helpers.ts`
- API route: `src/app/api/auth/[...all]/route.ts`
- Admin plugin enabled for user management
- API key plugin enabled with custom rate limiting

## Common Pitfalls & Best Practices

### Critical Mistakes to Avoid

1. **Don't bypass DI container**
   - ❌ `new AbiRepositoryImpl(db)`
   - ✅ `getAbiRepository()` from `src/infrastructure/di/container.ts`
   - **Why**: Breaks dependency injection, makes testing impossible

2. **Don't access DB directly in use cases or API routes**
   - ❌ `await db.query.abis.findMany()`
   - ✅ `await abiRepository.findAll()`
   - **Why**: Violates Clean Architecture, couples business logic to infrastructure

3. **Don't forget to regenerate types after schema changes**
   - Always run `pnpm db:generate` after modifying `schema/*.ts` files
   - Run `pnpm db:migrate` to apply migrations
   - **Why**: TypeScript types won't match database schema

4. **Don't hardcode API version**
   - ❌ `const id = \`abi_v1_\${nanoid()}\``
   - ✅ Extract from `X-Internal-API-Version` header and use `IdGenerator.generate()`
   - **Why**: Breaks versioning system, prevents future API evolution

5. **Understand dual rate limiting architecture**
   - **Layer 1 (Better Auth)**: Global IP rate limiting (100 req/min) - database-backed
   - **Layer 2 (Custom Redis)**: API key tier-based rate limiting - distributed
   - Better Auth's API key rate limiting is **DISABLED** - we use custom implementation
   - **Why**: Two-layer protection against abuse while providing tiered access

6. **Server Actions vs API Routes** - Know when to use each
   - **Server Actions**: Admin UI operations, internal mutations (don't expose publicly)
   - **API Routes**: Public API, external integrations, caching control needed
   - **Why**: Server Actions optimize server-side operations but lack caching control

7. **React Query cache invalidation**
   - ❌ Mutate without invalidating cache
   - ✅ Always invalidate related queries: `queryClient.invalidateQueries({ queryKey: queryKeys.abis.all })`
   - **Why**: Stale data shown to users, inconsistent UI state

8. **Query key consistency**
   - ❌ `['abis', params.id]` hardcoded strings
   - ✅ Use centralized factory: `queryKeys.abis.detail(params.id)`
   - **Why**: Prevents cache invalidation bugs, maintains consistency

### Production Readiness Checklist

#### Security
- [ ] Strong `BETTER_AUTH_SECRET` (32+ characters, randomly generated)
- [ ] Database connection uses SSL (`?sslmode=require`)
- [ ] API keys use cryptographic randomness (not sequential IDs)
- [ ] Rate limiting enabled on all public endpoints
- [ ] Input validation on all API routes (Zod schemas)
- [ ] SQL injection prevention via ORM (Drizzle)
- [ ] XSS protection via React (auto-escaping)

#### Performance
- [ ] Database indexes on frequently queried columns
- [ ] Redis caching enabled for read-heavy operations
- [ ] IPFS gateway CDN configured
- [ ] Image optimization enabled (Next.js)
- [ ] Database connection pooling configured
- [ ] Lazy loading for admin UI components

#### Monitoring & Observability
- [ ] Health check endpoint configured (`/api/health`)
- [ ] Error tracking integrated (Sentry recommended)
- [ ] Log aggregation configured (Logtail/DataDog)
- [ ] Database query performance monitoring
- [ ] Redis cache hit rate tracking
- [ ] API response time metrics

#### Deployment
- [ ] Environment variables validated
- [ ] Database migrations applied
- [ ] Better Auth migrations applied
- [ ] Database seeded with networks
- [ ] Admin account created
- [ ] Public API key generated (if needed)
- [ ] HTTPS/SSL certificate configured
- [ ] CORS origins configured
- [ ] Backup strategy implemented

## Code Quality & Documentation Rules

### File Creation Policy

- **NEVER auto-create \*.md files** without explicit permission
- Only create documentation files when explicitly requested by the user
- Focus on code implementation rather than documentation generation

### Senior-Level Code Standards

- **Clean Architecture**: Follow hexagonal architecture patterns strictly
- **SOLID Principles**: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion
- **DRY Principle**: Don't repeat yourself - extract common logic into reusable utilities
- **KISS Principle**: Keep it simple and straightforward
- **YAGNI**: You aren't gonna need it - don't over-engineer

### Code Maintainability

- **Type Safety First**: Use TypeScript strict mode, leverage generated types
- **Clear Naming**: Use descriptive variable/function names that explain intent
- **Small Functions**: Keep functions focused and under 50 lines when possible
- **Error Handling**: Always handle errors gracefully with proper error codes
- **Logging**: Include structured logging for debugging and monitoring

### Production-Ready Code

- **Performance**: Implement pagination, caching, and background jobs
- **Security**: Proper authentication/authorization at every layer
- **Scalability**: Design for horizontal scaling with stateless services
- **Monitoring**: Include health checks, metrics, and observability
- **Testing**: Unit tests for business logic, integration tests for endpoints

## Database Migrations & Seeding

### Drizzle Migrations

**Location**: `src/infrastructure/database/drizzle/migrations/`

**Workflow**:
```bash
# 1. Modify schema files in src/infrastructure/database/drizzle/schema/
# 2. Generate migration
pnpm db:generate  # Creates SQL migration + updates TypeScript types

# 3. Review migration file in migrations/ directory
# 4. Apply migration
pnpm db:migrate

# 5. Verify in Drizzle Studio
pnpm db:studio
```

**Important Notes**:
- Never edit migration files manually (generate new ones instead)
- Always commit migration files to version control
- Test migrations in development before production
- Migrations are automatically tracked in `drizzle.__drizzle_migrations` table

### Better Auth Migrations

**Workflow**:
```bash
# Run after modifying Better Auth configuration
pnpm auth:migrate

# Regenerate TypeScript types
pnpm auth:generate
```

**Tables Created**:
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth provider links
- `verification` - Email verification tokens
- `apiKey` - API keys with permissions

### Database Seeding

**Location**: `scripts/seed/index.ts`

**Orchestrated Seeding**:
```bash
pnpm db:seed
```

**Seed Data Includes**:
1. **Networks**: Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Sepolia
2. **API Versions**: v1 (enabled)
3. **Admin User**: From `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD`
4. **Public API Key**: For unauthenticated read access
5. **Test Contracts**: Sample contracts from Foundry builds (if `FOUNDRY_OUT_DIR` configured)

**Seed Providers**:
- `scripts/seed/providers/network-seed.provider.ts` - Network configuration
- `scripts/seed/providers/user-seed.provider.ts` - Admin user creation
- `scripts/seed/providers/api-key-seed.provider.ts` - Public API key
- `scripts/seed/providers/contract-seed.provider.ts` - Contract imports

**Validation**:
```bash
pnpm db:check  # Validates data integrity and relationships
```

---

## API Endpoints Reference

### Public Endpoints (No Auth Required - Rate Limited)

```
GET  /api/health                              # Health check
GET  /api/version                             # API version info
GET  /api/networks                            # List all networks
GET  /api/networks/{chainId}/contracts        # Contracts by network
GET  /api/abis                                # List ABIs (paginated)
GET  /api/abis/{id}                           # Get ABI by ID
GET  /api/abis/full                           # Get full ABI with metadata
GET  /api/contracts                           # List contracts
GET  /api/contracts/{address}                 # Get contract by address
GET  /api/contracts/{address}/abi             # Get contract's current ABI
GET  /api/contracts/{address}/versions        # List contract ABI versions
GET  /api/contracts/by-name/{name}            # Search contract by name
```

### Authenticated Endpoints (Requires API Key or Session)

```
POST   /api/abis                              # Create new ABI
PUT    /api/abis/{id}                         # Update ABI
DELETE /api/abis/{id}                         # Delete ABI
POST   /api/contracts                         # Create contract
PUT    /api/contracts/{address}               # Update contract
DELETE /api/contracts/{address}               # Delete contract
```

### Admin-Only Endpoints (Requires Admin Session)

```
GET    /api/admin/api-keys                    # List all API keys
POST   /api/admin/api-keys                    # Create API key
DELETE /api/admin/api-keys/{id}               # Revoke API key
POST   /api/backup/create                     # Create database backup
POST   /api/backup/restore                    # Restore from backup
```

### Admin UI Pages (Requires Admin Session)

```
/admin                                        # Admin dashboard
/admin/abis                                   # ABI management
/admin/contracts                              # Contract management
/admin/networks                               # Network management
/admin/api-keys                               # API key management
/admin/users                                  # User management
/admin/logs                                   # Audit log viewer
/admin/settings                               # System settings
```

---

## Quick Reference: File Locations

### Core Business Logic
- **Domain Entities**: `src/core/domain/{entity}/entity.ts`
- **Repository Interfaces**: `src/core/domain/{entity}/repository.ts`
- **Use Cases**: `src/core/use-cases/{operation}/{operation}.use-case.ts`
- **Domain Services**: `src/core/services/`

### Infrastructure
- **Repository Implementations**: `src/infrastructure/database/repositories/{entity}.repository.impl.ts`
- **Database Schema**: `src/infrastructure/database/drizzle/schema/{entity}.schema.ts`
- **DI Container**: `src/infrastructure/di/container.ts`
- **IPFS Adapter**: `src/infrastructure/storage/ipfs/pinata.adapter.ts`
- **Cache Adapter**: `src/infrastructure/cache/cache.adapter.ts`
- **Rate Limit Service**: `src/infrastructure/services/rate-limit.service.ts`

### API Layer
- **API Routes**: `src/app/api/{endpoint}/route.ts`
- **API Handler Wrapper**: `src/shared/lib/api/api-handler.ts`
- **Validation Schemas**: `src/shared/lib/validation/{entity}.dto.ts`
- **Error Handling**: `src/shared/lib/api/error-formatter.ts`

### Admin UI
- **Server Actions**: `src/app/admin/{feature}/actions.ts`
- **Page Components**: `src/app/admin/{feature}/page.tsx`
- **Feature Components**: `src/components/feature/{feature}/`
- **React Query Hooks**: `src/hooks/use-{feature}.ts`
- **Query Keys**: `src/shared/constants/query-keys.ts`

### Configuration
- **Environment Variables**: `src/shared/config/env.ts`
- **App Config**: `src/shared/config/app.config.ts`
- **Better Auth Config**: `src/infrastructure/auth/better-auth.config.ts`
- **Database Config**: `src/infrastructure/database/drizzle/config.ts`

---

## Performance Optimization Guidelines

### Database Optimization
- **Indexes**: Add indexes on frequently queried columns (`network`, `chainId`, `contractAddress`)
- **Pagination**: Always paginate large result sets (default 20, max 100)
- **Select Specific Columns**: Use Drizzle's `.select()` to avoid over-fetching
- **Connection Pooling**: Configure PostgreSQL connection pool size based on load

### Caching Strategy
- **Cache Expensive Queries**: ABIs, contract metadata, network lists
- **Short TTLs for Mutable Data**: 15-30 minutes for frequently updated data
- **Long TTLs for Static Data**: 2+ hours for networks, API versions
- **Cache Warming**: Pre-populate cache on application startup
- **Cache Invalidation**: Invalidate on mutations, not time-based alone

### API Performance
- **Rate Limiting**: Prevents abuse, protects infrastructure
- **Response Compression**: Enable gzip/brotli in production
- **CDN Integration**: Use CDN for IPFS gateway requests
- **Batch Endpoints**: Provide bulk retrieval endpoints for efficiency

### Frontend Optimization
- **Code Splitting**: Lazy load admin UI components
- **React Query Caching**: Configure stale times appropriately
- **Optimistic Updates**: Update UI before server confirmation
- **Debouncing**: Debounce search inputs (300-500ms)
- **Virtual Scrolling**: Use for large tables (100+ rows)

---

## Troubleshooting Common Issues

### Database Connection Errors
**Symptom**: `Database connection failed` or `ECONNREFUSED`
**Solutions**:
- Verify `DATABASE_URL` format: `postgresql://user:password@host:5432/database`
- Check PostgreSQL is running: `psql -h localhost -U postgres`
- Verify firewall rules allow connections
- Check SSL mode if using cloud database (`?sslmode=require`)

### Rate Limiting Issues
**Symptom**: `429 Too Many Requests`
**Solutions**:
- Check API key tier in database
- Verify Redis connection (Upstash)
- Review rate limit configuration in `app.config.ts`
- Check IP whitelisting settings

### IPFS Upload Failures
**Symptom**: `Failed to upload to IPFS`
**Solutions**:
- Verify `PINATA_JWT` is valid
- Check Pinata account quota and billing
- Test Pinata API directly: `curl -H "Authorization: Bearer $PINATA_JWT" https://api.pinata.cloud/data/testAuthentication`
- Review file size limits

### Type Generation Issues
**Symptom**: TypeScript errors after schema changes
**Solutions**:
- Run `pnpm db:generate` to regenerate types
- Clear TypeScript cache: `rm -rf .next node_modules/.cache`
- Restart TypeScript server in IDE
- Verify schema file syntax

### Authentication Failures
**Symptom**: `Unauthorized` or session not persisting
**Solutions**:
- Verify `BETTER_AUTH_SECRET` is set (min 32 characters)
- Check `BETTER_AUTH_URL` matches actual domain
- Run `pnpm auth:migrate` to ensure tables exist
- Clear browser cookies and try again
- Check CORS configuration for cross-origin requests

---

## Production Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (`pnpm test && pnpm test:e2e`)
- [ ] Type checking clean (`pnpm typecheck`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Better Auth migrations applied
- [ ] Secrets rotated (not using defaults)

### Infrastructure Setup
- [ ] PostgreSQL database provisioned (14+ recommended)
- [ ] Upstash Redis instance created
- [ ] Pinata account with sufficient quota
- [ ] SSL certificate configured
- [ ] CDN configured (Cloudflare/Vercel Edge)
- [ ] Backup strategy implemented
- [ ] Monitoring tools integrated (Sentry, DataDog, etc.)

### Post-Deployment
- [ ] Health check endpoint responding (`/api/health`)
- [ ] Admin account accessible
- [ ] Public API key working
- [ ] Rate limiting functioning
- [ ] IPFS uploads working
- [ ] Cache hit rate > 60%
- [ ] API response times < 200ms (p95)
- [ ] Error rate < 1%

### Security Hardening
- [ ] Change default admin password
- [ ] Rotate API keys
- [ ] Enable database SSL
- [ ] Configure CORS whitelist
- [ ] Enable security headers (CSP, HSTS, X-Frame-Options)
- [ ] Set up DDoS protection
- [ ] Configure rate limiting per tier
- [ ] Enable audit logging

---

## Support & Resources

### Documentation
- **Architecture Guide**: This file (CLAUDE.md)
- **User Guide**: README.md
- **API Documentation**: `/api/health` (includes endpoints)
- **Code Examples**: `tests/` directory

### External Resources
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Better Auth Docs](https://www.better-auth.com/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Upstash Redis Docs](https://upstash.com/docs/redis)
- [Pinata Docs](https://docs.pinata.cloud)

### Community
- GitHub Issues: For bug reports and feature requests
- GitHub Discussions: For questions and community support
- Discord: [Coming Soon]

---

**Last Updated**: 2025-01-19
**Version**: 0.1.0
**Maintainers**: Zuno Team
