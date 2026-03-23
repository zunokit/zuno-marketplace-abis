## Architecture

```text
cronjob.org ──GET──▶ /api/cron/keepalive ──▶ /api/health + Neon SELECT 1
      │
      └──GET──▶ /api/cron/db-backup ──▶ Neon table snapshot

Both routes require: Authorization: Bearer CRON_SECRET
Both routes optionally notify: Slack Incoming Webhook
```

## Env vars

| Variable | Example | Description |
| --- | --- | --- |
| `CRON_SECRET` | `openssl rand -hex 32` | Shared bearer token for both cron routes |
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/services/...` | Slack Incoming Webhook for success/failure notifications |
| `DATABASE_URL` | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` | Neon connection string used by both routes |
| `NEXT_PUBLIC_APP_URL` | `https://<your-vercel-domain>` | Base app URL used by the keepalive route to call `/api/health` |

## DB setup

Install the Neon HTTP client used by the cron routes:

```bash
pnpm add @neondatabase/serverless
```

The routes use the existing `DATABASE_URL` environment variable. No SQL migration is required.

## Slack webhook

Create an Incoming Webhook in your Slack app, then copy the webhook URL into `SLACK_WEBHOOK_URL`.

- Slack apps: [api.slack.com/apps](https://api.slack.com/apps)
- Feature: Incoming Webhooks

## Deploy

Deploy the updated app, then smoke-test both routes.

```bash
git push
```

```bash
curl -i "https://<your-vercel-domain>/api/cron/keepalive" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

```bash
curl -i "https://<your-vercel-domain>/api/cron/db-backup" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Expected behavior:
- `401` without the bearer token
- `200` when the job and Slack notification both succeed
- `207` when the job fails or Slack notification fails

## cronjob.org config

| Title | URL | Schedule | Method | Header name | Header value | Timeout |
| --- | --- | --- | --- | --- | --- | --- |
| Keepalive | `https://<your-vercel-domain>/api/cron/keepalive` | `0 6,18 * * *` | `GET` | `Authorization` | `Bearer <CRON_SECRET>` | `30s` |
| DB Backup | `https://<your-vercel-domain>/api/cron/db-backup` | `0 2 * * *` | `GET` | `Authorization` | `Bearer <CRON_SECRET>` | `300s` |

## Disable old GitHub Actions

After the external cron routes pass smoke tests:

1. Keep the workflow files as manual-only, or delete them entirely.
2. Remove the old Vercel cron entry so `/api/health` no longer runs on a platform schedule.
3. Confirm only cronjob.org is triggering the routes.

If you want to delete the old workflows entirely:

```bash
rm .github/workflows/keepalive.yml
rm .github/workflows/db-backup.yml
```
