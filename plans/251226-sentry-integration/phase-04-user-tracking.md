# Phase 4: User Action Tracking

**Duration**: 1.5 hours
**Status**: Pending
**Dependencies**: Phase 3 complete

---

## Overview

Track meaningful user actions (login, ABI creation, contract verification) as breadcrumbs in Sentry. This provides context when errors occur, helping understand what the user was doing.

---

## Tasks

### Task 4.1: Create Sentry Tracker

**File**: `src/infrastructure/monitoring/sentry-tracker.ts` (NEW)

```typescript
import * as Sentry from "@sentry/nextjs";

/**
 * Sentry User Action Tracker
 *
 * Records user actions as breadcrumbs for error context.
 * Breadcrumbs appear in Sentry event details under "Breadcrumbs" tab.
 *
 * Example breadcrumb trail:
 * 1. user.login (api_key)
 * 2. user.action (abi.list viewed)
 * 3. user.action (abi.create clicked)
 * 4. user.action (abi.form submitted)
 * [ERROR occurs here]
 */
export class SentryTracker {
  /**
   * Add generic breadcrumb
   */
  static addBreadcrumb(
    category: string,
    message: string,
    level: "info" | "warning" = "info",
    data?: Record<string, unknown>
  ): void {
    Sentry.addBreadcrumb({
      category,
      message,
      level,
      data,
    });
  }

  /**
   * Track authentication events
   */
  static trackLogin(
    userId: string,
    method: "api_key" | "session" | "admin_key"
  ): void {
    Sentry.setUser({ id: userId });

    this.addBreadcrumb("auth", `User logged in via ${method}`, "info", {
      userId,
      method,
    });
  }

  static trackLogout(userId: string): void {
    this.addBreadcrumb("auth", "User logged out", "info", { userId });
    Sentry.setUser(null); // Clear user context
  }

  static trackLoginFailure(reason: string): void {
    this.addBreadcrumb("auth", "Login failed", "warning", { reason });
  }

  /**
   * Track ABI operations
   */
  static trackAbiListed(filters?: Record<string, unknown>): void {
    this.addBreadcrumb("abi", "ABI list viewed", "info", { filters });
  }

  static trackAbiViewed(abiId: string): void {
    this.addBreadcrumb("abi", "ABI details viewed", "info", { abiId });
  }

  static trackAbiCreated(data: {
    contractAddress: string;
    network: string;
    abiId: string;
  }): void {
    this.addBreadcrumb("abi", "ABI created", "info", {
      contractAddress: data.contractAddress,
      network: data.network,
      abiId: data.abiId,
    });
  }

  static trackAbiUpdated(abiId: string, changes: string): void {
    this.addBreadcrumb("abi", "ABI updated", "info", { abiId, changes });
  }

  static trackAbiDeleted(abiId: string): void {
    this.addBreadcrumb("abi", "ABI deleted", "warning", { abiId });
  }

  /**
   * Track contract operations
   */
  static trackContractViewed(address: string, network: string): void {
    this.addBreadcrumb("contract", "Contract viewed", "info", {
      address: address.substring(0, 10) + "...",
      network,
    });
  }

  static trackContractVerified(address: string): void {
    this.addBreadcrumb("contract", "Contract verified", "info", {
      address: address.substring(0, 10) + "...",
    });
  }

  static trackVersionsViewed(address: string): void {
    this.addBreadcrumb("contract", "Contract versions viewed", "info", {
      address: address.substring(0, 10) + "...",
    });
  }

  /**
   * Track admin operations
   */
  static trackApiKeysListed(): void {
    this.addBreadcrumb("admin", "API keys list viewed", "info");
  }

  static trackApiKeyCreated(tier: string): void {
    this.addBreadcrumb("admin", "API key created", "info", { tier });
  }

  static trackApiKeyDeleted(keyId: string): void {
    this.addBreadcrumb("admin", "API key deleted", "warning", { keyId });
  }

  static trackNetworksModified(action: "created" | "updated" | "deleted", networkId: string): void {
    this.addBreadcrumb("admin", `Network ${action}`, "info", { networkId });
  }

  /**
   * Track errors with context
   */
  static trackError(category: string, message: string, error?: Error): void {
    this.addBreadcrumb("error", message, "error", {
      category,
      errorMessage: error?.message,
    });
  }

  /**
   * Track rate limit hits (informational, not errors)
   */
  static trackRateLimitHit(endpoint: string, tier: string): void {
    this.addBreadcrumb("ratelimit", `Rate limit hit: ${endpoint}`, "warning", {
      endpoint,
      tier,
    });
  }

  /**
   * Track cache operations
   */
  static trackCacheHit(key: string): void {
    this.addBreadcrumb("cache", "Cache hit", "info", {
      key: key.substring(0, 50),
    });
  }

  static trackCacheMiss(key: string): void {
    this.addBreadcrumb("cache", "Cache miss", "info", {
      key: key.substring(0, 50),
    });
  }
}

/**
 * Initialize Sentry tracker with request context
 *
 * Call this at the start of each API request
 */
export function initRequestContext(requestId: string, path: string): void {
  Sentry.setContext("request", {
    requestId,
    path,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Clear request context
 *
 * Call this at the end of each API request
 */
export function clearRequestContext(): void {
  Sentry.setContext("request", null);
}
```

---

### Task 4.2: Integrate with Authentication

**File**: `src/infrastructure/auth/auth-helpers.ts`

**Add tracking to `verifyApiKey`**:

```typescript
import { SentryTracker } from "../monitoring/sentry-tracker";

export async function verifyApiKey(apiKeyValue: string) {
  // ... existing validation logic

  if (apiKey) {
    // Track successful login
    SentryTracker.trackLogin(apiKey.userId, "api_key");

    return apiKey;
  }

  // Track failed login
  SentryTracker.trackLoginFailure("invalid_api_key");

  return null;
}
```

**Add tracking to session verification**:

```typescript
// In verifySessionFromHeaders
export async function verifySessionFromHeaders(headers: Headers) {
  try {
    const session = await betterAuthServer.api.getSession({
      headers,
    });

    if (session?.user) {
      SentryTracker.trackLogin(session.user.id, "session");
      return { user: session.user, session: session.session };
    }

    SentryTracker.trackLoginFailure("invalid_session");
    return null;
  } catch (error) {
    SentryTracker.trackLoginFailure("session_error");
    return null;
  }
}
```

---

### Task 4.3: Integrate with Use Cases

**File**: `src/core/use-cases/abi/create-abi.use-case.ts`

```typescript
import { SentryTracker } from "@/infrastructure/monitoring/sentry-tracker";

export class CreateAbiUseCase {
  async execute(input: CreateAbiInput): Promise<CreateAbiOutput> {
    try {
      // Track ABI creation start
      SentryTracker.addBreadcrumb("abi", "ABI creation started", "info", {
        contractAddress: input.contractAddress,
        network: input.network,
      });

      // ... existing logic (validation, IPFS, database)

      // Track successful creation
      SentryTracker.trackAbiCreated({
        contractAddress: input.contractAddress,
        network: input.network,
        abiId: abi.id,
      });

      return result;
    } catch (error) {
      SentryTracker.trackError("abi_creation", "Failed to create ABI", error as Error);
      throw error;
    }
  }
}
```

**Similar integration for**:
- `UpdateAbiUseCase`
- `DeleteAbiUseCase`
- `VerifyContractUseCase`
- `CreateApiKeyUseCase`

---

### Task 4.4: Add to API Middleware

**File**: `src/shared/lib/api/api-handler.ts`

**Add request context in `ApiWrapper.create`**:

```typescript
import { initRequestContext, clearRequestContext } from "@/infrastructure/monitoring/sentry-tracker";

export class ApiWrapper {
  static create<TInput = unknown, TOutput = unknown>(
    handler: ApiHandler<TInput, TOutput>,
    config: ApiRouteConfig = {}
  ) {
    return async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
      const requestId = extractRequestId(request);
      const path = request.nextUrl.pathname;

      try {
        // Initialize Sentry context
        initRequestContext(requestId, path);

        // Track API request start
        SentryTracker.addBreadcrumb("http", `${request.method} ${path}`, "info", {
          requestId,
        });

        // ... existing parsing, auth, handler logic

        return response;
      } catch (error) {
        // ... existing error handling

        return this.handleError(error, request);
      } finally {
        // Clear context after request
        clearRequestContext();
      }
    };
  }
}
```

---

## Breadcrumb Strategy

### What to Track

| Category | Actions | Level |
|----------|---------|-------|
| `auth` | login, logout, failed attempts | info/warning |
| `abi` | create, update, delete, view | info |
| `contract` | view, verify, list versions | info |
| `admin` | API keys, networks management | info |
| `http` | API requests | info |
| `cache` | hit, miss | info |
| `ratelimit` | limit exceeded | warning |
| `error` | operation failures | error |

### What NOT to Track

- ❌ Every database query (use spans instead)
- ❌ Health check requests
- ❌ Static asset requests
- ❌ Highly repetitive operations (>100/minute)

---

## Testing

### Test 4.1: Breadcrumb Capture

1. Perform login action
2. Create an ABI
3. View contract details
4. Trigger an error (intentional)

**In Sentry**, check error event → Breadcrumbs tab:

**Expected**:
```
[5 min ago] auth User logged in via api_key
[3 min ago] http POST /api/abis
[3 min ago] abi ABI creation started
[3 min ago] abi ABI created
[1 min ago] contract Contract viewed
[now] error [error message]
```

### Test 4.2: User Context

After login, trigger error:

**In Sentry**, check event → User section:

**Expected**:
```json
{
  "id": "user_v1_abc123",
  "apiKey": "key_v1_xyz456",
  "tier": "pro"
}
```

---

## Success Criteria

| Criterion | How to Verify |
|-----------|---------------|
| ✅ Login events tracked | Sentry shows auth breadcrumbs |
| ✅ ABI operations tracked | Sentry shows abi breadcrumbs |
| ✅ Contract operations tracked | Sentry shows contract breadcrumbs |
| ✅ Context on errors | Error events have breadcrumb trail |
| ✅ User ID attached | Events show user.id |

---

## Privacy Considerations

### Sensitive Data Filtering

The tracker already:
- ✅ Truncates long keys
- ✅ Masks contract addresses
- ❌ Does NOT track passwords
- ❌ Does NOT track full API keys

### Additional Filtering (if needed):

```typescript
// In sentry.server.config.ts
beforeSend(event, hint) {
  // Remove sensitive user data
  if (event.user?.email) {
    event.user.email = event.user.email.substring(0, 3) + "...";
  }

  return event;
}
```

---

## Next Phase

After Phase 4 complete, proceed to [Phase 5: Dashboard & Alerts](./phase-05-alerts.md)

---

**Phase Owner**: Implementation Team
**Review Status**: Pending
