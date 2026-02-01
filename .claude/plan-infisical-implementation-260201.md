---
title: "Infisical CLI Implementation Plan"
description: "Implement Infisical CLI for local development secrets management to improve developer experience and streamline onboarding"
status: pending
priority: P2
effort: 10-12h
branch: main
tags: [infisical, secrets-management, developer-experience, onboarding]
created: 2026-02-01
---

# Infisical CLI Implementation Plan

**Project**: zuno-marketplace-abis
**Approach**: Infisical CLI for Local Development Only (Approach 1 from brainstorm)
**Total Effort**: 10-12 hours (Lead Developer) + 1-2 weeks (Team Migration)
**Risk Buffer**: 20% included

---

## Executive Summary

This plan implements Infisical CLI to inject secrets into the local development environment, addressing the primary pain point of manual `.env` file setup. The solution keeps Vercel environment variables for production deployment, focusing on developer experience without over-engineering for a small team (2-5 developers).

**Key Benefits**:
- Single command to start development with all secrets
- Reduced onboarding time from 30-60 minutes to 10-15 minutes
- Eliminates secrets sharing via Slack/email
- Zero code changes to application

---

## Prerequisites

### Before Starting Implementation

1. **Infisical Cloud Account**
   - Sign up at [app.infisical.com](https://app.infisical.com)
   - Free tier sufficient for 2-5 developers

2. **Current Secrets Inventory**
   - Verify all secrets in `.env` file are correct
   - Backup current `.env` file: `cp .env .env.backup`

3. **Team Buy-in**
   - Inform team of upcoming workflow change
   - Schedule 30-minute training meeting for Phase 4

4. **Access to Vercel Dashboard**
   - Verify current production environment variables are documented
   - Ensure Vercel env vars will remain for production deployment

---

## Phase 1: Infisical Cloud Setup (4 hours)

### Task 1.1: Create Infisical Account and Organization (30 minutes)

**Actions**:
```bash
# 1. Sign up at https://app.infisical.com
# 2. Create organization: "Zuno Marketplace" (or existing org name)
# 3. Verify email address
```

**Verification**:
- [ ] Successfully logged in to Infisical Cloud dashboard
- [ ] Organization created/confirmed

**Rollback**:
- Delete account if needed (infisical.com → Settings → Account → Delete)

---

### Task 1.2: Create Project and Dev Environment (30 minutes)

**Actions**:
```bash
# 1. Navigate to Infisical Cloud dashboard
# 2. Click "New Project"
# 3. Project name: "zuno-marketplace-abis"
# 4. Create environment: "dev"
#    - Keep defaults for now
```

**Verification**:
- [ ] Project created with correct name
- [ ] "dev" environment exists in project

**Rollback**:
- Delete project in Infisical Cloud dashboard

---

### Task 1.3: Add Secrets to Infisical (2 hours)

**Actions**:

Add all secrets from current `.env` file to Infisical `dev` environment:

**Database Secrets**:
```
Key: DATABASE_URL
Value: [Copy from .env]
```

**Auth Secrets**:
```
Key: BETTER_AUTH_SECRET
Value: [Copy from .env]

Key: BETTER_AUTH_URL
Value: http://localhost:3000
```

**Cache Secrets**:
```
Key: UPSTASH_REDIS_REST_URL
Value: [Copy from .env]

Key: UPSTASH_REDIS_REST_TOKEN
Value: [Copy from .env]
```

**IPFS Secrets**:
```
Key: PINATA_JWT
Value: [Copy from .env]

Key: PINATA_GATEWAY_URL
Value: [Copy from .env]

Key: PINATA_UPLOAD_ENABLED
Value: [Copy from .env]
```

**Monitoring Secrets**:
```
Key: SENTRY_DSN
Value: [Copy from .env]

Key: NEXT_PUBLIC_SENTRY_DSN
Value: [Copy from .env]

Key: SENTRY_AUTH_TOKEN
Value: [Copy from .env]

Key: SENTRY_ENABLED
Value: [Copy from .env]

Key: NEXT_PUBLIC_SENTRY_ENABLED
Value: [Copy from .env]

Key: SENTRY_ORG
Value: [Copy from .env]

Key: SENTRY_PROJECT
Value: [Copy from .env]
```

**App Config Secrets**:
```
Key: NEXT_PUBLIC_APP_URL
Value: http://localhost:3000

Key: PUBLIC_API_USER_ID
Value: [Copy from .env]

Key: DEFAULT_ADMIN_EMAIL
Value: [Copy from .env]

Key: DEFAULT_ADMIN_PASSWORD
Value: [Copy from .env]

Key: API_KEYS
Value: [Copy from .env, if present]

Key: CORS_ALLOWED_ORIGINS
Value: [Copy from .env, if present]

Key: FOUNDRY_OUT_DIR
Value: [Copy from .env, if present]

Key: FOUNDRY_BROADCAST_DIR
Value: [Copy from .env, if present]

Key: NODE_ENV
Value: development
```

**Verification**:
```bash
# Test fetching secrets from Infisical (after Phase 2 setup)
infisical secrets --env=dev
```

Expected: All secrets listed with correct values

**Rollback**:
- Delete secrets individually in Infisical dashboard
- Restore from `.env.backup` file

---

### Task 1.4: Configure Access Control (1 hour)

**Actions**:
```bash
# 1. Invite team members to organization
#    - Go to Settings → Members → Invite
#    - Enter team member emails (2-5 developers)
# 2. Grant permissions:
#    - All members: Read access to "dev" environment
#    - Lead developer: Write access to "dev" environment
# 3. Verify member access levels
```

**Verification**:
- [ ] All team members invited
- [ ] Correct permissions assigned
- [ ] Test: Team member can access Infisical Cloud

**Rollback**:
- Remove member access from organization settings

---

## Phase 2: Local Development Setup (2 hours)

### Task 2.1: Install Infisical CLI (30 minutes)

**Actions**:

**Option A: npm (Recommended for Node.js developers)**
```bash
npm install -g @infisical/cli
```

**Option B: brew (macOS)**
```bash
brew install infisical/tap/infisical
```

**Option C: Binary (Windows/Linux)**
```bash
# Download from https://github.com/Infisical/infisical/releases
# Extract and add to PATH
```

**Verification**:
```bash
infisical --version
```

Expected: Version number displayed (e.g., `0.14.0`)

**Rollback**:
```bash
# npm
npm uninstall -g @infisical/cli

# brew
brew uninstall infisical

# Binary
Remove downloaded binary from PATH
```

---

### Task 2.2: Authenticate to Infisical (30 minutes)

**Actions**:
```bash
infisical login
```

**Follow prompts**:
1. Opens browser window
2. Login to Infisical Cloud account
3. Authorize CLI access
4. Success message in terminal

**Verification**:
```bash
infisical whoami
```

Expected: Displays logged-in user email

**Rollback**:
```bash
infisical logout
```

---

### Task 2.3: Initialize Project (30 minutes)

**Actions**:
```bash
cd E:\zuno-marketplace-abis
infisical init
```

**Follow prompts**:
1. Select project: "zuno-marketplace-abis"
2. Select environment: "dev"
3. Confirm defaults (path: "/")

**Creates file**: `.infisical.json`

**Verification**:
```bash
cat .infisical.json
```

Expected output:
```json
{
  "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "env": "dev",
  "path": "/"
}
```

**Rollback**:
```bash
rm .infisical.json
```

---

### Task 2.4: Verify Setup (30 minutes)

**Actions**:

**Test 1: List secrets**
```bash
infisical secrets --env=dev
```

Expected: All secrets from Infisical displayed

**Test 2: Print environment variables**
```bash
infisical run --env=dev -- printenv
```

Expected: All environment variables loaded with values from Infisical

**Test 3: Verify specific secret**
```bash
infisical run --env=dev -- bash -c 'echo $DATABASE_URL'
```

Expected: Database URL value displayed

**Verification Checklist**:
- [ ] All secrets listed in `infisical secrets --env=dev`
- [ ] `printenv` shows all environment variables
- [ ] Specific secret values match Infisical

**Rollback**:
- Continue using existing `.env` file
- `infisical logout` if CLI issues

---

## Phase 3: Update Development Workflow (1 hour)

### Task 3.1: Update npm Scripts (15 minutes)

**File to modify**: `package.json`

**Current state** (verify these scripts exist):
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "dev:local": "next dev --turbopack",
    "dev:infisical": "infisical run --env=dev -- next dev --turbopack",
    "build": "next build --turbopack",
    "build:infisical": "infisical run --env=prod -- next build --turbopack"
  }
}
```

**If scripts don't exist, add them**:
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "dev:local": "next dev --turbopack",
    "dev:infisical": "infisical run --env=dev -- next dev --turbopack",
    "dev:watch": "infisical run --watch --env=dev -- next dev --turbopack",
    "build": "next build --turbopack",
    "build:infisical": "infisical run --env=prod -- next build --turbopack"
  }
}
```

**Verification**:
```bash
pnpm run dev:infisical
```

Expected: Dev server starts with secrets from Infisical

**Rollback**:
- Remove added scripts from `package.json`

---

### Task 3.2: Update README.md (20 minutes)

**File to modify**: `README.md`

**Add new section** (after Prerequisites section, before Installation):

```markdown
## 🔐 Secrets Management with Infisical

This project uses **Infisical CLI** for local development secrets management.

### Why Infisical?

- ✅ Single command to start development with all secrets
- ✅ No manual `.env` file setup required
- ✅ Secure secrets storage in Infisical Cloud
- ✅ Team-friendly: All developers access same secrets
- ✅ Production still uses Vercel environment variables

### Quick Start with Infisical

#### 1. Install Infisical CLI

```bash
npm install -g @infisical/cli
```

#### 2. Login to Infisical

```bash
infisical login
```

This opens your browser for authentication.

#### 3. Start Development Server

```bash
pnpm dev:infisical
```

This command:
1. Fetches all secrets from Infisical (dev environment)
2. Injects them into the environment
3. Starts Next.js dev server with Turbopack

### Alternative: Local .env File

If you prefer using a local `.env` file (not recommended for team members):

```bash
# Copy example file
cp .env.example .env

# Fill in your values
# Ask team lead for secrets
```

Then run:
```bash
pnpm dev:local
```

### Managing Secrets

**View all secrets**:
```bash
infisical secrets --env=dev
```

**Export secrets (backup)**:
```bash
infisical export --env=dev --format=dotenv-export > backup.env
```

**Watch mode (auto-reload on secret changes)**:
```bash
pnpm dev:watch
```

### Need Help?

- See [ONBOARDING.md](ONBOARDING.md) for detailed setup guide
- Check [Infisical Documentation](https://infisical.com/docs/cli)
- Ask team lead for access to Infisical organization
```

**Remove/update** existing `.env` setup instructions:
- Keep minimal `.env` setup as alternative for special cases
- Reference Infisical as primary method

**Verification**:
- [ ] README.md updated with Infisical section
- [ ] Code blocks tested and working
- [ ] Links valid

**Rollback**:
- Revert README.md changes with git

---

### Task 3.3: Update .gitignore (10 minutes)

**File to modify**: `.gitignore`

**Verify these entries exist** (or add them):
```
# Environment variables
.env
.env.local
.env.*.local

# Infisical
# Note: .infisical.json is SAFE to commit (contains no secrets)
# Infisical CLI cache (should not be committed)
.infisical/
```

**Verification**:
```bash
git status
```

Expected: `.env` files are untracked, `.infisical.json` is tracked

**Rollback**:
- Revert `.gitignore` changes with git

---

### Task 3.4: Commit .infisical.json (5 minutes)

**Actions**:
```bash
git add .infisical.json
git commit -m "chore(secrets): add Infisical CLI configuration"
```

**Rationale**: `.infisical.json` contains no sensitive data (only project ID, environment, path) and is safe to commit.

**Verification**:
```bash
git log -1 --stat
```

Expected: `.infisical.json` included in commit

**Rollback**:
```bash
git reset --soft HEAD~1
```

---

### Task 3.5: Create Fallback Documentation (10 minutes)

**File to create**: `docs/infisical-fallback.md`

```markdown
# Infisical Fallback Procedures

## If Infisical Cloud is Down

**Symptom**: `infisical run` fails with connection error

**Solution**: Use local `.env` file temporarily

```bash
# Restore from backup
cp .env.backup .env

# Start dev server with local env
pnpm dev:local
```

## If Infisical CLI Fails

**Symptom**: CLI crashes or hangs

**Solution**: Reinstall CLI

```bash
# npm
npm uninstall -g @infisical/cli
npm install -g @infisical/cli

# Re-authenticate
infisical login
```

## If Authentication Fails

**Symptom**: `infisical whoami` shows no user

**Solution**:
```bash
infisical logout
infisical login
```

## If Secrets are Missing

**Symptom**: Application starts but environment variables are empty

**Solution**:
```bash
# Verify secrets exist in Infisical
infisical secrets --env=dev

# If missing, restore from backup
infisical export --env=dev --format=dotenv-export < backup.env
```

## Contact Team Lead

If none of the above work, contact team lead for:
- Infisical organization access
- Emergency secrets distribution
- Escalation to Infisical support
```

**Verification**:
- [ ] File created at `docs/infisical-fallback.md`
- [ ] All procedures tested

**Rollback**:
- Delete fallback documentation file

---

## Phase 4: Team Onboarding & Documentation (2 hours)

### Task 4.1: Create ONBOARDING.md (1 hour)

**File to create**: `ONBOARDING.md`

```markdown
# Developer Onboarding Guide - Zuno Marketplace ABIs

Welcome to the team! This guide will help you set up your development environment in 10-15 minutes.

---

## Quick Start (10 Minutes)

### Step 1: Install Dependencies (3 minutes)

```bash
# Clone repository
git clone https://github.com/ZunoKit/zuno-marketplace-abis.git
cd zuno-marketplace-abis

# Install dependencies
pnpm install
```

### Step 2: Install Infisical CLI (2 minutes)

**npm** (recommended):
```bash
npm install -g @infisical/cli
```

**Or other methods**:
- macOS: `brew install infisical/tap/infisical`
- Windows/Linux: Download binary from [GitHub Releases](https://github.com/Infisical/infisical/releases)

### Step 3: Login to Infisical (2 minutes)

```bash
infisical login
```

This opens your browser. Login with your email and authorize CLI access.

### Step 4: Start Development Server (1 minute)

```bash
pnpm dev:infisical
```

That's it! You should see the dev server running at http://localhost:3000

---

## Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Admin Dashboard** | http://localhost:3000/admin | Ask team lead for credentials |
| **API Documentation** | http://localhost:3000/api/docs | Public access |
| **Health Check** | http://localhost:3000/api/health | Public access |

---

## Common Commands

```bash
# Development
pnpm dev:infisical           # Start dev server with Infisical
pnpm dev:local              # Start dev server with local .env
pnpm dev:watch              # Start with secret watching enabled

# Database
pnpm db:generate            # Generate migrations
pnpm db:migrate             # Run migrations
pnpm db:seed                # Seed database
pnpm db:studio              # Open database GUI

# Testing
pnpm test                   # Run tests
pnpm typecheck              # Type checking
pnpm lint                   # Lint code

# Build
pnpm build                  # Production build
pnpm build:infisical        # Build with Infisical secrets
```

---

## Managing Secrets

### View All Secrets
```bash
infisical secrets --env=dev
```

### Export Secrets (Backup)
```bash
infisical export --env=dev --format=dotenv-export > backup.env
```

### When Secrets Change

Infisical CLI caches secrets locally. If secrets are updated in Infisical Cloud:

```bash
# Force refresh
infisical secrets --env=dev

# Or use watch mode (auto-reload)
pnpm dev:watch
```

---

## Troubleshooting

### "infisical: command not found"
```bash
# Reinstall CLI
npm install -g @infisical/cli

# Verify installation
infisical --version
```

### "Authentication failed"
```bash
infisical logout
infisical login
```

### "Permission denied" on Infisical
- Contact team lead to add you to the organization
- Verify you're using the correct email address

### Secrets not loading
```bash
# Verify secrets exist
infisical secrets --env=dev

# Check network connection
ping app.infisical.com

# Try fallback method
cp .env.example .env
pnpm dev:local
```

### More Issues?

See [docs/infisical-fallback.md](docs/infisical-fallback.md) for detailed troubleshooting.

---

## Getting Help

**Team Communication**:
- Slack: #zuno-marketplace-dev
- Email: team@zuno-marketplace.com

**Documentation**:
- [README.md](README.md) - Project overview
- [CLAUDE.md](CLAUDE.md) - Development workflows
- [API Documentation](docs/api/) - API reference

**External Resources**:
- [Infisical Documentation](https://infisical.com/docs/cli)
- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)

---

## Next Steps

1. **Explore the codebase**: Read [docs/codebase-summary.md](docs/codebase-summary.md)
2. **Set up your IDE**: Install recommended VS Code extensions
3. **Run tests**: `pnpm test` to verify everything works
4. **Make your first contribution**: Check GitHub issues for good first tasks

---

## Architecture Overview

This project follows **Clean Architecture** (Hexagonal):

```
┌─────────────────────────────────────────────────────────┐
│                  Presentation Layer                      │
│  (Next.js App Router, API Routes, Server Actions)       │
└────────────────────┬────────────────────────────────────┘
                      │
┌────────────────────▼────────────────────────────────────┐
│                 Application Layer                        │
│          (Use Cases, Business Logic)                     │
└────────────────────┬────────────────────────────────────┘
                      │
┌────────────────────▼────────────────────────────────────┐
│                   Domain Layer                           │
│     (Entities, Repository Interfaces, Services)         │
└────────────────────┬────────────────────────────────────┘
                      │
┌────────────────────▼────────────────────────────────────┐
│               Infrastructure Layer                       │
│  (Database, Cache, Storage, External Services)          │
└─────────────────────────────────────────────────────────┘
```

See [docs/system-architecture.md](docs/system-architecture.md) for details.

---

## Code Standards

- Follow [docs/code-standards.md](docs/code-standards.md)
- Use TypeScript strict mode
- Write tests for new features
- Conventional commits: `feat(scope): description`

---

## Welcome Aboard! 🚀

We're excited to have you on the team. If you have any questions, don't hesitate to ask in Slack or reach out to any team member.

---

**Last Updated**: 2026-02-01
```

**Verification**:
- [ ] File created at `ONBOARDING.md`
- [ ] All commands tested
- [ ] Links verified

**Rollback**:
- Delete ONBOARDING.md

---

### Task 4.2: Update CLAUDE.md (20 minutes)

**File to modify**: `CLAUDE.md`

**Add new section** under "Workflows" (after existing workflows):

```markdown
## Infisical Secrets Management

### Quick Reference

```bash
# Daily usage
pnpm dev:infisical              # Start dev server with Infisical
pnpm dev:watch                 # Watch for secret changes
pnpm build:infisical            # Build with Infisical secrets

# Secret management
infisical secrets --env=dev    # List all secrets
infisical login                # Authenticate
infisical whoami               # Check authentication
```

### Workflow

**Development**:
1. Clone repo and run `pnpm install`
2. Run `infisical login` (one-time)
3. Run `pnpm dev:infisical` to start development

**Secret Rotation**:
1. Update secret in Infisical Cloud dashboard
2. Team auto-syncs on next `pnpm dev:infisical`
3. Update production secrets in Vercel separately

**Onboarding New Developers**:
1. Send them [ONBOARDING.md](ONBOARDING.md)
2. Add them to Infisical organization (Settings → Members)
3. Grant "Read" access to "dev" environment

### Important Notes

- `.infisical.json` is safe to commit (contains project ID, not secrets)
- `.env` files remain gitignored
- Production uses Vercel environment variables (not Infisical)
- See [docs/infisical-fallback.md](docs/infisical-fallback.md) for troubleshooting
```

**Verification**:
- [ ] CLAUDE.md updated with Infisical section
- [ ] Commands verified working

**Rollback**:
- Revert CLAUDE.md changes with git

---

### Task 4.3: Update README.md Quick Start (10 minutes)

**File to modify**: `README.md`

**Replace** existing "Quick Start" section with:

```markdown
## 🚀 Quick Start

### Prerequisites

| Requirement | Minimum Version | Recommended | Purpose |
|-------------|----------------|-------------|---------|
| **Node.js** | 18.x | 20.x LTS | Runtime environment |
| **pnpm** | 8.x | 9.x | Package manager |
| **Infisical CLI** | Latest | Latest | Secrets management |
| **PostgreSQL** | 14.x | 16.x | Primary database |
| **Upstash Redis** | - | Cloud | Caching & rate limiting |
| **Pinata Account** | - | Cloud | IPFS storage |

### Installation (5 Minutes Setup)

#### 1️⃣ Clone & Install Dependencies

```bash
# Clone repository
git clone https://github.com/ZunoKit/zuno-marketplace-abis.git
cd zuno-marketplace-abis

# Install dependencies (pnpm recommended)
pnpm install
```

#### 2️⃣ Install Infisical CLI & Login

```bash
# Install CLI
npm install -g @infisical/cli

# Login to Infisical Cloud
infisical login
```

> **Note**: If you don't have Infisical access, contact team lead to be added to the organization.

#### 3️⃣ Setup Database

```bash
# Generate authentication types
pnpm auth:generate

# Generate database migrations and TypeScript types
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed database with networks, admin user, and test data
pnpm db:seed
```

#### 4️⃣ Start Development Server

```bash
# Start with Turbopack (fast HMR) and Infisical secrets
pnpm dev:infisical
```

### 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Public marketplace (coming soon) |
| **Admin Dashboard** | http://localhost:3000/admin | ABI management interface |
| **API** | http://localhost:3000/api | RESTful API endpoints |
| **Health Check** | http://localhost:3000/api/health | System status & version |
| **Database Studio** | `pnpm db:studio` | Visual database browser |

### 🔐 Default Admin Credentials

```
Email: admin@example.com
Password: admin123
```

**⚠️ IMPORTANT**: Change these credentials immediately in production!

```bash
# Login at http://localhost:3000/admin
# Go to Settings > Account > Change Password
```

### ✅ Verify Installation

```bash
# Type check
pnpm typecheck

# Run tests
pnpm test

# Health check
curl http://localhost:3000/api/health
```

**Expected Output**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-19T...",
  "version": "v1",
  "services": {
    "database": "connected",
    "cache": "connected",
    "ipfs": "connected"
  }
}
```

---

### Alternative: Local .env File

If you prefer not to use Infisical (not recommended for team members):

```bash
# Copy example file
cp .env.example .env

# Fill in your values (ask team lead for secrets)
# Edit .env file with your credentials

# Start dev server with local env
pnpm dev:local
```

> **Note**: Using local `.env` file is discouraged for team collaboration. Secrets managed in Infisical ensure consistency across the team.
```

**Verification**:
- [ ] README.md Quick Start section updated
- [ ] All commands tested
- [ ] Links verified

**Rollback**:
- Revert README.md changes with git

---

### Task 4.4: Team Training Meeting (30 minutes)

**Actions**:

**Preparation** (before meeting):
1. Share ONBOARDING.md with team via Slack
2. Test all commands on your machine
3. Prepare demo environment

**Meeting Agenda** (30 minutes):

**Part 1: Overview (5 minutes)**
- Why we're adopting Infisical
- Benefits: "One command to start with all secrets"
- Timeline: 1-2 weeks migration period

**Part 2: Live Demo (15 minutes)**
```bash
# Show CLI installation
npm install -g @infisical/cli

# Show authentication
infisical login

# Show starting dev server
pnpm dev:infisical

# Show watching for secret changes
pnpm dev:watch
```

**Part 3: Q&A (10 minutes)**
- Answer team questions
- Address concerns
- Collect feedback

**Follow-up Actions**:
1. Share meeting notes/recordings
2. Schedule 1-on-1 sessions for blockers
3. Monitor team adoption during migration period

**Verification**:
- [ ] Team meeting scheduled
- [ ] Demo prepared and tested
- [ ] Meeting notes shared

**Rollback**:
- Cancel meeting if critical blockers discovered
- Defer implementation if team consensus not reached

---

## Phase 5: Team Migration (1-2 weeks)

### Task 5.1: Individual Developer Setups (Ongoing - Week 1)

**Actions**:

**For each developer**:

1. **Self-service onboarding** (10-15 minutes):
   ```bash
   # Follow ONBOARDING.md
   npm install -g @infisical/cli
   infisical login
   pnpm dev:infisical
   ```

2. **Verification**:
   - Developer runs `pnpm dev:infisical` successfully
   - Developer reports no errors in Slack

3. **Support**:
   - Team lead available for 1-on-1 help
   - Troubleshooting via Slack
   - Use docs/infisical-fallback.md if needed

**Tracking**:
```markdown
## Migration Tracker

| Developer | Status | Date | Notes |
|-----------|--------|------|-------|
| Developer 1 | ✅ Migrated | 2026-02-01 | No issues |
| Developer 2 | ⏳ In Progress | 2026-02-02 | Needs auth help |
| Developer 3 | 📅 Scheduled | 2026-02-03 | |
| Developer 4 | 📅 Scheduled | 2026-02-04 | |
| Developer 5 | 📅 Scheduled | 2026-02-05 | |
```

**Verification**:
- [ ] All developers have Infisical CLI installed
- [ ] All developers can run `pnpm dev:infisical`
- [ ] Migration tracker updated

**Rollback**:
- Individual developers revert to `.env` if needed
- No impact on other developers

---

### Task 5.2: Coexistence Period (Week 1-2)

**Actions**:

**During this period**:
- Both workflows supported: `pnpm dev:infisical` and `pnpm dev:local`
- `.env` file remains as backup
- Team encouraged to use Infisical but not forced

**Communication**:
- Weekly standup check-in on migration progress
- Slack reminders: "Try pnpm dev:infisical today!"
- Success stories shared in team chat

**Monitoring**:
- Track which developers using which workflow
- Collect feedback on Infisical experience
- Identify and address blockers

**Verification**:
- [ ] No production issues during coexistence
- [ ] Team feedback collected
- [ ] Blockers identified and resolved

**Rollback**:
- Extend coexistence period if needed
- Revert to `.env`-only if critical blockers

---

### Task 5.3: Remove Old .env File (Week 2)

**Actions**:

**Prerequisites** (must be met before removal):
- [ ] All 5 developers successfully using Infisical
- [ ] Zero complaints/issues for 3+ days
- [ ] Team consensus on removal
- [ ] `.env.backup` preserved for emergency

**Removal Process**:

1. **Backup .env**:
   ```bash
   # Archive old .env file (keep for emergency)
   cp .env .env.backup.archive
   cp .env .env.emergency-restore
   ```

2. **Remove .env**:
   ```bash
   # Remove from local machines
   rm .env
   rm .env.local
   ```

3. **Update Documentation**:
   - Mark `.env` usage as "Emergency Fallback Only"
   - Update ONBOARDING.md to de-emphasize `.env` method
   - Add note: "Use Infisical. .env only for emergencies."

4. **Commit changes**:
   ```bash
   git add -A
   git commit -m "chore(secrets): remove .env file, using Infisical exclusively"
   ```

**Verification**:
```bash
# Test Infisical-only workflow
pnpm dev:infisical

# Verify app starts successfully
curl http://localhost:3000/api/health
```

**Rollback** (if issues arise):
```bash
# Emergency restore
cp .env.emergency-restore .env

# Restart dev server
pnpm dev:local
```

---

### Task 5.4: Post-Migration Review (Week 2)

**Actions**:

**Collect Feedback**:
- Anonymous survey: "How was the migration?"
- 1-on-1 check-ins with each developer
- Collect metrics: onboarding time, satisfaction

**Document Learnings**:
- What went well?
- What could be improved?
- Unexpected issues?

**Update Documentation**:
- Refine ONBOARDING.md based on feedback
- Add troubleshooting tips to docs/infisical-fallback.md
- Update CLAUDE.md with lessons learned

**Celebrate Success**:
- Share metrics: "Onboarding time reduced from 60 to 15 minutes!"
- Acknowledge team effort
- Plan next improvements (optional: staging environment, etc.)

**Verification**:
- [ ] Feedback collected from all developers
- [ ] Learnings documented
- [ ] Success metrics calculated
- [ ] Team satisfaction high

**Rollback**:
- Re-introduce `.env` if critical issues persist
- Schedule follow-up review

---

## Success Criteria

### Primary Metrics (Must Achieve)

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **Onboarding Time** | 30-60 minutes | 10-15 minutes | Time to `pnpm dev:infisical` success |
| **Team Adoption** | 0% | 100% | All 5 developers using Infisical |
| **Secret Requests** | 3-5/week | 0/week | Slack messages asking for secrets |
| **Setup Success Rate** | N/A | 100% | No blockers reported |

### Secondary Metrics (Nice to Have)

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **Developer Satisfaction** | Qualitative | Positive | Post-migration survey |
| **Secret Update Time** | 10-15 minutes | 2-3 minutes | Time to update secret in Infisical |
| **Documentation Quality** | No onboarding docs | < 5-min error rate | Questions/issues from new devs |

---

## Rollback Plan

### Immediate Rollback (Any Phase)

If critical issues arise during implementation:

1. **Stop using Infisical**:
   ```bash
   # Use local .env file
   cp .env.backup .env
   pnpm dev:local
   ```

2. **Revert code changes**:
   ```bash
   # Undo package.json changes
   git checkout package.json

   # Undo documentation changes
   git checkout README.md CLAUDE.md

   # Delete new files
   rm ONBOARDING.md docs/infisical-fallback.md
   ```

3. **Infisical cleanup**:
   ```bash
   # Logout CLI
   infisical logout

   # Remove CLI
   npm uninstall -g @infisical/cli
   ```

4. **Infisical Cloud** (optional):
   - Delete project in Infisical dashboard
   - Delete organization if created specifically for this

**Rollback Time**: 15-30 minutes

**Risk**: Zero - no code changes to application code

---

### Post-Migration Rollback (Week 2)

If issues arise after team migration:

1. **Restore .env file**:
   ```bash
   cp .env.emergency-restore .env
   ```

2. **Communicate to team**:
   - Slack: "Reverting to .env workflow"
   - Schedule meeting to discuss issues

3. **Analyze root cause**:
   - Why did Infisical fail?
   - Can issues be resolved?
   - Should we retry or abandon?

4. **Decision**:
   - **Retry**: Fix issues and re-migrate
   - **Abandon**: Stay with .env workflow indefinitely

**Rollback Time**: 1 hour

**Risk**: Low - backup `.env` file preserved

---

## File Changes Summary

### Files to Create

| File | Purpose | Size |
|------|---------|------|
| `ONBOARDING.md` | Developer onboarding guide | ~200 lines |
| `docs/infisical-fallback.md` | Troubleshooting procedures | ~100 lines |
| `.infisical.json` | Infisical project config (auto-generated) | ~5 lines |

### Files to Modify

| File | Changes | Impact |
|------|---------|--------|
| `package.json` | Add `dev:infisical`, `dev:watch`, `build:infisical` scripts | Low |
| `README.md` | Add Infisical section, update Quick Start | Medium |
| `.gitignore` | Verify `.env` entries exist | Low |
| `CLAUDE.md` | Add Infisical workflow section | Low |

### Files to Keep (No Changes)

| File | Status |
|------|--------|
| `.env.example` | No changes (template file) |
| `.env` | Keep during migration, remove in Phase 5 |
| `src/**/*` | No code changes required |
| `drizzle.config.ts` | No changes |
| `next.config.*` | No changes |

---

## Commands Reference

### Installation Commands

```bash
# npm
npm install -g @infisical/cli

# brew (macOS)
brew install infisical/tap/infisical

# Verify installation
infisical --version
```

### Authentication Commands

```bash
# Login
infisical login

# Check authentication
infisical whoami

# Logout
infisical logout
```

### Setup Commands

```bash
# Initialize project
infisical init

# List all secrets
infisical secrets --env=dev

# Export secrets
infisical export --env=dev --format=dotenv-export > backup.env
```

### Development Commands

```bash
# Start dev server with Infisical
pnpm dev:infisical

# Start with watch mode
pnpm dev:watch

# Start with local .env
pnpm dev:local
```

### Build Commands

```bash
# Build with Infisical
pnpm build:infisical

# Build with local .env
pnpm build
```

---

## Timeline

| Phase | Tasks | Duration | Start | End |
|-------|-------|----------|-------|-----|
| **Phase 1** | Infisical Cloud Setup | 4 hours | Day 1 AM | Day 1 AM |
| **Phase 2** | Local Development Setup | 2 hours | Day 1 PM | Day 1 PM |
| **Phase 3** | Update Development Workflow | 1 hour | Day 1 PM | Day 1 PM |
| **Phase 4** | Team Onboarding & Documentation | 2 hours | Day 2 AM | Day 2 AM |
| **Phase 5** | Team Migration | 1-2 weeks | Day 2 PM | Day 10+ |

**Total Lead Developer Time**: 9-10 hours
**Total Team Migration Time**: 1-2 weeks

**Gantt Chart**:
```
Day 1:  [Phase 1][Phase 2][Phase 3]
Day 2:  [Phase 4]         [Phase 5 Start]
Day 3-10:  [Phase 5: Team Migration & Coexistence]
```

---

## Dependencies & Risks

### Dependencies

| Dependency | Owner | Status |
|------------|-------|--------|
| Infisical Cloud account | Lead Developer | ⚠️ Create before Phase 1 |
| Team buy-in | Team Lead | ⚠️ Communicate before Phase 4 |
| Vercel prod env vars documented | Lead Developer | ✅ Already exists |
| .env file backup | Lead Developer | ✅ Done in prerequisites |

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Infisical Cloud outage | Low | High | Keep .env backup during migration |
| Developer resistance | Medium | Medium | Emphasize benefits, demo live |
| CLI installation issues | Low | Medium | Document multiple install methods |
| Secret sync conflicts | Low | Low | Clear documentation: Infisical for dev, Vercel for prod |
| Team not onboarding | Low | Medium | Extend coexistence period |

---

## Post-Implementation Tasks (Optional)

### Future Enhancements (Not in Scope)

1. **Staging Environment** (can add later):
   - Add `staging` environment in Infisical
   - Use for pre-production testing

2. **Vercel Integration** (can upgrade to Approach 2 later):
   - Sync secrets from Infisical to Vercel automatically
   - Single source of truth for all environments

3. **Automated Secret Rotation** (if requirements change):
   - Use Infisical's secret rotation features
   - Schedule regular rotations

4. **Secrets Scanning**:
   - Enable Infisical's secret scanning
   - Integrate with GitHub for automated scanning

### Monitoring & Maintenance

1. **Weekly Checks** (during migration period):
   - Monitor team adoption
   - Address issues promptly
   - Collect feedback

2. **Monthly Reviews** (after migration):
   - Review usage metrics
   - Identify optimization opportunities
   - Plan improvements

3. **Quarterly Audits**:
   - Review access permissions
   - Rotate sensitive secrets
   - Update documentation

---

## Appendix: Verification Checklists

### Phase 1 Verification

- [ ] Infisical Cloud account created
- [ ] Organization "Zuno Marketplace" created
- [ ] Project "zuno-marketplace-abis" created
- [ ] Environment "dev" created
- [ ] All 20+ secrets added to Infisical
- [ ] Team members invited to organization
- [ ] Access permissions configured

### Phase 2 Verification

- [ ] Infisical CLI installed (`infisical --version`)
- [ ] Authenticated to Infisical (`infisical whoami`)
- [ ] Project initialized (`cat .infisical.json`)
- [ ] Can list secrets (`infisical secrets --env=dev`)
- [ ] Can inject secrets (`infisical run --env=dev -- printenv`)
- [ ] Specific secrets verified

### Phase 3 Verification

- [ ] npm scripts added/verified in package.json
- [ ] `pnpm dev:infisical` works
- [ ] README.md updated with Infisical section
- [ ] .gitignore verified
- [ ] .infisical.json committed to git
- [ ] Fallback documentation created

### Phase 4 Verification

- [ ] ONBOARDING.md created and tested
- [ ] CLAUDE.md updated with Infisical section
- [ ] README.md Quick Start updated
- [ ] Team training meeting completed
- [ ] Team feedback collected

### Phase 5 Verification

- [ ] All 5 developers using Infisical
- [ ] Migration tracker complete
- [ ] Coexistence period successful (3+ days, zero issues)
- [ ] .env file removed
- [ ] Post-migration review completed
- [ ] Success metrics achieved

---

## Unresolved Questions

None. All questions resolved during brainstorm session.

---

**End of Implementation Plan**

**Next Steps**:
1. Review this plan with team lead
2. Schedule implementation start date
3. Begin Phase 1: Infisical Cloud Setup
