# Phase 5: Dashboard & Alerts Configuration

**Duration**: 1 hour
**Status**: Done
**Completed**: 2025-12-27 09:28
**Dependencies**: Phase 4 complete

---

## Overview

Configure Sentry dashboard, set up alert rules, and establish notification channels. This phase ensures you're promptly notified of critical issues.

---

## Tasks

### Task 5.1: Create Sentry Project

**Location**: https://sentry.io/

**Steps** (if not done in Phase 1):

1. **Sign Up / Log In**
   - Go to https://sentry.io/signup/
   - Choose "Developer" free tier
   - Create organization: `zuno-kit` (or your preference)

2. **Create Project**
   - Click "Create Project"
   - Platform: **Next.js**
   - Name: `zuno-marketplace-abis`
   - Alert rate: **30 days** (default)

3. **Get DSN**
   - Project Settings → Client Keys (DSN)
   - Copy DSN URL (already set via Vercel integration)

---

### Task 5.2: Configure Release Tracking

**Purpose**: Track which deployment version introduced errors

#### Option A: Vercel Integration (Recommended)

Vercel integration automatically tracks releases via `SENTRY_RELEASE` environment variable.

**Verify**:
```typescript
// In sentry.server.config.ts
release: process.env.VERCEL_GIT_COMMIT_SHA || "development",
```

#### Option B: Manual Release Tracking

If not using Vercel integration:

1. **Set release in build**:
```bash
# package.json
"scripts": {
  "build": "next build && sentry-cli releases new $NEXT_PUBLIC_APP_VERSION",
  "build:prod": "next build && sentry-cli releases new $VERCEL_GIT_COMMIT_SHA && sentry-cli releases deploy $VERCEL_GIT_COMMIT_SHA -e production"
}
```

2. **Upload source maps**:
```bash
sentry-cli releases files $VERSION upload-sourcemaps ./out/.next/static
```

---

### Task 5.3: Configure Alert Rules

**Location**: Sentry → Settings → Alerts → New Alert Rule

#### Alert 1: New Unhandled Exception

| Setting | Value |
|---------|-------|
| Name | 🔴 Critical: New Unhandled Exception |
| Condition | `issue.type` = `error` |
| Filters | `error.handled` = `false` |
| Threshold | Every new issue |

**Actions**:
- ✅ Send to Slack
- ✅ Send email notification
- ✅ Auto-assign to: `@your-team`

#### Alert 2: Spike in Error Rate

| Setting | Value |
|---------|-------|
| Name | ⚠️ Warning: Error Rate Spike |
| Condition | `error_rate` > `5%` |
| Time window | 5 minutes |
| Threshold | `>5%` for `5 min` |

**Actions**:
- ✅ Send to Slack
- ✅ Create issue in Sentry

#### Alert 3: High Error Count

| Setting | Value |
|---------|-------|
| Name | 📊 High Error Volume |
| Condition | `event.count` > `50` |
| Time window | 1 hour |

**Actions**:
- ✅ Send email summary
- ✅ Mark for review

#### Alert 4: Performance Degradation

| Setting | Value |
|---------|-------|
| Name | 🐌 Slow Response Time |
| Condition | `transaction.duration` > `2000ms` |
| Filters | `transaction.op` = `http.server` |
| Threshold | P95 > 2s |

**Actions**:
- ✅ Send to Slack (warning level)

#### Alert 5: Free Tier Warning

| Setting | Value |
|---------|-------|
| Name | 💰 Quota Usage Warning |
| Condition | `quota.used` > `80%` |
| Check frequency | Daily |

**Actions**:
- ✅ Send email notification
- ✅ Review sampling strategy

---

### Task 5.4: Configure Notifications

#### Slack Integration

**Setup**:
1. Go to Sentry → Settings → Integrations → Slack
2. Click "Install Slack App"
3. Select workspace
4. Choose channel: `#zuno-marketplace-errors` (create first)
5. Configure alerts to send to Slack

**Recommended Channels**:
```
#zuno-marketplace-errors    # All error alerts
#zuno-marketplace-alerts    # Critical alerts only
#zuno-marketplace-perf      # Performance alerts
```

#### Email Notifications

**Setup**:
1. Sentry → Settings → Notifications → Email
2. Add team members' emails
3. Configure frequency:
   - **Immediate**: Critical errors
   - **Hourly**: Warnings
   - **Daily**: Digests

#### Discord Integration (Alternative)

**Setup**:
1. Create Discord webhook
2. Sentry → Settings → Integrations → Discord
3. Paste webhook URL
4. Configure server/channel

---

## Dashboard Configuration

### Create Custom Dashboards

**Location**: Sentry → Dashboards → New Dashboard

#### Dashboard 1: Error Overview

**Widgets**:

| Widget | Type | Query |
|--------|------|-------|
| Total Errors | Timeline | `event.type:error` |
| Top 5 Errors | Table | `error.type` group by |
| Errors by Status | Pie Chart | `error.level` |
| Recent Issues | List | `is:unresolved` |

#### Dashboard 2: Performance

**Widgets**:

| Widget | Type | Query |
|--------|------|-------|
| P95 Latency | Timeline | `transaction.duration:p95` |
| Slowest Endpoints | Table | `http.request.method` |
| DB Query Time | Timeline | `db.query.duration` |
| Cache Hit Rate | Big Number | `cache.hit / (cache.hit + cache.miss)` |

#### Dashboard 3: User Activity

**Widgets**:

| Widget | Type | Query |
|--------|------|-------|
| Unique Users | Big Number | `unique user.id` |
| Actions by Type | Bar Chart | `user.action` |
| Login Failures | Timeline | `auth:login_failure` |

---

## Issue Tracking Integration

### GitHub Integration ✅ **Confirmed**

**Setup**:
1. Sentry → Settings → Integrations → GitHub
2. Connect repository: `ZunoKit/zuno-marketplace-abis`
3. Configure issue creation rules

**Auto-create GitHub issue when**:
- Sentry issue confirmed (>=2 occurrences)
- Severity: error or fatal
- Environment: production

**GitHub issue template**:
```markdown
## Sentry Error Report

**Sentry Issue**: [Link to Sentry]
**Environment**: production
**First Seen**: {{ firstSeen }}
**Events**: {{ events }} times

### Summary
{{ issue.title }}

### Stack Trace
```
{{ culprit }}
```

### Breadcrumbs
{{ breadcrumbs }}

### User Context
- User ID: {{ user.id }}
- IP: {{ user.ipAddress }}
```

---

## Daily Operations

### Morning Checklist

| Task | Frequency | Action |
|------|-----------|--------|
| Check error dashboard | Daily | Review new issues |
| Review quota usage | Daily | Verify <80% |
| Check performance metrics | Daily | P95 latency OK? |
| Review alert log | Daily | Any missed alerts? |

### Weekly Tasks

| Task | Day | Action |
|------|-----|--------|
| Review error trends | Monday | Identify patterns |
| Update sampling strategy | Monday | Adjust if needed |
| Audit breadcrumbs | Friday | Remove noise |
| Review ignored errors | Friday | Un-ignore if fixed |

---

## Success Criteria

| Criterion | How to Verify |
|-----------|---------------|
| ✅ Project created | Accessible at sentry.io |
| ✅ Releases tracked | Deployments tagged with version |
| ✅ Alerts configured | Test triggers notifications |
| ✅ Notifications received | Slack/email gets alerts |
| ✅ Dashboards created | Views show correct data |
| ✅ Issue integration works | GitHub issues created (if enabled) |

---

## Testing

### Test 5.1: Alert Delivery

1. **Trigger test error**:
```typescript
// src/app/api/test-alert/route.ts
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  Sentry.captureException(new Error("Test alert - please ignore"));
  return NextResponse.json({ test: "alert sent" });
}
```

2. **Verify**:
   - Slack receives notification
   - GitHub issue created ✅ (confirmed feature)

3. **Cleanup**: Delete test endpoint

### Test 5.2: Performance Alert

Make 100 slow requests:

```typescript
// src/app/api/test-slow/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5s delay
  return NextResponse.json({ slow: true });
}
```

Run 100 times, verify P95 alert triggers.

### Test 5.3: Cleanup

```bash
rm src/app/api/test-*.ts
```

---

## Rollback

### Disable Alerts

If too noisy:
1. Go to Sentry → Settings → Alerts
2. Pause individual rules
3. Or adjust thresholds upward

### Disable Integration

```bash
# Remove Vercel integration
# Vercel → Settings → Integrations → Sentry → Remove

# Or disable Sentry at runtime
SENTRY_ENABLED=false pnpm dev
```

---

## Post-Implementation

### Week 1: Monitor and Tune

1. **Check alerts daily** - Adjust if too noisy
2. **Review sampling** - Adjust based on usage
3. **Filter noise** - Ignore expected errors
4. **Refine dashboards** - Add useful widgets

### Week 2: Optimize

1. **Review breadcrumbs** - Add more context if needed
2. **Custom spans** - Add instrumentation for slow operations
3. **Performance budget** - Set alerts for key endpoints

### Ongoing: Maintain

1. **Update documentation** - Document new breadcrumbs/spans
2. **Review quotas** - Check monthly usage trends
3. **Plan upgrades** - When free tier insufficient

---

## Completion Checklist

- [x] Phase 1: Foundation setup complete
- [x] Phase 2: Error capture configured
- [x] Phase 3: Performance monitoring active
- [x] Phase 4: User actions tracked
- [x] Phase 5: Alerts and dashboards configured ✅

**All Phases Complete! 🎉**

---

## Next Steps

After Phase 5:

1. **Monitor for 1 week** - Validate alerts and dashboards
2. **Gather feedback** - Adjust noise/signals
3. **Document learnings** - Update runbooks
4. **Plan iteration** - Additional features (profiling, replay)

---

**Phase Owner**: Implementation Team
**Review Status**: Done
**Project Status**: Complete 🎉
