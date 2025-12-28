# Sentry Integration Brainstorming Report

**Date**: 2025-12-26
**Project**: Zuno Marketplace ABIs
**Stack**: Next.js 15, TypeScript, PostgreSQL, Redis, Better Auth
**Deployment**: Vercel
**Budget**: Sentry Free Tier

---

## Problem Statement

User wants comprehensive monitoring with Sentry:
- **Error Tracking**: Capture unhandled exceptions, rejected promises
- **Performance Monitoring**: Track slow DB queries, API response times
- **User Action Tracing**: Track login, ABI creation, contract verification
- **Distributed Tracing**: Connect traces across API, DB, Cache, IPFS
- **Auto Issue Creation**: Automatically create issues when bugs occur
- **Experience Level**: Complete beginner to Sentry
- **Deployment**: Vercel with Free Tier

---

## Current State Analysis

### Existing Error Handling Infrastructure

**Strengths:**
```typescript
src/shared/lib/utils/error-handler.ts       // Custom error classes
src/shared/lib/errors/process-error-handler.ts  // Process-level handlers
src/shared/lib/api/api-handler.ts            // API wrapper with error handling
src/shared/lib/api/error-formatter.ts        // Error formatting
src/core/services/audit-log/                 // Audit logging
```

**Current Capabilities:**
- ✅ Custom error hierarchy (AppError, ValidationError, NotFoundError, etc.)
- ✅ Process-level error handlers (uncaughtException, unhandledRejection)
- ✅ Request ID tracking for tracing
- ✅ Audit logging for all API requests
- ✅ Graceful shutdown on SIGTERM/SIGINT
- ⚠️ **Sentry placeholder exists** (process-error-handler.ts:261-269) but not implemented

**Gap:** No centralized error reporting to external monitoring service.

---

## Evaluated Approaches

### Option 1: Sentry SDK with Vercel Integration ⭐ RECOMMENDED

**Description:** Use `@sentry/nextjs` with Vercel's built-in Sentry integration

**How it works:**
1. Run Sentry wizard: `npx @sentry/wizard@latest -i nextjs`
2. Connect Vercel project to Sentry (one-click integration)
3. Auto-configures source maps, environment variables, releases

**Pros:**
- ✅ **Fastest setup** - wizard handles everything
- ✅ **Vercel native** - zero-config deployment integration
- ✅ **Auto source maps** - stack traces point to actual code
- ✅ **Release tracking** - know which version introduced bugs
- ✅ **Vercel environment injection** - auto `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`
- ✅ **Works with Turbopack** (Next.js 15)
- ✅ **App Router support** (server components, server actions)

**Cons:**
- ⚠️ Free tier limits (5K errors/month, 3K transactions/day for tracing)
- ⚠️ Requires Sentry account signup
- ⚠️ Source map uploads to Sentry (privacy consideration)

**Free Tier Limitations:**
| Feature | Free Tier Limit | Impact |
|---------|-----------------|--------|
| Errors | 5,000/month | ~166/day - OK for small apps |
| Transactions | 3,000/day | ~125/hour - may exceed with traffic |
| Users | None tracked | No user-specific insights |
| Team members | 3 | Small team only |

---

### Option 2: OpenTelemetry + Sentry

**Description:** Use OpenTelemetry SDKs, export traces to Sentry

**Pros:**
- ✅ Vendor-agnostic (switch to Datadog/New Relic later)
- ✅ More control over instrumentation
- ✅ Standard observability format

**Cons:**
- ❌ **Complex setup** - multiple SDKs to configure
- ❌ **Overkill for this project** - YAGNI principle violated
- ❌ **More maintenance burden**
- ❌ **Beginner-unfriendly**

**Verdict:** **NOT RECOMMENDED** - violates KISS principle for beginner

---

### Option 3: Self-hosted Sentry

**Description:** Run Sentry on your own infrastructure

**Pros:**
- ✅ No usage limits
- ✅ Data stays on your servers
- ✅ Free (just hosting costs)

**Cons:**
- ❌ **Heavy infrastructure** - requires Redis, PostgreSQL, ClickHouse
- ❌ **High maintenance** - upgrades, backups, scaling
- ❌ **Not beginner-friendly**
- ❌ **Defeats Vercel simplicity**

**Verdict:** **NOT RECOMMENDED** - violates YAGNI principle

---

## Final Recommendation: Option 1 (Sentry SDK + Vercel)

### Why This is the Best Choice

1. **Aligns with beginner experience** - wizard guides you through
2. **Leverages Vercel integration** - deployment is already handled
3. **Fits free tier with smart sampling** - can work within limits
4. **Minimal code changes** - SDK auto-instruments most things
5. **Proven production setup** - used by thousands of Next.js apps

---

## Recommended Implementation Plan

### Phase 1: Core Setup (30 minutes)

1. **Run Sentry Wizard**
   ```bash
   pnpm add @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

2. **Wizard will:**
   - Create `sentry.server.config.ts`
   - Create `sentry.client.config.ts`
   - Create `sentry.edge.config.ts`
   - Update `next.config.js`
   - Add `.sentryclirc`
   - Ask for SENTRY_DSN

3. **Connect Vercel Integration**
   - Go to [Sentry → Integrations → Vercel](https://docs.sentry.io/organization/integrations/deployment/vercel/)
   - Click "Add Integration"
   - Select your Vercel project
   - Auto-injects environment variables

### Phase 2: Configuration (1 hour)

**Server Config** (`sentry.server.config.ts`):
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0, // 10% in prod for free tier
  profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Integrations
  integrations: [
    Sentry.httpIntegration({
      tracing: true, // trace HTTP requests
    }),
    Sentry.postgresIntegration(), // trace PostgreSQL queries
    Sentry.redisIntegration(), // trace Redis operations
  ],

  // Filter sensitive data
  beforeSend(event, hint) {
    // Don't send operational errors (rate limits, validation)
    if (event.tags?.code === "RATE_LIMITED" || event.tags?.code === "VALIDATION_ERROR") {
      return null;
    }
    return event;
  },

  // Attach request context
  beforeSendTransaction(event) {
    event.user = {
      id: event.user?.id,
      ipAddress: event.request?.headers?.["x-forwarded-for"]?.toString(),
    };
    return event;
  },
});
```

**Update Process Handler** (`process-error-handler.ts`):
```typescript
// Replace placeholder at line 261
import * as Sentry from "@sentry/node";

// In sendToMonitoring() method:
private sendToMonitoring(error: Error, type: string): void {
  Sentry.captureException(error, {
    level: "fatal",
    tags: { type },
  });
}
```

### Phase 3: Custom Instrumentation (2 hours)

**Track User Actions:**
```typescript
// src/infrastructure/monitoring/sentry-tracker.ts
import * as Sentry from "@sentry/nextjs";

export class SentryTracker {
  static trackUserAction(action: string, properties?: Record<string, any>) {
    Sentry.addBreadcrumb({
      category: "user",
      message: action,
      level: "info",
      data: properties,
    });
  }

  static trackAbiCreation(contractAddress: string, network: string) {
    this.trackUserAction("abi_created", { contractAddress, network });
  }

  static trackContractVerification(address: string) {
    this.trackUserAction("contract_verified", { address });
  }

  static trackLogin(userId: string, method: "api_key" | "session") {
    Sentry.setUser({ id: userId });
    this.trackUserAction("login", { method });
  }
}
```

**Track Performance:**
```typescript
// Trace slow database queries
import { span } from "@sentry/core";

export async function tracedRepositoryCall<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return await span({ name: `db.${operation}`, op: "db" }, async () => {
    return await fn();
  });
}
```

### Phase 4: Issue Alerts (30 minutes)

**In Sentry Dashboard:**
1. Create alert rules for:
   - Unhandled exceptions (fatal)
   - Error rate spike (>5%)
   - P95 latency >2s
2. Configure Slack/Discord/email notifications
3. Set up issue assignment rules

---

## Free Tier Survival Guide

### Sampling Strategy for Free Tier

**Problem:** Free tier limits 3,000 transactions/day (~125/hour)

**Solution:** Smart sampling

```typescript
tracesSampleRate: ({ transactionContext }) => {
  // Sample 100% of errors
  if (transactionContext?.op?.startsWith("http.server")) {
    const statusCode = transactionContext.data?.["http.response.status_code"];
    if (statusCode >= 400) return 1.0; // 100% of error requests
  }

  // Sample 5% of successful health checks
  if (transactionContext?.name?.includes("/api/health")) {
    return 0.05;
  }

  // Sample 20% of other successful requests
  return 0.2;
},
```

**Estimated Daily Usage:**
| Request Type | Daily Requests | Sample Rate | Traces Sent |
|--------------|----------------|-------------|-------------|
| Health checks | 2,880 | 5% | 144 |
| API calls | 5,000 | 20% | 1,000 |
| Error requests | 100 | 100% | 100 |
| **Total** | **7,980** | **-** | **1,244** ✅ |

**Result:** Well within 3,000/day limit!

### Error Filtering

Don't waste quota on operational errors:

```typescript
beforeSend(event, hint) {
  // Skip expected operational errors
  const skipCodes = ["RATE_LIMITED", "VALIDATION_ERROR", "UNAUTHORIZED", "NOT_FOUND"];

  if (event.tags?.code && skipCodes.includes(event.tags.code as string)) {
    return null;
  }

  // Only send in production
  if (process.env.NODE_ENV !== "production") {
    return null; // Or keep for debugging
  }

  return event;
},
```

---

## Architecture: How Sentry Fits In

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Deployment                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌─────────────────┐         ┌─────────────────┐           │
│   │  Next.js App    │         │  Sentry SDK     │           │
│   │                 │────────▶│  (Auto-instrument)│          │
│   │  • App Router   │         │                 │           │
│   │  • API Routes   │         │  • Errors       │           │
│   │  • Server Actions│        │  • Traces       │           │
│   └─────────────────┘         │  • Performance  │           │
│            │                  └────────┬────────┘           │
│            │                           │                     │
│            ▼                           ▼                     │
│   ┌─────────────────┐         ┌─────────────────┐           │
│   │  Existing       │         │  Sentry Cloud   │           │
│   │  Error Handler  │────────▶│                 │           │
│   │  • AppError     │         │  • Dashboard    │           │
│   │  • Process      │         │  • Issues       │           │
│   │  • API Wrapper  │         │  • Alerts       │           │
│   └─────────────────┘         └─────────────────┘           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Free tier exceeded | Missing error data | Smart sampling, error filtering |
| Source map privacy | Code exposed | Self-host source maps or disable |
| Performance overhead | Slower app | Sample traces in production (10-20%) |
| False positives | Noise in alerts | Filter operational errors |
| Vercel integration breaks | No deployment | Have manual config fallback |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Error visibility | 100% of unhandled errors captured | Sentry error count vs logs |
| Performance insights | P95 latency tracked | Transaction dashboard |
| Issue response time | <1 hour to first alert | Alert notification timestamp |
| Free tier compliance | <3K traces/day | Sentry usage dashboard |
| Debug efficiency | 50% faster MTTD (mean time to detect) | Compare before/after |

---

## Next Steps

1. **Create Sentry Account** - [sentry.io/signup](https://sentry.io/signup/) (Free tier)
2. **Run Wizard** - `npx @sentry/wizard@latest -i nextjs`
3. **Connect Vercel** - One-click integration in Sentry settings
4. **Test Locally** - Throw error, verify capture
5. **Deploy to Preview** - Verify with production-like traffic
6. **Monitor Usage** - Check dashboards, adjust sampling if needed
7. **Set Up Alerts** - Configure notifications for critical issues

---

## Unresolved Questions

1. **Source Maps:** Upload to Sentry or self-host? (Privacy vs debugging convenience)
2. **User Data:** Should we track user IDs in Sentry? (GDPR considerations)
3. **Sampling Strategy:** Start with 10% or 20% sampling for traces?
4. **Alert Channel:** Slack, Discord, or email for team notifications?
5. **Environment:** Separate Sentry projects for dev/staging/prod?

---

## Sources

- [Sentry Next.js Manual Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/)
- [Sentry Vercel Integration](https://docs.sentry.io/organization/integrations/deployment/vercel/)
- [Sentry Distributed Tracing for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/tracing/distributed-tracing/)
- [Using Distributed Tracing to Debug Timeout Errors in Next.js (Sentry Blog, July 2025)](https://sentry-blog.sentry.dev/distributed-tracing-debug-timeout-errors-next-js/)
- [Monitoring, Profiling, and Diagnosing Performance in Next.js 15 - 2025 Edition](https://medium.com/@sureshdotariya/monitoring-profiling-and-diagnosing-performance-in-next-js-15-web-apps-2025-edition-bed33a88a719)

---

**Report prepared by:** Claude (Solution Brainstormer)
**Status:** Ready for implementation planning
**Next Action:** Ask user if they want detailed implementation plan via `/plan` command
