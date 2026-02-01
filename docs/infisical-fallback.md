# Infisical Fallback Procedures

## If Infisical Cloud is Down

**Symptom**: `pnpm dev:infisical` fails with connection error

**Solution**: Use local `.env` file temporarily

```bash
# Restore from backup
cp .env.backup .env

# Start dev server with local env
pnpm dev:local
```

## If Infisical CLI Fails

**Symptom**: CLI crashes, hangs, or shows permission errors

**Solution**: Reinstall global package

```bash
# Reinstall global package
npm uninstall -g @infisical/cli
npm install -g @infisical/cli

# Re-authenticate if needed
infisical logout
infisical login
```

## If Authentication Fails

**Symptom**: `infisical whoami` shows no user or auth error

**Solution**:
```bash
infisical logout
infisical login
```

Follow browser prompts to re-authenticate.

## If Secrets are Missing

**Symptom**: Application starts but environment variables are empty or incorrect

**Solution**:
```bash
# Verify secrets exist in Infisical
infisical secrets --env=dev

# If missing, restore from backup
infisical export --env=dev --format=dotenv-export < backup.env
```

## If Project Not Initialized

**Symptom**: Error: `.infisical.json not found`

**Solution**:
```bash
# Initialize project (requires Phase 1 completion)
infisical init

# Follow prompts:
# 1. Select project: "zuno-marketplace-abis"
# 2. Select environment: "dev"
# 3. Confirm defaults (path: "/")
```

## Contact Team Lead

If none of above work, contact team lead for:
- Infisical organization access
- Emergency secrets distribution
- Escalation to Infisical support
- Alternative development setup

## Windows-Specific Issues

### Permission Denied Error

**Symptom**: `infisical: command not found` or permission errors

**Solution**: Install Infisical CLI globally:
```bash
npm install -g @infisical/cli
```

## Quick Reference

| Problem | Command |
|---------|---------|
| CLI not working | `infisical --version` |
| Auth issue | `infisical logout && infisical login` |
| Missing secrets | `infisical secrets --env=dev` |
| Project not found | `infisical init` |
| Use local .env | `cp .env.backup .env && pnpm dev:local` |

---

**Last Updated**: 2026-02-01
