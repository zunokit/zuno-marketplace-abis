# Brainstorm: Keepalive CI/CD for Free Tier Services

**Date:** 2026-01-07
**Author:** Claude Code (Brainstormer)
**Status:** Approved

---

## Problem Statement

Current project uses free-tier cloud services (Neon PostgreSQL, Upstash Redis) that may suspend or delete resources after extended periods of inactivity. Need a CI/CD solution to periodically trigger these services to prevent suspension.

## Requirements

1. Prevent Neon PostgreSQL and Upstash Redis from being suspended/deleted due to inactivity
2. Use GitHub Actions as CI/CD platform
3. Run every 12 hours (sufficient margin for inactivity limits)
4. Integrate with Sentry for failure alerts
5. Minimal resource usage and maintenance

## Service Inactivity Policies

| Service | Policy | Mitigation |
|---------|--------|------------|
| **Neon PostgreSQL** | 5-min auto-suspend (cold starts). Extended inactivity may archive projects. | Health check pings database |
| **Upstash Redis** | No documented auto-delete, but free resources may be cleaned after prolonged inactivity | Health check pings cache |

## Evaluated Approaches

### A. GitHub Actions Cron Job ✅ RECOMMENDED

**Pros:**
- Free (uses existing workflow minutes)
- Integrated with existing CI/CD
- Full control over logic
- Sentry integration possible
- Leverages existing `/api/health` endpoint

**Cons:**
- Uses ~4 workflow minutes/day (~120 min/month)
- GitHub may skip scheduled runs under high load

**Verdict:** Best option - simple, integrated, free

### B. External Monitoring (UptimeRobot)

**Pros:**
- Completely free
- No GitHub minutes usage
- Professional monitoring

**Cons:**
- Limited to HTTP pings
- No custom logic
- Harder to integrate Sentry
- Another service to manage

**Verdict:** Viable but less flexible

### C. Vercel Cron Jobs

**Pros:**
- Native Next.js integration
- No additional config needed

**Cons:**
- Free tier limited to 1/day
- Requires Vercel Pro for more frequent runs

**Verdict:** Too limited for every 12 hours

### D. Custom Serverless Worker

**Pros:**
- Full control
- No limits

**Cons:**
- Over-engineered
- Additional service to maintain
- Violates YAGNI

**Verdict:** Rejected - unnecessary complexity

## Final Solution: GitHub Actions Scheduled Workflow

### Architecture

```
┌─────────────────┐         ┌─────────────────┐
│  GitHub Actions │   HTTP  │   /api/health   │
│  (Scheduled)    │────────▶│   (Next.js)     │
│  Every 12hrs    │         │                 │
└─────────────────┘         └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌───────────┐    ┌───────────┐    ┌───────────┐
            │   Neon    │    │  Upstash  │    │  Pinata   │
            │  Postgres │    │   Redis   │    │   IPFS    │
            └───────────┘    └───────────┘    └───────────┘
                    │                │                │
                    └────────────────┴────────────────┘
                                     │
                                     ▼
                            ┌───────────────┐
                            │    Sentry     │
                            │ (on failure)  │
                            └───────────────┘
```

### Workflow File

**Path:** `.github/workflows/keepalive.yml`

```yaml
name: Keepalive Services

on:
  schedule:
    - cron: '0 6,18 * * *'  # 6 AM and 6 PM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  keepalive:
    name: Ping Health Endpoint
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Health Check
        id: health
        run: |
          response=$(curl -sf -w "\n%{http_code}" "${{ secrets.NEXT_PUBLIC_APP_URL }}/api/health" || echo -e "\n000")
          http_code=$(echo "$response" | tail -n1)
          body=$(echo "$response" | sed '$d')

          echo "HTTP Code: $http_code"
          echo "Response Body:"
          echo "$body" | jq . 2>/dev/null || echo "$body"

          if [ "$http_code" != "200" ]; then
            echo "::error::Health check failed with status $http_code"
            exit 1
          fi

          # Check if critical services are healthy
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
            # Sentry Envelope API format
            curl -X POST "https://sentry.io/api/0/envelope/" \
              -H "Content-Type: application/x-sentry-envelope" \
              -d '{"event_id":"'"$(uuidgen)"'","dsn":"'"$SENTRY_DSN"'"}
{"type":"event"}
{"message":"Keepalive health check failed","level":"error","timestamp":'"$(date +%s)"'}'
          fi
```

### Implementation Considerations

1. **No new secrets required** - uses existing `NEXT_PUBLIC_APP_URL` and `SENTRY_DSN`
2. **Existing health endpoint** - `/api/health` already checks all services
3. **Graceful degradation** - "degraded" status is acceptable, only "unhealthy" triggers alert
4. **Timeout protection** - 5-minute job timeout prevents hanging

### Success Metrics

- Health endpoint returns 200 status
- All critical services (database, cache, auth) report healthy/degraded
- No service suspension warnings
- Sentry receives alerts only on actual failures

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GitHub skips scheduled run | Low | Low | 12hr interval provides buffer; manual dispatch available |
| Health endpoint down | Low | Medium | Sentry alert triggers investigation |
| Workflow minutes exhausted | Very Low | Low | ~120 min/month << 2000 free min/month |

## Next Steps

1. ✅ Create `.github/workflows/keepalive.yml`
2. Test with manual `workflow_dispatch` trigger
3. Monitor first scheduled runs
4. Verify Sentry integration

## Decision Log

| Decision | Rationale |
|----------|-----------|
| GitHub Actions over external service | Integrated, free, full control |
| 12-hour interval | Safe margin for all free tier limits |
| Reuse `/api/health` | Checks all services in one request, already tested |
| Sentry integration | Leverages existing monitoring stack |

---

**Approved by:** User
**Implementation:** Pending
