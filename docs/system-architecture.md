# Zuno Marketplace ABIs - System Architecture

**Version**: 1.0
**Last Updated**: January 2025
**Architecture Pattern**: Clean Architecture (Hexagonal)

## Architecture Overview

Zuno Marketplace ABIs follows **Clean Architecture** principles with a **Hexagonal (Ports & Adapters)** pattern, ensuring business logic is independent of frameworks and infrastructure concerns.

### Layer Visualization

```
┌──────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                          │
│  Next.js Routes │ API Routes │ Admin Dashboard │ Auth Pages   │
│  Port: 3000 → HTTP/REST → Client Applications                │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ (Use Cases)
                       ↓
┌──────────────────────────────────────────────────────────────┐
│              APPLICATION LAYER (Use Cases)                    │
│  CreateAbi │ UpdateAbi │ DeleteAbi │ ListAbis │ GetAbiVersions │
│  Similar for Contracts, Networks, API Keys, Audit Logs       │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ (Services & Repositories)
                       ↓
┌──────────────────────────────────────────────────────────────┐
│                   DOMAIN LAYER                                │
│  Entities │ Repository Interfaces │ Domain Services │ Ports  │
│  Business logic independent of frameworks                     │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ (Implementations)
                       ↓
┌──────────────────────────────────────────────────────────────┐
│               INFRASTRUCTURE LAYER                            │
│  Database │ Cache │ Storage │ Auth │ External Services       │
│  PostgreSQL │ Redis │ IPFS │ Better Auth │ Pinata           │
└──────────────────────────────────────────────────────────────┘
```

---

## Layer Details

### 1. Presentation Layer

**Purpose**: Handle HTTP requests, serve user interfaces, translate external input to application format

**Components**:

**API Routes** (`src/app/api/`):
- 21+ RESTful endpoints
- Middleware chain for validation, authentication, rate limiting
- Request/response envelope with consistent error handling
- No business logic (delegates to use cases)

**Admin Dashboard** (`src/app/admin/`):
- React components with Server Components
- TanStack Query for server state management
- Server Actions for mutations
- shadcn/ui components for consistent UI

**Authentication Pages** (`src/app/auth/`):
- Login/registration forms
- Session and API key management

**Key Responsibilities**:
- Accept HTTP requests
- Validate input format
- Authenticate and authorize
- Call appropriate use cases
- Format responses
- Handle CORS, security headers

### 2. Application Layer

**Purpose**: Orchestrate use cases, coordinate domain logic and infrastructure

**Use Cases** (20+):
- One class per business operation
- No business logic (delegates to domain)
- Coordinates multiple services/repositories
- Handles transaction boundaries
- Implements audit logging

**Use Case Pattern**:
```typescript
export class CreateAbiUseCase {
  constructor(
    private abiRepository: IAbiRepository,
    private ipfsService: IIpfsService,
    private cacheService: ICacheService,
    private auditLogService: IAuditLogService
  ) {}

  async execute(input: CreateAbiInput): Promise<CreateAbiOutput> {
    // 1. Validate (domain service)
    const validatedAbi = AbiValidator.validate(input.abi);

    // 2. Store on IPFS (infrastructure)
    const ipfsHash = await this.ipfsService.pin(validatedAbi);

    // 3. Create entity (domain)
    const abi = AbiFactory.create({
      ...input,
      ipfsHash,
    });

    // 4. Save to database (infrastructure)
    await this.abiRepository.save(abi);

    // 5. Invalidate cache (infrastructure)
    await this.cacheService.invalidate(`abi:${abi.id}`);

    // 6. Log activity (infrastructure)
    await this.auditLogService.log({
      action: 'ABI_CREATED',
      resourceId: abi.id,
      userId: input.userId,
    });

    return { id: abi.id, ipfsHash };
  }
}
```

### 3. Domain Layer

**Purpose**: Encapsulate business logic, entity rules, and business value

**Components**:

**Entities** (`src/core/domain/*/`):
- Business objects with identity and lifecycle
- Validation rules and business invariants
- No database knowledge
- Language of the business

```typescript
export class Abi {
  readonly id: string;
  contractAddress: string;
  network: Network;
  abiJson: object;
  abiHash: AbiHash; // Value object
  ipfsHash?: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: AbiProps) {
    this.id = props.id || nanoid();
    this.contractAddress = props.contractAddress.toLowerCase();
    this.abiJson = props.abiJson;
    this.abiHash = new AbiHash(props.abiHash);
    // ... more initialization
  }

  static canUpdateNetwork(): boolean {
    // Business rule: can't change network once created
    return false;
  }

  equals(other: Abi): boolean {
    return this.id === other.id;
  }
}
```

**Repository Interfaces** (`src/core/domain/*/repository.ts`):
- Abstract data access without specifying how
- Collections-like interface
- No database queries visible in domain

```typescript
export interface IAbiRepository {
  findById(id: string): Promise<Abi | null>;
  findByAddress(address: string, network: Network): Promise<Abi[]>;
  findAll(filters?: AbiFilter): Promise<Abi[]>;
  save(abi: Abi): Promise<void>;
  delete(id: string): Promise<void>;
}
```

**Domain Services** (`src/core/services/`):
- Stateless business logic
- Coordinates multiple entities
- No infrastructure knowledge

```typescript
export class ContractQueryService {
  constructor(
    private contractRepository: IContractRepository,
    private abiRepository: IAbiRepository
  ) {}

  async getContractWithLatestAbi(
    address: string,
    network: Network
  ): Promise<ContractWithAbi> {
    const contract = await this.contractRepository.findByAddress(address, network);
    if (!contract) throw new ResourceNotFoundError('Contract', address);

    const abi = await this.abiRepository.findLatest(contract.id);
    return { contract, abi };
  }
}
```

**Value Objects**:
- Immutable objects representing business concepts
- Encapsulate validation and logic
- No identity (equal if values equal)

```typescript
export class AbiHash {
  constructor(private readonly value: string) {
    if (!this.isValidIpfsHash(value)) {
      throw new ValidationError('Invalid IPFS hash format');
    }
  }

  private isValidIpfsHash(hash: string): boolean {
    return /^Qm[a-zA-Z0-9]{44}$/.test(hash);
  }

  toString(): string {
    return this.value;
  }

  equals(other: AbiHash): boolean {
    return this.value === other.toString();
  }
}
```

**Ports** (`src/core/ports/`):
- Interface definitions for external adapters
- Implements Dependency Inversion Principle
- Part of domain, but external implementations

### 4. Infrastructure Layer

**Purpose**: Implement technical details - databases, caches, APIs, external services

**Database** (`src/infrastructure/database/`):
- Drizzle ORM with PostgreSQL
- Repository implementations (adapters for IRepository)
- Schema definitions with migrations
- Query optimization with indexes

```typescript
export class AbiRepository implements IAbiRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<Abi | null> {
    const row = await this.db.query.abis.findFirst({
      where: eq(schema.abis.id, id),
      with: { contract: true }, // Eager load if needed
    });

    return row ? this.toDomain(row) : null;
  }

  async save(abi: Abi): Promise<void> {
    await this.db.insert(schema.abis).values(this.toPersistence(abi))
      .onConflictDoUpdate({
        target: schema.abis.id,
        set: this.toPersistence(abi),
      });
  }

  private toDomain(row: AbiRow): Abi {
    return new Abi({
      id: row.id,
      contractAddress: row.contractAddress,
      abiJson: row.abiJson,
      // ... map all fields
    });
  }

  private toPersistence(abi: Abi): AbiRow {
    return {
      id: abi.id,
      contractAddress: abi.contractAddress,
      abiJson: abi.abiJson,
      // ... map all fields
    };
  }
}
```

**Cache** (`src/infrastructure/cache/`):
- Redis via Upstash
- Cache-aside pattern implementation
- 18 cache key types for different data

**Storage** (`src/infrastructure/storage/`):
- Pinata IPFS client
- Content addressing and pinning
- Fallback mechanisms

**Authentication** (`src/infrastructure/auth/`):
- Better Auth integration
- Session management
- API key validation

**Dependency Injection** (`src/infrastructure/di/`):
- Service container
- Singleton management
- Lazy initialization

---

## Component Interactions

### Request → Response Lifecycle

```
HTTP Request
    ↓
Middleware Chain (CORS, logging, auth, rate limit, version)
    ↓
API Route Handler
    ↓
Input Validation (Zod schema)
    ↓
Use Case Execution
    ├→ Domain Service (business logic)
    ├→ Repository (data access)
    ├→ External Service (IPFS, etc.)
    └→ Audit Service (logging)
    ↓
Cache Invalidation
    ↓
API Response Envelope
    ↓
HTTP Response
```

### Database Schema Relationships

```
users
  ├── id (primary key)
  ├── email
  └── created_at

api_keys (one-to-many: user can have many keys)
  ├── id
  ├── user_id (foreign key → users)
  ├── key_hash (hashed API key)
  ├── tier (public/free/pro/enterprise)
  └── permissions (scoped access)

networks
  ├── id
  ├── chain_id (ethereum=1, polygon=137, ...)
  ├── name
  └── rpc_url

contracts (many-to-many: network has many contracts)
  ├── id
  ├── network_id (foreign key → networks)
  ├── address (ethereum address)
  ├── name
  └── verified

abis (many-to-one: contract has many ABIs)
  ├── id
  ├── contract_id (foreign key → contracts)
  ├── abi_hash (content hash, unique)
  ├── abi_json (full ABI)
  ├── ipfs_hash (IPFS content address)
  └── version (semantic versioning)

abi_versions (history tracking)
  ├── id
  ├── abi_id (foreign key → abis)
  ├── version_number
  ├── changelog
  └── created_at

audit_logs (complete activity trail)
  ├── id
  ├── user_id (foreign key → users)
  ├── resource_type (abi/contract/network/api_key)
  ├── resource_id
  ├── action (created/updated/deleted)
  ├── changes (JSON diff)
  ├── ip_address
  └── timestamp
```

---

## Data Flow Examples

### Create ABI Flow

```
1. Admin submits ABI via UI
   POST /api/abis
   {
     "contractAddress": "0x...",
     "network": "ethereum",
     "abi": [...]
   }

2. API Route Handler
   - Validates JWT/Session
   - Checks rate limit
   - Validates version header
   - Parses request body

3. Input Validation
   - Zod schema validation
   - Ethereum address format
   - ABI JSON structure
   - Network enum

4. CreateAbiUseCase.execute()
   a. AbiValidator.validate() [Domain Service]
      - Validates ABI structure
      - Checks for required fields

   b. IpfsService.pin() [Infrastructure]
      - Pins ABI to Pinata
      - Returns IPFS hash

   c. AbiFactory.create() [Domain]
      - Creates Abi entity
      - Assigns ID
      - Sets timestamps

   d. AbiRepository.save() [Infrastructure]
      - Inserts into PostgreSQL
      - Handles conflicts

   e. CacheService.invalidate() [Infrastructure]
      - Clears cache key: abi:*
      - Clears listing caches

   f. AuditLogService.log() [Infrastructure]
      - Non-blocking log
      - Records user, action, resource

5. Response
   {
     "success": true,
     "data": {
       "id": "abi_v1_xyz123",
       "ipfsHash": "Qm...",
       "createdAt": "2025-01-19T..."
     }
   }
```

### Get Contract with Versions Flow

```
1. Client requests contract ABI history
   GET /api/contracts/0x.../versions?network=ethereum

2. Rate Limit Check
   - Check IP-based limit (DDoS protection)
   - Check API key tier limit
   - Return X-RateLimit-* headers

3. GetContractVersionsUseCase.execute()
   a. ContractRepository.findByAddress() [Infrastructure]
      - Query with cache-aside
      - Check cache: contract:{network}:{address}
      - Load from DB if miss
      - Update cache

   b. AbiRepository.findVersions(contractId) [Infrastructure]
      - Query version history
      - Order by creation date DESC
      - Join with abis table

   c. Domain Service sorts and formats
      - Map to response DTOs
      - Enrich with metadata

4. Response
   {
     "success": true,
     "data": [
       {
         "versionId": "v1.0.0",
         "abiId": "abi_v1_xyz123",
         "createdAt": "2025-01-19T...",
         "changes": "Initial version"
       },
       {
         "versionId": "v1.1.0",
         "abiId": "abi_v1_abc456",
         "createdAt": "2025-01-20T...",
         "changes": "Added new functions"
       }
     ]
   }
```

---

## Authentication & Authorization

### Authentication Flow

**Session-Based (Web UI)**:
```
1. User login at /auth/sign-in
2. POST /api/auth/sign-in/email with credentials
3. Better Auth validates and creates session
4. Session token stored in HTTP-only cookie
5. Subsequent requests include cookie automatically
6. Middleware verifies session token
7. Request context includes authenticated user
```

**API Key-Based (Programmatic)**:
```
1. Admin generates API key at /admin/api-keys
2. User stores key securely (shown only once)
3. API requests include: X-API-Key: sk_live_abc123xyz...
4. API Route extracts and validates key
5. Constant-time comparison prevents timing attacks
6. Rate limit tier determined by API key tier
7. Scoped permissions checked (read/write/admin)
```

### Authorization

**Role-Based Access Control (RBAC)**:
- Admin: Full access to all endpoints
- User: Read + write own API keys, see own usage
- Public API Consumer: Read-only access with rate limits

**Endpoint Authorization**:
```typescript
// Public endpoint (no auth required)
GET /api/networks

// Requires session or API key
GET /api/abis
POST /api/abis (requires write permission)

// Admin-only
POST /api/networks
DELETE /api/abis/{id}
GET /api/audit-logs
```

---

## Caching Strategy

### Cache Layers

```
Client Request
    ↓
Browser Cache (if configured)
    ↓
CDN Cache (Vercel/CloudFront)
    ↓
Redis Cache (Upstash)
    ↓
Database (PostgreSQL)
```

### Cache-Aside Pattern

```
1. Check Redis cache
2. If hit: return cached data
3. If miss:
   a. Query database
   b. Update Redis with TTL
   c. Return data
4. On write: invalidate related cache keys
```

### Cache Key Structure

```
abi:{id}
  - Individual ABI
  - TTL: 1 hour

contract:{network}:{address}
  - Contract details
  - TTL: 30 minutes

network:{chainId}
  - Network info
  - TTL: 2 hours

contract:list:{network}
  - Contract listings
  - TTL: 15 minutes

abi:versions:{contractId}
  - Version history
  - TTL: 30 minutes

[... 13 more types]
```

### Cache Invalidation

On entity update/delete:
```typescript
// When ABI updated
await cache.invalidate('abi:${abiId}');
await cache.invalidate('contract:${network}:${address}');
await cache.invalidate('abi:versions:${contractId}');

// When contract deleted
await cache.invalidate('contract:${network}:${address}');
await cache.invalidate('contract:list:${network}');
```

---

## Rate Limiting

### Dual-Layer Protection

**Layer 1: IP-Based Rate Limiting**
- Protects against DDoS attacks
- 1000 requests/minute per IP
- Implemented in middleware
- Returns 429 Too Many Requests

**Layer 2: API Key Tier Limits**
- Per-user rate limiting
- Varies by subscription tier

| Tier | /Hour | /Day | Burst |
|------|-------|------|-------|
| PUBLIC | 100 | 1,000 | 10/min |
| FREE | 500 | 5,000 | 30/min |
| PRO | 5,000 | 50,000 | 100/min |
| ENTERPRISE | Unlimited | Unlimited | Unlimited |

**Implementation**:
- Redis sliding window counter
- Key: `ratelimit:{userId}:{tier}`
- Updated on each request
- Headers include X-RateLimit-* info

---

## IPFS Storage Integration

### Pinata Flow

```
ABI JSON
    ↓
Hash Computation (IPFS content hash)
    ↓
Send to Pinata API
    ↓
Pinata pins to IPFS network
    ↓
Store IPFS hash in database
    ↓
Gateway URL: https://gateway.pinata.cloud/ipfs/Qm...
```

### Benefits

- **Immutability**: Content hash ensures data integrity
- **Decentralization**: IPFS network provides redundancy
- **Content Addressing**: Same content = same hash
- **Verifiability**: Can verify hash matches content

---

## Audit Logging

### Non-Blocking Implementation

```
User Action
    ↓
Use Case executes
    ↓
Return response to user immediately
    ↓
Queue audit log (background)
    ↓
Async logging to database
    ↓
User never waits for log completion
```

### Logged Information

```typescript
{
  id: string;              // Unique log ID
  userId: string;          // Who did it
  action: string;          // What action (CREATED, UPDATED, DELETED)
  resourceType: string;    // What entity (abi, contract, network)
  resourceId: string;      // Which entity
  changes: object;         // What changed (diff)
  ipAddress: string;       // Where from
  timestamp: Date;         // When
}
```

---

## Error Handling Architecture

### Error Hierarchy

```
Error
  ├── DomainError (business logic errors)
  │   ├── ValidationError (invalid input)
  │   ├── ResourceNotFoundError (missing entity)
  │   ├── BusinessRuleViolationError (constraint violated)
  │   └── UnauthorizedError (auth failed)
  ├── InfrastructureError (external service errors)
  │   ├── DatabaseError
  │   ├── CacheError
  │   ├── IpfsError
  │   └── ExternalServiceError
  └── UnexpectedError (programming errors)
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "ABI not found with ID: abi_v1_xyz123",
    "statusCode": 404,
    "requestId": "req_abc123",
    "details": {
      "resourceType": "abi",
      "resourceId": "abi_v1_xyz123"
    }
  }
}
```

---

## Security Measures

### Input Validation
- Zod schemas on all API inputs
- Whitelist allowed values
- Maximum sizes enforced
- Type checking at compile time

### Authentication
- Session-based: HTTP-only cookies
- API keys: Bearer token header
- Constant-time comparison: prevents timing attacks
- Key hashing: keys hashed in database

### Authorization
- Role-based access control (RBAC)
- Scoped API key permissions
- Per-endpoint authorization checks
- Admin-only route protection

### Data Protection
- TLS/HTTPS for all transit
- Prepared statements prevent SQL injection
- Input escaping prevents XSS
- CORS origin whitelist

### Rate Limiting
- IP-based DDoS protection
- Per-API key tier limits
- Sliding window counters
- Exponential backoff for retries

---

## Monitoring & Observability

### Error Tracking with Sentry (Phase 2)

**Configuration Files**:
- `sentry.server.config.ts` - Server-side error tracking with enhanced sanitization
- `sentry.client.config.ts` - Client-side error tracking
- `sentry.edge.config.ts` - Edge runtime error tracking
- `.sentryclirc` - Sentry CLI configuration
- `next.config.ts` - Wrapped with `withSentryConfig`

**Integration Points**:
- `src/shared/lib/errors/process-error-handler.ts` - Fatal process error capture
- `src/shared/lib/api/api-handler.ts` - API error capture with user context

**Environment Variables**:
```
SENTRY_DSN           - Data Source Name for Sentry project
SENTRY_AUTH_TOKEN    - Authentication token for Sentry API
SENTRY_ORG           - Sentry organization slug
SENTRY_PROJECT       - Sentry project name
```

**Features Implemented**:

| Feature | Configuration | Purpose |
|---------|--------------|---------|
| **Error Tracking** | Server/Client/Edge configs | Capture unhandled errors |
| **Performance Tracing** | 5% prod / 100% dev | Distributed tracing for performance |
| **Operational Filtering** | `SKIP_ERROR_PATTERNS` | Filter expected business errors |
| **Privacy Protection** | `SENSITIVE_PARAMS` + sanitization | Scrub headers/query params/messages |
| **Release Tracking** | Git SHA via Vercel | Track errors by release |
| **User Context** | Auto-set on auth | Track errors by user/session |
| **Process Error Capture** | `process-error-handler.ts` | Fatal error monitoring |
| **API Error Capture** | `api-handler.ts` | Request-scoped error tracking |
| **Session Replay** | Phase 2 (10% on error) | User session playback for debugging |

**Error Capture Points** (Phase 2):

| Capture Point | File | Level | Context |
|--------------|------|-------|---------|
| **API Errors** | `api-handler.ts` | error | errorCode, statusCode, path, method |
| **Process Errors** | `process-error-handler.ts` | fatal | type, processUptime, memoryUsage |
| **Unexpected Errors** | `api-handler.ts` | error | errorType: "unexpected" |

**User Context Tracking**:
- API Key auth: `{ id, apiKey, scopes }`
- Session auth: `{ id, email, role }`
- Automatically set on successful authentication

**Filtered Errors** (operational/business errors):
- `RATE_LIMITED`
- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`

**Scrubbed Data** (privacy protection):
- Headers: `authorization`, `x-api-key`, `cookie`
- Query params: `token`, `password`, `secret`, `apiKey`, `api_key`
- Error messages: Bearer tokens, API keys, passwords, secrets (via regex sanitization)

**Ignored Sources** (denoising):
- Chrome extensions (`/extensions//`, `chrome://`)
- Browser extension errors (`top.GLOBALS`)
- Random plugins (`cordova`, `sencha`)

### Health Check Endpoint

```
GET /api/health

Response:
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-01-19T10:00:00Z",
  "version": "v1",
  "services": {
    "database": "connected|disconnected",
    "cache": "connected|disconnected",
    "ipfs": "connected|disconnected"
  },
  "uptime": 3600
}
```

### Logging Strategy

- Structured logging with severity levels
- Request IDs for tracing
- Performance metrics (response time, query time)
- Security events (auth failures, rate limit hits)
- Error stack traces in development

### Metrics Collection

- API endpoint latency (p50, p95, p99)
- Cache hit/miss rates
- Database query performance
- IPFS operation times
- Rate limit hits
- Authentication failures
- Error rates and types (via Sentry)

---

## Deployment Architecture

### Environment Separation

```
Development
  ├── Local PostgreSQL
  ├── Upstash Redis (free tier)
  ├── Pinata IPFS (free tier)
  ├── Better Auth (local)
  └── Sentry (development environment)

Staging
  ├── PostgreSQL (managed)
  ├── Redis (production instance)
  ├── Pinata IPFS (production account)
  ├── Better Auth (staging keys)
  └── Sentry (staging environment)

Production
  ├── PostgreSQL (HA setup)
  ├── Redis (production instance)
  ├── Pinata IPFS (production account)
  ├── Better Auth (production keys)
  ├── Sentry (production environment)
  └── CDN (Vercel, CloudFront)
```

### Zero-Downtime Deployments

1. Health check passes
2. New code deployed
3. Graceful connection draining
4. Database migrations applied
5. Cache invalidation
6. Traffic gradually shifted
7. Old instance shutdown

---

## Database Optimization

### Indexes Strategy

**High-Priority Indexes**:
```sql
-- Lookup by primary key (automatic)
CREATE INDEX idx_abis_id ON abis(id);

-- Foreign key lookups
CREATE INDEX idx_abis_contract_id ON abis(contract_id);

-- Common filters
CREATE INDEX idx_contracts_network_address
  ON contracts(network_id, address);

-- Sorting and pagination
CREATE INDEX idx_abis_created_at ON abis(created_at DESC);

-- Full-text search (future)
CREATE INDEX idx_contracts_name_tsvector
  ON contracts USING GIN(name_tsvector);
```

### Query Optimization

- Batch queries where possible
- Eager load relationships
- Limit result sets
- Use prepared statements
- Connection pooling (20-50 connections)

---

## Scalability Considerations

### Horizontal Scaling

- Stateless API servers (multiple instances)
- Load balancer distributes requests
- Shared database and cache
- Session store in database (shared)

### Vertical Scaling

- Database: Increase CPU, RAM, storage
- Cache: Upgrade Redis tier
- API servers: Increase instance size

### Future Optimizations

- Database read replicas
- Caching layers (CDN, edge functions)
- Request batching
- GraphQL API
- Event-driven architecture

---

## Integration Points

### External Services

**Sentry**:
- Error tracking (server, client, edge)
- Performance monitoring and tracing
- Release tracking via git SHA
- Alert notifications

**Pinata IPFS**:
- Pin ABI JSON
- Retrieve by hash
- Manage pins

**Upstash Redis**:
- Cache read/write
- Rate limit counters
- Session store option

**Better Auth**:
- User management
- Session creation
- Password hashing

**PostgreSQL**:
- Primary data store
- Transactional consistency
- ACID guarantees

---

## Unresolved Architectural Decisions

None. The architecture is well-defined and production-ready.
