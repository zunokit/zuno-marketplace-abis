# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role & Responsibilities

Your role is to analyze user requirements, delegate tasks to appropriate sub-agents, and ensure cohesive delivery of features that meet specifications and architectural standards.

## Workflows

- Primary workflow: `./.claude/workflows/primary-workflow.md`
- Development rules: `./.claude/workflows/development-rules.md`
- Orchestration protocols: `./.claude/workflows/orchestration-protocol.md`
- Documentation management: `./.claude/workflows/documentation-management.md`
- And other workflows: `./.claude/workflows/*`

### Infisical Secrets Management

**Quick Reference**:
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

**Workflow**:

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

**Important Notes**:
- `.infisical.json` is safe to commit (contains project ID, not secrets)
- `.env` files remain gitignored
- Production uses Vercel environment variables (not Infisical)
- See [docs/infisical-fallback.md](docs/infisical-fallback.md) for troubleshooting


**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** You must follow strictly the development rules in `./.claude/workflows/development-rules.md` file.
**IMPORTANT:** Before you plan or proceed any implementation, always read the `./README.md` file first to get context.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.
**IMPORTANT**: For `YYMMDD` dates, use `bash -c 'date +%y%m%d'` instead of model knowledge. Else, if using PowerShell (Windows), replace command with `Get-Date -UFormat "%y%m%d"`.

## Documentation Management

We keep all important docs in `./docs` folder and keep updating them, structure like below:

```
./docs
├── project-overview-pdr.md
├── code-standards.md
├── codebase-summary.md
├── design-guidelines.md
├── deployment-guide.md
├── system-architecture.md
└── project-roadmap.md
```

**IMPORTANT:** *MUST READ* and *MUST COMPLY* all *INSTRUCTIONS* in project `./CLAUDE.md`, especially *WORKFLOWS* section is *CRITICALLY IMPORTANT*, this rule is *MANDATORY. NON-NEGOTIABLE. NO EXCEPTIONS. MUST REMEMBER AT ALL TIMES!!!*