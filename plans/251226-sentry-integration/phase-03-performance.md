# Phase 3: Performance Monitoring

**Duration**: 1.5 hours
**Status**: Pending
**Dependencies**: Phase 2 complete

---

## Overview

Enable distributed tracing to track request latency, database query performance, and cache operation times. Configure smart sampling to stay within free tier limits.

---

## Tasks

### Task 3.1: Enable Distributed Tracing

**File**: `sentry.server.config.ts`

**Update trace configuration**:

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",

  // Smart sampling (detailed below)
  tracesSampleRate: ({ transactionContext }) => {
    // Development: 100% sampling
    if (process.env.NODE_ENV !== "production") {
      return 1.0;
    }

    // Production: Smart sampling for free tier
    const name = transactionContext?.name || "";
    const op = transactionContext?.op || "";

    // 100% of error requests
    if (name.includes("400") || name.includes("500")) {
      return 1.0;
    }

    // 5% of health checks
    if (name.includes("/api/health")) {
      return 0.05;
    }

    // 5% of API requests (conservative for free tier)
    if (name.startsWith("GET /api/") ||
        name.startsWith("POST /api/") ||
        name.startsWith("PUT /api/") ||
        name.startsWith("DELETE /api/")) {
      return 0.05;
    }

    // 5% of other requests
    return 0.05;
  },

  // Profiling (optional, can be disabled)
  profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Integrations
  integrations: [
    Sentry.httpIntegration({
      tracing: true,
      // Capture request headers
      captureRequestHeaders: true,
      // Capture response headers
      captureResponseHeaders: ["x-request-id", "x-rate-limit-*"],
    }),
    Sentry.postgresIntegration({
      // Capture database query details
      captureQueries: true,
    }),
    Sentry.redisIntegration({
      // Capture Redis commands
      captureCommands: true,
    }),
    // ... existing integrations
  ],

  // ... rest of config
});
```

---

### Task 3.2: Add Custom Span Names

**Create helper for repository tracing**:

**File**: `src/infrastructure/monitoring/sentry-span.ts` (NEW)

```typescript
import { span } from "@sentry/core";

/**
 * Wrap repository call with Sentry span
 *
 * Usage:
 * ```typescript
 * const abi = await tracedRepositoryCall(
 *   "abi.findById",
 *   () => this.abiRepository.findById(id)
 * );
 * ```
 */
export async function tracedRepositoryCall<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  // Parse operation: "entity.action" → span name
  const [entity, action] = operation.split(".");

  return await span(
    {
      name: `${entity}.${action}`,
      op: "db.query",
      data: {
        entity,
        action,
      },
    },
    async (span) => {
      try {
        const result = await fn();
        span?.setStatus({ code: 1, message: "success" }); // SpanStatus.OK
        return result;
      } catch (error) {
        span?.setStatus({ code: 2, message: "error" }); // SpanStatus.INTERNAL_ERROR
        throw error;
      }
    }
  );
}

/**
 * Wrap cache call with Sentry span
 */
export async function tracedCacheCall<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const [action, key] = operation.split(":");

  return await span(
    {
      name: `cache.${action}`,
      op: "cache",
      data: {
        action, // get, set, delete
        key: key?.substring(0, 50), // Truncate long keys
      },
    },
    fn
  );
}

/**
 * Wrap external service call (IPFS, etc.)
 */
export async function tracedExternalCall<T>(
  service: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return await span(
    {
      name: `${service}.${operation}`,
      op: "http.client",
      data: {
        service,
        operation,
      },
    },
    fn
  );
}
```

**Usage in repositories** (optional enhancement):

```typescript
// src/infrastructure/database/repositories/abi.repository.ts
import { tracedRepositoryCall } from "@/infrastructure/monitoring/sentry-span";

export class AbiRepository implements IAbiRepository {
  async findById(id: string): Promise<Abi | null> {
    return tracedRepositoryCall("abi.findById", async () => {
      const row = await this.db.query.abis.findFirst({
        where: eq(schema.abis.id, id),
      });
      return row ? this.toDomain(row) : null;
    });
  }

  // ... other methods
}
```

---

### Task 3.3: Add IPFS Operation Spans

**File**: `src/infrastructure/storage/ipfs.service.ts`

**Add spans to key operations**:

```typescript
import { tracedExternalCall } from "../monitoring/sentry-span";

export class IpfsService {
  async pin(data: unknown): Promise<string> {
    return tracedExternalCall("pinata", "pin", async () => {
      // ... existing Pinata API call
    });
  }

  async retrieve(hash: string): Promise<unknown> {
    return tracedExternalCall("pinata", "retrieve", async () => {
      // ... existing retrieval logic
    });
  }
}
```

---

## Sampling Strategy

### Free Tier Calculation

**Daily Traffic Estimate** (Updated for 5% conservative sampling):

| Endpoint | Requests/day | Sample Rate | Traces |
|----------|--------------|------------|--------|
| `GET /api/health` | 2,880 | 5% | 144 |
| `GET /api/abis` | 1,000 | 5% | 50 |
| `GET /api/contracts` | 800 | 5% | 40 |
| `POST /api/abis` | 50 | 5% | 3 |
| Error requests | 100 | 100% | 100 |
| Other endpoints | 500 | 5% | 25 |
| **Total** | **5,330** | - | **362** |

**Result**: ~360 traces/day ✅ (Limit: 3,000/day = 12% used - very safe)

### Adjustment Formula

If approaching limit:

```typescript
// Reduce all production rates by 50%
tracesSampleRate: ({ transactionContext }) => {
  const baseRate = /* existing logic */;
  return process.env.REDUCE_SENTRY_SAMPLING ? baseRate * 0.5 : baseRate;
},
```

---

## Testing

### Test 3.1: Trace Capture

```bash
# Make test request
curl http://localhost:3000/api/health

# Check Sentry Dashboard
# Should see transaction: "GET /api/health"
# With spans: HTTP request, any DB/cache calls
```

### Test 3.2: Span Names

```bash
# Test ABI retrieval
curl http://localhost:3000/api/abis/abi_v1_test123

# Check Sentry
# Should see spans with descriptive names:
# - db.query: abi.findById
# - cache.get: abi:abi_v1_test123
```

### Test 3.3: Sampling Verification

Make 100 requests to same endpoint:

```bash
for i in {1..100}; do
  curl http://localhost:3000/api/health
done
```

**Expected**: ~5 traces in Sentry (5% sampling)

### Test 3.4: Performance Baseline

After 24 hours, check Sentry dashboards:

| Metric | Expected |
|--------|----------|
| P50 latency | <100ms |
| P95 latency | <500ms |
| P99 latency | <1000ms |
| DB query time | <50ms |
| Cache hit rate | >60% |

---

## Monitoring

### Daily Checks

1. **Usage Dashboard**: Verify <3K traces/day
2. **Performance**: Check P95 latency trends
3. **Slow Transactions**: Investigate >2s requests

### Alerts to Configure

| Alert | Threshold | Action |
|-------|-----------|--------|
| High error rate | >5% errors | Investigate immediately |
| P95 latency spike | >2s | Check DB/Cache |
| Trace limit | >2.5K/day | Reduce sampling |

---

## Success Criteria

| Criterion | How to Verify |
|-----------|---------------|
| ✅ HTTP requests traced | Sentry shows transactions |
| ✅ DB queries spanned | Transaction has db.query spans |
| ✅ Redis operations spanned | Transaction has cache spans |
| ✅ Sampling working | Expected traces sent |
| ✅ Free tier compliant | <3K traces/day |

---

## Rollback

If performance issues:

```typescript
// Disable tracing temporarily
tracesSampleRate: 0, // No traces
```

Or via environment variable:

```bash
SENTRY_TRACES_SAMPLE_RATE=0 pnpm dev
```

---

## Next Phase

After Phase 3 complete, proceed to [Phase 4: User Action Tracking](./phase-04-user-tracking.md)

---

**Phase Owner**: Implementation Team
**Review Status**: Pending
