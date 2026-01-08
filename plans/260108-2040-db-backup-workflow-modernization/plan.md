# Implementation Plan: Database Backup Workflow Modernization

**Status**: pending
**Created**: 2026-01-08
**Type**: GitHub Actions Workflow Rewrite
**Complexity**: Medium
**Estimated Time**: 2-3 hours

---

## Overview

Modernize the database backup workflow (`.github/workflows/db-backup.yml`) to fix critical issues, add missing features, and integrate official Slack notifications.

**Critical Issues**:
- 🚨 Workflow completely broken - GitHub Secrets not configured or passed correctly
- Using outdated third-party Slack action (8398a7/action-slack@v3)
- No compression, metrics, or detailed error handling

**Solution**: Complete workflow rewrite with official Slack action v2.0.0, compression, and enhanced monitoring.

---

## Objectives

### Primary Objectives
1. ✅ Fix broken workflow by properly configuring and passing GitHub Secrets
2. ✅ Update to official Slack GitHub Action v2.0.0
3. ✅ Add gzip compression (70-80% storage reduction)
4. ✅ Add backup metrics (size, duration, record counts)
5. ✅ Improve error handling and retry logic

### Secondary Objectives
- Maintain backward compatibility with existing backup script
- Keep workflow execution under 5 minutes for databases <10K records
- Provide actionable insights in Slack notifications

---

## Success Criteria

- [ ] Workflow runs successfully on schedule (daily 2 AM UTC)
- [ ] Backup file created and uploaded as artifact
- [ ] Backup compressed with gzip (>60% size reduction)
- [ ] Slack notification sent on success/failure with metrics
- [ ] All GitHub Secrets properly configured and passed
- [ ] Artifact retention set to 30 days
- [ ] Old backups auto-deleted after 10 backups

---

## Implementation Phases

### Phase 1: Preparation (15 minutes)

#### 1.1 Review Current State
- [ ] Review current workflow execution logs
- [ ] Document current backup sizes and durations
- [ ] Identify all required GitHub Secrets

#### 1.2 Configure GitHub Secrets
**CRITICAL**: These secrets MUST be configured in GitHub repository settings before deployment.

- [ ] Go to repository Settings → Secrets and variables → Actions
- [ ] Add `DATABASE_URL` (PostgreSQL connection string)
- [ ] Add `SLACK_WEBHOOK_URL` (Slack incoming webhook URL)
- [ ] Verify `UPSTASH_REDIS_REST_URL` exists
- [ ] Verify `UPSTASH_REDIS_REST_TOKEN` exists
- [ ] Verify `PINATA_JWT` exists
- [ ] Verify `PINATA_GATEWAY_URL` exists

#### 1.3 Create Test Environment
- [ ] Fork repository for testing
- [ ] Create test Slack webhook for development

---

### Phase 2: Workflow Rewrite (1-1.5 hours)

#### 2.1 Update Workflow Header
- [ ] Update workflow name and description
- [ ] Keep schedule: `cron: "0 2 * * *"` (daily 2 AM UTC)
- [ ] Keep `workflow_dispatch` for manual triggering
- [ ] Update environment variables (Node.js 22.x, pnpm 10)

#### 2.2 Rewrite Backup Job
- [ ] Update checkout action: `actions/checkout@v4`
- [ ] Update Node.js setup: `actions/setup-node@v4`
- [ ] Update pnpm setup: `pnpm/action-setup@v2`
- [ ] Fix pnpm cache configuration
- [ ] **CRITICAL**: Fix environment variable passing for secrets

**Secrets to Pass to Backup Script**:
```yaml
DATABASE_URL: ${{ secrets.DATABASE_URL }}
UPSTASH_REDIS_REST_URL: ${{ secrets.UPSTASH_REDIS_REST_URL }}
UPSTASH_REDIS_REST_TOKEN: ${{ secrets.UPSTASH_REDIS_REST_TOKEN }}
PINATA_JWT: ${{ secrets.PINATA_JWT }}
PINATA_GATEWAY_URL: ${{ secrets.PINATA_GATEWAY_URL }}
```

#### 2.3 Add Compression Step
Insert after backup creation, before artifact upload:

```yaml
- name: Compress backup
  run: |
    gzip -9 backups/backup-*.json
    echo "COMPRESSED_SIZE=$(du -h backups/backup-*.json.gz | cut -f1)" >> $GITHUB_ENV
    echo "ORIGINAL_SIZE=$(du -h backups/backup-*.json | cut -f1)" >> $GITHUB_ENV
```

#### 2.4 Collect Backup Metrics
```yaml
- name: Collect backup metrics
  id: metrics
  run: |
    START_TIME=${{ steps.backup.outputs.start_time }}
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "duration=${DURATION}s" >> $GITHUB_OUTPUT
    echo "size=${{ env.COMPRESSED_SIZE }}" >> $GITHUB_OUTPUT
    echo "records=$(jq '.metadata.totalRecords' backups/backup-*.json)" >> $GITHUB_OUTPUT
```

#### 2.5 Update Artifact Upload
- [ ] Update artifact name pattern: `db-backup-${{ github.run_number }}.gz`
- [ ] Update artifact path: `backups/*.gz`
- [ ] Keep retention-days: 30

#### 2.6 Update Slack Notifications
Replace `8398a7/action-slack@v3` with official `slackapi/slack-github-action@v2.0.0`:

**Success Notification**:
```yaml
- name: Notify backup success
  if: success()
  uses: slackapi/slack-github-action@v2.0.0
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
    webhook-type: incoming-webhook
    payload: |
      text: "✅ Database backup completed successfully"
      blocks:
        - type: "header"
          text:
            type: "plain_text"
            text: "✅ Database Backup - Success"
        - type: "section"
          fields:
            - type: "mrkdwn"
              text: "*Size:*\n${{ env.COMPRESSED_SIZE }} (from ${{ env.ORIGINAL_SIZE }})"
            - type: "mrkdwn"
              text: "*Duration:*\n${{ steps.metrics.outputs.duration }}"
            - type: "mrkdwn"
              text: "*Records:*\n${{ steps.metrics.outputs.records }}"
            - type: "mrkdwn"
              text: "*Artifact:*\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|Download>"
```

**Failure Notification**:
```yaml
- name: Notify backup failure
  if: failure()
  uses: slackapi/slack-github-action@v2.0.0
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
    webhook-type: incoming-webhook
    payload: |
      text: "❌ Database backup failed"
      blocks:
        - type: "header"
          text:
            type: "plain_text"
            text: "❌ Database Backup - Failed"
        - type: "section"
          text:
            type: "mrkdwn"
            text: |-
              *Workflow:* ${{ github.workflow }}
              *Run:* <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|#${{ github.run_number }}>
              *Actor:* ${{ github.actor }}
              *Branch:* ${{ github.ref_name }}
```

#### 2.7 Update Health Check Job
- [ ] Update checkout action: `actions/checkout@v4`
- [ ] Update Node.js setup: `actions/setup-node@v4`
- [ ] Update pnpm setup: `pnpm/action-setup@v2`
- [ ] Fix pnpm cache configuration
- [ ] **CRITICAL**: Fix environment variable passing for secrets

---

### Phase 3: Testing (30-45 minutes)

#### 3.1 Manual Workflow Test
- [ ] Trigger workflow manually via GitHub Actions UI
- [ ] Monitor workflow execution in real-time
- [ ] Verify all steps complete successfully

#### 3.2 Backup Verification
- [ ] Download artifact from workflow run
- [ ] Decompress backup file: `gunzip backup-*.json.gz`
- [ ] Verify JSON structure and data integrity
- [ ] Check that sensitive data (passwords, API keys) is excluded

#### 3.3 Compression Test
- [ ] Compare original vs compressed file sizes
- [ ] Verify compression ratio >60%
- [ ] Confirm decompression works: `gunzip -t backup-*.json.gz`

#### 3.4 Slack Notification Test
- [ ] Verify Slack message formatting
- [ ] Check that all metrics are displayed correctly
- [ ] Test artifact download link
- [ ] Verify emoji and block formatting

#### 3.5 Failure Scenario Test
- [ ] Temporarily remove DATABASE_URL secret
- [ ] Trigger workflow to simulate failure
- [ ] Verify Slack failure notification sent
- [ ] Check that error message is clear and actionable
- [ ] Restore DATABASE_URL secret

---

### Phase 4: Deployment (15 minutes)

#### 4.1 Create Pull Request
- [ ] Create feature branch: `feature/db-backup-workflow-modernization`
- [ ] Commit changes with conventional commit message
- [ ] Create pull request with detailed description
- [ ] Reference brainstorming report in PR description

#### 4.2 Review and Approval
- [ ] Self-review changes using GitHub PR review tool
- [ ] Verify all tests pass
- [ ] Confirm workflow syntax is valid (GitHub Actions linting)
- [ ] Get team approval

#### 4.3 Merge and Monitor
- [ ] Merge PR to main branch
- [ ] Monitor first scheduled execution (2 AM UTC next day)
- [ ] Verify backup created successfully
- [ ] Check Slack notification received
- [ ] Download and verify backup artifact

---

## Files to Modify

### 1. `.github/workflows/db-backup.yml` (Complete Rewrite)
**Changes**:
- Update action versions
- Fix secret passing
- Add compression step
- Add metrics collection
- Rewrite Slack notifications with official action v2.0.0

**No Changes Needed**:
- `scripts/backup/create-backup.ts` - Keep as-is
- `scripts/health-check.ts` - Keep as-is

---

## Rollback Plan

If issues arise after deployment:

1. **Immediate Rollback** (5 minutes):
   - Revert the merge commit
   - Force push to main branch
   - Workflow will revert to previous version

2. **Data Recovery**:
   - Previous backups still available in GitHub Actions artifacts
   - Download and decompress as needed

3. **Slack Notifications**:
   - Old Slack action will work again after rollback
   - No configuration changes needed

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Slack v2 breaking changes | Test in fork first; keep backup of old workflow |
| Compression fails | Add error handling; continue without compression if fails |
| Secrets not passed | Double-check secret passing syntax; validate before merge |
| Artifact upload timeout | Add retry logic; increase timeout if backup >500MB |
| Workflow syntax errors | Use GitHub Actions YAML linting; test manually before merge |

---

## Post-Deployment Checklist

- [ ] Monitor first 3 scheduled executions
- [ ] Verify backup sizes are consistent
- [ ] Check Slack notifications received consistently
- [ ] Confirm artifact retention working (30-day limit)
- [ ] Validate old backup cleanup (keeps last 10)
- [ ] Update team documentation with new workflow details
- [ ] Archive brainstorming report and implementation plan

---

## Future Enhancements (Out of Scope)

1. **Month 1-2**: Add GPG encryption before compression
2. **Month 3-4**: Add optional S3/R2 upload (multi-destination)
3. **Month 5-6**: Add backup validation (restore test database)
4. **Month 7+**: Migrate to native `pg_dump` format

---

## References

- **Brainstorming Report**: `plans/reports/brainstormer-260108-2040-db-backup-workflow-modernization.md`
- **Current Workflow**: `.github/workflows/db-backup.yml`
- **Backup Script**: `scripts/backup/create-backup.ts`
- **Health Check Script**: `scripts/health-check.ts`
- **Slack GitHub Action**: https://github.com/slackapi/slack-github-action

---

**Plan End**
