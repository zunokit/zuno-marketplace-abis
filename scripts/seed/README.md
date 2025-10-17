# Professional Seed System

A clean, extensible, and production-ready seed system for the Zuno Marketplace ABIs project.

## 🏗️ Architecture

The seed system follows a clean architecture pattern with clear separation of concerns:

```
scripts/seed/
├── index.ts              # Entry point and CLI
├── orchestrator.ts       # Manages seeder execution and dependencies
├── config.ts            # Configuration management
├── logger.ts            # Professional logging system
├── types.ts             # TypeScript interfaces and types
├── factories/           # Data factories for creating test data
│   └── network.factory.ts
├── data-providers/      # Data providers for real-world data
│   └── network.provider.ts
└── seeders/            # Individual seeders for each entity
    ├── network.seeder.ts
    ├── user.seeder.ts
    └── api-version.seeder.ts
```

## 🚀 Features

- **Dependency Management**: Automatic resolution of seeder dependencies
- **Transaction Support**: Optional transaction wrapping for data consistency
- **Batch Processing**: Configurable batch sizes for large datasets
- **Error Handling**: Comprehensive error handling with detailed logging
- **Environment Awareness**: Different configurations for dev/staging/production
- **Validation**: Data validation before insertion
- **Progress Tracking**: Real-time progress reporting
- **Extensibility**: Easy to add new seeders and data providers

## 📝 Usage

### Basic Usage

```bash
# Run with default configuration
pnpm db:seed

# Run with custom configuration
pnpm db:seed --clearExisting=true --batchSize=50 --logLevel=verbose
```

### Programmatic Usage

```typescript
import { seed } from './scripts/seed';

// Basic seeding
await seed();

// With custom configuration
await seed({
  environment: 'production',
  clearExisting: false,
  batchSize: 100,
  useTransactions: true,
  logLevel: 'minimal'
});
```

### Environment Variables

```bash
# Configuration overrides
SEED_CLEAR_EXISTING=true
SEED_BATCH_SIZE=50
SEED_USE_TRANSACTIONS=false
SEED_LOG_LEVEL=verbose
SEED_SKIP=test-data,development-only
```

## 🔧 Configuration

### Default Configuration

```typescript
{
  environment: 'development',
  clearExisting: false,
  skipSeeders: [],
  batchSize: 100,
  useTransactions: true,
  logLevel: 'verbose'
}
```

### Production Configuration

```typescript
{
  environment: 'production',
  clearExisting: false,
  skipSeeders: ['test-data', 'development-only'],
  batchSize: 50,
  useTransactions: true,
  logLevel: 'minimal'
}
```

## 🏭 Creating New Seeders

### 1. Create a Factory (Optional)

```typescript
// scripts/seed/factories/example.factory.ts
import { SeedFactory } from '../types';

export interface ExampleData {
  id: string;
  name: string;
  // ... other fields
}

export class ExampleFactory implements SeedFactory<ExampleData> {
  create(overrides: Partial<ExampleData> = {}): ExampleData {
    return {
      id: 'example-id',
      name: 'Example Name',
      ...overrides
    };
  }

  createMany(count: number, overrides?: Partial<ExampleData>): ExampleData[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  state(state: string): SeedFactory<ExampleData> {
    // Return different data based on state
    return this;
  }
}
```

### 2. Create a Data Provider

```typescript
// scripts/seed/data-providers/example.provider.ts
import { SeedDataProvider } from '../types';
import { ExampleFactory, ExampleData } from '../factories/example.factory';

export class ExampleDataProvider implements SeedDataProvider<ExampleData> {
  private factory: ExampleFactory;

  constructor() {
    this.factory = new ExampleFactory();
  }

  async getAll(): Promise<ExampleData[]> {
    return this.factory.createMany(10);
  }

  async getBy(criteria: Partial<ExampleData>): Promise<ExampleData[]> {
    const all = await this.getAll();
    return all.filter(item => 
      Object.entries(criteria).every(([key, value]) => 
        item[key as keyof ExampleData] === value
      )
    );
  }

  async validate(data: ExampleData): Promise<boolean> {
    return !!(data.id && data.name);
  }

  async transform(data: ExampleData): Promise<ExampleData> {
    // Transform data if needed
    return data;
  }
}
```

### 3. Create a Seeder

```typescript
// scripts/seed/seeders/example.seeder.ts
import { Seeder, SeedContext, SeedResult } from '../types';
import { ExampleDataProvider } from '../data-providers/example.provider';
import { exampleTable } from '@/infrastructure/database/drizzle/schema/example.schema';

export class ExampleSeeder implements Seeder {
  name = 'examples';
  dependencies: string[] = ['users']; // Dependencies
  parallel = false;

  private provider: ExampleDataProvider;

  constructor() {
    this.provider = new ExampleDataProvider();
  }

  async execute(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let created = 0;
    let skipped = 0;
    let updated = 0;

    try {
      const data = await this.provider.getAll();
      
      for (const item of data) {
        try {
          // Validate
          const isValid = await this.provider.validate(item);
          if (!isValid) {
            context.logger?.warn(`Invalid data, skipping: ${item.name}`);
            skipped++;
            continue;
          }

          // Transform
          const transformed = await this.provider.transform(item);

          // Insert
          await context.db.insert(exampleTable).values(transformed);
          created++;

        } catch (error: any) {
          if (this.isUniqueConstraintError(error)) {
            context.logger?.info(`Example ${item.name} already exists, skipping...`);
            skipped++;
          } else {
            throw error;
          }
        }
      }

      const duration = Date.now() - startTime;

      return {
        seeder: this.name,
        created,
        skipped,
        updated,
        duration,
        success: true
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      context.logger?.error(`Example seeding failed: ${error.message}`);

      return {
        seeder: this.name,
        created,
        skipped,
        updated,
        duration,
        success: false,
        error: error.message
      };
    }
  }

  private isUniqueConstraintError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('duplicate key') ||
      message.includes('unique constraint') ||
      message.includes('already exists')
    );
  }
}
```

### 4. Register the Seeder

```typescript
// scripts/seed/index.ts
import { ExampleSeeder } from './seeders/example.seeder';

// In the seed function:
orchestrator.register(new ExampleSeeder());
```

## 🔍 Logging

The seed system provides comprehensive logging with different levels:

- **silent**: No output
- **minimal**: Only errors and summary
- **verbose**: Detailed progress and information

### Log Format

```
[2024-01-15T10:00:00.000Z] [INFO] Starting Seed Orchestration
============================================================
🌱 EXECUTING USERS
============================================================
[2024-01-15T10:00:00.100Z] [INFO] Created system user: usr_v1_xxx
[2024-01-15T10:00:00.200Z] [INFO] Created public user: usr_v1_yyy
✅ User seeding completed: 2 created, 0 skipped, 0 updated
============================================================
📊 SEED SUMMARY
============================================================
✅ Successful seeders: 3/3
📝 Total created: 8
⏭️  Total skipped: 0
🔄 Total updated: 0
⏱️  Total duration: 1500ms
============================================================
```

## 🛡️ Error Handling

The seed system includes comprehensive error handling:

- **Validation Errors**: Data validation before insertion
- **Constraint Violations**: Graceful handling of unique constraint errors
- **Transaction Rollback**: Automatic rollback on failure (when using transactions)
- **Dependency Resolution**: Circular dependency detection
- **Environment-Specific Behavior**: Different error handling for dev vs production

## 🧪 Testing

```bash
# Test with different configurations
pnpm db:seed --environment=development --logLevel=verbose
pnpm db:seed --environment=staging --clearExisting=true
pnpm db:seed --environment=production --logLevel=minimal
```

## 📈 Performance

- **Batch Processing**: Configurable batch sizes for optimal performance
- **Parallel Execution**: Support for parallel seeder execution where possible
- **Transaction Optimization**: Optional transaction wrapping
- **Memory Efficient**: Streaming large datasets
- **Progress Tracking**: Real-time progress reporting

## 🔒 Security

- **Environment Awareness**: Different behavior for different environments
- **Data Validation**: Comprehensive validation before insertion
- **Error Sanitization**: Safe error messages in production
- **Transaction Safety**: ACID compliance when using transactions

## 🚀 Future Enhancements

- [ ] Parallel seeder execution
- [ ] Incremental seeding
- [ ] Data migration support
- [ ] Rollback functionality
- [ ] Performance metrics
- [ ] Integration with CI/CD
- [ ] Data anonymization for testing
- [ ] Backup and restore integration
