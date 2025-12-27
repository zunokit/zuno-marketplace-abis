# Sentry Setup Guide for Next.js

Complete guide for integrating Sentry error tracking and performance monitoring into Next.js applications. Based on production implementation with free-tier optimization.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Installation](#2-installation)
3. [Configuration](#3-configuration)
4. [Usage Patterns](#4-usage-patterns)
5. [Best Practices](#5-best-practices)
6. [Testing](#6-testing)
7. [Troubleshooting](#7-troubleshooting)
8. [Advanced Configuration](#8-advanced-configuration)
9. [References](#9-references)

---

## 1. Prerequisites

### Required Accounts

| Service | Free Tier | Purpose |
|---------|-----------|---------|
| [Sentry](https://sentry.io) | 5K errors/month, 3K transactions/day | Error tracking & performance monitoring |
| Vercel (optional) | - | Auto integration & release tracking |

### Project Requirements

- **Next.js**: 15.x or higher (App Router)
- **Node.js**: 18.x LTS or 20.x LTS
- **Package Manager**: pnpm 8.x+ (npm/yarn also supported)
- **TypeScript**: 5.x (strict mode)

### Before You Begin

1. Create a Sentry account at https://sentry.io
2. Create a new project in Sentry dashboard
3. Select **Next.js** as the platform
4. Note your **DSN** (Data Source Name) URL from Settings → Client Keys

---

## 2. Installation

### Step 2.1: Install Sentry SDK

```bash
# Using pnpm (recommended)
pnpm add @sentry/nextjs

# Using npm
npm install @sentry/nextjs

# Using yarn
yarn add @sentry/nextjs
```

### Step 2.2: Run Setup Wizard

```bash
npx @sentry/wizard@latest -i nextjs
```

The wizard will:
- Create `sentry.server.config.ts`
- Create `sentry.client.config.ts`
- Create `sentry.edge.config.ts`
- Update `next.config.ts`
- Create `.sentryclirc` for source maps

### Step 2.3: Verify Installation

```bash
# Check package installed
pnpm list @sentry/nextjs

# Verify TypeScript compilation
pnpm typecheck

# Run tests (if applicable)
pnpm test
```

---

## 3. Configuration

### 3.1 Environment Variables

Add to your `.env` file:

```bash
# Required
SENTRY_DSN="https://examplePublicKey@o0.ingest.sentry.io/0"
SENTRY_AUTH_TOKEN="sntrys_..."  # For source map uploads (Settings → Auth Tokens)
SENTRY_ORG="your-org-slug"
SENTRY_PROJECT="your-project-slug"

# Optional - Enable/disable Sentry at runtime
SENTRY_ENABLED="true"

# Optional - Release versioning
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

**Vercel Integration** (recommended):
If using Vercel, connect Sentry integration in Vercel dashboard. This auto-provides:
- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `VERCEL_GIT_COMMIT_SHA` (for release tracking)

### 3.2 Config Files

#### sentry.server.config.ts

```typescript
import * as Sentry from "@sentry/nextjs";

// Sensitive patterns to redact from error messages
const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,  // Bearer tokens
  /sk_[a-zA-Z0-9]{20,}/g,               // API keys (sk_live_, sk_test_)
  /"[^"]*apiKey[^"]*":\s*"[^"]+"/g,      // JSON apiKey values
  /token[^"]*[:=]\s*[A-Za-z0-9\-._~+/]{10,}/gi,  // Tokens in logs
  /password[^"]*[:=]\s*"[^"]+"/gi,       // Passwords in logs
  /secret[^"]*[:=]\s*"[^"]+"/gi,         // Secrets in logs
];

// Sensitive query parameters to scrub
const SENSITIVE_PARAMS = ["token", "password", "secret", "apiKey", "api_key"];

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",

  // Set release from git SHA (Vercel provides this)
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || "local",

  // Smart sampling for distributed tracing
  // Development: 100% sampling for debugging
  // Production: 5% sampling to stay within free tier limits
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  // Profiling - Enable for performance analysis (10% in production)
  profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay (disabled for cost control)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,

  // Integrations (auto-instrumentation)
  integrations: [
    Sentry.httpIntegration(),
    Sentry.postgresIntegration(),
    Sentry.redisIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter sensitive data and operational errors
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["x-api-key"];
      delete event.request.headers["cookie"];
    }

    // Skip operational errors (not bugs)
    const skipCodes = [
      "RATE_LIMITED",      // Expected user behavior
      "VALIDATION_ERROR",  // Bad input
      "UNAUTHORIZED",      // Auth failure
      "FORBIDDEN",         // Permission denied
      "NOT_FOUND",         // Resource missing
    ];

    if (event.tags?.code && skipCodes.includes(event.tags.code as string)) {
      return null; // Don't send
    }

    // Only send production errors to Sentry
    if (process.env.NODE_ENV !== "production") {
      return null;
    }

    // Scrub sensitive query parameters
    if (event.request?.query_string) {
      const qs = event.request.query_string;
      if (typeof qs === "string") {
        let scrubbed = qs;
        for (const param of SENSITIVE_PARAMS) {
          const regex = new RegExp(`(?:^|&)${param}=[^&]*`, "gi");
          scrubbed = scrubbed.replace(regex, `${param}=[REDACTED]`);
        }
        event.request.query_string = scrubbed;
      }
    }

    // Sanitize error messages
    if (event.exception?.values) {
      for (const exception of event.exception.values) {
        if (exception.value) {
          for (const pattern of SENSITIVE_PATTERNS) {
            exception.value = exception.value.replace(pattern, "[REDACTED]");
          }
        }
      }
    }

    return event;
  },
});

export default Sentry;
```

#### sentry.client.config.ts

```typescript
import * as Sentry from "@sentry/nextjs";

// Operational errors to skip
const SKIP_ERROR_PATTERNS = [
  "RATE_LIMIT_EXCEEDED",
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "FORBIDDEN",
  "BAD_REQUEST",
];

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",

  // Set release from git SHA
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || "local",

  // Tracing
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  // Session replay
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,

  // Integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter operational errors
  beforeSend(event, hint) {
    const errorMessage = event.exception?.values?.[0]?.value || "";
    if (SKIP_ERROR_PATTERNS.some((pattern) => errorMessage.includes(pattern))) {
      return null;
    }

    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["x-api-key"];
      delete event.request.headers["cookie"];
    }

    return event;
  },
});

export default Sentry;
```

#### sentry.edge.config.ts

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",

  // Edge runtime has minimal tracing
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.01 : 1.0,

  // No replay on edge (cost optimization)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

export default Sentry;
```

### 3.3 Vercel Integration (Recommended)

**Setup Steps:**

1. Go to Vercel Dashboard → Your Project → Integrations
2. Add **Sentry** integration
3. Configure:
   - Auto-inject environment variables (`SENTRY_DSN`, `SENTRY_AUTH_TOKEN`)
   - Enable source map upload
   - Enable release tracking

**Benefits:**
- Automatic release tagging with Git commit SHA
- Source map upload for readable stack traces
- No manual configuration needed

---

## 4. Usage Patterns

### 4.1 Error Tracking

#### Basic Error Capture

```typescript
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const result = await someOperation();
    return NextResponse.json(result);
  } catch (error) {
    // Capture with context
    Sentry.captureException(error, {
      tags: {
        component: "abi-api",
        operation: "get-abi",
      },
      extra: {
        url: request.url,
        method: request.method,
      },
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

#### Non-Blocking Error Capture (API Handler)

```typescript
// Don't let Sentry errors block API responses
if (process.env.NODE_ENV === "production") {
  Promise.resolve().then(() =>
    Sentry.captureException(error, {
      level: "error",
      tags: {
        errorCode: apiError.code,
        statusCode: apiError.statusCode.toString(),
      },
    })
  ).catch((e) => console.debug("Failed to send to Sentry", e));
}
```

#### Error with Custom Context

```typescript
Sentry.captureException(error, {
  user: {
    id: userId,
    email: userEmail,
  },
  tags: {
    tier: apiTier,
    network: contractNetwork,
  },
  extra: {
    contractAddress: address,
    abiId: abiId,
    requestId: requestId,
  },
  level: "error",
});
```

### 4.2 Performance Monitoring

#### Transaction Tracking

```typescript
import * as Sentry from "@sentry/nextjs";

async function processAbiCreation(abiData: AbiInput) {
  return await Sentry.startSpan(
    { name: "process_abi_creation", op: "abi.create" },
    async (span) => {
      // Child span for IPFS operation
      const ipfsHash = await Sentry.startSpan(
        { name: "pin_to_ipfs", op: "ipfs.pin" },
        async () => await ipfsService.pin(abiData)
      );

      // Child span for database operation
      const abi = await Sentry.startSpan(
        { name: "save_to_db", op: "db.insert" },
        async () => await abiRepository.save(abiData)
      );

      return { ipfsHash, abi };
    }
  );
}
```

### 4.3 User Action Tracking

Create a `SentryTracker` utility class for consistent tracking:

```typescript
// src/infrastructure/monitoring/sentry-tracker.ts
import * as Sentry from "@sentry/nextjs";

export class SentryTracker {
  /**
   * Track authentication events
   */
  static trackLogin(
    userId: string,
    method: "api_key" | "session" | "admin_key"
  ): void {
    Sentry.setUser({ id: userId });
    Sentry.addBreadcrumb({
      category: "auth",
      message: `User logged in via ${method}`,
      level: "info",
      data: { userId, method },
    });
  }

  static trackLogout(userId: string): void {
    Sentry.addBreadcrumb({
      category: "auth",
      message: "User logged out",
      level: "info",
      data: { userId },
    });
    Sentry.setUser(null);
  }

  static trackLoginFailure(reason: string): void {
    Sentry.addBreadcrumb({
      category: "auth",
      message: "Login failed",
      level: "warning",
      data: { reason },
    });
  }

  /**
   * Track ABI operations
   */
  static trackAbiCreated(data: {
    contractAddress?: string;
    network?: string;
    abiId: string;
  }): void {
    Sentry.addBreadcrumb({
      category: "abi",
      message: "ABI created",
      level: "info",
      data: {
        contractAddress: data.contractAddress
          ? `${data.contractAddress.substring(0, 10)}...`
          : undefined,
        network: data.network,
        abiId: data.abiId,
      },
    });
  }

  static trackAbiViewed(abiId: string): void {
    Sentry.addBreadcrumb({
      category: "abi",
      message: "ABI viewed",
      level: "info",
      data: { abiId },
    });
  }

  /**
   * Track rate limit hits
   */
  static trackRateLimitHit(endpoint: string, tier: string): void {
    Sentry.addBreadcrumb({
      category: "ratelimit",
      message: `Rate limit hit: ${endpoint}`,
      level: "warning",
      data: { endpoint, tier },
    });
  }

  /**
   * Track cache operations
   */
  static trackCacheHit(key: string): void {
    Sentry.addBreadcrumb({
      category: "cache",
      message: "Cache hit",
      level: "info",
      data: { key: key.substring(0, 50) },
    });
  }

  static trackCacheMiss(key: string): void {
    Sentry.addBreadcrumb({
      category: "cache",
      message: "Cache miss",
      level: "info",
      data: { key: key.substring(0, 50) },
    });
  }
}
```

**Usage Examples:**

```typescript
import { SentryTracker } from "@/infrastructure/monitoring/sentry-tracker";

// Authentication
SentryTracker.trackLogin(userId, "api_key");
SentryTracker.trackLogout(userId);
SentryTracker.trackLoginFailure("invalid_key");

// ABI operations
SentryTracker.trackAbiViewed(abiId);
SentryTracker.trackAbiCreated({ abiId, network: "ethereum" });

// System operations
SentryTracker.trackRateLimitHit("/api/abis", "free");
SentryTracker.trackCacheHit("abi:0x123...");
```

### 4.4 Breadcrumbs

**Standard Breadcrumb Categories:**

| Category | Usage | Examples |
|----------|-------|----------|
| `auth` | Authentication events | login, logout, failures |
| `abi` | ABI operations | create, update, delete, view |
| `contract` | Contract operations | register, view, update |
| `admin` | Admin operations | API keys, networks |
| `http` | HTTP requests | method, path |
| `ratelimit` | Rate limit events | hits, warnings |
| `cache` | Cache operations | hits, misses |
| `error` | Error events | with context |

**Adding Breadcrumbs:**

```typescript
// Add breadcrumb before operation
Sentry.addBreadcrumb({
  category: "abi",
  message: "Starting ABI validation",
  level: "info",
});

// Add breadcrumb with data
Sentry.addBreadcrumb({
  category: "abi",
  message: "ABI validation passed",
  level: "info",
  data: {
    abiSize: abiData.length,
    functionCount: abiData.filter(f => f.type === "function").length,
  },
});
```

---

## 5. Best Practices

### 5.1 Sampling Strategies

**Production Sampling (Free Tier Optimization):**

```typescript
// 5% of all requests
// Estimate: 30K requests/day × 5% = ~1,500 traces/day
tracesSampleRate: 0.05

// 10% for profiling (CPU flame graphs)
profilesSampleRate: 0.1

// Session replay: errors only (10%)
replaysSessionSampleRate: 0
replaysOnErrorSampleRate: 0.1
```

**Free Tier Limits:**
- Errors: 5,000/month (~167/day)
- Transactions: 3,000/day
- Profiles: Varies by plan

**Adjust Based on Traffic:**

| Daily Requests | tracesSampleRate | Est. Traces/Day |
|----------------|------------------|-----------------|
| 10,000 | 10% (0.1) | 1,000 |
| 30,000 | 5% (0.05) | 1,500 |
| 100,000 | 3% (0.03) | 3,000 |
| 500,000 | 1% (0.01) | 5,000 |

### 5.2 Error Filtering

**Operational Errors to Skip:**

```typescript
const SKIP_ERROR_PATTERNS = [
  "RATE_LIMITED",      // Expected user behavior
  "VALIDATION_ERROR",  // Bad input
  "UNAUTHORIZED",      // Auth failure
  "FORBIDDEN",         // Permission denied
  "NOT_FOUND",         // Resource missing
  "BAD_REQUEST",       // Invalid input
];
```

**Why Skip These?**
- They indicate expected user behavior, not bugs
- Filling Sentry quota with operational errors masks real issues
- Better to track metrics separately (Prometheus, CloudWatch)

### 5.3 Security & Privacy

**Always Redact:**

1. **Headers:**
   - `authorization`
   - `x-api-key`
   - `cookie`
   - `set-cookie`

2. **Query Parameters:**
   - `token`
   - `password`
   - `secret`
   - `apiKey`
   - `api_key`
   - `credit_card`

3. **Error Messages:**
   - API keys (pattern: `sk_live_...`, `sk_test_...`)
   - Bearer tokens
   - JSON credentials

**Pattern:**

```typescript
// Redact in beforeSend hook
beforeSend(event) {
  // Remove headers
  delete event.request.headers["authorization"];

  // Scrub query params
  event.request.query_string = scrubSensitiveParams(event.request.query_string);

  // Sanitize messages
  event.exception.values = sanitizeMessages(event.exception.values);

  return event;
}
```

---

## 6. Testing

### Verification Checklist

```markdown
- [ ] Package installed: `pnpm list @sentry/nextjs`
- [ ] Config files created: `sentry.*.config.ts`
- [ ] Type checking passes: `pnpm typecheck`
- [ ] Linting passes: `pnpm lint`
- [ ] Environment variables set
- [ ] Test error captured in dashboard
- [ ] Release tracking works
```

### Manual Testing

**1. Create Test Endpoint:**

```typescript
// src/app/api/test-sentry/route.ts
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  Sentry.captureException(new Error("Sentry test - please ignore"));

  return NextResponse.json({
    message: "Test error sent to Sentry",
    instruction: "Check your Sentry dashboard for this error"
  });
}
```

**2. Trigger Test:**

```bash
curl http://localhost:3000/api/test-sentry
```

**3. Verify:**
- Sentry dashboard shows new issue
- Error message: "Sentry test - please ignore"
- Release tag shows current commit SHA
- Environment is "development"

**4. Clean Up:**

```bash
rm src/app/api/test-sentry/route.ts
```

---

## 7. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Errors not appearing in dashboard** | Verify `SENTRY_DSN` env var is set correctly. Check `beforeSend` isn't returning `null`. |
| **Too many errors** | Add error patterns to `SKIP_ERROR_PATTERNS` list. |
| **Free tier exceeded** | Reduce `tracesSampleRate` to 0.01 or lower. |
| **Source maps not working** | Check `.sentryclirc` config. Verify `SENTRY_AUTH_TOKEN` has `project:releases` scope. |
| **Vercel build fails** | Temporarily disable source map upload in `next.config.ts`. |
| **Local development errors not sent** | By default, only production errors are sent. Set `NODE_ENV=production` for testing. |

### Quick Disable Pattern

```typescript
// sentry.server.config.ts
const SENTRY_ENABLED = process.env.SENTRY_ENABLED === "true";

export default SENTRY_ENABLED ? Sentry.init({
  // ... config
}) : { dsn: undefined };
```

**Usage:**

```bash
# Disable Sentry at runtime
SENTRY_ENABLED=false pnpm dev
```

### Rollback Plan

If Sentry causes issues:

1. **Disable source map upload:**
   ```typescript
   // next.config.ts
   withSentryConfig(nextConfig, {
     silent: true,
     dryRun: true,  // Disable source map upload
   })
   ```

2. **Disable Sentry completely:**
   ```bash
   # Set env var
   SENTRY_ENABLED=false
   ```

3. **Remove integration:**
   ```bash
   pnpm remove @sentry/nextjs
   rm sentry.*.config.ts
   git checkout next.config.ts
   ```

---

## 8. Advanced Configuration

### Custom Integrations

**IPFS Upload Tracking:**

```typescript
import * as Sentry from "@sentry/nextjs";

async function uploadToIpfs(data: unknown) {
  return await Sentry.startSpan(
    {
      name: "ipfs_upload",
      op: "ipfs.pin",
      data: { dataSize: JSON.stringify(data).length }
    },
    async (span) => {
      const result = await pinata.pin(data);
      span?.setStatus({ status: "ok" });
      return result;
    }
  );
}
```

### Multi-Environment Setup

```typescript
// sentry.server.config.ts
const environment = process.env.NODE_ENV === "production"
  ? process.env.VERCEL_ENV || "production"
  : "development";

Sentry.init({
  environment,
  // Different sampling per environment
  tracesSampleRate: environment === "production" ? 0.05 : 1.0,
});
```

### Alert Configuration

**In Sentry Dashboard** (https://sentry.io):

1. **New Unhandled Exception Alert:**
   - Condition: `issue.type = error`
   - Filters: `error.handled = false`
   - Actions: Send to Slack, Create GitHub issue

2. **Error Rate Spike Alert:**
   - Condition: `error_rate > 5%`
   - Time window: 5 minutes
   - Actions: Send to Slack

3. **Performance Degradation Alert:**
   - Condition: `transaction.duration > 2000ms`
   - Filters: `transaction.op = http.server`
   - Actions: Send to Slack (warning)

---

## 9. References

### Internal Documentation

- [Code Standards - Sentry Integration](./code-standards.md#sentry-integration) - Usage patterns and examples
- [System Architecture - Observability](./system-architecture.md) - Monitoring architecture
- [README - Monitoring Section](../README.md#monitoring-sentry) - Project-specific setup

### Implementation Plans

- [Sentry Integration Plan](../plans/251226-sentry-integration/plan.md) - Complete 5-phase implementation
- [Phase 1: Foundation](../plans/251226-sentry-integration/phase-01-foundation.md) - Initial setup
- [Phase 2: Error Capture](../plans/251226-sentry-integration/phase-02-error-capture.md) - Enhanced error tracking
- [Phase 3: Performance](../plans/251226-sentry-integration/phase-03-performance.md) - Performance monitoring
- [Phase 4: User Tracking](../plans/251226-sentry-integration/phase-04-user-tracking.md) - User action tracking
- [Phase 5: Alerts](../plans/251226-sentry-integration/phase-05-alerts.md) - Dashboard and alerts

### External Resources

- [Sentry Next.js SDK Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Wizard](https://github.com/getsentry/sentry-wizard)
- [Vercel Sentry Integration](https://vercel.com/integrations/sentry)
- [Sentry Source Maps](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/)

---

**Last Updated:** 2025-12-27
**Sentry SDK Version:** ^10.32.1
**Next.js Version:** 15.x
