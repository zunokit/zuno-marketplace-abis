# Rate Limiting Testing Guide

Scripts để test rate limiting bypass cho admin users.

## 📋 Overview

PR #32 fix issue: **Admin users' API keys vẫn bị rate limited**

**Solution:** Admin users' API keys giờ sẽ bypass rate limiting (unlimited requests).

## 🧪 Testing Workflow

### **Bước 1: Tạo test API keys**

```bash
pnpm tsx scripts/create-test-api-keys.ts
```

Script sẽ tạo:
- ✅ Admin user với API key (role: admin, tier: enterprise, unlimited)
- ✅ Regular user với API key (role: user, tier: free, 500 req/hr)

Output sẽ show API key values để dùng cho testing.

### **Bước 2: Start dev server**

```bash
pnpm dev
```

Server phải chạy ở `http://localhost:3000` (hoặc cấu hình trong `.env`)

### **Bước 3: Run rate limit test**

**Linux/Mac:**
```bash
TEST_ADMIN_API_KEY="sk_test_xxx..." \
TEST_REGULAR_API_KEY="sk_test_yyy..." \
pnpm tsx scripts/test-rate-limit.ts
```

**Windows (PowerShell):**
```powershell
$env:TEST_ADMIN_API_KEY="sk_test_xxx..."
$env:TEST_REGULAR_API_KEY="sk_test_yyy..."
pnpm tsx scripts/test-rate-limit.ts
```

**Windows (CMD):**
```cmd
set TEST_ADMIN_API_KEY=sk_test_xxx...
set TEST_REGULAR_API_KEY=sk_test_yyy...
pnpm tsx scripts/test-rate-limit.ts
```

## 📊 Expected Results

### ✅ Admin API Key Test
```
🧪 Testing: Admin User API Key (Should Bypass Rate Limiting)
============================================================
✅ Request #1  | Status: 200 | Limit: Infinity | Remaining: Infinity
✅ Request #2  | Status: 200 | Limit: Infinity | Remaining: Infinity
...
✅ Request #15 | Status: 200 | Limit: Infinity | Remaining: Infinity

📊 Summary:
  Total Requests:     15
  Successful (2xx):   15
  Rate Limited (429): 0
  Rate Limit:         Infinity
  ✅ ADMIN KEY - No rate limiting (Infinity)
```

### ⚠️ Regular API Key Test
```
🧪 Testing: Regular User API Key (Should Be Rate Limited)
============================================================
✅ Request #1  | Status: 200 | Limit: 500 | Remaining: 499
✅ Request #2  | Status: 200 | Limit: 500 | Remaining: 498
...
✅ Request #10 | Status: 200 | Limit: 500 | Remaining: 490

📊 Summary:
  Total Requests:     10
  Successful (2xx):   10
  Rate Limited (429): 0
  Rate Limit:         500
  Last Remaining:     490
  ⚠️  REGULAR KEY - Rate limited (500/hr)
```

## 🔍 Debug Script

Nếu có issue, check API key owner:

```bash
pnpm tsx scripts/debug-api-key-owner.ts <api-key-id>
```

Sẽ show:
- API key metadata
- Owner user info (email, role, banned status)
- Rate limit tier
- Whether should bypass rate limiting

## 🐛 Troubleshooting

### Issue: "Server is not running"
**Fix:** Start dev server với `pnpm dev`

### Issue: "No API keys provided"
**Fix:** Chạy `create-test-api-keys.ts` trước để tạo test keys

### Issue: Admin key vẫn bị rate limited
**Debug steps:**
1. Check user role: `pnpm tsx scripts/debug-api-key-owner.ts <key-id>`
2. Verify user có `role = 'admin'` trong database
3. Check logs trong terminal (should see "Admin API key - bypassing rate limit")
4. Verify đang test trên đúng branch: `git branch --show-current`

### Issue: Rate limit headers không hiện
**Fix:** Verify API endpoint có set rate limit headers. Check `src/shared/lib/api/api-handler.ts`

## 📝 What Changed in PR #32

### Before (develop-claude)
```typescript
// Only hardcoded env API keys bypass rate limiting
if (isHardcodedAdminApiKey(apiKeyValue)) {
  context.rateLimit = { limit: Infinity, remaining: Infinity, reset: 0 };
}
// Admin users' API keys still rate limited ❌
```

### After (copilot/fix-api-rate-limit-error)
```typescript
// Check if API key should bypass rate limiting
const isHardcodedAdmin = isHardcodedAdminApiKey(apiKeyValue);
const isOwnerAdmin = !isHardcodedAdmin && await isApiKeyOwnerAdmin(apiKey);

if (isHardcodedAdmin || isOwnerAdmin) {
  // ✅ Both hardcoded AND admin users' keys bypass rate limiting
  context.rateLimit = { limit: Infinity, remaining: Infinity, reset: 0 };
}
```

### New Function Added
```typescript
// src/infrastructure/auth/auth-helpers.ts
export async function isApiKeyOwnerAdmin(apiKey: AuthApiKey): Promise<boolean> {
  // Query database to check if API key owner has role='admin'
  const [userRecord] = await db
    .select({ role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, apiKey.userId))
    .limit(1);

  return userRecord?.role === "admin";
}
```

## 🚀 After Testing

Nếu tests pass:
1. ✅ Commit changes
2. ✅ Push to branch
3. ✅ Merge PR #32
4. ✅ Deploy to production

## 📞 Support

Issues? Check:
- PR #32: https://github.com/ZunoKit/zuno-marketplace-abis/pull/32
- Issue #30: Rate limiting for admin API keys
