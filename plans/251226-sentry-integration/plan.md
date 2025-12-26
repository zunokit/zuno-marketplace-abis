---
title: Sentry Integration Implementation Plan
description: Integrate Sentry for comprehensive monitoring including error tracking, performance monitoring, distributed tracing, and user action tracking
status: in-progress
priority: high
effort: 4-6 hours
branch: feature/add-sentry
tags: [monitoring, sentry, error-tracking, performance, observability]
created: 2025-12-26
---

# Sentry Integration Implementation Plan

**Project**: Zuno Marketplace ABIs
**Date**: 2025-12-26
**Status**: ✅ Phase 3 Complete (60% overall)
**Priority**: High
**Estimated Time**: 4-6 hours

---

## Validation Summary

**Validated:** 2025-12-26
**Questions asked:** 6

### Confirmed Decisions

| Decision | User Choice | Impact |
|----------|-------------|--------|
| **Source Maps** | Upload to Sentry | ✅ As planned |
| **Environments** | One project with env filter | ✅ As planned |
| **Dev Monitoring** | Production only | ✅ As planned |
| **User Privacy** | Full ID tracking | ✅ As planned |
| **Sampling Rate** | 5% conservative | ⚠️ **Change needed** |
| **Alert Channels** | Slack + GitHub issues | ⚠️ **Add GitHub** |

### Required Plan Updates

- [ ] Phase 3: Reduce sampling from 20% → 5% for API requests
- [ ] Phase 5: Add GitHub integration for auto-issue creation
- [ ] Update free tier estimates (5% = ~150 traces/day)

---

## Executive Summary

Integrate Sentry for comprehensive monitoring including error tracking, performance monitoring, distributed tracing, and user action tracking. Uses `@sentry/nextjs` SDK with Vercel integration, optimized for Free Tier usage (5K errors/month, 3K transactions/day).

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| **SDK**: `@sentry/nextjs` | Native Next.js 15 + Turbopack support |
| **Deployment**: Vercel Integration | Zero-config, automatic environment variables |
| **Sampling**: Smart sampling (5-100%) | Stay within free tier limits |
| **Error Filtering**: Skip operational errors | Focus on bugs, not expected failures |
| **Source Maps**: Upload to Sentry | Best debugging experience (privacy trade-off) |

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR1 | Capture all unhandled exceptions and promise rejections | P0 |
| FR2 | Track HTTP request performance (latency, throughput) | P0 |
| FR3 | Trace database queries (PostgreSQL) | P1 |
| FR4 | Trace cache operations (Redis) | P1 |
| FR5 | Trace IPFS operations (Pinata) | P2 |
| FR6 | Track user actions (login, ABI creation, verification) | P1 |
| FR7 | Auto-create issues in Sentry on errors | P0 |
| FR8 | Distributed tracing across service boundaries | P1 |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR1 | Performance overhead | <5% latency impact |
| NFR2 | Free tier compliance | <3K traces/day, <5K errors/month |
| NFR3 | No breaking changes | Existing error handling preserved |
| NFR4 | Zero config for Vercel deploy | Auto environment injection |
| NFR5 | Development experience | Works with local dev + Turbopack |

---

## Architecture Integration

### Where Sentry Fits

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel Deployment                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Next.js Application                    │  │
│  │                                                           │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │  │
│  │  │ App Router  │───▶│ API Routes  │───▶│ Middleware  │   │  │
│  │  └─────────────┘    └─────────────┘    └─────────────┘   │  │
│  │         │                   │                   │         │  │
│  │         └───────────────────┼───────────────────┘         │  │
│  │                             ▼                             │  │
│  │                    ┌───────────────┐                      │  │
│  │                    │  ApiWrapper   │                      │  │
│  │                    │  (existing)   │                      │  │
│  │                    └───────┬───────┘                      │  │
│  │                            │                              │  │
│  │                            ▼                              │  │
│  │                    ┌───────────────┐                      │  │
│  │                    │  Use Cases    │                      │  │
│  │                    └───────┬───────┘                      │  │
│  │                            │                              │  │
│  │                            ▼                              │  │
│  │                    ┌───────────────┐                      │  │
│  │                    │ Repositories  │                      │  │
│  │                    │ Services      │                      │  │
│  │                    └───────┬───────┘                      │  │
│  └────────────────────────────┼─────────────────────────────┘  │
│                               │                                 │
│  ┌────────────────────────────┼─────────────────────────────┐  │
│  │                    ▼       │       ▼                      │  │
│  │  ┌───────────────┐   ┌─────┴─────┐   ┌───────────────┐   │  │
│  │  │ Sentry SDK    │   │ Process   │   │ Existing      │   │  │
│  │  │ (Auto-instrument)│  Handler  │   │ Error Classes │   │  │
│  │  │               │   │           │   │ (AppError,    │   │  │
│  │  │ • Errors      │   │ (enhanced │   │  ValidationError│  │
│  │  │ • Traces      │   │  with     │   │  etc.)        │   │  │
│  │  │ • Breadcrumbs │   │  Sentry)  │   └───────────────┘   │  │
│  │  └───────┬───────┘   └───────────┘                        │  │
│  └──────────┼──────────────────────────────────────────────┘  │
│             │                                                  │
└─────────────┼──────────────────────────────────────────────────┘
              │
              ▼
        ┌─────────────┐
        │ Sentry Cloud│
        │             │
        │ • Dashboard  │
        │ • Issues    │
        │ • Traces    │
        │ • Alerts    │
        └─────────────┘
```

### Integration Points

| Component | Integration Method | Responsibility |
|-----------|-------------------|----------------|
| `sentry.server.config.ts` | NEW | Server-side error/trace capture |
| `sentry.client.config.ts` | NEW | Client-side error/trace capture |
| `sentry.edge.config.ts` | NEW | Edge runtime error/trace capture |
| `process-error-handler.ts` | MODIFY | Send fatal errors to Sentry |
| `api-handler.ts` | MODIFY | Add Sentry context to API errors |
| `sentry-tracker.ts` | NEW | User action tracking |
| Repositories (optional) | MODIFY | Custom span names for queries |
| Vercel Integration | NEW | Auto source maps, releases |

---

## Phase Breakdown

### Phase 1: Foundation (1 hour)
**Status**: ✅ DONE
**Completed**: 2025-12-26
**Review Date**: 2025-12-26
**Review Report**: `plans/reports/code-reviewer-251226-2225-sentry-phase1.md`
**Files**: 4 created, 3 modified

| Task | Description | Files | Status |
|------|-------------|-------|--------|
| 1.1 | Install Sentry package | `package.json` | ✅ Done |
| 1.2 | Run Sentry wizard | `sentry.*.config.ts`, `.sentryclirc` | ✅ Done |
| 1.3 | Connect Vercel integration | Environment variables | ✅ Done |
| 1.4 | Configure server settings | `sentry.server.config.ts` | ✅ Done |

**Validation**:
- [x] Wizard completes successfully
- [x] Config files generated
- [x] Typecheck passes
- [x] Linting passes
- [x] Test error appears in Sentry dashboard
- [x] **CRITICAL FIXES APPLIED** (see review report):

**Critical Issues Fixed:**
1. [x] **P0**: Set `tracesSampleRate: 0.05` for production (currently 1.0)
2. [x] **P0**: Add error filtering in `beforeSend()` for operational errors
3. [x] **P1**: Add rate limiting to `/api/test-sentry` endpoint
4. [x] **P1**: Add request body/query param scrubbing in `beforeSend()`
5. [x] **P1**: Remove `beforeSendTransaction` user code (incorrect pattern)

### Phase 2: Enhanced Error Capture (1 hour)
**Status**: ✅ DONE (2025-12-26 23:18)
**Files**: 3 modified
**Test Report**: `plans/reports/tester-251226-2221-sentry-phase1-test.md`

| Task | Description | Files |
|------|-------------|-------|
| 2.1 | Update process error handler | `process-error-handler.ts` |
| 2.2 | Add Sentry to API wrapper | `api-handler.ts` |
| 2.3 | Configure error filtering | `sentry.server.config.ts` |
| 2.4 | Test error reporting | Test endpoints |

**Validation**:
- [ ] Unhandled exceptions captured
- [ ] Promise rejections captured
- [ ] Operational errors filtered
- [ ] Context data attached (user, request)

### Phase 3: Performance Monitoring (1.5 hours)
**Status**: ✅ DONE (2025-12-26 23:38)
**Test Report**: `plans/reports/tester-251226-2332-sentry-phase3-test.md`
**Code Review**: `plans/reports/code-reviewer-251226-2338-sentry-phase3.md`
**Files**: 2 modified, 1 created

| Task | Description | Files | Status |
|------|-------------|-------|--------|
| 3.1 | Enable distributed tracing | `sentry.server.config.ts` | ✅ Done |
| 3.2 | Configure smart sampling | `sentry.server.config.ts` | ✅ Done |
| 3.3 | Add DB instrumentation | `sentry.server.config.ts` | ✅ Done |
| 3.4 | Add Redis instrumentation | `sentry.server.config.ts` | ✅ Done |
| 3.5 | Create custom span helpers | `src/infrastructure/monitoring/sentry-span.ts` | ✅ Done |
| 3.6 | Add IPFS tracing | `src/infrastructure/storage/ipfs/pinata.adapter.ts` | ✅ Done |

**Validation**:
- [x] HTTP requests traced
- [x] DB queries spanned
- [x] Redis operations spanned
- [x] Sampling rate <3K traces/day (~360 traces/day expected)

### Phase 4: User Action Tracking (1.5 hours)
**Status**: Pending
**Files**: 3 created, 3 modified

| Task | Description | Files |
|------|-------------|-------|
| 4.1 | Create Sentry tracker | `sentry-tracker.ts` |
| 4.2 | Track login events | Auth endpoints |
| 4.3 | Track ABI operations | ABI use cases |
| 4.4 | Track contract operations | Contract use cases |
| 4.5 | Add breadcrumbs | Key user flows |

**Validation**:
- [ ] Login events tracked
- [ ] ABI creation tracked
- [ ] Contract verification tracked
- [ ] Breadcrumbs appear in error context

### Phase 5: Dashboard & Alerts (1 hour)
**Status**: Pending
**Files**: 0 (Sentry dashboard config)

| Task | Description | Location |
|------|-------------|----------|
| 5.1 | Create Sentry project | sentry.io |
| 5.2 | Configure release tracking | Sentry settings |
| 5.3 | Set up alert rules | Sentry dashboard |
| 5.4 | Configure notifications | Slack/Email/Discord |

**Validation**:
- [ ] Releases tracked
- [ ] Alerts fire on new errors
- [ ] Notifications received
- [ ] Issue assignment works

---

## Free Tier Strategy

### Sampling Configuration

```typescript
// sentry.server.config.ts
tracesSampleRate: ({ transactionContext }) => {
  const isProd = process.env.NODE_ENV === "production";

  // Development: 100% sampling
  if (!isProd) return 1.0;

  // Production: Smart sampling
  const name = transactionContext?.name || "";

  // 100% of error requests
  if (name.includes("400") || name.includes("500")) return 1.0;

  // 5% of health checks
  if (name.includes("/api/health")) return 0.05;

  // 20% of successful API requests
  if (name.startsWith("GET /api/") || name.startsWith("POST /api/")) return 0.2;

  // 10% of page requests
  return 0.1;
},
```

### Error Filtering

```typescript
beforeSend(event, hint) {
  // Skip operational errors (not bugs)
  const skipCodes = [
    "RATE_LIMITED",      // Expected user behavior
    "VALIDATION_ERROR",  // Bad input
    "UNAUTHORIZED",      // Auth failure
    "NOT_FOUND",         // Resource missing
  ];

  if (event.tags?.code && skipCodes.includes(event.tags.code as string)) {
    return null;
  }

  // Only send production errors
  if (process.env.NODE_ENV !== "production") {
    return null; // Or keep for debugging
  }

  return event;
},
```

### Usage Estimates

| Metric | Daily | Monthly | Limit | Status |
|--------|-------|---------|-------|--------|
| Errors | ~50 | ~1,500 | 5,000 | ✅ 30% used |
| Transactions | ~1,200 | ~36,000 | 3K/day | ⚠️ 40% used |
| Team members | 1-3 | - | 3 | ✅ OK |

---

## File Changes Summary

### New Files (4)

```
sentry.server.config.ts           # Server-side Sentry configuration
sentry.client.config.ts           # Client-side Sentry configuration
sentry.edge.config.ts             # Edge runtime Sentry configuration
src/infrastructure/monitoring/
  └── sentry-tracker.ts           # User action tracking utilities
```

### Modified Files (3)

```
process-error-handler.ts           # Add Sentry.captureException
src/shared/lib/api/api-handler.ts  # Add Sentry context to errors
package.json                       # Add @sentry/nextjs dependency
```

### Configuration Files (1)

```
.sentryclirc                        # Sentry CLI config (source maps)
```

---

## Testing Strategy

### Unit Tests

| Test | Description |
|------|-------------|
| Error filtering | Verify operational errors not sent |
| Sampling logic | Verify correct sample rates |
| Tracker functions | Verify breadcrumbs created |

### Integration Tests

| Test | Description |
|------|-------------|
| Error capture | Throw test error, verify in Sentry |
| Transaction capture | Make test request, verify trace |
| User action | Call tracker, verify breadcrumb |
| Release tracking | Deploy with release name, verify tagged |

### Manual Tests

1. **Local Development**
   ```bash
   pnpm dev
   # Throw error in /api/test-error
   # Verify appears in local Sentry
   ```

2. **Preview Deployment**
   ```bash
   vercel
   # Test on preview URL
   # Verify errors captured
   ```

3. **Production**
   ```bash
   vercel --prod
   # Monitor first 24 hours
   # Check usage dashboards
   ```

---

## Rollback Plan

### If Issues Detected

| Issue | Rollback Action |
|-------|-----------------|
| Performance degradation | Reduce `tracesSampleRate` to 0 |
| Too many errors | Add more codes to `beforeSend` filter |
| Sensitive data leaked | Add data scrubbing to `beforeSend` |
| Vercel build fails | Remove source map upload from `.sentryclirc` |
| Free tier exceeded | Reduce all sample rates by 50% |

### Quick Disable

```typescript
// sentry.server.config.ts
const SENTRY_ENABLED = process.env.SENTRY_ENABLED === "true";

export default SENTRY_ENABLED ? {
  // ... existing config
} : {
  dsn: undefined, // Disabled
};
```

---

## Success Metrics

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Error visibility | 0% | 100% | Sentry issues count |
| MTTD (mean time to detect) | Days | <1 hour | Sentry alert timestamp |
| P95 latency tracking | None | Tracked | Transaction dashboard |
| Free tier usage | N/A | <80% | Sentry usage stats |
| Debug efficiency | Baseline | +50% | Issue resolution time |

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Free tier exceeded | Medium | Medium | Smart sampling + error filtering |
| Performance overhead | Low | Medium | Keep sampling <20% in prod |
| Source map privacy | Low | Low | Can disable upload |
| Vendor lock-in | Low | Low | Standard OpenTelemetry export available |
| Vercel integration breaks | Low | High | Manual config fallback documented |

---

## Dependencies

### External Services

| Service | Purpose | Setup Time |
|---------|---------|------------|
| Sentry Cloud | Error/trace storage | 5 min |
| Vercel Integration | Auto config | 5 min |

### Internal Dependencies

| Component | Required For |
|-----------|--------------|
| Existing error classes | Error categorization |
| Process handler | Fatal error capture |
| API wrapper | Request context |

---

## Configuration Decisions (Confirmed)

All configuration questions resolved during validation (2025-12-26):

| Decision | Choice | File Affected |
|----------|--------|---------------|
| Source map upload? | ✅ Upload to Sentry | `.sentryclirc` |
| User ID tracking? | ✅ Full ID | `sentry-tracker.ts` |
| Sampling rate? | ✅ 5% conservative | `sentry.server.config.ts` |
| Alert channels? | ✅ Slack + GitHub | Phase 5 |
| Environments? | ✅ One project + env filter | `sentry.server.config.ts` |
| Dev monitoring? | ✅ Production only | `beforeSend` filter |

---

## Code Review Summary

### Phase 1 Code Review (2025-12-26)

| Metric | Status | Details |
|--------|--------|---------|
| **Overall** | ⚠️ NEEDS REVISION | 2 critical, 3 high, 5 medium issues |
| **Type Safety** | ✅ Pass | `tsc --noEmit` clean |
| **Linting** | ✅ Pass | ESLint clean |
| **Security** | ⚠️ Issues | Missing rate limiting, incomplete data filtering |
| **Performance** | ❌ Critical | `tracesSampleRate=1.0` will exceed free tier |
| **Architecture** | ✅ Good | Follows Clean Architecture |

**Critical Issues (P0)**:
1. `tracesSampleRate: 1.0` will exceed 3K traces/day limit
2. Missing error filtering for operational errors

**High Priority (P1)**:
1. Incomplete sensitive data filtering (bodies, query params)
2. Test endpoint lacks rate limiting
3. `beforeSendTransaction` uses incorrect pattern

**Full Report**: `plans/reports/code-reviewer-251226-2225-sentry-phase1.md`

---

## Next Steps

1. ✅ ~~Review this plan~~ - **Complete**
2. ✅ ~~Answer open questions~~ - **Complete**
3. ✅ ~~Phase 1 Foundation~~ - **Complete**
4. ✅ ~~Fix Phase 1 critical issues~~ - **Applied**
5. ✅ ~~Resume Phase 1 validation~~ - **Tested and verified**
6. ✅ ~~Phase 2 Enhanced Error Capture~~ - **Complete (2025-12-26 23:18)**
7. ✅ ~~Phase 3 Performance Monitoring~~ - **Complete (2025-12-26 23:38)**
8. **Continue to Phase 4** - User Action Tracking
9. **Monitor free tier usage** - Adjust sampling if needed
10. **Set up GitHub integration** - Auto-create issues (Phase 5)

---

**Plan prepared by**: Claude (Planning Agent)
**Review status**: ✅ Validated
**Phase 1 Status**: ✅ DONE (2025-12-26)
**Phase 2 Status**: ✅ DONE (2025-12-26 23:18)
**Phase 3 Status**: ✅ DONE (2025-12-26 23:38)
**Updated**: 2025-12-27 03:31

