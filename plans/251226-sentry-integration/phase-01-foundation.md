# Phase 1: Foundation Setup

**Duration**: 1 hour
**Status**: Pending
**Dependencies**: None

---

## Overview

Install Sentry SDK, run the setup wizard, and configure Vercel integration. This phase creates the foundational configuration files and connects your project to Sentry cloud.

---

## Tasks

### Task 1.1: Install Sentry Package

**File**: `package.json`

**Action**:
```bash
pnpm add @sentry/nextjs
```

**Expected Result**:
- `@sentry/nextjs` added to dependencies
- Package installed in `node_modules`

**Verification**:
```bash
pnpm list @sentry/nextjs
```

---

### Task 1.2: Run Sentry Wizard

**Action**:
```bash
npx @sentry/wizard@latest -i nextjs
```

**Wizard Prompts** (make selections):

| Prompt | Selection | Rationale |
|--------|-----------|-----------|
| Sentry platform? | Next.js | Only option |
| Create Sentry project? | Yes | Auto-creates project |
| Project name? | `zuno-marketplace-abis` | Matches repo |
| Authentication method? | URL (auto) | Vercel integration will handle |

**Files Created**:

| File | Purpose |
|------|---------|
| `sentry.server.config.ts` | Server-side config |
| `sentry.client.config.ts` | Client-side config |
| `sentry.edge.config.ts` | Edge runtime config |
| `.sentryclirc` | CLI configuration |
| `next.config.js` (modified) | Sentry plugin added |

**Expected Result**:
```
✓ Sentry configuration files created
✓ next.config.js updated
✓ .sentryclirc created
```

---

### Task 1.3: Connect Vercel Integration

**Location**: Sentry Dashboard

**Steps**:

1. Go to [Sentry → Settings → Integrations](https://sentry.io/settings/integrations/)
2. Find "Vercel" and click "Add Integration"
3. Select your Vercel account/organization
4. Select project: `zuno-marketplace-abis`
5. Review permissions and click "Install"

**Environment Variables Added**:

| Variable | Purpose | Set By |
|----------|---------|--------|
| `SENTRY_DSN` | Project identifier | Vercel |
| `SENTRY_AUTH_TOKEN` | Upload authentication | Vercel |
| `SENTRY_ORG` | Organization slug | Vercel |
| `SENTRY_PROJECT` | Project slug | Vercel |

**Verification**:
```bash
# In local .env
echo $SENTRY_DSN  # Should show DSN URL
```

---

### Task 1.4: Configure Server Settings

**File**: `sentry.server.config.ts`

**Replace wizard-generated config with**:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",

  // Set release from git SHA (Vercel provides this)
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || "local",

  // Tracing
  tracesSampleRate: 1.0, // Will be smart-sampled in Phase 3
  profilesSampleRate: 1.0, // Profiling (Phase 3)

  // Session replay (optional, Phase 2)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Integrations (auto-instrumentation)
  integrations: [
    Sentry.httpIntegration({ tracing: true }),
    Sentry.postgresIntegration(),
    Sentry.redisIntegration(),
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["x-api-key"];
      delete event.request.headers["cookie"];
    }

    // Remove sensitive query params
    if (event.request?.query_string) {
      // Could add more filtering here
    }

    return event;
  },

  // Attach user context
  beforeSendTransaction(event) {
    const request = event.contexts?.trace as any;
    if (request?.data?.user) {
      event.user = {
        id: request.data.user.id,
        ipAddress: request.data.user.ip,
      };
    }
    return event;
  },

  // Debug mode (development only)
  debug: process.env.NODE_ENV === "development",

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    // Random plugins/extensions
    /.*\b(cordova|sencha)\b.*/,
  ],

  // Denoising (group similar errors)
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
  ],
});

export default Sentry;
```

**Key Configuration Points**:

| Setting | Value | Why |
|---------|-------|-----|
| `environment` | `NODE_ENV` | Separate dev/prod data |
| `release` | Git SHA | Track which version has errors |
| `tracesSampleRate` | 1.0 | Will smart-sample in Phase 3 |
| `beforeSend` | Filter headers | Privacy/security |

**Verification**:
```bash
pnpm typecheck  # Should pass
pnpm lint       # Should pass
```

---

## Testing

### Test 1.1: Verify Installation

```bash
# Start dev server
pnpm dev

# Check for Sentry initialization in logs
# Should see: "Sentry initialized"
```

### Test 1.2: Test Error Capture

Create temporary test endpoint:

```typescript
// src/app/api/test-sentry/route.ts
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  Sentry.captureException(new Error("Test Sentry integration"));

  return NextResponse.json({ message: "Error sent to Sentry" });
}
```

Visit: `http://localhost:3000/api/test-sentry`

**Expected**:
- Response: `{ message: "Error sent to Sentry" }`
- Error appears in Sentry dashboard within 30 seconds

**Verification in Sentry**:
1. Go to sentry.io → Projects → zuno-marketplace-abis
2. Should see new issue: "Test Sentry integration"
3. Check event has correct release, environment, tags

### Test 1.3: Cleanup

```bash
# Delete test endpoint
rm src/app/api/test-sentry/route.ts
```

---

## Rollback Procedure

If wizard fails or issues arise:

```bash
# 1. Remove Sentry files
rm sentry.*.config.ts
rm .sentryclirc

# 2. Revert next.config.js
git checkout next.config.js

# 3. Remove dependency
pnpm remove @sentry/nextjs

# 4. Disconnect Vercel integration
# Go to Sentry → Settings → Integrations → Vercel → Remove
```

---

## Success Criteria

| Criterion | How to Verify |
|-----------|---------------|
| ✅ Package installed | `pnpm list @sentry/nextjs` shows version |
| ✅ Config files created | Files exist in project root |
| ✅ Vercel connected | Environment variables set |
| ✅ Server config valid | `pnpm typecheck` passes |
| ✅ Test error captured | Appears in Sentry dashboard |

---

## Known Issues

| Issue | Solution |
|-------|----------|
| Wizard asks for auth token | Cancel, use Vercel integration instead |
| Config has TypeScript errors | Run `pnpm install` to update types |
| Test error not appearing | Check `SENTRY_DSN` environment variable |

---

## Next Phase

After Phase 1 complete, proceed to [Phase 2: Enhanced Error Capture](./phase-02-error-capture.md)

---

**Phase Owner**: Implementation Team
**Review Status**: Pending
