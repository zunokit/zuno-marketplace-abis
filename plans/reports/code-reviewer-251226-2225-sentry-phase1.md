# Code Review Report: Sentry Integration Phase 1

**Date**: 2025-12-26
**Reviewer**: Code Reviewer Agent
**Plan**: `plans/251226-sentry-integration/plan.md`
**Phase**: 1 - Foundation Setup
**Status**: ⚠️ NEEDS REVISION

---

## Scope

| Metric | Value |
|--------|-------|
| Files Reviewed | 7 |
| LOC Added | ~250 |
| Files Created | 4 |
| Files Modified | 3 |
| Test Coverage | N/A (infrastructure code) |

**Files:**
- `sentry.server.config.ts` (NEW)
- `sentry.client.config.ts` (NEW)
- `sentry.edge.config.ts` (NEW)
- `.sentryclirc` (NEW)
- `next.config.ts` (MODIFIED)
- `src/app/api/test-sentry/route.ts` (NEW)
- `package.json` (MODIFIED)

---

## Overall Assessment

**⚠️ NEEDS REVISION** - Foundation is solid but critical issues must be addressed before deployment to production.

**Summary:**
- ✅ Type safety: Passes `tsc --noEmit`
- ✅ Linting: Passes ESLint
- ✅ Architecture: Follows Clean Architecture principles
- ⚠️ **CRITICAL**: tracesSampleRate=1.0 will exceed free tier immediately
- ⚠️ **HIGH**: Incomplete sensitive data filtering
- ⚠️ **HIGH**: Missing error filtering logic
- ⚠️ **MEDIUM**: Test endpoint lacks rate limiting

---

## Critical Issues

### 1. FREE TIER EXCEEDANCE RISK (P0)
**File**: `sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts`
**Lines**: 11, 12 (server), 11 (client/edge)

```typescript
tracesSampleRate: 1.0, // Will be smart-sampled in Phase 3
```

**Impact**: With moderate traffic (~3K requests/day), this will generate ~3K traces/day, hitting the free tier limit immediately. Any excess traces are either dropped or billed.

**Fix**: Apply conservative sampling now (5%):
```typescript
tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,
```

### 2. INCOMPLETE ERROR FILTERING (P0)
**File**: `sentry.server.config.ts`, `sentry.edge.config.ts`
**Issue**: `beforeSend()` filters sensitive headers but NOT operational errors

**Impact**: Sentry will be flooded with expected errors (auth failures, validation errors), wasting quota.

**Fix**: Add error filtering (from plan):
```typescript
beforeSend(event, hint) {
  // Existing header filtering...

  // Skip operational errors
  const skipCodes = ["RATE_LIMITED", "VALIDATION_ERROR", "UNAUTHORIZED", "NOT_FOUND"];
  if (event.tags?.code && skipCodes.includes(event.tags.code as string)) {
    return null;
  }

  // Production only (optional - plan says dev monitoring disabled)
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  return event;
},
```

---

## High Priority Findings

### 3. INCOMPLETE PRIVACY FILTERING (P1)
**Files**: All `*.config.ts`

**Current**: Only removes headers (`authorization`, `x-api-key`, `cookie`)

**Missing**:
- Request body filtering (passwords, tokens)
- Query parameter filtering (`?token=xxx`, `?api_key=xxx`)
- Response body filtering
- LocalStorage data
- User data in breadcrumbs

**Recommendation**:
```typescript
beforeSend(event, hint) {
  // Remove sensitive headers
  if (event.request?.headers) {
    const sensitive = ["authorization", "x-api-key", "cookie", "x-auth-token"];
    sensitive.forEach(key => delete event.request.headers[key]);
  }

  // Scrub query params
  if (event.request?.query_string) {
    event.request.query_string = event.request.query_string
      .split('&')
      .map(param => {
        const [key] = param.split('=');
        return ['token', 'api_key', 'password', 'secret'].some(s => key.toLowerCase().includes(s))
          ? `${key}=[REDACTED]`
          : param;
      })
      .join('&');
  }

  // Scrub request body
  if (event.request?.data) {
    const scrub = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      const redacted = ['password', 'token', 'secret', 'apiKey'];
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [
          k,
          redacted.some(r => k.toLowerCase().includes(r)) ? '[REDACTED]' : scrub(v)
        ])
      );
    };
    event.request.data = scrub(event.request.data);
  }

  return event;
}
```

### 4. BEFORESENDTRANSACTION TYPE ERROR (P1)
**File**: `sentry.server.config.ts:47-56`

```typescript
beforeSendTransaction(event) {
  const request = event.contexts?.trace as any; // ❌ Type assertion
  if (request?.data?.user) {
    event.user = { id: request.data.user.id, ipAddress: request.data.user.ip };
  }
  return event;
}
```

**Issues**:
- `as any` bypasses type safety
- `trace.data.user` is not a standard Sentry property
- User context should be set via `Sentry.setUser()`, not in transaction hook

**Recommendation**: Remove this block. User context is set by `sentry-tracker.ts` in Phase 4.

### 5. TEST ENDPOINT SECURITY (P1)
**File**: `src/app/api/test-sentry/route.ts`

**Issue**: No rate limiting or authentication

**Impact**: Anyone can spam Sentry with test errors

**Fix**: Add simple protection:
```typescript
export async function GET(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  // Or require auth token
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.TEST_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  Sentry.captureException(new Error("Test Sentry integration - Phase 1 Foundation"));
  return NextResponse.json({ message: "Test error sent to Sentry" });
}
```

---

## Medium Priority Improvements

### 6. DSN ENV VAR INCONSISTENCY
**Files**: `sentry.client.config.ts:4`

```typescript
dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
```

**Issue**: Fallback to `SENTRY_DSN` won't work on client (server-only vars not exposed)

**Recommendation**: Remove fallback, use only `NEXT_PUBLIC_SENTRY_DSN`:
```typescript
dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
```

### 7. MISSING CONFIGURATION VALIDATION
**Files**: All `*.config.ts`

**Issue**: No validation that DSN is set before init

**Recommendation**:
```typescript
const dsn = process.env.SENTRY_DSN;
if (!dsn && process.env.NODE_ENV === "production") {
  console.warn("SENTRY_DSN not set - Sentry disabled");
}

Sentry.init({
  dsn,
  // If dsn is undefined, Sentry will be disabled
});
```

### 8. SENTRYCLIRC SECURITY DOCUMENTATION
**File**: `.sentryclirc:2`

```text
# Authentication token will be provided by Vercel integration
```

**Issue**: Comment implies token is provided, but Vercel integration doesn't write to `.sentryclirc`

**Recommendation**: Clarify this is for local development only:
```text
# For local development, set SENTRY_AUTH_TOKEN env var
# Vercel integration provides this via environment variables
```

### 9. MISSING TYPE DECLARATIONS
**Files**: All config files

**Issue**: No JSDoc or `@tscheck` comments

**Recommendation**: Add headers:
```typescript
/**
 * Sentry Server Configuration
 *
 * Environment Variables:
 * - SENTRY_DSN: Sentry project DSN (required in production)
 * - SENTRY_ORG: Sentry organization slug
 * - SENTRY_PROJECT: Sentry project slug
 * - NODE_ENV: Environment (development/production)
 * - VERCEL_GIT_COMMIT_SHA: Git commit SHA for release tracking
 */
```

### 10. PROFILESAMPLERATE CONFIGURATION
**File**: `sentry.server.config.ts:12`

```typescript
profilesSampleRate: 1.0, // Profiling (Phase 3)
```

**Issue**: Profiling is separate feature, consumes separate quota. May not be needed for Phase 1.

**Recommendation**: Disable until Phase 3:
```typescript
profilesSampleRate: 0, // Disabled until Phase 3
```

---

## Low Priority Suggestions

### 11. Add SENTRY_ENABLED Toggle
For quick disable without changing env vars:
```typescript
const SENTRY_ENABLED = process.env.SENTRY_ENABLED !== "false";

Sentry.init({
  dsn: SENTRY_ENABLED ? process.env.SENTRY_DSN : undefined,
});
```

### 12. Improve Debug Mode Comment
```typescript
// Debug mode (development only) - prints to console
debug: process.env.NODE_ENV === "development" && process.env.SENTRY_DEBUG === "true",
```

### 13. Consider Sentry Hub Integration
For distributed tracing with microservices:
```typescript
integrations: [
  Sentry.hubIntegration(), // For cross-service tracing
  // ...
],
```

---

## Positive Observations

✅ **Clean separation** of server, client, and edge configs
✅ **Proper header filtering** for auth tokens
✅ **Release tracking** from git SHA
✅ **Replay integration** properly configured with privacy masks
✅ **Browser extension noise** properly filtered with `ignoreErrors` and `denyUrls`
✅ **TypeScript configs** pass typecheck
✅ **ESLint** passes without issues
✅ **Vercel integration** properly configured in `next.config.ts`
✅ **Code organization** follows project structure
✅ **Clear documentation** in test endpoint

---

## Required Actions

### Before Production Deployment

| Priority | Action | File |
|----------|--------|------|
| P0 | Set `tracesSampleRate` to 0.05 | All `*.config.ts` |
| P0 | Add error filtering to `beforeSend` | `sentry.server.config.ts`, `sentry.edge.config.ts` |
| P1 | Add rate limiting to test endpoint | `src/app/api/test-sentry/route.ts` |
| P1 | Add request body/query param scrubbing | All `*.config.ts` |
| P1 | Remove `beforeSendTransaction` user code | `sentry.server.config.ts` |

### Before Merge

| Priority | Action | File |
|----------|--------|------|
| P2 | Remove `SENTRY_DSN` fallback in client config | `sentry.client.config.ts` |
| P2 | Add config validation/warnings | All `*.config.ts` |
| P2 | Add JSDoc comments | All `*.config.ts` |

---

## Unresolved Questions

1. **Q**: Does Vercel integration automatically set `SENTRY_AUTH_TOKEN` in CI?
   - **A**: Vercel integration injects `SENTRY_AUTH_TOKEN` at build time. Document this.

2. **Q**: Should `profilesSampleRate` be disabled for Phase 1?
   - **A**: Yes, profiling is Phase 3 feature. Set to 0.

3. **Q**: What sampling rate for production?
   - **A**: Plan says 5% conservative. Apply now, not in Phase 3.

4. **Q**: Delete test endpoint after verification?
   - **A**: Yes, document deletion in Phase 1 completion checklist.

---

## Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Type Safety | 100% | 100% | ✅ |
| Linting | 0 errors | 0 errors | ✅ |
| Critical Issues | 0 | 2 | ❌ |
| High Priority | ≤3 | 3 | ⚠️ |
| Medium Priority | ≤5 | 5 | ⚠️ |
| Code Duplication | DRY | Minimal | ✅ |

---

## Recommendation

**⚠️ NEEDS REVISION** - Address P0 and P1 issues before production deployment.

**Minimum for merge:**
1. Fix `tracesSampleRate` = 0.05 for production
2. Add error filtering for operational errors
3. Remove `beforeSendTransaction` user code
4. Add rate limiting to test endpoint

**Post-merge improvements:**
- Add comprehensive data scrubbing
- Add configuration validation
- Improve documentation

---

**Reviewed by**: Code Reviewer Agent (ID: a144457)
**Report generated**: 2025-12-26 22:25
**Plan updated**: YES - See `plans/251226-sentry-integration/plan.md`
