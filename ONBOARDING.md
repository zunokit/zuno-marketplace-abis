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

### Step 2: Infisical CLI (Already Installed) (0 minutes)

Infisical CLI should be installed globally. Run `infisical --version` to verify.

### Step 3: Login to Infisical (2 minutes)

```bash
infisical login
```

This opens your browser. Login with your email and authorize CLI access.

> **Note**: If you don't have Infisical access, contact team lead to be added to the organization.

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

### "npx: command not found"

```bash
# Verify Infisical CLI is installed
infisical --version

# If not found, install globally
npm install -g @infisical/cli
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
