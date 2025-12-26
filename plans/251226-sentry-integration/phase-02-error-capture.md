# Phase 2: Enhanced Error Capture

**Duration**: 1 hour
**Status**: ✅ DONE (2025-12-26 23:18)
**Dependencies**: Phase 1 complete ✅

---

## Overview

Integrate Sentry with existing error handling infrastructure. Capture process-level errors (uncaught exceptions, promise rejections) and enhance API error context.

---

## Tasks

### Task 2.1: Update Process Error Handler

**File**: `src/shared/lib/errors/process-error-handler.ts`

**Current Code** (lines 261-269):
```typescript
private sendToMonitoring(
  error: Error,
  type: "uncaughtException" | "unhandledRejection"
): void {
  try {
    // Placeholder for monitoring service integration
    // In production, integrate with Sentry, DataDog, etc.

    if (process.env.SENTRY_DSN) {
      // Example Sentry integration:
      // import * as Sentry from "@sentry/node";
      // Sentry.captureException(error, {
      //   level: "fatal",
      //   tags: { type },
      // });
      logger.debug("Sentry integration not configured");
    }
```

**Replace with**:

```typescript
import * as Sentry from "@sentry/node";
import { logger } from "../utils/logger";
// ... existing imports

private sendToMonitoring(
  error: Error,
  type: "uncaughtException" | "unhandledRejection"
): void {
  try {
    // Only send to Sentry if enabled and in production
    if (
      process.env.SENTRY_DSN &&
      process.env.NODE_ENV === "production"
    ) {
      Sentry.captureException(error, {
        level: "fatal",
        tags: {
          type,
          processError: "true",
        },
        extra: {
          processUptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        },
      });

      logger.info("Fatal error sent to Sentry", { type, message: error.message });
    }

    // Always log locally
    logger.error("Process error", error, { type });
  } catch (monitoringError) {
    logger.error("Failed to send error to monitoring service", monitoringError);
  }
}
```

**Changes**:
- ✅ Import Sentry
- ✅ Check SENTRY_DSN + production mode
- ✅ Add relevant context (uptime, memory)
- ✅ Remove debug placeholder
- ✅ Keep local logging

---

### Task 2.2: Enhance API Error Handler

**File**: `src/shared/lib/api/api-handler.ts`

**Add Sentry import** (top of file):
```typescript
import * as Sentry from "@sentry/nextjs";
```

**Modify `handleError` method** (around line 454-523):

Add after `const apiError = ...;` block:

```typescript
private static handleError(
  error: unknown,
  request: NextRequest
): NextResponse {
  // Convert all errors to ApiError for consistent handling
  let apiError: ApiError;

  if (error instanceof ApiError) {
    apiError = error;

    // Send to Sentry for API errors
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(error, {
        level: "error",
        tags: {
          errorCode: apiError.code,
          statusCode: apiError.statusCode.toString(),
        },
        extra: {
          details: apiError.details,
          path: request.nextUrl.pathname,
          method: request.method,
        },
      });
    }
  } else if (error instanceof z.ZodError) {
    // ... existing Zod handling

    // Don't send validation errors to Sentry (expected)
  } else if (error instanceof Error) {
    // ... existing Error handling

    // Send unexpected errors to Sentry
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(error, {
        level: "error",
        tags: {
          errorType: "unexpected",
        },
        extra: {
          path: request.nextUrl.pathname,
          method: request.method,
        },
      });
    }
  }

  // ... rest of existing error handling
```

**Add user context** (in `handleAuth` method, after successful auth):

```typescript
// After API key authentication
if (apiKey) {
  context.apiKey = apiKey;
  authenticated = true;

  // Set Sentry user context
  Sentry.setUser({
    id: apiKey.userId,
    apiKey: apiKey.id,
    tier: apiKey.tier,
  });

  logger.debug("API key authenticated", {
    keyId: apiKey.id,
    userId: apiKey.userId,
  });
}

// After session authentication
if (sessionData) {
  context.user = sessionData.user;
  authenticated = true;

  // Set Sentry user context
  Sentry.setUser({
    id: sessionData.user.id,
    email: sessionData.user.email,
    role: sessionData.user.role,
  });

  logger.debug("Session authenticated", {
    userId: sessionData.user.id,
    role: sessionData.user.role,
  });
}
```

---

### Task 2.3: Configure Error Filtering

**File**: `sentry.server.config.ts`

**Update `beforeSend`** to include operational error filtering:

```typescript
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
    return null; // Keep in local logs only
  }

  // Add request context
  if (event.request) {
    event.contexts = {
      ...event.contexts,
      app: {
        request_id: event.request.headers?.["x-request-id"],
      },
    };
  }

  return event;
},
```

**What This Filters**:

| Error Type | Sent to Sentry | Reason |
|------------|----------------|--------|
| Validation errors | ❌ No | User input issue |
| Rate limit hits | ❌ No | Expected behavior |
| Auth failures | ❌ No | Security event, not bug |
| Not found | ❌ No | Client error |
| Unexpected errors | ✅ Yes | **Bugs to fix** |

---

## Testing

### Test 2.1: Process Error Capture

```typescript
// Test script: scripts/test-sentry-process.ts
import { initProcessErrorHandler } from "../src/shared/lib/errors/process-error-handler";

console.log("Testing process error handler...");

// This should be captured by Sentry
setTimeout(() => {
  throw new Error("Test uncaught exception for Sentry");
}, 1000);
```

Run: `pnpm tsx scripts/test-sentry-process.ts`

**Expected**: Error appears in Sentry with level "fatal"

### Test 2.2: API Error Capture

Test endpoint (temporary):

```typescript
// src/app/api/test-api-error/route.ts
import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { AppError } from "@/shared/lib/utils/error-handler";

export const GET = ApiWrapper.create(
  async () => {
    throw new AppError(
      "Test API error for Sentry",
      "INTERNAL_ERROR" as any,
      500,
      { test: true }
    );
  },
  { auth: { required: false } }
);
```

Visit: `http://localhost:3000/api/test-api-error`

**Expected**: Error in Sentry with tags, context

### Test 2.3: Validation Error Filtering

```typescript
// src/app/api/test-validation-error/route.ts
import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

export const POST = ApiWrapper.create(
  async ({ body }) => {
    return { received: body.email };
  },
  {
    auth: { required: false },
    validation: { body: schema },
  }
);
```

Test: `curl -X POST http://localhost:3000/api/test-validation-error -d '{"email":"invalid"}'`

**Expected**: ❌ Should NOT appear in Sentry (validation error filtered)

### Test 2.4: Cleanup

```bash
rm src/app/api/test-*.ts
rm scripts/test-sentry-process.ts
```

---

## Success Criteria

| Criterion | How to Verify |
|-----------|---------------|
| ✅ Process errors captured | Sentry has fatal errors |
| ✅ API errors captured | Sentry has API errors with context |
| ✅ User context attached | Sentry events have user.id |
| ✅ Operational errors filtered | Validation errors NOT in Sentry |
| ✅ Only production sent | Dev errors stay in logs only |

---

## Rollback

If errors not capturing correctly:

```bash
# Revert process-error-handler.ts
git checkout src/shared/lib/errors/process-error-handler.ts

# Revert api-handler.ts
git checkout src/shared/lib/api/api-handler.ts
```

---

## Next Phase

After Phase 2 complete, proceed to [Phase 3: Performance Monitoring](./phase-03-performance.md)

---

**Phase Owner**: Implementation Team
**Review Status**: Pending
