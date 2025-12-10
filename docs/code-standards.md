# Zuno Marketplace ABIs - Code Standards & Conventions

**Version**: 1.0
**Last Updated**: January 2025
**Scope**: TypeScript, React, Next.js, Database

## Overview

This document establishes coding standards and architectural patterns for the Zuno Marketplace ABIs project. All code contributions must adhere to these standards to maintain consistency, readability, and maintainability.

---

## TypeScript Configuration & Strict Mode

### tsconfig.json Settings

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "module": "esnext",
    "target": "ES2020",
    "moduleResolution": "bundler"
  }
}
```

### Enforcement

- All code must compile with strict mode enabled
- No `any` types allowed (use `unknown` if necessary)
- All variables must have explicit types or inferred types
- Function return types must be explicitly specified
- Unused variables/imports will fail type checking

---

## Naming Conventions

### Files & Directories

**Kebab-Case Convention**:
```
✅ CORRECT:
  src/core/use-cases/abi/create-abi.use-case.ts
  src/infrastructure/database/repositories/abi.repository.ts
  src/app/admin/api-keys/page.tsx
  src/shared/lib/validation/abi-validator.ts

❌ INCORRECT:
  src/core/useCases/abi/createAbi.ts
  src/infrastructure/database/Repositories/AbiRepository.ts
  src/app/admin/apiKeys/page.tsx
```

**File Naming Pattern**:
- Entity files: `{entity}.entity.ts`
- Repository files: `{entity}.repository.ts`
- Services: `{service}.service.ts`
- Use cases: `{operation}-{entity}.use-case.ts`
- Validators: `{entity}-validator.ts`
- Pages: `page.tsx`
- Layouts: `layout.tsx`
- Components: `{component-name}.tsx`
- Actions: `actions.ts`
- Routes: `route.ts`

### TypeScript Types & Classes

**PascalCase Convention**:
```typescript
// ✅ CORRECT
class UserRepository implements IRepository<User> {}
interface IAuditLog {}
type ApiResponse<T> = { success: boolean; data: T };
enum NetworkChainId { Ethereum = 1, Polygon = 137 }

// ❌ INCORRECT
class userRepository {}
interface auditLog {}
type apiResponse<T> = {}
enum networkChainId {}
```

### Functions & Variables

**camelCase Convention**:
```typescript
// ✅ CORRECT
const createAbi = async (abi: Abi): Promise<void> => {};
let userCount = 0;
function getUserById(id: string) {}
const validateAbiSchema = (abi: Abi) => {};

// ❌ INCORRECT
const CreateAbi = async () => {};
let UserCount = 0;
function get_user_by_id() {}
const ValidateAbiSchema = () => {};
```

### Constants

**UPPER_SNAKE_CASE Convention**:
```typescript
// ✅ CORRECT
const DEFAULT_CACHE_TTL = 3600;
const API_VERSION = 'v1';
const MAX_ABI_SIZE_MB = 5;
const RATE_LIMIT_TIERS = { FREE: 500, PRO: 5000 };

// ❌ INCORRECT
const defaultCacheTtl = 3600;
const api_version = 'v1';
const max_abi_size_mb = 5;
```

### Database Objects

**snake_case Convention**:
```typescript
// ✅ CORRECT - Database Schema
const users = pgTable('users', {
  user_id: varchar('user_id'),
  created_at: timestamp('created_at'),
  api_keys: varchar('api_keys').array(),
});

// ❌ INCORRECT
const users = pgTable('users', {
  userId: varchar('userId'),
  createdAt: timestamp('createdAt'),
});
```

### React Components

**PascalCase Convention**:
```typescript
// ✅ CORRECT
const AbiTable: React.FC<AbiTableProps> = ({ abis }) => {};
export const CreateAbiDialog = () => {};
const AdminLayout: React.FC = ({ children }) => {};

// ❌ INCORRECT
const abiTable = () => {};
const create_abi_dialog = () => {};
const adminLayout = () => {};
```

---

## Code Organization Patterns

### Directory Structure Principles

1. **Feature-based Organization**: Group code by domain/feature
2. **Layer Separation**: Distinct layers (domain, application, infrastructure, presentation)
3. **Single Responsibility**: One purpose per file/module
4. **Dependency Inversion**: Depend on abstractions, not implementations

### Proper Structure Example

```
src/
├── core/
│   ├── domain/
│   │   └── abi/
│   │       ├── abi.entity.ts          # Entities
│   │       ├── abi.repository.ts      # Interfaces only
│   │       └── index.ts               # Exports
│   ├── services/
│   │   └── abi/
│   │       ├── abi.service.ts         # Business logic
│   │       └── index.ts
│   ├── use-cases/
│   │   └── abi/
│   │       ├── create-abi.use-case.ts # One per operation
│   │       └── index.ts
│   └── ports/
│       └── repository.port.ts         # Interfaces
├── infrastructure/
│   ├── database/
│   │   ├── repositories/              # Implementations
│   │   ├── drizzle/
│   │   │   └── schema/                # Database schemas
│   │   └── index.ts
│   └── cache/                         # Redis implementation
├── app/
│   ├── api/                           # API routes
│   ├── admin/                         # Admin UI
│   └── auth/                          # Auth pages
└── shared/
    ├── lib/                           # Utilities
    ├── types/                         # Type definitions
    └── config/                        # Configuration
```

---

## Architecture Patterns

### 1. Repository Pattern

**Purpose**: Abstract data access behind interfaces

```typescript
// ✅ CORRECT - Domain Layer
export interface IAbiRepository {
  findById(id: string): Promise<Abi | null>;
  findAll(filters?: AbiFilter): Promise<Abi[]>;
  save(abi: Abi): Promise<void>;
  delete(id: string): Promise<void>;
}

// ✅ CORRECT - Infrastructure Layer
export class AbiRepository implements IAbiRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<Abi | null> {
    return this.db.query.abis.findFirst({
      where: eq(schema.abis.id, id),
    });
  }

  async save(abi: Abi): Promise<void> {
    await this.db.insert(schema.abis).values(abi);
  }
}

// ❌ INCORRECT - Direct database access in domain
export class AbiService {
  async getAbi(id: string) {
    return db.query(`SELECT * FROM abis WHERE id = $1`, [id]);
  }
}
```

### 2. Use Case Pattern

**Purpose**: Single operation, single file

```typescript
// ✅ CORRECT - One use case per file
export class CreateAbiUseCase {
  constructor(
    private abiRepository: IAbiRepository,
    private ipfsService: IIpfsService,
    private cacheService: ICacheService
  ) {}

  async execute(input: CreateAbiInput): Promise<CreateAbiOutput> {
    // Validate input
    const validatedAbi = validateAbiSchema(input.abi);

    // Pin to IPFS
    const ipfsHash = await this.ipfsService.pin(validatedAbi);

    // Save to database
    const abi = new Abi({
      contractAddress: input.contractAddress,
      network: input.network,
      ipfsHash,
      abi: validatedAbi,
    });

    await this.abiRepository.save(abi);

    // Invalidate cache
    await this.cacheService.invalidate(`abi:${abi.id}`);

    return { id: abi.id, ipfsHash };
  }
}

// ❌ INCORRECT - God class handling multiple operations
export class AbiManager {
  async createAbi() {}
  async updateAbi() {}
  async deleteAbi() {}
  async getAbi() {}
  async listAbis() {}
  // ... 10 more methods
}
```

### 3. Dependency Injection

**Purpose**: Loose coupling, testability

```typescript
// ✅ CORRECT - Constructor injection
export class AbiService {
  constructor(
    private abiRepository: IAbiRepository,
    private cacheService: ICacheService,
    private auditLogService: IAuditLogService
  ) {}

  async getAbi(id: string): Promise<Abi> {
    // Service uses injected dependencies
    const cached = await this.cacheService.get(`abi:${id}`);
    if (cached) return cached;

    const abi = await this.abiRepository.findById(id);
    await this.cacheService.set(`abi:${id}`, abi);
    return abi;
  }
}

// ❌ INCORRECT - Direct instantiation (tight coupling)
export class AbiService {
  private cacheService = new RedisCache();

  async getAbi(id: string): Promise<Abi> {
    // Hard to test, can't swap implementations
  }
}
```

### 4. Value Objects

**Purpose**: Type-safe, validated representations

```typescript
// ✅ CORRECT - Value object for ABI hash
export class AbiHash {
  constructor(private readonly value: string) {
    if (!this.isValidHash(value)) {
      throw new Error('Invalid ABI hash');
    }
  }

  private isValidHash(hash: string): boolean {
    return /^Qm[a-zA-Z0-9]{44}$/.test(hash); // IPFS hash format
  }

  toString(): string {
    return this.value;
  }

  equals(other: AbiHash): boolean {
    return this.value === other.toString();
  }
}

// Usage
const abiHash = new AbiHash('QmXxxx...'); // Validated on creation
abi.setHash(abiHash); // Type-safe

// ❌ INCORRECT - Raw strings
let abiHash: string = 'invalid-hash'; // No validation
abi.ipfsHash = abiHash; // Could be invalid
```

### 5. Factory Pattern

**Purpose**: Centralized entity creation

```typescript
// ✅ CORRECT - Factory for entity creation
export class AbiFactory {
  static create(input: CreateAbiInput): Abi {
    // Centralized validation and initialization
    return new Abi({
      id: nanoid(),
      contractAddress: input.contractAddress.toLowerCase(),
      network: input.network,
      abi: input.abi,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

// Usage
const abi = AbiFactory.create({ contractAddress: '0x...', ... });

// ❌ INCORRECT - Direct instantiation scattered
new Abi({
  id: nanoid(),
  contractAddress: input.contractAddress, // Might not be lowercase
  network: input.network,
  abi: input.abi,
});
```

---

## Error Handling Standards

### Custom Error Classes

```typescript
// ✅ CORRECT - Typed error hierarchy
export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ResourceNotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super('RESOURCE_NOT_FOUND', `${resource} not found: ${id}`, 404);
    this.name = 'ResourceNotFoundError';
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public details?: Record<string, string[]>) {
    super('VALIDATION_ERROR', message, 400);
    this.name = 'ValidationError';
  }
}

// ❌ INCORRECT - Generic errors
throw new Error('Not found');
throw new Error('Invalid input');
```

### Error Handling in API Routes

```typescript
// ✅ CORRECT - Proper error handling
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      throw new ValidationError('Missing required parameter: id');
    }

    const abi = await getAbiUseCase.execute({ id });
    return ApiWrapper.success(abi);
  } catch (error) {
    if (error instanceof DomainError) {
      return ApiWrapper.error(error.code, error.message, error.statusCode);
    }
    return ApiWrapper.error('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

// ❌ INCORRECT - Unhandled errors
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  const abi = await getAbiUseCase.execute({ id });
  return Response.json(abi);
}
```

---

## Testing Standards

### Unit Test Organization

```typescript
// ✅ CORRECT - Clear test structure
describe('CreateAbiUseCase', () => {
  let useCase: CreateAbiUseCase;
  let mockRepository: jest.Mocked<IAbiRepository>;

  beforeEach(() => {
    mockRepository = mock<IAbiRepository>();
    useCase = new CreateAbiUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should create ABI with valid input', async () => {
      // Arrange
      const input = { contractAddress: '0x...', abi: validAbi };
      mockRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result.id).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw error with invalid ABI', async () => {
      // Arrange
      const input = { contractAddress: '0x...', abi: invalidAbi };

      // Act & Assert
      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
    });
  });
});

// ❌ INCORRECT - Unclear test structure
describe('AbiTest', () => {
  it('test', () => {
    const result = createAbi({ a: 1 });
    expect(result).toBeTruthy();
  });
});
```

### Test Coverage Goals

- **Unit Tests**: >80% code coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user flows
- **Skipped Tests**: Mark with `.skip` and add comment with issue/reason

```typescript
it.skip('should handle concurrent requests', async () => {
  // TODO: Implement after concurrency fix (issue #123)
});
```

---

## Documentation Standards

### JSDoc Comments

```typescript
// ✅ CORRECT - Comprehensive JSDoc
/**
 * Retrieves a contract ABI by ID with optional caching.
 *
 * @param id - Unique ABI identifier
 * @param options - Optional configuration
 * @param options.useCache - Whether to use cached result (default: true)
 * @returns Promise containing the ABI data
 * @throws {ResourceNotFoundError} When ABI with ID is not found
 *
 * @example
 * ```typescript
 * const abi = await getAbiUseCase.execute({ id: 'abi_v1_123' });
 * ```
 */
async execute(id: string, options?: GetAbiOptions): Promise<Abi> {}

// ❌ INCORRECT - Missing or vague documentation
async execute(id: string, options?: any): Promise<any> {}
```

### Inline Comments

```typescript
// ✅ CORRECT - Explain why, not what
const abiHash = await ipfsService.pin(abi); // Content-addressed for integrity verification
const startTime = performance.now(); // Track response time for metrics

// ❌ INCORRECT - Explain obvious code
const abiHash = await ipfsService.pin(abi); // Pin to IPFS
const startTime = performance.now(); // Get start time
```

### Class Documentation

```typescript
// ✅ CORRECT - Class-level documentation
/**
 * Handles ABI creation with validation, IPFS storage, and caching.
 *
 * Implements the Create ABI use case with the following flow:
 * 1. Validate ABI schema
 * 2. Pin to IPFS
 * 3. Save to database
 * 4. Invalidate cache
 *
 * @example
 * ```typescript
 * const abi = await createAbiUseCase.execute(input);
 * ```
 */
export class CreateAbiUseCase {}
```

---

## Git Workflow & Commit Conventions

### Branch Naming

```
✅ CORRECT:
  feature/add-abi-versioning
  feature/improve-cache-performance
  bugfix/fix-race-condition-in-audit-log
  hotfix/critical-security-patch
  chore/update-dependencies

❌ INCORRECT:
  feature_add_abi_versioning
  bugfix-race-condition
  fix-it
  myfeature
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Test additions/changes
- `chore`: Build, dependencies, tooling

**Examples**:

```
✅ CORRECT:
  feat(abis): add ABI versioning with rollback capability
  fix(cache): resolve race condition in Redis invalidation
  refactor(repositories): extract common query logic
  docs(api): update endpoint authentication examples
  perf(database): add indexes on frequently queried columns

❌ INCORRECT:
  Added ABI versioning
  fixed bug
  updated code
  changes
  WIP
```

---

## Validation & Input Handling

### Zod Schema Validation

```typescript
// ✅ CORRECT - Comprehensive validation
import { z } from 'zod';

export const createAbiSchema = z.object({
  contractAddress: z
    .string()
    .min(42)
    .max(42)
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  network: z.enum(['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'sepolia']),
  abi: z.array(z.object({
    type: z.enum(['function', 'constructor', 'fallback', 'receive', 'event']),
    name: z.string().optional(),
    inputs: z.array(z.any()).default([]),
  })).min(1, 'ABI must contain at least one element'),
  metadata: z.record(z.string()).optional(),
});

// Usage
const validated = createAbiSchema.parse(input);

// ❌ INCORRECT - No validation
function createAbi(input: any) {
  if (!input.contractAddress) throw new Error('Missing address');
  // Incomplete validation
}
```

### API Request Validation

```typescript
// ✅ CORRECT - Validate at API boundary
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = createAbiSchema.parse(body);

    const result = await createAbiUseCase.execute(validated);
    return ApiWrapper.success(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiWrapper.error('VALIDATION_ERROR', 'Invalid input', 400, {
        details: error.errors,
      });
    }
    throw error;
  }
}
```

---

## Performance Standards

### Query Optimization

```typescript
// ✅ CORRECT - Optimized queries
const contracts = await db.query.contracts.findMany({
  where: and(
    eq(contracts.network, 'ethereum'),
    eq(contracts.verified, true)
  ),
  columns: { id: true, address: true, name: true }, // Select only needed columns
  limit: 20,
  offset: 0,
});

// ❌ INCORRECT - N+1 queries, full table scans
const contracts = await db.query.contracts.findMany(); // No filters
const withAbis = contracts.map(c => ({
  ...c,
  abi: db.query.abis.findFirst({ where: eq(abis.contractId, c.id) }) // N+1 problem
}));
```

### Caching Strategy

```typescript
// ✅ CORRECT - Cache-aside pattern
async getAbi(id: string): Promise<Abi> {
  // Check cache first
  const cached = await this.cache.get(`abi:${id}`);
  if (cached) return cached;

  // Load from database
  const abi = await this.repository.findById(id);

  // Update cache
  await this.cache.set(`abi:${id}`, abi, { ttl: 3600 });

  return abi;
}

// ❌ INCORRECT - Always load from database
async getAbi(id: string): Promise<Abi> {
  return this.repository.findById(id);
}
```

---

## Security Standards

### API Key Handling

```typescript
// ✅ CORRECT - Constant-time comparison
function compareApiKeys(provided: string, stored: string): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(provided),
    Buffer.from(stored)
  );
}

// ❌ INCORRECT - Timing attack vulnerability
if (provided === stored) {
  // Timing reveals information about correct key
}
```

### Input Sanitization

```typescript
// ✅ CORRECT - Sanitize user inputs
const sanitized = DOMPurify.sanitize(userInput);
const escaped = escapeHtml(contractName);

// ❌ INCORRECT - Using unsanitized input
const html = `<h1>${contractName}</h1>`; // XSS vulnerability
```

---

## React Component Standards

### Functional Component Pattern

```typescript
// ✅ CORRECT - Modern React component
interface AbiTableProps {
  abis: Abi[];
  onSelect: (abi: Abi) => void;
  isLoading?: boolean;
}

export const AbiTable: React.FC<AbiTableProps> = ({
  abis,
  onSelect,
  isLoading = false,
}) => {
  return (
    <table>
      <tbody>
        {abis.map(abi => (
          <tr key={abi.id} onClick={() => onSelect(abi)}>
            <td>{abi.contractAddress}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ❌ INCORRECT - Class component, no types
class AbiTable extends React.Component {
  render() {
    return <table>{this.props.abis.map(...)}</table>;
  }
}
```

### Hook Usage

```typescript
// ✅ CORRECT - Proper hook usage
export function AbiForm({ onSubmit }: AbiFormProps) {
  const [abi, setAbi] = useState<Abi | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['abi', abiId],
    queryFn: () => fetchAbi(abiId),
  });

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}

// ❌ INCORRECT - Hook in conditional
function AbiForm() {
  if (condition) {
    const [state] = useState(); // Hooks must be at top level
  }
}
```

---

## Database Standards

### Schema Definition

```typescript
// ✅ CORRECT - Well-structured schema
export const abis = pgTable('abis', {
  id: varchar('id').primaryKey(),
  contractId: varchar('contract_id')
    .notNull()
    .references(() => contracts.id, { onDelete: 'cascade' }),
  abiHash: varchar('abi_hash').notNull().unique(),
  abiJson: jsonb('abi_json').notNull(),
  ipfsHash: varchar('ipfs_hash'),
  verified: boolean('verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Indexes for performance
export const abiContractIdIdx = index('abi_contract_id_idx')
  .on(abis.contractId);
export const abiHashIdx = index('abi_hash_idx')
  .on(abis.abiHash);

// ❌ INCORRECT - Missing constraints
export const abis = pgTable('abis', {
  id: varchar('id'),
  contractId: varchar('contract_id'),
  abiJson: jsonb('abi_json'),
  // No constraints, no indexes
});
```

---

## Environment & Configuration

### Environment Variables

```typescript
// ✅ CORRECT - Validated env vars
export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.UPSTASH_REDIS_REST_URL!,
  PINATA_JWT: process.env.PINATA_JWT!,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Validation happens at module load time
if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

// ❌ INCORRECT - No validation
const dbUrl = process.env.DATABASE_URL; // Could be undefined
```

### Feature Flags

```typescript
// ✅ CORRECT - Centralized feature flags
export const features = {
  ipfsStorage: true,
  auditLogging: true,
  rateLimiting: true,
  publicSignup: false,
};

// Usage
if (features.auditLogging) {
  await auditLogService.log(action);
}
```

---

## Code Review Checklist

Before submitting PR, ensure:

- [ ] Code follows all naming conventions (files, functions, variables)
- [ ] TypeScript strict mode compilation passes
- [ ] No `any` types used
- [ ] All functions have explicit return types
- [ ] Clean Architecture layers are respected
- [ ] Tests pass with >80% coverage
- [ ] No unused imports or variables
- [ ] Error handling is comprehensive
- [ ] Input validation with Zod schemas
- [ ] JSDoc comments for public APIs
- [ ] Commit messages follow conventional commits
- [ ] Database queries are optimized
- [ ] No security vulnerabilities (timing attacks, XSS, etc.)
- [ ] Performance-critical sections are optimized
- [ ] Tests are clear and maintainable

---

## Unresolved Questions

None. All code standards are clearly defined.
