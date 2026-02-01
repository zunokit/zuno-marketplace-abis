# Infisical Implementation Brainstorm - Zuno Marketplace ABIs
**Date**: 260201
**Project**: zuno-marketplace-abis

## Problem Statement

**Current State**:
- Local development requires manual `.env` file setup with all secrets
- New developers spend time configuring local environment
- Secrets stored in plaintext `.env` files (gitignored)
- No centralized secrets management
- Manual secret sharing via Slack/email or verbal communication

**Pain Points**:
- **Local env setup pain**: New developers must manually create `.env` file and copy/paste all secrets from somewhere
- **No single source of truth**: Secrets scattered across team members, documentation, chat
- **Inconsistent environments**: Different developers may have different values or missing secrets
- **Security risk**: Accidental commit of `.env` files, though gitignore helps

**Requirements**:
- Improve developer experience for local development
- Streamline new developer onboarding
- Maintain simple workflow for small team (2-5 developers)
- Deploy to Vercel (production)
- Keep implementation simple and maintainable

**Priorities**:
1. Developer Experience (PRIMARY)
2. Security improvement (SECONDARY)
3. Audit/compliance (NOT REQUIRED YET)

---

## Evaluated Approaches

### Approach 1: Infisical CLI for Local Development Only ⭐ RECOMMENDED

**Description**: Use Infisical CLI tool (`infisical run`, `infisical init`) to inject secrets into local development environment. Keep Vercel environment variables for production deployment.

**Workflow**:
```bash
# One-time setup
infisical login                    # Browser-based authentication
infisical init                      # Create .infisical.json config

# Daily usage
infisical run --env=dev -- npm run dev  # Inject secrets and start dev server
```

**Pros**:
- ✅ **Simple implementation**: Minimal code changes, no SDK integration
- ✅ **Fast to implement**: 1-2 days total setup
- ✅ **Great developer experience**: Single command to start with all secrets
- ✅ **No code complexity**: Application code unchanged, secrets loaded via environment variables
- ✅ **Git-friendly**: `.infisical.json` contains no secrets, can be committed
- ✅ **Watch mode**: `infisical run --watch` auto-reloads when secrets change
- ✅ **Works with existing setup**: Vercel env vars for prod, Infisical for local dev
- ✅ **Practical for small team**: Doesn't over-engineer for 2-5 devs
- ✅ **Zero runtime overhead**: No SDK calls during production

**Cons**:
- ⚠️ Two systems: Infisical (local) + Vercel (prod) - but this is acceptable
- ⚠️ Requires CLI installation on developer machines
- ⚠️ Need to manage Infisical Cloud account/organization
- ⚠️ Manual rotation required (but this matches team's preference)

**Implementation Complexity**: **Low** (2-3 days)

---

### Approach 2: Full Infisical Integration (Local + Production)

**Description**: Use Infisical CLI for local development AND Infisical-Vercel integration to sync secrets from Infisical to Vercel for production deployment.

**Workflow**:
```bash
# Local development (same as Approach 1)
infisical run --env=dev -- npm run dev

# Production deployment (automatic sync)
# Infisical syncs secrets to Vercel via Vercel Integration
# No manual management of Vercel env vars needed
```

**Pros**:
- ✅ **Single source of truth**: All environments managed in Infisical
- ✅ **Unified workflow**: Same tool for dev, staging, prod
- ✅ **Automatic sync**: Secrets propagate from Infisical to Vercel automatically
- ✅ **Better audit trail**: All secret changes tracked in Infisical
- ✅ **Easier secret rotation**: Rotate once in Infisical, syncs everywhere
- ✅ **Access control**: Fine-grained permissions per environment/team member
- ✅ **Future-proof**: Scales well as team grows

**Cons**:
- ❌ **More complex setup**: Requires Vercel Integration configuration
- ❌ **Additional dependency**: Vercel project must connect to Infisical
- ❌ **Longer implementation**: 3-5 days total
- ❌ **Potential failure points**: Integration could break, requires monitoring
- ❌ **Overkill for current needs**: Small team may not need full integration yet

**Implementation Complexity**: **Medium** (4-5 days)

---

### Approach 3: Infisical SDK Integration (Code-Based)

**Description**: Use Infisical Node.js SDK to fetch secrets at runtime instead of loading from environment variables.

**Workflow**:
```typescript
// src/shared/config/infisical.ts
import { InfisicalClient } from '@infisical/sdk';

const client = new InfisicalClient({
  token: process.env.INFISICAL_TOKEN,
});

export async function getSecrets() {
  return client.getAllSecrets({
    environment: 'dev',
    path: '/',
  });
}

// Application uses secrets from Infisical directly
```

**Pros**:
- ✅ **Runtime flexibility**: Fetch secrets dynamically
- ✅ **Single implementation**: Works for all environments
- ✅ **Centralized secret access**: All secret access goes through SDK
- ✅ **Dynamic secrets support**: Can rotate secrets without restart

**Cons**:
- ❌ **Significant code changes**: Requires refactoring of config loading
- ❌ **Runtime latency**: Every request may need to fetch secrets (or cache)
- ❌ **SDK dependency**: Adds package, version, maintenance burden
- ❌ **Complex error handling**: Must handle Infisical API failures gracefully
- ❌ **Over-engineering**: Doesn't solve primary problem (local setup pain)
- ❌ **Hot-reload complexity**: Watching for secret changes becomes harder

**Implementation Complexity**: **High** (7-10 days)

---

## Final Recommended Solution

### Selected Approach: **Approach 1 - Infisical CLI for Local Development Only**

**Rationale**:
1. **Addresses primary pain point**: Solves "local env setup pain" directly
2. **Matches team priorities**: Focuses on developer experience without over-engineering
3. **Pragmatic for team size**: 2-5 developers don't need complex multi-environment integration
4. **Low risk**: Minimal changes, quick rollback if needed
5. **Proven pattern**: Similar to how teams use AWS CLI, Heroku CLI, etc.
6. **Cost-effective**: Infisical Cloud free tier sufficient for small team

**Why Not Other Approaches**:
- **Approach 2 (Full Integration)**: Too complex for current needs. Can upgrade later if team grows or requirements change.
- **Approach 3 (SDK)**: Doesn't solve the main problem and adds unnecessary complexity. Runtime fetching is anti-pattern for Next.js.

---

## Implementation Plan

### Phase 1: Infisical Cloud Setup (4 hours)

1. **Create Infisical Account**
   - Sign up at [app.infisical.com](https://app.infisical.com)
   - Create organization (e.g., "Zuno Marketplace")
   - Invite team members (2-5 developers)

2. **Create Project**
   - Project name: "zuno-marketplace-abis"
   - Create environment: `dev` (add `staging` and `prod` later if needed)

3. **Add Secrets to Infisical**
   - Migrate all secrets from current `.env` file
   - **Database secrets**:
     - `DATABASE_URL`
   - **Auth secrets**:
     - `BETTER_AUTH_SECRET`
     - `BETTER_AUTH_URL`
   - **Cache secrets**:
     - `UPSTASH_REDIS_REST_URL`
     - `UPSTASH_REDIS_REST_TOKEN`
   - **IPFS secrets**:
     - `PINATA_JWT`
     - `PINATA_GATEWAY_URL`
     - `PINATA_API_KEY` (if used)
     - `PINATA_GATEWAY_SECRET` (if used)
     - `PINATA_UPLOAD_ENABLED`
   - **Monitoring secrets**:
     - `SENTRY_DSN`
     - `SENTRY_ORG`
     - `SENTRY_PROJECT`
     - `SENTRY_ENABLED`
   - **App config**:
     - `NEXT_PUBLIC_APP_URL`
     - `PUBLIC_API_USER_ID`
     - `DEFAULT_ADMIN_EMAIL`
     - `DEFAULT_ADMIN_PASSWORD`
     - `CORS_ALLOWED_ORIGINS` (if used)
     - `FOUNDRY_OUT_DIR` (if used)
     - `FOUNDRY_BROADCAST_DIR` (if used)
     - `API_KEYS` (if hardcoded)

4. **Configure Access Control**
   - Grant all team members read access to `dev` environment secrets
   - Consider write access restrictions for production secrets (when added)

### Phase 2: Local Development Setup (2 hours)

1. **Install Infisical CLI**
   ```bash
   npm install -g @infisical/cli
   # or
   brew install infisical/tap/infisical
   ```

2. **Authenticate to Infisical**
   ```bash
   infisical login  # Opens browser for authentication
   ```

3. **Initialize Project**
   ```bash
   cd E:\zuno-marketplace-abis
   infisical init  # Creates .infisical.json
   ```

4. **Verify Setup**
   ```bash
   # Test fetching secrets
   infisical secrets --env=dev

   # Test injecting secrets
   infisical run --env=dev -- printenv
   ```

### Phase 3: Update Development Workflow (1 hour)

1. **Create npm script**
   ```json
   // package.json
   {
     "scripts": {
       "dev": "next dev",
       "dev:infisical": "infisical run --env=dev -- next dev",
       "dev:watch": "infisical run --watch --env=dev -- next dev"
     }
   }
   ```

2. **Update README.md**
   - Add "Quick Start with Infisical" section
   - Document new workflow commands
   - Remove manual `.env` setup instructions

3. **Update .gitignore** (if not already)
   ```
   .env
   .env.local
   .env.*.local
   ```

4. **Commit `.infisical.json`**
   - File contains no sensitive data (just project ID, environment, path)
   - Safe to commit to git

### Phase 4: Team Onboarding & Documentation (2 hours)

1. **Create `ONBOARDING.md`**
   - Step-by-step Infisical setup for new developers
   - Troubleshooting common issues
   - Link to Infisical CLI documentation

2. **Update `CLAUDE.md`**
   - Document Infisical CLI commands
   - Add to development workflow

3. **Update `README.md`**
   - Replace manual `.env` setup with Infisical instructions
   - Add Prerequisites: Infisical CLI installation
   - Update Quick Start section

4. **Team Training**
   - 30-minute sync meeting to demo Infisical workflow
   - Share screen showing setup process
   - Answer questions

---

## Technical Considerations

### Security

**Current State → Infisical**:
- ✅ Removes plaintext `.env` files from local machines
- ✅ Secrets no longer shared via Slack/email/chat
- ✅ Single source of truth in Infisical Cloud
- ✅ Access control via Infisical's RBAC
- ⚠️ Still uses Vercel environment variables for production (acceptable)

**Secret Rotation**:
- Manual rotation as requested (team preference)
- Document rotation procedure in ONBOARDING.md
- Consider automating later if requirements change

**Backup & Recovery**:
- Infisical Cloud provides built-in backup and versioning
- Secrets can be exported: `infisical export --format=dotenv-export > backup.env`
- Document backup procedure in ONBOARDING.md

### Performance

**Local Development**:
- ⚠️ Slight delay on `npm run dev:infisical` (fetches secrets from Infisical API)
- ✅ Typically < 500ms, negligible for developer workflow
- ✅ Secrets cached in CLI after first fetch
- ✅ No impact after application starts (env vars loaded once)

**Production**:
- ✅ No performance impact (still uses Vercel env vars)
- ✅ No SDK runtime overhead

### Compatibility

**Next.js Integration**:
- ✅ Works seamlessly with Next.js environment variable loading
- ✅ `@t3-oss/env-nextjs` validation unchanged
- ✅ No code changes required in application

**Vercel Integration**:
- ✅ No changes to Vercel deployment
- ✅ Production continues using Vercel env vars
- ⚠️ If upgrading to Approach 2 later, can add Vercel integration

**Windows Compatibility**:
- ✅ Infisical CLI supports Windows (PowerShell, CMD)
- ✅ Tested on WSL, Windows native terminals
- Document Windows-specific commands in ONBOARDING.md

### Migration Strategy

**Rollout Plan**:
1. **Phase 1**: Lead developer sets up Infisical and validates workflow
2. **Phase 2**: Document setup process
3. **Phase 3**: Team sync meeting (30 minutes) to demo new workflow
4. **Phase 4**: Team members migrate to Infisical one by one
5. **Phase 5**: Remove old `.env` file after all team members verified

**Rollback Strategy**:
- Keep existing `.env` file (gitignored) during migration
- If Infisical fails, team can revert to `.env` immediately
- No code changes means zero rollback risk

**Coexistence Period**:
- 1-2 weeks coexistence to ensure all team members comfortable
- Support both workflows during transition
- Gradually deprecate `.env` usage

---

## Risks & Mitigations

### Risk 1: Infisical Cloud Service Outage

**Impact**: Cannot start local development server

**Probability**: Low (Infisical Cloud has 99.9% uptime SLA)

**Mitigation**:
- Keep `.env` file as backup during initial rollout
- Document fallback procedure in ONBOARDING.md
- Consider caching secrets locally (Infisical CLI does this automatically)

---

### Risk 2: Developer Resistance to New Tool

**Impact**: Delayed adoption, potential team friction

**Probability**: Medium (developers accustomed to existing workflow)

**Mitigation**:
- Emphasize benefits: "One command to start with all secrets"
- Hands-on demo during team sync meeting
- Provide clear, simple ONBOARDING.md documentation
- Coexistence period to let developers switch at their own pace
- Share success story: "No more asking for secrets in Slack"

---

### Risk 3: Infisical CLI Installation Issues

**Impact**: Developers blocked from starting work

**Probability**: Low (Infisical CLI well-maintained)

**Mitigation**:
- Document multiple installation methods (npm, brew, binary)
- Provide troubleshooting guide in ONBOARDING.md
- Test on all developer machines before rollout

---

### Risk 4: Secret Sync Conflicts

**Impact**: Inconsistent secrets across environments

**Probability**: Low (Vercel prod env vars unchanged)

**Mitigation**:
- Clear documentation: Infisical for local dev, Vercel for prod
- Document secret update procedure: Update in both Infisical and Vercel
- Consider adding "Secret Management" section to ops documentation

---

## Success Metrics

### Primary Metrics (Developer Experience)

1. **Onboarding Time Reduction**
   - Baseline: New developers need 30-60 minutes to setup `.env`
   - Target: Reduce to 10-15 minutes with Infisical
   - Measurement: Track time for next new developer

2. **Developer Satisfaction**
   - Baseline: Qualitative feedback on current workflow
   - Target: Positive feedback after 2 weeks of Infisical usage
   - Measurement: Anonymous survey after 2 weeks

3. **Secret Request Frequency**
   - Baseline: 3-5 Slack messages/week asking for secrets
   - Target: Zero secret request messages after migration
   - Measurement: Monitor team communication channels

### Secondary Metrics (Process Improvement)

4. **Secret Update Time**
   - Baseline: 10-15 minutes to notify all team members of secret changes
   - Target: 2-3 minutes to update in Infisical (team auto-syncs)
   - Measurement: Time tracker for next secret rotation

5. **Onboarding Documentation Quality**
   - Baseline: No dedicated onboarding documentation
   - Target: Comprehensive ONBOARDING.md with < 5-minute error rate
   - Measurement: Track questions/issues from new developers

---

## Dependencies

### Required Before Implementation

1. ✅ **Infisical Cloud Account**
   - Sign up at app.infisical.com
   - Free tier sufficient for small team (2-5 developers)

2. ✅ **Infisical CLI Installation**
   - All developers must install CLI
   - Document installation methods in ONBOARDING.md

3. ✅ **Secrets Inventory**
   - List all current secrets from `.env` file
   - Validate secret values are correct

### Optional (Future Enhancements)

1. ⚠️ **Staging Environment**
   - Add `staging` environment in Infisical (can add later)
   - Use for pre-production testing

2. ⚠️ **Automated Secret Rotation**
   - Implement later if requirements change
   - Use Infisical's secret rotation features

3. ⚠️ **Vercel Integration**
   - Upgrade to Approach 2 if production secrets management becomes painful
   - Sync secrets from Infisical to Vercel automatically

4. ⚠️ **Secrets Scanning**
   - Enable Infisical's secret scanning to prevent accidental commits
   - Integrate with GitHub for automated scanning

---

## Estimated Timeline

| Phase | Tasks | Duration | Owner |
|-------|-------|----------|-------|
| **Phase 1: Infisical Cloud Setup** | Create account, organization, project, add secrets, configure access | 4 hours | Lead Developer |
| **Phase 2: Local Development Setup** | Install CLI, authenticate, initialize project, verify setup | 2 hours | Lead Developer |
| **Phase 3: Update Development Workflow** | Update npm scripts, README, .gitignore, commit .infisical.json | 1 hour | Lead Developer |
| **Phase 4: Team Onboarding & Documentation** | Create ONBOARDING.md, update CLAUDE.md/README.md, team training | 2 hours | Lead Developer + Team |
| **Phase 5: Team Migration** | Individual developer setups, coexistence period, remove old .env | 1-2 weeks | All Developers |

**Total Implementation Time**: **9-10 hours** (Lead Developer) + **1-2 weeks** (Team Migration)

**Risk Buffer**: Add 20% for unexpected issues → **10-12 hours** + **2 weeks**

---

## Next Steps

1. **Create Implementation Plan** (Recommended)
   - Run `/plan` command to generate detailed implementation plan
   - Plan will include specific commands, file changes, and tasks
   - Plan maintains continuity with this brainstorm summary

2. **Proceed with Implementation** (Alternative)
   - Skip planning and start implementing directly
   - Follow phases outlined in "Implementation Plan" section
   - Create ONBOARDING.md as primary artifact

3. **Defer Implementation** (Alternative)
   - Gather more information about Infisical Cloud free tier limits
   - Discuss with team for buy-in before implementation
   - Pilot with 1-2 developers first

---

## Unresolved Questions

None. All key questions answered during brainstorm session.

---

## Appendix: Infisical CLI Reference

### Essential Commands

```bash
# Login (one-time setup)
infisical login

# Initialize project (one-time setup)
infisical init

# Run with secrets (daily usage)
infisical run --env=dev -- npm run dev

# Run with secrets and watch for changes
infisical run --watch --env=dev -- npm run dev

# List all secrets
infisical secrets --env=dev

# Export secrets to file (backup)
infisical export --env=dev --format=dotenv-export > backup.env
```

### Configuration File (.infisical.json)

```json
{
  "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "env": "dev",
  "path": "/"
}
```

**Note**: This file is safe to commit to git (contains no sensitive data).

---

**End of Brainstorm Report**
