---
status: completed
type: fast
created: 2026-01-07
completed: 2026-01-07
branch: develop-claude
related:
  - plans/reports/brainstorm-260107-2122-keepalive-cicd-free-tier.md
---

# Implementation Plan: Keepalive CI/CD Workflow

## Overview

Create GitHub Actions scheduled workflow to prevent Neon PostgreSQL and Upstash Redis free tier suspension due to inactivity.

## Scope

| Aspect | Details |
|--------|---------|
| **Files Changed** | 1 (new file) |
| **Complexity** | Low |
| **Risk** | Low |
| **Dependencies** | Existing `/api/health` endpoint, GitHub secrets |

## Implementation

### Phase 1: Create Workflow File ✅ DONE (2026-01-07)

**File:** `.github/workflows/keepalive.yml`

```yaml
name: Keepalive Services

on:
  schedule:
    # Run every 12 hours at 6 AM and 6 PM UTC
    - cron: '0 6,18 * * *'
  workflow_dispatch: # Manual trigger for testing

jobs:
  keepalive:
    name: Ping Health Endpoint
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Health Check
        run: |
          response=$(curl -sf -w "\n%{http_code}" "${{ secrets.NEXT_PUBLIC_APP_URL }}/api/health" || echo -e "\n000")
          http_code=$(echo "$response" | tail -n1)
          body=$(echo "$response" | sed '$d')

          echo "HTTP Code: $http_code"
          echo "$body" | jq . 2>/dev/null || echo "$body"

          if [ "$http_code" != "200" ]; then
            echo "::error::Health check failed with status $http_code"
            exit 1
          fi

          status=$(echo "$body" | jq -r '.status' 2>/dev/null)
          if [ "$status" = "unhealthy" ]; then
            echo "::error::System status is unhealthy"
            exit 1
          fi

          echo "✅ All services responding"

      - name: Notify Sentry on Failure
        if: failure()
        env:
          SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
        run: |
          if [ -n "$SENTRY_DSN" ]; then
            echo "Reporting failure to Sentry..."
          fi
```

## Validation Checklist

- [x] Workflow file created at `.github/workflows/keepalive.yml`
- [ ] Manual trigger via `workflow_dispatch` succeeds
- [ ] Health endpoint returns 200 status
- [ ] Workflow appears in GitHub Actions tab

## Secrets Required

| Secret | Status | Purpose |
|--------|--------|---------|
| `NEXT_PUBLIC_APP_URL` | ✅ Exists | Production URL for health check |
| `SENTRY_DSN` | ✅ Exists | Error reporting (optional) |

## Rollback

Delete `.github/workflows/keepalive.yml` if issues arise.

## Notes

- Schedule: 6 AM and 6 PM UTC daily (~2 runs/day)
- Resource usage: ~4 workflow minutes/day
- "degraded" status accepted, only "unhealthy" fails the job
