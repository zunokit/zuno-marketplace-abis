# Zuno Marketplace ABIs - Codebase Summary

**Version**: 1.0
**Last Updated**: January 2025
**Project Version**: 0.1.0 (Production Ready)

## Overview

Zuno Marketplace ABIs is a production-grade Next.js 15 application implementing Clean Architecture (Hexagonal) patterns. The codebase is organized into clear layers: presentation (Next.js routes), application (use cases), domain (entities and services), and infrastructure (database, cache, external services).

**Statistics**:
- Total Files: 267+
- Total Directories: 40+
- Primary Language: TypeScript (100%)
- Code Size: ~320KB (excluding node_modules, dist, migrations)

---

## Project Structure & Organization

### Root Directory Layout

```
E:\zuno-marketplace-abis\
├── .claude/                    # Claude Code workspace config
│   ├── agents/                # Sub-agent configurations
│   ├── commands/              # Custom slash commands
│   ├── hooks/                 # Git/CI hooks
│   ├── skills/                # Extended capability scripts
│   ├── workflows/             # Development workflows
│   └── settings.json          # Workspace settings
├── .opencode/                 # OpenCode integration
├── .repomixignore             # Repomix exclude patterns
├── .sentryclirc               # Sentry CLI configuration
├── src/                       # Main application code
├── scripts/                   # Build and utility scripts
├── tests/                     # Test suites (unit, integration)
├── public/                    # Static assets
├── docs/                      # Documentation (this folder)
├── CLAUDE.md                  # Development guidelines
├── README.md                  # Project overview
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── next.config.ts             # Next.js configuration (with Sentry wrapper)
├── drizzle.config.ts          # Database configuration
├── eslint.config.mjs          # Linting rules
├── postcss.config.mjs         # Tailwind CSS config
├── sentry.server.config.ts    # Server-side Sentry configuration
├── sentry.client.config.ts    # Client-side Sentry configuration
├── sentry.edge.config.ts      # Edge runtime Sentry configuration
└── components.json            # shadcn/ui configuration
```

---

## Source Code Organization (`src/`)

### Layer 1: Domain Core (`src/core/`)

**Purpose**: Business logic independent of frameworks and external concerns

#### 1.1 Domain Layer (`src/core/domain/`)

Entities and repository interfaces defining business rules:

**ABIs Context**:
```
src/core/domain/abi/
├── abi.entity.ts            # ABI entity with validation
├── abi.repository.ts        # Repository interface
├── abi-version.entity.ts    # ABI version tracking
└── abi-hash.value-object.ts # Value object for content hashing
```

**Contracts Context**:
```
src/core/domain/contract/
├── contract.entity.ts       # Smart contract entity
├── contract.repository.ts   # Repository interface
└── index.ts                 # Exports
```

**Networks Context**:
```
src/core/domain/network/
├── network.entity.ts        # Blockchain network
├── network.repository.ts    # Repository interface
└── index.ts                 # Exports
```

**Audit Logs Context**:
```
src/core/domain/audit-log/
├── audit-log.entity.ts      # Activity audit record
├── audit-log.repository.ts  # Repository interface
└── index.ts                 # Exports
```

**Key Classes**:
- `AbiEntity`: Represents contract ABI with hash and IPFS details
- `ContractEntity`: Blockchain contract record
- `NetworkEntity`: EVM network configuration
- `AuditLogEntity`: Activity audit trail

#### 1.2 Services (`src/core/services/`)

Domain services implementing business logic:

```
src/core/services/
├── abi/
│   ├── abi-query.service.ts       # ABI retrieval logic
│   └── abi-hash.service.ts        # Hash computation
├── contract/
│   ├── contract-query.service.ts  # Contract lookups
│   └── contract.service.ts        # Contract operations
├── network/
│   ├── network-query.service.ts   # Network queries
│   └── index.ts
├── audit-log/
│   └── audit-log.service.ts       # Audit logging
├── auth/
│   └── auth-context.service.ts    # Auth context management
├── backup.service.ts              # Database backup/restore
├── index.ts                        # Service exports
└── ...
```

**Key Services**:
- `AbiQueryService`: Retrieve ABIs with caching
- `ContractQueryService`: Contract details and ABI versions
- `NetworkQueryService`: Network information
- `AuditLogService`: Log user activities
- `BackupService`: Database backup/restore operations

#### 1.3 Use Cases (`src/core/use-cases/`)

One class per business operation (application commands):

```
src/core/use-cases/
├── abi/
│   ├── create-abi.use-case.ts     # Add new ABI
│   ├── delete-abi.use-case.ts     # Remove ABI
│   ├── get-abi.use-case.ts        # Fetch ABI
│   ├── get-abi-versions.use-case.ts # Get version history
│   ├── list-abis.use-case.ts      # List ABIs (paginated)
│   └── update-abi.use-case.ts     # Modify ABI
├── contract/
│   ├── create-contract.use-case.ts
│   ├── delete-contract.use-case.ts
│   ├── get-contract.use-case.ts
│   ├── get-contract-abi.use-case.ts
│   ├── get-contract-versions.use-case.ts
│   ├── list-contracts.use-case.ts
│   └── update-contract.use-case.ts
├── network/
│   ├── create-network.use-case.ts
│   ├── delete-network.use-case.ts
│   ├── get-network.use-case.ts
│   ├── list-networks.use-case.ts
│   └── update-network.use-case.ts
├── api-key/
│   ├── create-api-key.use-case.ts
│   ├── delete-api-key.use-case.ts
│   ├── get-api-key.use-case.ts
│   └── list-api-keys.use-case.ts
└── index.ts
```

**20+ use cases total**, each handling single business operation with clear inputs/outputs.

#### 1.4 Ports (`src/core/ports/`)

Interface definitions for external adapters:

```
src/core/ports/
├── repository.port.ts       # Base repository interface
├── cache.port.ts           # Cache adapter interface
├── storage.port.ts         # IPFS storage interface
└── index.ts
```

---

### Layer 2: Infrastructure (`src/infrastructure/`)

**Purpose**: External service implementations (database, cache, auth, etc.)

#### 2.1 Database (`src/infrastructure/database/`)

Drizzle ORM implementation:

```
src/infrastructure/database/
├── drizzle/
│   ├── schema/
│   │   ├── users.schema.ts          # User table
│   │   ├── api-keys.schema.ts       # API key storage
│   │   ├── networks.schema.ts       # Network records
│   │   ├── contracts.schema.ts      # Contract records
│   │   ├── abis.schema.ts          # ABI storage
│   │   ├── abi-versions.schema.ts  # ABI version history
│   │   ├── audit-logs.schema.ts    # Activity logs
│   │   └── index.ts                # Schema exports
│   ├── migrations/
│   │   ├── 0000_*.sql              # Initial migration
│   │   ├── 0001_*.sql              # Auth setup
│   │   └── meta/                   # Migration metadata
│   ├── client.ts                   # Drizzle database client
│   ├── index.ts                    # Database exports
│   └── ...
├── repositories/
│   ├── abi.repository.ts           # ABI repository impl
│   ├── contract.repository.ts      # Contract repository
│   ├── network.repository.ts       # Network repository
│   ├── audit-log.repository.ts    # Audit log repository
│   └── index.ts
└── migrations.config.ts            # Migration setup
```

**11 Database Tables**:
- `users` - User accounts
- `better_auth_users` - Better Auth user data
- `api_keys` - API key credentials
- `networks` - Blockchain networks
- `contracts` - Smart contracts
- `abis` - Contract ABIs
- `abi_versions` - ABI version history
- `audit_logs` - Activity audit trail
- Plus 3-4 Better Auth internal tables

**30+ Indexes** optimizing queries on:
- Network + address lookups
- User + API key searches
- Audit log filters
- ABI pagination

#### 2.2 Cache (`src/infrastructure/cache/`)

Redis caching layer:

```
src/infrastructure/cache/
├── redis.client.ts         # Upstash Redis client
├── cache.service.ts        # Cache operations
├── cache-keys.ts          # Cache key constants
├── cache-ttl.config.ts    # TTL configurations
└── index.ts
```

**18 Cache Key Types**:
- `abi:{id}` - Individual ABI
- `contract:{network}:{address}` - Contract details
- `network:{chainId}` - Network info
- `contract:list:{network}` - Contract listings
- `abi:versions:{contractId}` - Version history
- Plus 13 more specialized keys

**TTL Configurations**:
- ABIs: 1 hour
- Contracts: 30 minutes
- Networks: 2 hours
- Lists: 15 minutes

#### 2.3 Storage (`src/infrastructure/storage/`)

IPFS/Pinata integration:

```
src/infrastructure/storage/
├── ipfs/
│   ├── ipfs.client.ts       # Pinata SDK client
│   ├── pinata.adapter.ts    # Storage adapter with tracing
│   └── index.ts
├── content-hash.ts          # Hash generation
└── index.ts
```

**Operations**:
- Pin ABI JSON to IPFS (with `tracedExternalCall`)
- Retrieve by IPFS hash (with `tracedExternalCall`)
- Generate content-addressed hashes
- Unpin/remove operations (with `tracedExternalCall`)
- Fallback to local storage if IPFS unavailable

**IPFS Operation Tracing** (Phase 3):
| Operation | Span Name | Op Type |
|-----------|-----------|---------|
| `store()` | `pinata.pin` | `http.client` |
| `retrieve()` | `pinata.retrieve` | `http.client` |
| `remove()` | `pinata.unpin` | `http.client` |

#### 2.4 Authentication (`src/infrastructure/auth/`)

Better Auth integration:

```
src/infrastructure/auth/
├── better-auth.ts         # Better Auth configuration
├── auth.config.ts         # Auth settings
├── plugins/
│   ├── api-key-plugin.ts  # Custom API key plugin
│   └── admin-plugin.ts    # Admin role plugin
├── context.ts             # Auth context helpers
└── index.ts
```

**Features**:
- Session management (cookies)
- API key authentication with scoping
- RBAC (Role-Based Access Control)
- Admin-only routes protection

#### 2.5 Dependency Injection (`src/infrastructure/di/`)

Service container:

```
src/infrastructure/di/
├── container.ts           # DI container
├── providers/
│   ├── abi.provider.ts    # ABI service provider
│   ├── contract.provider.ts
│   ├── network.provider.ts
│   ├── audit.provider.ts
│   └── index.ts
├── register-dependencies.ts # Service registration
└── index.ts
```

**Pattern**: Singleton container managing all service dependencies, lazy-loaded on first access.

#### 2.6 Monitoring (`src/infrastructure/monitoring/`)

Sentry performance monitoring (Phase 3):

```
src/infrastructure/monitoring/
├── sentry-span.ts         # Custom span helpers for distributed tracing
└── index.ts
```

**Custom Span Helpers**:
- `tracedRepositoryCall()` - Wrap database operations for tracing
- `tracedCacheCall()` - Wrap cache operations for tracing
- `tracedExternalCall()` - Wrap external service calls for tracing

**Usage Examples**:
```typescript
// Repository operations
await tracedRepositoryCall("abi.findById", () =>
  this.abiRepository.findById(id)
);

// Cache operations
await tracedCacheCall("get:abi:123", () =>
  this.cache.get("abi:123")
);

// External service calls (IPFS)
await tracedExternalCall("pinata", "pin", () =>
  this.ipfs.pin(data)
);
```

---

### Layer 3: API & Presentation (`src/app/`)

**Purpose**: HTTP endpoints, UI routes, and user interfaces

#### 3.1 API Routes (`src/app/api/`)

RESTful endpoints:

```
src/app/api/
├── abis/
│   ├── route.ts                  # GET /api/abis, POST /api/abis
│   ├── [id]/
│   │   ├── route.ts              # GET /api/abis/{id}, PUT, DELETE
│   │   ├── versions/route.ts     # GET /api/abis/{id}/versions
│   │   └── ...
│   └── full/route.ts             # GET /api/abis/full (unpaginated)
├── contracts/
│   ├── route.ts                  # GET /api/contracts, POST
│   ├── [address]/
│   │   ├── route.ts              # GET contract by address
│   │   ├── abi/route.ts          # GET /api/contracts/{address}/abi
│   │   ├── versions/route.ts     # GET version history
│   │   └── route.ts
│   └── ...
├── networks/
│   ├── route.ts                  # GET /api/networks, POST
│   ├── [chainId]/
│   │   ├── route.ts              # GET /api/networks/{chainId}
│   │   ├── contracts/route.ts    # GET contracts on network
│   │   └── ...
│   └── ...
├── api-keys/
│   ├── route.ts                  # API key CRUD
│   ├── [id]/route.ts
│   └── ...
├── audit-logs/
│   └── route.ts                  # Audit log retrieval
├── backup/
│   ├── route.ts                  # Backup/restore endpoints
│   └── ...
├── auth/
│   ├── sign-in/
│   │   ├── email/route.ts        # Email login
│   │   └── ...
│   ├── sign-up/route.ts          # Registration
│   └── ...
├── health/route.ts               # Health check endpoint
├── middleware.ts                 # API middleware chain
├── wrapper.ts                    # API response wrapper
└── ...
```

**21+ Routes** with middleware:
1. CORS handling
2. Request logging
3. Security headers
4. API version validation
5. Authentication
6. Rate limiting
7. Input validation

#### 3.2 Admin Dashboard (`src/app/admin/`)

Management interface:

```
src/app/admin/
├── layout.tsx              # Admin layout with sidebar
├── page.tsx                # Dashboard overview
├── abis/
│   ├── page.tsx            # ABI management UI
│   ├── actions.ts          # Server actions for CRUD
│   ├── components/         # ABI-specific components
│   └── dialogs/            # Create/Edit dialogs
├── contracts/
│   ├── page.tsx            # Contract management
│   ├── actions.ts
│   └── ...
├── networks/
│   ├── page.tsx            # Network configuration
│   ├── actions.ts
│   └── ...
├── api-keys/
│   ├── page.tsx            # API key management
│   ├── actions.ts
│   └── ...
├── audit-logs/
│   ├── page.tsx            # Audit log viewer
│   └── actions.ts
├── users/
│   ├── page.tsx            # User management
│   ├── actions.ts
│   └── ...
├── error.tsx               # Error boundary
├── settings/
│   ├── page.tsx            # Admin settings
│   └── ...
└── components/
    ├── sidebar.tsx         # Navigation sidebar
    ├── datatable.tsx       # Reusable data table
    ├── dialogs/            # Modal dialogs
    └── ...
```

**6 Admin Modules** with full CRUD:
- ABIs management
- Contracts management
- Networks configuration
- API keys generation
- Audit logs viewer
- User management

#### 3.3 Auth Pages (`src/app/auth/`)

Authentication UI:

```
src/app/auth/
├── sign-in/
│   └── page.tsx            # Login form
├── sign-up/
│   └── page.tsx            # Registration form (if enabled)
└── error/
    └── page.tsx            # Auth error display
```

---

### Layer 4: Shared Utilities (`src/shared/`)

**Purpose**: Cross-cutting utilities and configurations

#### 4.1 Configuration (`src/shared/config/`)

```
src/shared/config/
├── app.config.ts           # App-level configuration
├── env.ts                  # Environment variable validation
├── cache.config.ts         # Cache TTL settings
├── rate-limit.config.ts   # Rate limit tiers
├── features.config.ts      # Feature flags
├── api-version.config.ts  # API version settings
├── openapi.schema.ts       # OpenAPI specification
└── index.ts
```

#### 4.2 Libraries (`src/shared/lib/`)

Utility functions:

```
src/shared/lib/
├── utils/
│   ├── logger.ts          # Structured logging
│   ├── errors.ts          # Error handling utilities
│   ├── api-helper.ts      # API utility functions
│   ├── time.ts            # Date/time utilities
│   ├── constants.ts       # App constants
│   └── index.ts
├── errors/
│   ├── process-error-handler.ts  # Process-level error handling (Phase 2)
│   ├── error-utils.ts            # Error utility functions
│   └── index.ts
├── validation/
│   ├── abi-validator.ts   # ABI schema validation
│   ├── contract-validator.ts
│   ├── network-validator.ts
│   ├── api-key-validator.ts
│   ├── auth-validator.ts
│   └── index.ts
├── api/
│   ├── api-handler.ts     # API wrapper with Sentry error capture (Phase 2)
│   ├── error-formatter.ts # Error response formatting
│   └── index.ts
└── index.ts
```

**Error Handling Libraries** (Phase 2):
- `process-error-handler.ts` - Handles uncaught exceptions, unhandled rejections, graceful shutdown
- `api-handler.ts` - API wrapper with Sentry user context and error capture

#### 4.3 Types (`src/shared/types/`)

TypeScript type definitions:

```
src/shared/types/
├── api.types.ts           # API request/response types
├── domain.types.ts        # Domain model types
├── auth.types.ts          # Authentication types
├── database.types.ts      # Database schema types
├── errors.types.ts        # Error type definitions
├── rate-limit.types.ts    # Rate limiting types
├── index.ts
└── ...
```

#### 4.4 Components (`src/components/`)

React components:

```
src/components/
├── ui/                     # shadcn/ui components (50+)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── table.tsx
│   ├── datatable.tsx
│   └── ... (46+ more)
├── feature/                # Feature-specific components
│   ├── abi-table.tsx
│   ├── contract-form.tsx
│   ├── api-key-dialog.tsx
│   └── ...
└── index.ts
```

---

## Key Files & Responsibilities

### Configuration Files

| File | Purpose | Key Settings |
|------|---------|--------------|
| `tsconfig.json` | TypeScript configuration | Strict mode enabled, module resolution |
| `next.config.ts` | Next.js configuration | Turbopack enabled, redirects, headers |
| `drizzle.config.ts` | Database configuration | PostgreSQL connection, migration paths |
| `eslint.config.mjs` | Linting rules | TypeScript support, import ordering |
| `postcss.config.mjs` | CSS processing | Tailwind CSS v4 with autoprefixer |

### Script Files

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/seed/index.ts` | Database seeding | `pnpm db:seed` |
| `scripts/db-truncate.ts` | Clear database | `pnpm db:truncate` |
| `scripts/security/verify-api-key-hashing.ts` | Verify API key security | Manual verification |
| `scripts/test-admin-rate-limit.js` | Rate limit testing | `pnpm test:rate-limit` |

### Test Files

```
tests/
├── setup/
│   ├── jest.config.js      # Jest configuration
│   └── setup.ts            # Test setup
├── unit/
│   ├── services/           # Service unit tests
│   ├── use-cases/          # Use case tests
│   └── ...
├── integration/            # Integration tests
└── api/                   # API endpoint tests
```

---

## Technology Stack Details

### Frontend Technologies

**Framework & Runtime**:
- Next.js 15.5: Full-stack React framework with Turbopack
- React 19.2: UI library with Server Components support
- TypeScript 5.9: Type-safe development

**Styling & Components**:
- TailwindCSS 4.1: Utility-first CSS framework
- shadcn/ui: 50+ accessible, customizable components
- Lucide React: Icon library (545+ icons)

**Form & Validation**:
- React Hook Form 7.67: Efficient form state management
- Zod 4.1: TypeScript-first schema validation

**Data Management & Queries**:
- TanStack React Query 5.90: Server state management
- TanStack React Table 8.21: Headless table library
- SWR patterns for caching

**UI Utilities**:
- Sonner 2.0: Toast notifications
- Embla Carousel 8.6: Carousel component
- Date-fns 4.1: Date manipulation
- Recharts 3.2: Charting library

### Backend Technologies

**Runtime & Framework**:
- Node.js 18+: JavaScript runtime
- Next.js 15: API routes and server-side rendering

**Database**:
- PostgreSQL 14+: Relational database
- Drizzle ORM 0.44: Type-safe database abstraction
- Drizzle Kit: Schema generation and migrations

**Authentication & Security**:
- Better Auth 1.4: Modern authentication library
- Crypto-js 4.2: Cryptographic operations
- Constant-time comparison: Timing attack prevention

**Monitoring & Error Tracking**:
- Sentry 10.32: Error tracking and performance monitoring (Phase 1-3)
  - Server-side error tracking with enhanced sanitization
  - Client-side error tracking
  - Edge runtime error tracking
  - **Distributed tracing**: 5% prod / 100% dev sampling (~1,500 traces/day for 30K requests)
  - **Performance profiling**: 10% prod / 100% dev sampling for CPU analysis
  - **Auto-instrumentation**: HTTP, PostgreSQL, Redis operations
  - **Custom span helpers**: `tracedRepositoryCall`, `tracedCacheCall`, `tracedExternalCall`
  - **IPFS operation tracing**: Pin, retrieve, unpin operations monitored
  - Operational error filtering
  - Privacy protection (headers/query params/messages scrubbed)
  - User context tracking (API key + session auth)
  - Fatal process error capture (uncaught exceptions, unhandled rejections)
  - API error capture with request context
  - Session replay on errors (10% sampling)

**Caching**:
- Upstash Redis: Serverless Redis client
- Cache-aside pattern: Efficient caching strategy

**Storage**:
- Pinata 2.5: IPFS pinning service
- Multihashes 4.0: Hash library
- Content-addressed storage

**Utilities**:
- Nanoid 5.1: Unique ID generation
- Clsx 2.1: Conditional class names
- Class-variance-authority 0.7: Component variants

### Development & Testing

**Testing**:
- Jest 30.2: Unit and integration testing
- @testing-library/react 16.3: React component testing

**Code Quality**:
- ESLint 9.39: Linting
- Prettier: Code formatting
- TypeScript strict mode: Type checking

**Build & Deployment**:
- Turbopack: Fast bundler (default with Next.js 15)
- next/image: Image optimization
- next/font: Font optimization

---

## Dependencies Summary

**Total Dependencies**: 88
- **Production**: 27 direct packages (including @sentry/nextjs)
- **Development**: 61 dev packages
- **Package Manager**: pnpm (recommended) or npm/yarn

**Key Version Constraints**:
- Node.js 18.x minimum (20.x LTS recommended)
- PostgreSQL 14+ (16+ recommended)
- TypeScript 5.9+
- Sentry 10.32+ (error tracking & performance monitoring)

---

## Build & Development Process

### Development Workflow

```bash
# Install dependencies
pnpm install

# Generate database types and migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed database with initial data
pnpm db:seed

# Start development server (Turbopack)
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Testing
pnpm test                   # Unit tests
pnpm test:watch            # Watch mode
pnpm test:coverage         # Coverage report
```

### Production Build

```bash
# Type check and lint
pnpm typecheck && pnpm lint

# Run all tests
pnpm test

# Build for production
pnpm build

# Start production server
pnpm start
```

### Database Workflow

```bash
# Create migration from schema changes
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Open Drizzle Studio (visual db browser)
pnpm db:studio

# Seed with initial data
pnpm db:seed

# Clear all data
pnpm db:truncate

# Reset (truncate + seed)
pnpm db:reset

# Validate data integrity
pnpm db:check
```

---

## Project Statistics

### Code Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **Total Files** | 267+ | Including tests and configs |
| **TypeScript Files** | 180+ | Main source code |
| **Test Files** | 25+ | Unit, integration |
| **Config Files** | 15+ | Build and tool configurations |
| **Lines of Code** | ~35,000 | Excluding node_modules and migrations |
| **Test Coverage** | >80% | Unit test coverage goal |

### Database Metrics

| Metric | Value |
|--------|-------|
| **Tables** | 11+ |
| **Indexes** | 30+ |
| **Migrations** | 2+ |
| **Stored Procedures** | 0 (using ORM) |

### API Metrics

| Metric | Value |
|--------|-------|
| **Endpoints** | 21+ |
| **Middleware Layers** | 7 |
| **Use Cases** | 20+ |
| **Domain Services** | 8+ |

---

## File Organization Best Practices

### Naming Conventions

- **Files**: kebab-case (e.g., `abi.entity.ts`, `create-abi.use-case.ts`)
- **Directories**: kebab-case (e.g., `src/use-cases/`, `src/core/services/`)
- **Classes/Types**: PascalCase (e.g., `AbiEntity`, `CreateAbiUseCase`)
- **Variables/Functions**: camelCase (e.g., `createAbi`, `abiRepository`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_CACHE_TTL`)
- **Database Tables**: snake_case (e.g., `audit_logs`, `api_keys`)

### Import Organization

1. Node/External packages
2. Core domain imports
3. Infrastructure imports
4. Shared utilities
5. Relative imports
6. Type-only imports (separate section)

---

## Key Architectural Decisions

1. **Clean Architecture**: Separation of concerns across layers
2. **Repository Pattern**: Data access abstraction
3. **Use Case Pattern**: Single responsibility per operation
4. **Dependency Injection**: Loose coupling and testability
5. **Cache-Aside**: Efficient caching without invalidation complexity
6. **API Versioning**: Header-based for flexibility
7. **Dual Authentication**: Sessions + API keys for flexibility
8. **IPFS Storage**: Decentralized, immutable ABI storage
9. **Audit Logging**: Non-blocking fire-and-forget pattern
10. **Type Safety**: TypeScript strict mode throughout

---

## Common Development Tasks

### Adding a New Feature

1. Create domain entity in `src/core/domain/`
2. Create repository interface in domain
3. Create use case in `src/core/use-cases/`
4. Implement repository in `src/infrastructure/database/repositories/`
5. Add database schema in `src/infrastructure/database/drizzle/schema/`
6. Create API route in `src/app/api/`
7. Add UI components in `src/app/admin/` (if admin feature)
8. Write tests in `tests/`
9. Update documentation

### Debugging Tips

- **Logger**: Use `logger` from `src/shared/lib/utils/logger.ts`
- **Database**: Use Drizzle Studio with `pnpm db:studio`
- **Requests**: Check `/api/health` for service status
- **Cache**: Use Redis CLI for cache inspection
- **Auth**: Check Better Auth session tokens in DevTools

---

## Related Documentation

- **[project-overview-pdr.md](./project-overview-pdr.md)**: Product requirements and roadmap
- **[code-standards.md](./code-standards.md)**: Coding conventions and patterns
- **[system-architecture.md](./system-architecture.md)**: Detailed architecture documentation
- **[../README.md](../README.md)**: Quick start and API reference
- **[../CLAUDE.md](../CLAUDE.md)**: Development workflows and CI/CD
