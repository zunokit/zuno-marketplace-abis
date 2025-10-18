# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Zuno Marketplace ABIs** is a Next.js 15 application providing a marketplace for Ethereum smart contract ABIs. The system enables API-based access to contract ABIs with authentication, rate limiting, and versioning support.

**Stack**: Next.js 15 (App Router + Turbopack), React 19, TypeScript, PostgreSQL (Drizzle ORM), Better Auth, Upstash Redis, Pinata (IPFS), TailwindCSS v4 + shadcn/ui, TanStack React Query

## Development Commands

```bash
# Development
pnpm dev                 # Start dev server with Turbopack
pnpm typecheck          # Type check without emitting files
pnpm lint               # Run ESLint

# Database
pnpm db:generate        # Generate Drizzle migrations and TypeScript types
pnpm db:migrate         # Run database migrations
pnpm db:studio          # Open Drizzle Studio
pnpm db:seed            # Seed database with initial data
pnpm db:check           # Check database data integrity

# Authentication
pnpm auth:generate      # Generate Better Auth types
pnpm auth:migrate       # Run Better Auth migrations

# Testing
pnpm test               # Run Jest unit tests
pnpm test:watch         # Run Jest in watch mode
pnpm test:e2e           # Run Playwright E2E tests

# Build & Deploy
pnpm build              # Build for production with Turbopack
pnpm start              # Start production server
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

### API Versioning System

The application supports **API versioning** via headers and ID prefixes:

- **Client sends version**: `X-API-Version: v1` or `Accept-Version: v1` (defaults to v1)
- **Middleware validates**: `src/middleware.ts` validates version against database
- **ID prefixes**: All entities use versioned IDs (e.g., `abi_v1_xyz123`, `contract_v1_abc456`)
- **Database tracking**: API versions stored in `api_versions` table with enabled/deprecated flags

When working with versioning:

- Always include version in entity ID generation
- Use `IdGenerator.generate({ prefix, apiVersion })` from `src/shared/lib/utils/id-generator.ts`
- Respect `X-Internal-API-Version` header in route handlers

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

### Storage & Caching

- **IPFS Storage**: ABIs stored on IPFS via Pinata (`src/infrastructure/storage/ipfs/pinata.adapter.ts`)
- **Redis Cache**: Query results cached in Upstash Redis (`src/infrastructure/cache/cache.adapter.ts`)
- Cache TTLs defined in `src/shared/config/app.config.ts`

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

Required environment variables (see `.env.example` if exists, otherwise create from `src/shared/config/env.ts`):

```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
BETTER_AUTH_SECRET="..."  # Min 32 characters
BETTER_AUTH_URL="http://localhost:3000"

# Cache
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# IPFS Storage
PINATA_JWT="..."
PINATA_GATEWAY_URL="..."

# Optional
PUBLIC_API_USER_ID="..."  # For public API key generation
DEFAULT_ADMIN_EMAIL="..."
DEFAULT_ADMIN_PASSWORD="..."
```

Validation handled by `@t3-oss/env-nextjs` in `src/shared/config/env.ts`

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

## Common Pitfalls

1. **Don't bypass DI container** - Always use `getAbiRepository()` instead of `new AbiRepositoryImpl()`
2. **Don't access DB directly** - Use repositories, not `db.query()` in use cases
3. **Don't forget to regenerate types** - Run `pnpm db:generate` after schema changes
4. **Don't hardcode API version** - Extract from `X-Internal-API-Version` header
5. **Understand dual rate limiting** - Better Auth has global IP rate limiting (enabled); API key rate limiting uses custom Redis service
6. **Server Actions vs API Routes** - Use Server Actions for admin UI operations, API routes for public API
7. **React Query cache invalidation** - Always invalidate related queries after mutations
8. **Query key consistency** - Use centralized query keys factory, don't hardcode strings

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

## Migration Notes

- Drizzle migrations: `src/infrastructure/database/drizzle/migrations/`
- Better Auth migrations: Run via `pnpm auth:migrate`
- Seed data: `scripts/seed/index.ts` (orchestrated seeding with data providers)
