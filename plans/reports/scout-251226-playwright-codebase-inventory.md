# Playwright Codebase Inventory Report
**Date:** 2025-12-26  
**Task:** Find ALL Playwright-related code for removal planning

---

## 1. Dependencies

### package.json
**File:** `E:\zuno-marketplace-abis\package.json`
```json
Line 22:  "test:e2e": "playwright test",
Line 90:    "@playwright/test": "^1.57.0",
```

### pnpm-lock.yaml
**File:** `E:\zuno-marketplace-abis\pnpm-lock.yaml`
- Multiple references to `@playwright/test@1.57.0` throughout lockfile
- Line 183, 1374, 5959: Direct dependency entries
- Line 7262, 7278, 8980, 8998: Transitive dependency references (better-auth, next)

### package-lock.json
**File:** `E:\zuno-marketplace-abis\package-lock.json`
- Line 70: `@playwright/test: ^1.56.0`
- Line 3300: `node_modules/@playwright/test` module entry
- Line 11810: Peer dependency reference

---

## 2. Configuration Files

### Playwright Config
**File:** `E:\zuno-marketplace-abis\playwright.config.ts`
```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/helpers/global-setup.ts",
  // ... full config (84 lines)
});
```

---

## 3. Test Files

### E2E Test File
**File:** `E:\zuno-marketplace-abis\tests\e2e\homepage.spec.ts`
```typescript
import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should display the homepage correctly", async ({ page }) => {
    // 77 lines of tests
  });
});
```

### Global Setup Helper
**File:** `E:\zuno-marketplace-abis\tests\helpers\global-setup.ts`
```typescript
import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  // TransformStream polyfill for older Node.js versions
}
```

---

## 4. CI/CD Configuration

### GitHub CI Workflow
**File:** `E:\zuno-marketplace-abis\.github\workflows\ci.yml`
```yaml
Lines 147-205: e2e-tests job
  - name: Cache Playwright Browsers (182)
    paths: ~/.cache/ms-playwright, ~/Library/Caches/ms-playwright, %LOCALAPPDATA%/ms-playwright
  - name: Install Playwright Browsers (191)
    run: pnpm exec playwright install --with-deps
  - name: Run E2E tests (194)
    run: pnpm test:e2e
  - name: Upload E2E test results (199)
    path: playwright-report/
```

---

## 5. Documentation References

### README.md
**File:** `E:\zuno-marketplace-abis\README.md`
- Line 753: `pnpm test:e2e           # E2E tests`
- Line 880: `└── e2e/              # E2E tests (Playwright)`
- Line 896: `pnpm test:e2e`
- Line 899: `pnpm test:e2e --ui`
- Line 918-926: E2E Test Example with `@playwright/test` import
- Line 933: `- **E2E Tests**: Critical user flows`
- Line 964: `pnpm test && pnpm test:e2e`
- Line 1540: `pnpm test:e2e   # E2E tests (optional)`

### docs/project-overview-pdr.md
- Line 294: `| Playwright | 1.57 | E2E testing |`
- Line 396, 423: References to E2E testing requirements

### docs/codebase-summary.md
- Line 36: `tests/` with E2E mention
- Line 45: `playwright.config.ts` file reference
- Line 547: Config description
- Line 572: `e2e/` directory structure
- Line 643: `Playwright 1.57: E2E browser testing`
- Line 701, 712: `pnpm test:e2e` commands
- Line 756: Test files count including E2E

### docs/code-standards.md
- Line 521: E2E Tests standards reference

### .claude/skills/backend-development/references/backend-testing.md
- Lines 244-268: Playwright E2E testing documentation and examples

---

## 6. Build Artifacts (Generated)

### Directories (to be cleaned)
- `E:\zuno-marketplace-abis\playwright-report/` - Contains index.html (~518KB)
- `E:\zuno-marketplace-abis\test-results/` - Contains results.json (~9.5KB)

---

## 7. .gitignore Entries

**File:** `E:\zuno-marketplace-abis\.gitignore`
```
Line 49: test-results
Line 51: playwright-report
```

---

## 8. Summary - Files for Removal

### Direct Removal
| File | Action |
|------|--------|
| `playwright.config.ts` | DELETE |
| `tests/e2e/homepage.spec.ts` | DELETE |
| `tests/helpers/global-setup.ts` | DELETE |
| `tests/e2e/` directory | DELETE (if empty) |

### Dependency Removal
| File | Lines to Remove |
|------|-----------------|
| `package.json` | Line 22 (script), Line 90 (devDependency) |
| `pnpm-lock.yaml` | Regenerated after package.json edit |
| `package-lock.json` | Regenerated or DELETE if using pnpm |

### CI/CD Updates
| File | Lines to Remove |
|------|-----------------|
| `.github/workflows/ci.yml` | Lines 147-205 (entire e2e-tests job) |

### Documentation Updates
| File | Sections to Update |
|------|-------------------|
| `README.md` | Remove E2E/playwright references (8 locations) |
| `docs/project-overview-pdr.md` | Update Playwright row |
| `docs/codebase-summary.md` | Remove E2E sections |
| `docs/code-standards.md` | Remove E2E standards |
| `.claude/skills/backend-development/references/backend-testing.md` | Remove Playwright section (lines 244-268) |

### Build Artifacts Cleanup
| Directory | Action |
|-----------|--------|
| `playwright-report/` | DELETE |
| `test-results/` | DELETE |

### .gitignore Updates
| File | Lines to Remove |
|------|-----------------|
| `.gitignore` | Lines 49, 51 |

---

## 9. ESLint Config

**File:** `E:\zuno-marketplace-abis\eslint.config.mjs`
- No Playwright-specific overrides found (uses next/core-web-vitals)

---

## Unresolved Questions
- None. All Playwright-related code has been identified.
