# Admin Rate Limiting Documentation

## Overview

Admin rate limiting protects the application from abuse of admin endpoints, even when admin credentials are compromised or admin users make mistakes (e.g., runaway scripts).

## Why Admin Rate Limiting?

While the application already has multiple layers of rate limiting:
1. **Global IP-based** (Better Auth): 100 req/min per IP
2. **API Key-based** (Redis): Tier-based limits for public APIs

Admin endpoints need **additional protection** because:
- Admins have elevated privileges (create/update/delete access)
- A compromised admin account could cause significant damage
- Accidental automation mistakes could overwhelm the system
- Admin actions are often more expensive (writes vs reads)

## Architecture

### Rate Limit Tiers by Action Sensitivity

Admin actions are classified into 4 sensitivity levels:

| Level | Description | Per Minute | Per Hour | Examples |
|-------|-------------|------------|----------|----------|
| **General** | Read operations, list queries | 100 | 1,000 | List ABIs, View users, Get networks |
| **Sensitive** | Create/update/delete operations | 30 | 300 | Create ABI, Update contract, Delete network |
| **Critical** | High-privilege operations | 10 | 100 | Create user, Issue API key, Bulk operations |
| **Auth** | Authentication attempts | 5 | 20 | Sign in, Password reset, 2FA attempts |

### Implementation Details

- **Storage**: Redis (Upstash) for distributed, serverless-friendly rate limiting
- **Tracking**: Per user session (userId) + action level
- **Windows**: Minute-based (rolling) and hour-based (rolling)
- **TTL**: Automatic cleanup (60s for minute keys, 3600s for hour keys)
- **Enforcement**: Dual-window (both minute AND hour must pass)

### Key Components

1. **Configuration** (`src/shared/config/app.config.ts`)
   - Centralized rate limit settings
   - Easy to adjust limits per environment

2. **Service** (`src/infrastructure/services/admin-rate-limit.service.ts`)
   - Core rate limiting logic
   - Redis integration
   - Usage statistics and reset functions

3. **Helpers** (`src/shared/lib/utils/admin-rate-limit-helper.ts`)
   - Easy-to-use wrapper functions
   - Integration with server actions and API routes

## Usage Guide

### 1. Server Actions (Admin Pages)

For server actions in `src/app/admin/*/actions.ts`:

```typescript
"use server";

import { withAdminRateLimit } from "@/shared/lib/utils/admin-rate-limit-helper";
import { AdminActionLevel } from "@/infrastructure/services/admin-rate-limit.service";

// General read operation
export async function getAbis(input: GetAbisSchema) {
  // Apply rate limiting (100/min, 1000/hr)
  await withAdminRateLimit(AdminActionLevel.GENERAL);

  // Your logic here...
}

// Sensitive write operation
export async function createAbi(input: CreateAbiDto) {
  // Apply rate limiting (30/min, 300/hr)
  await withAdminRateLimit(AdminActionLevel.SENSITIVE);

  // Your logic here...
}

// Critical operation
export async function deleteUser(userId: string) {
  // Apply rate limiting (10/min, 100/hr)
  await withAdminRateLimit(AdminActionLevel.CRITICAL);

  // Your logic here...
}
```

**Benefits**:
- Automatic session validation (throws if not authenticated)
- Automatic admin check (throws if not admin role)
- Rate limit enforcement before any logic runs
- Clean, one-line integration

### 2. API Routes (Admin API)

For API routes in `src/app/api/admin/*/route.ts`:

```typescript
import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { checkAdminRateLimit } from "@/shared/lib/utils/admin-rate-limit-helper";
import { AdminActionLevel } from "@/infrastructure/services/admin-rate-limit.service";

// General endpoint (list)
export const GET = ApiWrapper.create(
  async (input, context) => {
    // Apply rate limiting
    await checkAdminRateLimit(context.user!.id, AdminActionLevel.GENERAL);

    // Your logic here...
  },
  {
    auth: {
      required: true,
      allowSession: true,
      requiredPermissions: ["admin:read"],
    },
  }
);

// Sensitive endpoint (create)
export const POST = ApiWrapper.create(
  async (input, context) => {
    // Apply rate limiting
    await checkAdminRateLimit(context.user!.id, AdminActionLevel.SENSITIVE);

    // Your logic here...
  },
  {
    auth: {
      required: true,
      allowSession: true,
    },
  }
);

// Critical endpoint (bulk delete)
export const DELETE = ApiWrapper.create(
  async (input, context) => {
    // Apply rate limiting
    await checkAdminRateLimit(context.user!.id, AdminActionLevel.CRITICAL);

    // Your logic here...
  },
  {
    auth: {
      required: true,
      allowSession: true,
      requiredPermissions: ["admin:delete"],
    },
  }
);
```

### 3. Alternative: Decorator Pattern

For a cleaner syntax in server actions:

```typescript
import { withAdminRateLimitWrapper } from "@/shared/lib/utils/admin-rate-limit-helper";
import { AdminActionLevel } from "@/infrastructure/services/admin-rate-limit.service";

// Wrapped handler
export const createAbi = withAdminRateLimitWrapper(
  AdminActionLevel.SENSITIVE,
  async (input: CreateAbiDto) => {
    // Your logic here - rate limiting applied automatically
  }
);
```

### 4. Include Rate Limit Headers (Optional)

For API routes, you can include rate limit information in response headers:

```typescript
import { getAdminRateLimitHeaders } from "@/shared/lib/utils/admin-rate-limit-helper";

export const GET = ApiWrapper.create(
  async (input, context) => {
    await checkAdminRateLimit(context.user!.id, AdminActionLevel.GENERAL);

    const data = await fetchData();

    // Get rate limit headers
    const rateLimitHeaders = await getAdminRateLimitHeaders(
      context.user!.id,
      AdminActionLevel.GENERAL
    );

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        ...rateLimitHeaders,
      },
    });
  },
  { auth: { required: true, allowSession: true } }
);
```

Response headers will include:
```
X-RateLimit-Limit-Minute: 100
X-RateLimit-Remaining-Minute: 87
X-RateLimit-Reset-Minute: 1737456840
X-RateLimit-Limit-Hour: 1000
X-RateLimit-Remaining-Hour: 823
X-RateLimit-Reset-Hour: 1737456840
X-RateLimit-Action-Level: general
```

## Error Handling

When rate limit is exceeded, the helpers throw appropriate errors:

### Server Actions Error
```typescript
// Throws standard Error
throw new Error("Rate limit exceeded for sensitive admin actions. Try again in 45 seconds.");
```

### API Routes Error
```typescript
// Throws ApiError (429 Too Many Requests)
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded for sensitive admin actions. Try again in 45 seconds.",
    "statusCode": 429,
    "data": {
      "rateLimit": {
        "actionLevel": "sensitive",
        "minuteLimit": 30,
        "hourLimit": 300,
        "minuteRemaining": 0,
        "hourRemaining": 142,
        "minuteReset": 1737456840,
        "hourReset": 1737459600,
        "retryAfter": 45
      }
    }
  }
}
```

### Client-Side Handling

```typescript
try {
  await createAbi(abiData);
} catch (error) {
  if (error.message.includes("Rate limit exceeded")) {
    toast.error("Too many requests. Please wait a moment.");
  } else {
    toast.error("Failed to create ABI");
  }
}
```

## Admin Utilities

### Get Current Usage Stats

```typescript
import { AdminRateLimitService, AdminActionLevel } from "@/infrastructure/services/admin-rate-limit.service";

const stats = await AdminRateLimitService.getUsageStats(userId, AdminActionLevel.SENSITIVE);

if (stats.success) {
  console.log("Minute:", stats.data.minute);
  // { count: 18, limit: 30, reset: 1737456840 }

  console.log("Hour:", stats.data.hour);
  // { count: 158, limit: 300, reset: 1737459600 }
}
```

### Check if Near Limit

```typescript
const isNearLimit = await AdminRateLimitService.isNearLimit(
  userId,
  AdminActionLevel.CRITICAL,
  0.9 // 90% threshold
);

if (isNearLimit) {
  console.warn("Admin is approaching rate limit");
}
```

### Reset Rate Limits (Super Admin)

```typescript
// Reset all limits for a user
await AdminRateLimitService.resetLimits(userId);

// Reset specific action level
await AdminRateLimitService.resetLimits(userId, AdminActionLevel.CRITICAL);
```

## Configuration

All rate limits are configured in `src/shared/config/app.config.ts`:

```typescript
rateLimit: {
  admin: {
    general: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
    },
    sensitive: {
      requestsPerMinute: 30,
      requestsPerHour: 300,
    },
    critical: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
    },
    auth: {
      requestsPerMinute: 5,
      requestsPerHour: 20,
    },
  },
}
```

To adjust limits:
1. Modify values in `app.config.ts`
2. Restart application (no code changes needed)
3. Existing rate limit counters continue using old limits until their TTL expires

## Monitoring & Logging

### Automatic Logging

Rate limit checks are automatically logged:

**When limit is exceeded**:
```json
{
  "level": "warn",
  "message": "Admin rate limit exceeded (minute)",
  "userId": "user_v1_xyz",
  "actionLevel": "sensitive",
  "minuteCount": 31,
  "limit": 30,
  "retryAfter": 45
}
```

**When approaching limit (90% threshold)**:
```json
{
  "level": "warn",
  "message": "Admin approaching rate limit",
  "userId": "user_v1_xyz",
  "actionLevel": "critical",
  "minuteRemaining": 1,
  "hourRemaining": 8
}
```

### Monitoring Queries

Check Redis for current rate limits:

```bash
# Check specific user's minute limit
redis-cli GET "admin:ratelimit:minute:user_v1_xyz:sensitive:2025-01-19T14:30"

# Check hour limit
redis-cli GET "admin:ratelimit:hour:user_v1_xyz:sensitive:2025-01-19T14"
```

## Best Practices

### ✅ DO

1. **Apply appropriate sensitivity levels**:
   ```typescript
   // ✅ GOOD - Read operation uses GENERAL
   await withAdminRateLimit(AdminActionLevel.GENERAL);

   // ✅ GOOD - Delete uses CRITICAL
   await withAdminRateLimit(AdminActionLevel.CRITICAL);
   ```

2. **Place rate limit check at the start**:
   ```typescript
   export async function createAbi(input: CreateAbiDto) {
     // ✅ GOOD - Check before any expensive operations
     await withAdminRateLimit(AdminActionLevel.SENSITIVE);

     // Now proceed with validation, business logic, etc.
   }
   ```

3. **Use consistent levels across related operations**:
   ```typescript
   // All user management operations use CRITICAL
   createUser() -> CRITICAL
   deleteUser() -> CRITICAL
   updateUserRole() -> CRITICAL
   ```

4. **Include rate limit info in error messages**:
   ```typescript
   // ✅ GOOD - Provides clear guidance
   "Rate limit exceeded. Try again in 45 seconds."
   ```

### ❌ DON'T

1. **Don't skip rate limiting on admin endpoints**:
   ```typescript
   // ❌ BAD - No rate limiting
   export async function deleteAllUsers() {
     // Dangerous without rate limiting
   }

   // ✅ GOOD
   export async function deleteAllUsers() {
     await withAdminRateLimit(AdminActionLevel.CRITICAL);
     // ...
   }
   ```

2. **Don't use inappropriate sensitivity levels**:
   ```typescript
   // ❌ BAD - Delete using GENERAL (too permissive)
   await withAdminRateLimit(AdminActionLevel.GENERAL);
   await deleteUser(userId);

   // ✅ GOOD
   await withAdminRateLimit(AdminActionLevel.CRITICAL);
   await deleteUser(userId);
   ```

3. **Don't check rate limit multiple times in the same operation**:
   ```typescript
   // ❌ BAD - Double checking
   export async function createAbi(input: CreateAbiDto) {
     await withAdminRateLimit(AdminActionLevel.SENSITIVE);
     // ...
     await withAdminRateLimit(AdminActionLevel.SENSITIVE); // Unnecessary
   }
   ```

4. **Don't silently ignore rate limit errors**:
   ```typescript
   // ❌ BAD - Silent failure
   try {
     await withAdminRateLimit(AdminActionLevel.CRITICAL);
   } catch {
     // Ignoring error
   }

   // ✅ GOOD - Let it throw or handle properly
   await withAdminRateLimit(AdminActionLevel.CRITICAL);
   ```

## Testing

### Unit Tests

```typescript
import { AdminRateLimitService, AdminActionLevel } from "@/infrastructure/services/admin-rate-limit.service";

describe("AdminRateLimitService", () => {
  it("allows requests within limit", async () => {
    const result = await AdminRateLimitService.checkLimit(
      "user_test",
      AdminActionLevel.GENERAL
    );

    expect(result.success).toBe(true);
    expect(result.data.allowed).toBe(true);
  });

  it("blocks requests exceeding minute limit", async () => {
    // Make 101 requests (limit is 100/min for GENERAL)
    for (let i = 0; i < 101; i++) {
      await AdminRateLimitService.checkLimit(
        "user_test2",
        AdminActionLevel.GENERAL
      );
    }

    // 102nd request should fail
    const result = await AdminRateLimitService.checkLimit(
      "user_test2",
      AdminActionLevel.GENERAL
    );

    expect(result.success).toBe(false);
  });
});
```

### Integration Tests

```typescript
import { checkAdminRateLimit } from "@/shared/lib/utils/admin-rate-limit-helper";
import { AdminActionLevel } from "@/infrastructure/services/admin-rate-limit.service";

describe("Admin Rate Limit Integration", () => {
  it("enforces rate limit on admin API endpoint", async () => {
    // Make requests up to limit
    for (let i = 0; i < 30; i++) {
      const response = await fetch("/api/admin/abis", {
        method: "POST",
        headers: { Cookie: adminSessionCookie },
        body: JSON.stringify(testAbi),
      });
      expect(response.ok).toBe(true);
    }

    // 31st request should fail (SENSITIVE limit: 30/min)
    const response = await fetch("/api/admin/abis", {
      method: "POST",
      headers: { Cookie: adminSessionCookie },
      body: JSON.stringify(testAbi),
    });

    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });
});
```

## Security Considerations

1. **Defense in Depth**: Admin rate limiting is an additional layer, not a replacement for authentication/authorization

2. **Fail Safe, Not Fail Open**: If rate limit check fails (e.g., Redis down), admin actions are blocked rather than allowed

3. **Per-User Tracking**: Rate limits are per userId, preventing one admin from consuming all capacity

4. **Dual Windows**: Both minute and hour limits must pass, preventing sustained abuse

5. **Audit Logging**: All rate limit violations are logged for security monitoring

## Troubleshooting

### "Rate limit exceeded" for legitimate admin

**Cause**: Admin hit the configured limits
**Solution**:
1. Wait for the reset time (shown in error message)
2. If urgent, super admin can reset: `AdminRateLimitService.resetLimits(userId)`
3. If limits too low, adjust in `app.config.ts`

### Rate limit not being enforced

**Cause**: Helper function not called
**Solution**: Ensure `withAdminRateLimit()` or `checkAdminRateLimit()` is called at start of handler

### Redis connection errors

**Cause**: Upstash Redis credentials invalid or service down
**Solution**:
1. Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
2. Verify Upstash Redis instance is active
3. Check network connectivity

## Migration Guide

### Adding to Existing Admin Endpoints

1. **Identify admin endpoints**:
   - Server actions in `src/app/admin/*/actions.ts`
   - API routes in `src/app/api/admin/*/route.ts`

2. **Classify by sensitivity**:
   - Read/List → GENERAL
   - Create/Update/Delete → SENSITIVE
   - User Management/API Keys → CRITICAL

3. **Add rate limiting**:
   ```typescript
   // Before
   export async function createAbi(input: CreateAbiDto) {
     // logic
   }

   // After
   import { withAdminRateLimit } from "@/shared/lib/utils/admin-rate-limit-helper";
   import { AdminActionLevel } from "@/infrastructure/services/admin-rate-limit.service";

   export async function createAbi(input: CreateAbiDto) {
     await withAdminRateLimit(AdminActionLevel.SENSITIVE);
     // logic
   }
   ```

4. **Test thoroughly**:
   - Verify rate limits work
   - Verify error messages are clear
   - Verify legitimate usage isn't blocked

---

**Last Updated**: 2025-01-19
**Version**: 1.0.0
**Related**: SECURITY-API-KEY-HASHING.md, ERROR-BOUNDARY-GUIDE.md
