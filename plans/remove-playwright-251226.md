# Plan: Remove Playwright from zuno-marketplace-abis

**Date:** 2025-12-26
**Status:** Draft
**Priority:** Medium
**Estimated Time:** 30-45 minutes

---

## Executive Summary

Remove all Playwright-related code, dependencies, and references from the zuno-marketplace-abis project. This includes deleting test files, configuration, CI/CD jobs, and updating documentation.

**Rationale:** E2E tests are not actively used and removal simplifies the codebase.

---

## 1. Files to DELETE

### 1.1 Configuration Files

| File Path | Action | Verification |
|-----------|--------|--------------|
| `playwright.config.ts` | DELETE | File no longer exists |
| `tests/e2e/homepage.spec.ts` | DELETE | File no longer exists |
| `tests/helpers/global-setup.ts` | DELETE | File no longer exists |
| `tests/e2e/` directory | DELETE | Remove if empty after file deletion |

### 1.2 Build Artifacts (Generated)

| Directory | Action | Verification |
|-----------|--------|--------------|
| `playwright-report/` | DELETE | Directory no longer exists |
| `test-results/` | DELETE | Directory no longer exists |

**Commands to execute:**
```bash
# Delete config files
rm -f playwright.config.ts
rm -f tests/e2e/homepage.spec.ts
rm -f tests/helpers/global-setup.ts

# Delete directories
rm -rf tests/e2e/
rm -rf playwright-report/
rm -rf test-results/

# Clean up empty tests/helpers if empty
rmdir tests/helpers/ 2>/dev/null || true
```

**Verification steps:**
```bash
# Confirm files are gone
ls playwright.config.ts 2>&1 | grep "No such file"
ls tests/e2e/ 2>&1 | grep "No such file"
ls playwright-report/ 2>&1 | grep "No such file"
ls test-results/ 2>&1 | grep "No such file"
```

---

## 2. Files to EDIT

### 2.1 `package.json`

**Location:** Root directory

**Changes:**

1. **Remove script (line ~22):**
```diff
- "test:e2e": "playwright test",
```

2. **Remove dependency (line ~90):**
```diff
- "@playwright/test": "^1.57.0",
```

**Edit command (using sed or manual):**
```bash
# Remove script line
sed -i '/"test:e2e": "playwright test",/d' package.json

# Remove dependency line (in devDependencies section)
sed -i '/"@playwright\/test": "\^1.57.0",/d' package.json

# Regenerate lockfile
pnpm install
```

**Verification:**
```bash
grep -E "test:e2e|playwright" package.json  # Should return nothing
grep "@playwright" pnpm-lock.yaml | wc -l  # Should be 0
```

---

### 2.2 `.github/workflows/ci.yml`

**Location:** `.github/workflows/ci.yml`

**Changes:**

Remove the entire `e2e-tests` job (lines 147-205):

```yaml
# DELETE this entire job section:
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, test]
    ... (entire job to line 205)
```

**Edit to remove:**
```yaml
# Lines 147-205 to be removed completely
# No other job depends on e2e-tests, so safe to remove
```

**Verification:**
```bash
grep -E "e2e-tests|playwright" .github/workflows/ci.yml  # Should return nothing
```

---

### 2.3 `.gitignore`

**Location:** Root directory

**Changes:**

Remove lines 49 and 51:

```diff
- test-results
- playwright-report
```

**Edit command:**
```bash
sed -i '/^test-results$/d' .gitignore
sed -i '/^playwright-report$/d' .gitignore
```

**Verification:**
```bash
grep -E "^test-results$|^playwright-report$" .gitignore  # Should return nothing
```

---

### 2.4 `README.md`

**Location:** Root directory

**Changes by line/section:**

1. **Line ~60 - Technical Architecture:**
```diff
- **Backend**
- - 🗄️ PostgreSQL 14+ with Drizzle ORM
- - ⚡ Upstash Redis for caching
- - 🔐 Better Auth for authentication
- - 📦 Pinata for IPFS storage
- - 🏗️ Clean Architecture (Hexagonal)
- - 🧪 Jest + Playwright for testing
+ **Backend**
+ - 🗄️ PostgreSQL 14+ with Drizzle ORM
+ - ⚡ Upstash Redis for caching
+ - 🔐 Better Auth for authentication
+ - 📦 Pinata for IPFS storage
+ - 🏗️ Clean Architecture (Hexagonal)
+ - 🧪 Jest for testing
```

2. **Line ~753 - Available Commands:**
```diff
- pnpm test:e2e           # E2E tests
```

3. **Line ~754 - Testing Commands Section:**
```diff
  # Testing
  pnpm test               # Unit tests
  pnpm test:watch         # Watch mode
- pnpm test:e2e           # E2E tests
  pnpm test:coverage      # Coverage report
```

4. **Line ~880 - Test Structure:**
```diff
  tests/
  ├── unit/              # Unit tests (Jest)
  ├── integration/       # Integration tests (Jest)
- └── e2e/              # E2E tests (Playwright)
+ └── integration/       # Integration tests (Jest)
```

5. **Lines ~895-899 - Running Tests Section:**
```diff
  # Coverage report
  pnpm test:coverage

- # E2E tests
- pnpm test:e2e

- # E2E with UI
- pnpm test:e2e --ui
```

6. **Lines ~918-926 - E2E Test Example:**
```diff
- #### E2E Test Example
-
- ```typescript
- import { test, expect } from "@playwright/test";
-
- test("should display ABIs list", async ({ page }) => {
-   await page.goto("/admin/abis");
-   await expect(page.locator("h1")).toContainText("ABIs");
- });
- ```
```

7. **Line ~933 - Test Coverage Goals:**
```diff
  - **Unit Tests**: >80% coverage
  - **Integration Tests**: All API endpoints
- - **E2E Tests**: Critical user flows
```

8. **Line ~964 - Pre-deployment Checklist:**
```diff
- - [ ] All tests passing (`pnpm test && pnpm test:e2e`)
+ - [ ] All tests passing (`pnpm test`)
```

9. **Line ~1540 - Contributing Section:**
```diff
  pnpm test       # Unit tests
- pnpm test:e2e   # E2E tests (optional)
```

**Verification:**
```bash
grep -i "playwright\|test:e2e\|@playwright" README.md  # Should return nothing
grep -E "E2E.*test" README.md  # Should return only non-Playwright mentions
```

---

### 2.5 `docs/project-overview-pdr.md`

**Location:** `docs/project-overview-pdr.md`

**Changes:**

1. **Line ~294 - Dependencies Table:**
```diff
  | **Testing** | Jest | 30.2 | Unit testing |
- | | Playwright | 1.57 | E2E testing |
```

2. **Line ~396 - Testing Requirements:**
```diff
- - **Testing**: >80% unit test coverage, critical path E2E tests
+ - **Testing**: >80% unit test coverage
```

3. **Line ~423 - Pre-deployment:**
```diff
- - All tests passing (unit, integration, E2E)
+ - All tests passing (unit, integration)
```

**Verification:**
```bash
grep -i "playwright\|test:e2e" docs/project-overview-pdr.md  # Should return nothing
```

---

### 2.6 `docs/codebase-summary.md`

**Location:** `docs/codebase-summary.md`

**Changes:**

1. **Line ~36 - Project Structure:**
```diff
  ├── tests/                     # Test suites (unit, integration, E2E)
+ ├── tests/                     # Test suites (unit, integration)
```

2. **Line ~45 - Config Files:**
```diff
  ├── drizzle.config.ts          # Database configuration
- ├── playwright.config.ts       # E2E test configuration
  ├── eslint.config.mjs          # Linting rules
```

3. **Line ~547 - Config Table:**
```diff
- | `playwright.config.ts` | E2E test configuration | Browser settings, timeout configs |
```

4. **Line ~572 - tests/ Directory:**
```diff
  tests/
  ├── setup/              # Jest configuration
  ├── unit/               # Unit tests
- ├── e2e/                # E2E browser tests
  └── api/                # API integration tests
```

5. **Line ~643 - Dependencies:**
```diff
  **Testing**:
  - Jest 30.2: Unit and integration testing
- - Playwright 1.57: E2E browser testing
  - @testing-library/react 16.3: React component testing
```

6. **Line ~701 - Commands:**
```diff
  pnpm test                   # Unit tests
- pnpm test:e2e              # E2E tests
```

7. **Line ~712 - Full Test Suite:**
```diff
- pnpm test && pnpm test:e2e
+ pnpm test
```

8. **Line ~756 - Test Files Summary:**
```diff
- | **Test Files** | 30+ | Unit, integration, E2E |
+ | **Test Files** | 25+ | Unit, integration |
```

**Verification:**
```bash
grep -i "playwright\|test:e2e" docs/codebase-summary.md  # Should return nothing
```

---

### 2.7 `docs/code-standards.md`

**Location:** `docs/code-standards.md`

**Changes:**

1. **Line ~521 - Test Coverage Goals:**
```diff
  - **Unit Tests**: >80% code coverage
  - **Integration Tests**: All API endpoints
- - **E2E Tests**: Critical user flows
  - **Skipped Tests**: Mark with `.skip` and add comment with issue/reason
```

**Verification:**
```bash
grep -i "playwright\|test:e2e" docs/code-standards.md  # Should return nothing
```

---

### 2.8 `.claude/skills/backend-development/references/backend-testing.md`

**Location:** `.claude/skills/backend-development/references/backend-testing.md`

**Changes:**

Remove section **"## E2E Testing"** (lines 244-268 approximately):

```diff
- ## E2E Testing
-
- ### Playwright (Modern, Multi-Browser)
-
- [Playwright](https://playwright.dev/) - Modern E2E testing framework from Microsoft.
-
- **Features:**
- - Multi-browser support (Chromium, Firefox, WebKit)
- - Fast, reliable, and parallel execution
- - Built-in waiting mechanisms
- - Network interception and mocking
- - Trace viewer for debugging
- - Visual regression testing
-
- **Basic Example:**
- ```typescript
- import { test, expect } from '@playwright/test';
-
- test.describe('ABI API', () => {
-   test('should list ABIs', async ({ page }) => {
-     await page.goto('/api/abis');
-     await expect(page.locator('pre')).toContainText('success');
-   });
- });
- ```
```

**Note:** The `.claude/skills/` directory contains reference documentation that is project-agnostic. Only remove Playwright-specific references that are project-specific examples. The generic E2E testing content can remain if it's educational material.

**Verification:**
```bash
grep -n "Playwright\|@playwright" .claude/skills/backend-development/references/backend-testing.md
```

---

## 3. Rollback Plan

### 3.1 Pre-Execution Backup

**Before making changes, create a backup:**
```bash
# Create backup branch
git checkout -b backup/remove-playwright-$(date +%Y%m%d)

# Or create a backup tarball
tar -czf ~/backup-playwright-remove-$(date +%Y%m%d).tar.gz \
  playwright.config.ts \
  tests/e2e/ \
  tests/helpers/ \
  package.json \
  pnpm-lock.yaml \
  .github/workflows/ci.yml \
  .gitignore \
  README.md \
  docs/project-overview-pdr.md \
  docs/codebase-summary.md \
  docs/code-standards.md
```

### 3.2 Rollback Commands

**If you need to restore from backup:**

```bash
# Restore from tarball
tar -xzf ~/backup-playwright-remove-YYYYMMDD.tar.gz

# Or revert to backup branch
git checkout backup/remove-playwright-YYYYMMDD -- .

# Reinstall dependencies
pnpm install
```

### 3.3 Git Rollback

**If changes were committed:**
```bash
# Revert the commit
git revert <commit-hash>

# Or reset to before commit (if not pushed)
git reset --hard HEAD~1

# Or reset specific files
git checkout HEAD~1 -- playwright.config.ts package.json README.md
```

---

## 4. Execution Order

**Execute in this sequence to minimize issues:**

1. **Create backup branch** (git checkout -b backup/remove-playwright-251226)
2. **Delete files** (config files, test files, build artifacts)
3. **Edit package.json** (remove script, dependency, regenerate lockfile)
4. **Edit CI/CD workflow** (remove e2e-tests job)
5. **Edit .gitignore** (remove playwright entries)
6. **Update documentation** (README.md, docs/*.md)
7. **Verify changes** (run all verification commands)
8. **Run tests** (pnpm test to ensure nothing broke)
9. **Commit changes** (with clear commit message)

---

## 5. Verification Steps

### 5.1 Post-Execution Verification

**Run all commands to confirm successful removal:**

```bash
# File checks - should all fail (files not found)
ls playwright.config.ts 2>&1
ls tests/e2e/ 2>&1
ls playwright-report/ 2>&1

# Code checks - should find no references
grep -r "playwright\|@playwright\|test:e2e" package.json README.md docs/ .github/workflows/ 2>/dev/null | grep -v node_modules | grep -v ".claude/skills"

# Dependency check
pnpm list @playwright/test 2>&1 | grep -q "empty" && echo "Playwright removed successfully"

# Lockfile check
grep "@playwright/test" pnpm-lock.yaml 2>&1 | wc -l  # Should be 0

# Git status
git status  # Review all changes before committing
```

### 5.2 Build Verification

```bash
# Install dependencies
pnpm install

# Type check
pnpm typecheck

# Run tests
pnpm test

# Build
pnpm build
```

### 5.3 CI/CD Verification

```bash
# Verify workflow syntax (requires act)
act -l  # List jobs - e2e-tests should not appear

# Or manual review
cat .github/workflows/ci.yml | grep -A5 "jobs:"
```

---

## 6. Git Commit Message

**Recommended commit message:**

```
chore: remove Playwright E2E testing framework

Remove all Playwright-related code, dependencies, and configuration:
- Delete playwright.config.ts and E2E test files
- Remove @playwright/test dependency from package.json
- Remove e2e-tests job from CI/CD workflow
- Update documentation to remove Playwright references
- Clean up .gitignore entries

Rationale: E2E tests not actively used, simplifying codebase

Files changed:
- Deleted: playwright.config.ts, tests/e2e/, tests/helpers/
- Modified: package.json, .github/workflows/ci.yml, .gitignore
- Modified: README.md, docs/project-overview-pdr.md, docs/codebase-summary.md, docs/code-standards.md
```

---

## 7. Potential Issues & Mitigations

| Issue | Likelihood | Mitigation |
|-------|-----------|------------|
| Broken references in code | Low | Use grep to find all references |
| CI/CD job dependencies | Low | No other jobs depend on e2e-tests |
| Lockfile corruption | Medium | Always run `pnpm install` after edit |
| Documentation missed | Medium | Use grep across all docs |
| Other E2E test dependencies | Low | `pnpm why @playwright/test` to check |

---

## 8. Post-Removal Checklist

- [ ] All Playwright files deleted
- [ ] `package.json` updated (script + dependency)
- [ ] `pnpm-lock.yaml` regenerated
- [ ] CI/CD workflow updated
- [ ] `.gitignore` updated
- [ ] README.md updated
- [ ] All docs/ updated
- [ ] Verification commands pass
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] `pnpm typecheck` passes
- [ ] Git commit created
- [ ] Changes pushed (after review)

---

## 9. References

- Scout Report: `plans/reports/scout-251226-playwright-codebase-inventory.md`
- Development Rules: `.claude/workflows/development-rules.md`
- Project README: `README.md`
- CI/CD Config: `.github/workflows/ci.yml`

---

**End of Plan**
