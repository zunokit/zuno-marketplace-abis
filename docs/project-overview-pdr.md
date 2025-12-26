# Zuno Marketplace ABIs - Product Development Requirements (PDR)

**Version**: 1.0
**Last Updated**: January 2025
**Status**: Production Ready (v0.1.0)

## Executive Summary

Zuno Marketplace ABIs is an enterprise-grade, production-ready platform providing scalable API access to verified Ethereum smart contract ABIs (Application Binary Interfaces) across multiple EVM-compatible networks. The platform eliminates manual contract ABI scraping and provides a reliable, versioned, auditable repository with advanced authentication, tiered rate limiting, decentralized IPFS storage, and comprehensive admin controls.

---

## Business Objectives & Goals

### Primary Objectives

1. **Reduce Developer Friction**: Provide instant, verified access to contract ABIs without manual etherscan scraping or file management
2. **Enable Multi-Network DApps**: Support seamless ABI management across Ethereum and EVM chains (Polygon, Arbitrum, Optimism, BSC, Base, Sepolia)
3. **Establish Trusted Repository**: Create industry-standard source for verified contract ABIs with immutable IPFS backing
4. **Monetize API Access**: Implement tiered pricing (Public/Free/Pro/Enterprise) for sustainable growth
5. **Ensure Production Reliability**: 99.9% uptime SLA with comprehensive monitoring, backup/restore, and disaster recovery

### Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **API Availability** | 99.9% uptime | 99.99% | On track |
| **Cache Hit Rate** | >50% | 60%+ | Exceeding |
| **Response Time (p99)** | <200ms | <150ms | Exceeding |
| **Database Coverage** | 500+ verified contracts | 200+ | On track |
| **Rate Limit Compliance** | 100% enforcement | 100% | Exceeding |
| **Audit Log Completeness** | 100% activity logged | 100% | Complete |

---

## Target Users & Use Cases

### Primary Users

1. **Blockchain Developers**
   - Use Case: Fetch ABIs for smart contract integration without manual etherscan queries
   - Pain Point: Time-consuming manual ABI collection and management
   - Value: 15-30 min time savings per contract

2. **DApp Development Teams**
   - Use Case: Multi-network contract support with version history and rollback
   - Pain Point: Managing ABIs across networks and versions
   - Value: Single API for all contract ABIs

3. **Development Agencies**
   - Use Case: Self-hosted ABI repository with audit trails and team access control
   - Pain Point: Sharing contract ABIs securely among team members
   - Value: Centralized, auditable ABI management

4. **API Consumers (Startups/Enterprises)**
   - Use Case: Reliable ABI access via versioned API with SLA guarantees
   - Pain Point: Building reliable contract interaction systems
   - Value: Production-grade ABI infrastructure

### Use Case Examples

**Scenario 1**: Smart Contract Developer
- Developer needs USDC contract ABI on Polygon for dApp integration
- Current: Search Etherscan, copy ABI, manage locally or paste into code
- With Zuno: `GET /api/contracts/0xA0b86...?network=polygon` → Complete ABI + metadata

**Scenario 2**: Multi-Chain DApp
- DApp operates on Ethereum, Polygon, and Arbitrum
- Current: Maintain 3 ABI files, manual version syncing
- With Zuno: Single API endpoint handles all networks, built-in versioning

**Scenario 3**: Enterprise Integration**
- Enterprise integrates with 50+ smart contracts
- Current: Complex ABI management, no audit trail, access control issues
- With Zuno: Admin dashboard with API key scoping, complete audit logs, rate limiting

---

## Core Features & Capabilities

### 1. RESTful API with Versioning

**Endpoints**: 21+ routes covering ABIs, contracts, networks, system operations
**Versioning**: Header-based (X-API-Version, Accept-Version), defaults to v1
**Response Format**: Standardized with pagination, metadata, and error details

#### Key Endpoints
- `GET /api/abis` - List ABIs (paginated, filterable)
- `GET /api/abis/{id}` - Get single ABI with full details
- `POST /api/abis` - Create new ABI (authenticated)
- `PUT /api/abis/{id}` - Update ABI (authenticated)
- `DELETE /api/abis/{id}` - Delete ABI (authenticated)
- `GET /api/contracts/{address}/abi` - Get contract's current ABI
- `GET /api/contracts/{address}/versions` - List ABI versions with history
- `GET /api/networks` - List supported networks
- `GET /api/health` - System health with service status

### 2. Multi-Authentication

**Session-Based Auth**
- Cookie-based authentication (Better Auth)
- Suitable for web UI and interactive dashboards
- Automatic CSRF protection

**API Key Authentication**
- Header-based (`X-API-Key: sk_...`) or bearer token
- Scoped permissions (read/write/admin)
- Rate limit tiers (Public/Free/Pro/Enterprise)
- Support for multiple keys per user

**Dual Authentication**
- Session takes precedence (web UI)
- API key fallback for programmatic access
- Fine-grained permission control

### 3. Tiered Rate Limiting

**Two-Layer Protection**
- IP-based rate limiting (DDoS protection)
- API key tier-based limits

**Tier Structure**

| Tier | Requests/Hour | Requests/Day | Burst Limit | Cost |
|------|---------------|--------------|-------------|------|
| **Public** | 100 | 1,000 | 10/min | Free |
| **Free** | 500 | 5,000 | 30/min | Free |
| **Pro** | 5,000 | 50,000 | 100/min | $29/month |
| **Enterprise** | Unlimited | Unlimited | Unlimited | Custom |

**Rate Limit Headers**
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1642589432
X-RateLimit-Tier: free
```

### 4. IPFS Storage Integration

**Provider**: Pinata IPFS
**Benefits**:
- Decentralized, immutable ABI storage
- Content-addressed hashing (IPFS)
- Redundant storage across multiple nodes
- Verifiable integrity via IPFS hashes

**Features**:
- Automatic IPFS pinning on ABI creation
- Gateway URLs for easy access
- Content hash verification
- Fallback to local storage if IPFS unavailable

### 5. Redis Caching

**Cache Layers**:
- 18 cache key types covering ABIs, contracts, networks
- Cache-aside pattern for consistency
- Automatic invalidation on updates

**Performance**:
- 60%+ cache hit rate
- <50ms median response time with cache hit
- 1-2 hour TTLs depending on data mutability

**Cache Keys**:
```
abi:{id}
contract:{network}:{address}
network:{chainId}
contract:list:{network}
abi:versions:{contractId}
[... 13 more key types]
```

### 6. Admin Dashboard

**6 Management Modules**:
1. **ABIs** - Create/read/update/delete contract ABIs
2. **Contracts** - Manage contract records with multi-network support
3. **Networks** - Add/edit network configurations
4. **API Keys** - Generate and manage API keys with tier assignment
5. **Audit Logs** - View complete activity history with filtering
6. **Users** - Manage user accounts and permissions

**Technologies**: React 19, TanStack Query v5, React Hook Form, shadcn/ui (50+ components)

### 7. Audit Logging

**Comprehensive Logging**:
- Non-blocking, fire-and-forget implementation
- Fields: Timestamp, user ID, action, resource type, changes, IP address
- Filterable and searchable in admin dashboard
- 100% compliance coverage

**Logged Actions**:
- ABI CRUD operations
- Contract management
- API key generation/revocation
- User authentication/logout
- Admin configuration changes

### 8. Multi-Network Support

**Supported Networks** (8 + custom):
- Ethereum Mainnet (chainId: 1)
- Polygon (chainId: 137)
- BSC (chainId: 56)
- Arbitrum (chainId: 42161)
- Optimism (chainId: 10)
- Base (chainId: 8453)
- Sepolia Testnet (chainId: 11155111)
- Custom networks (admin-configurable)

**Network Metadata**:
- Chain ID
- RPC URL
- Block explorer URL
- Native currency details
- Testnet flag

### 9. ABI Versioning

**Version History**:
- Track multiple ABI versions per contract
- Semantic versioning support (v1.0.0, v1.1.0, etc.)
- Changelog/notes per version
- Quick rollback to previous versions

**Use Cases**:
- Contract upgrades (proxy pattern)
- Breaking changes documentation
- Backward compatibility tracking

### 10. Search & Filtering

**Filter Options**:
- By network
- By verification status
- By contract name/address
- By date range
- By creator/owner

**Pagination**:
- Default limit: 20
- Max limit: 100
- Offset-based pagination
- Total count in response

---

## Technical Requirements

### Infrastructure Requirements

**Compute**:
- Node.js 18.x+ (20.x LTS recommended)
- Memory: 512MB minimum (2GB+ recommended for production)
- CPU: 1+ core (2+ cores recommended)

**Database**:
- PostgreSQL 14+ (16+ recommended)
- Storage: 10GB+ for database
- Connection pooling: 20-50 connections
- Automated backup capability

**Caching**:
- Upstash Redis (serverless option)
- Minimum: Free tier (10K requests/day)
- Production: Pro tier (unlimited)

**Storage**:
- Pinata IPFS account
- Minimum: Free tier (1GB)
- Production: Paid plan (10GB+)

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | Next.js | 15.5 | Full-stack React framework |
| | React | 19.2 | UI library |
| | TypeScript | 5.9 | Type-safe development |
| | TailwindCSS | 4.1 | Styling |
| | shadcn/ui | Latest | Component library |
| | TanStack Query | 5.90 | Data fetching/caching |
| **Backend** | Next.js API Routes | 15.5 | Serverless API |
| | Drizzle ORM | 0.44 | Database abstraction |
| | PostgreSQL | 14+ | Primary database |
| | Better Auth | 1.4 | Authentication |
| **Caching** | Upstash Redis | Latest | Distributed cache |
| **Storage** | Pinata | 2.5 | IPFS gateway |
| **Testing** | Jest | 30.2 | Unit testing |

### API Design Requirements

**Consistency**:
- RESTful principles (GET, POST, PUT, DELETE)
- Consistent error response format
- Request/response envelope with metadata
- Pagination for list endpoints

**Versioning**:
- Header-based versioning
- Backward compatibility maintained
- Deprecation notices in headers
- Migration guides for breaking changes

**Security**:
- HTTPS/TLS enforcement
- CORS with origin whitelist
- Rate limiting on all endpoints
- Input validation with Zod schemas
- Output escaping and sanitization

---

## Architecture & Design Patterns

### Clean Architecture (Hexagonal)

**Layer Structure**:
```
Presentation Layer (Next.js routes, API endpoints, admin UI)
       ↓
Application Layer (Use cases, business logic orchestration)
       ↓
Domain Layer (Entities, repository interfaces, domain services)
       ↓
Infrastructure Layer (Database, cache, external services)
```

### Key Patterns

**Repository Pattern**
- Abstraction for data access
- Repository implementations for each aggregate
- Dependency injection for easy testing

**Use Case Pattern**
- One class per business operation
- Single Responsibility Principle
- Orchestrates domain logic and repositories

**Factory Pattern**
- Centralized entity creation
- Ensures consistency and validation
- DI container for dependency management

**Cache-Aside Pattern**
- Check cache first
- Load from database if miss
- Update cache with fresh data
- Automatic invalidation on updates

**API Wrapper Pattern**
- Consistent error handling
- Standard response envelopes
- Request ID tracking
- Automatic retry logic

---

## Non-Functional Requirements

### Performance

- **Response Time (p99)**: <200ms
- **Cache Hit Rate**: >50% for common queries
- **Database Query Optimization**: Indexed columns, query plans reviewed
- **Connection Pooling**: Efficient PostgreSQL connection management

### Availability

- **Uptime SLA**: 99.9% (maintained service availability)
- **Graceful Degradation**: Cache failure doesn't break service
- **Health Monitoring**: `/api/health` endpoint with service status
- **Automated Backups**: Daily database backups with restore testing

### Security

- **Authentication**: Session + API key dual auth
- **Authorization**: Scoped API key permissions, role-based access control
- **Data Protection**: TLS for transit, at-rest encryption for sensitive data
- **OWASP Compliance**: Top 10 vulnerabilities addressed
- **Input Validation**: All inputs validated with Zod schemas
- **Timing Attack Prevention**: Constant-time comparison for API keys
- **Rate Limiting**: Dual-layer (IP + API key) protection against abuse

### Maintainability

- **Code Organization**: Clean Architecture with clear layer separation
- **Type Safety**: TypeScript strict mode enforced
- **Documentation**: JSDoc for public APIs, comprehensive guides
- **Testing**: >80% unit test coverage
- **Deployment**: Zero-downtime deployments with database migrations

---

## Deployment Strategy

### Supported Platforms

1. **Vercel** (Recommended)
   - Zero-config Next.js deployment
   - Automatic HTTPS and CDN
   - Edge functions and caching

2. **Docker/Docker Compose**
   - Self-hosted with PostgreSQL + Redis
   - Kubernetes-ready containerization

3. **Cloud Platforms**
   - AWS (ECS Fargate, RDS, ElastiCache)
   - Google Cloud Platform (Cloud Run, Cloud SQL)
   - Railway.app (managed PostgreSQL + Redis)

### Pre-Deployment Checklist

- Security secrets rotated and stored securely
- Database migrations tested in staging
- All tests passing (unit, integration)
- Type checking clean
- Linting clean
- Admin credentials changed
- CORS origins configured
- Monitoring and alerting setup
- Backup strategy tested
- SSL certificate configured

---

## Roadmap

### v0.1.0 (Current) - Foundation
✅ Core API with versioning
✅ Multi-authentication (session + API key)
✅ Tiered rate limiting
✅ IPFS storage via Pinata
✅ Redis caching
✅ Admin dashboard
✅ Audit logging
✅ Multi-network support
✅ ABI versioning

### v0.2.0 (Q1 2025) - Public Marketplace
🚧 Public marketplace UI
🚧 Advanced search with filters
🚧 Contract verification workflow
🚧 User documentation portal

### v0.3.0 (Q2 2025) - Analytics & Insights
📋 Analytics dashboard for API usage
📋 Contract popularity metrics
📋 Network usage statistics
📋 Real-time monitoring dashboard

### v0.4.0 (Q3 2025) - Enhanced Features
📋 GraphQL API endpoint
📋 Webhook notifications for contract updates
📋 Contract change detection
📋 Automated ABI imports from verified contracts

### v1.0.0 (Q4 2025) - Enterprise
📋 Multi-tenancy support
📋 Custom branding for enterprise
📋 Advanced RBAC
📋 SLA-backed uptime guarantees
📋 Priority support tiers

---

## Constraints & Dependencies

### External Dependencies

- **Pinata**: IPFS storage and pinning
- **Upstash**: Redis caching
- **Better Auth**: Authentication library
- **PostgreSQL**: Primary database
- **Drizzle ORM**: Database abstraction

### Operational Constraints

- **Cost**: Must maintain <$500/month in production infrastructure
- **Compliance**: GDPR-ready with data export/deletion
- **SLA**: 99.9% uptime requirement for production
- **Backup**: Daily automated backups with 30-day retention

---

## Success Criteria

### Launch Success (v0.1.0)
- ✅ All core features deployed and tested
- ✅ >80% test coverage
- ✅ Admin dashboard fully functional
- ✅ Zero critical security issues
- ✅ Health check endpoint responding
- ✅ Database migrations working
- ✅ Documentation complete

### Production Readiness
- ✅ 99.9% uptime SLA maintained
- ✅ <200ms p99 response time
- ✅ Rate limiting enforced
- ✅ Audit logs complete
- ✅ Monitoring and alerting active
- ✅ Backup/restore tested quarterly

---

## Unresolved Questions

None at this time. All PDR requirements are clear and implementation-ready.
