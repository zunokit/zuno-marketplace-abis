# API Key Hashing Security Documentation

## Overview

Zuno Marketplace ABIs implements **secure API key storage** using cryptographic hashing via Better Auth's API Key plugin. All API keys are hashed with **SHA-256** before being stored in the database, protecting against unauthorized access even in the event of a database breach.

## Implementation Details

### Hashing Algorithm

- **Algorithm**: SHA-256 (via Web Crypto API)
- **Implementation**: Better Auth v1.3.27 API Key plugin
- **Configuration**: `disableKeyHashing: false` (explicit in `better-auth.config.ts`)

### Storage Architecture

```
Client API Key (plaintext)
      ↓
Better Auth API (createApiKey)
      ↓
SHA-256 Hash Function
      ↓
Database Storage (hash only)
      ↓
Verification (constant-time comparison)
```

### Database Schema

```typescript
// api_key table
{
  id: string,           // Unique identifier (e.g., "apikey_v1_xyz123")
  name: string,         // User-friendly name
  key: string,          // ⚠️ HASHED value (SHA-256) - NEVER plaintext
  start: string,        // First 8 chars for UI display (e.g., "zuno_abc")
  prefix: string,       // Key prefix (e.g., "zuno_")
  userId: string,       // Owner reference
  // ... other fields
}
```

**CRITICAL**: The `key` field ONLY stores the SHA-256 hash. The plaintext key is:
- Returned to the user ONCE during creation
- Never stored in the database
- Never retrievable after creation

## Security Features

### 1. Cryptographic Hashing

```typescript
// Better Auth configuration (src/infrastructure/auth/better-auth.config.ts)
apiKey({
  disableKeyHashing: false, // ✅ ENABLED: Keys are hashed with SHA-256
  defaultKeyLength: 32,     // 256-bit entropy
  defaultPrefix: "zuno_",
})
```

### 2. Verification Flow

```typescript
// Client sends API key
Authorization: Bearer zuno_abc123xyz...

// Server verifies (src/infrastructure/auth/auth-helpers.ts)
const result = await auth.api.verifyApiKey({
  body: { key: apiKeyValue }
})

// Better Auth internally:
// 1. Hashes the provided key (SHA-256)
// 2. Compares against stored hash (constant-time)
// 3. Returns key metadata if valid
```

### 3. Protection Against Database Breaches

**Scenario**: Attacker gains read access to database

**Without Hashing** (vulnerable):
```sql
SELECT key FROM api_key;
-- Returns: zuno_abc123xyz789... (plaintext - attacker can use immediately)
```

**With Hashing** (secure):
```sql
SELECT key FROM api_key;
-- Returns: a7f5c8d2e9b1... (SHA-256 hash - useless to attacker)
```

Even with database access, attackers **cannot**:
- Retrieve original API keys
- Use hashed values to authenticate
- Reverse the hash to discover keys

### 4. Additional Security Layers

Beyond hashing, we implement:

1. **Tier-based Rate Limiting** (Redis)
   - Public: 100 req/hour
   - Free: 500 req/hour
   - Pro: 5000 req/hour
   - Enterprise: Unlimited

2. **IP Whitelisting** (metadata-based)
   ```typescript
   metadata: {
     ipWhitelist: ['192.168.1.1', '10.0.0.0/8']
   }
   ```

3. **Origin Validation** (metadata-based)
   ```typescript
   metadata: {
     allowedOrigins: ['https://example.com']
   }
   ```

4. **Expiration Dates**
   ```typescript
   expiresAt: Date | null
   ```

5. **Enable/Disable Toggle**
   ```typescript
   enabled: boolean
   ```

## Verification & Auditing

### Security Verification Script

Run the verification script to audit API key security:

```bash
pnpm security:verify-api-keys
```

**What it checks**:
- All keys are properly hashed (not plaintext)
- Hash lengths are appropriate for SHA-256
- No suspicious patterns indicating plaintext storage

**Expected Output**:
```
🔐 API Key Hashing Verification
================================

📊 Verification Results:
   Total keys checked: 5
   Suspicious keys: 0

✅ SUCCESS: All API keys appear to be properly hashed!

Security Status: PASS
All API keys are stored using cryptographic hashing (SHA-256).
Even if the database is compromised, attackers cannot retrieve original keys.
```

### Manual Database Inspection

```sql
-- Check hash format (should be 64 hex chars or ~44 base64)
SELECT
  id,
  name,
  LENGTH(key) as hash_length,
  SUBSTRING(key, 1, 10) as hash_preview
FROM api_key;

-- Expected Results:
-- hash_length: 64 (hex) or ~44 (base64)
-- hash_preview: Random-looking characters (a7f5c8d2e9...)
```

## Key Lifecycle

### 1. Creation

```typescript
// Admin creates API key
const result = await auth.api.createApiKey({
  body: {
    userId: 'user_v1_abc',
    name: 'Production API Key',
    permissions: {
      abis: ['read', 'write'],
      contracts: ['read', 'write']
    }
  }
})

// Response includes plaintext key (ONLY TIME it's visible)
{
  id: 'apikey_v1_xyz',
  key: 'zuno_abc123xyz789...', // ⚠️ SAVE THIS - cannot be retrieved later
  name: 'Production API Key',
  // ...
}
```

**IMPORTANT**: The plaintext `key` is returned ONLY during creation. Users must save it immediately.

### 2. Storage

```typescript
// Better Auth stores hashed version
INSERT INTO api_key (id, name, key, start, ...)
VALUES (
  'apikey_v1_xyz',
  'Production API Key',
  'a7f5c8d2e9b1...', -- SHA-256 hash
  'zuno_abc',         -- First 8 chars for UI
  ...
)
```

### 3. Verification

```typescript
// Client sends request with API key
fetch('/api/abis', {
  headers: {
    'Authorization': 'Bearer zuno_abc123xyz789...'
  }
})

// Server verifies (constant-time hash comparison)
const apiKey = await verifyApiKey('zuno_abc123xyz789...')
if (!apiKey) {
  return 401 Unauthorized
}
```

### 4. Revocation

```typescript
// Delete from database
DELETE FROM api_key WHERE id = 'apikey_v1_xyz'

// Key is immediately invalid - no further action needed
```

## Best Practices

### For Developers

1. **Never log plaintext keys**
   ```typescript
   // ❌ BAD
   logger.info('API key created', { key: result.key })

   // ✅ GOOD
   logger.info('API key created', { keyId: result.id, name: result.name })
   ```

2. **Never query by key value**
   ```typescript
   // ❌ BAD - requires plaintext comparison
   SELECT * FROM api_key WHERE key = 'zuno_...'

   // ✅ GOOD - use Better Auth API
   await auth.api.verifyApiKey({ body: { key } })
   ```

3. **Always use Better Auth API for verification**
   ```typescript
   // ❌ BAD - manual hash comparison
   const hash = await sha256(providedKey)
   const match = await db.query.apiKey.findFirst({ where: eq(apiKey.key, hash) })

   // ✅ GOOD - Better Auth handles everything
   const result = await auth.api.verifyApiKey({ body: { key: providedKey } })
   ```

### For Users

1. **Save API keys immediately** - they cannot be retrieved later
2. **Store keys securely** - use environment variables or secret managers
3. **Rotate keys regularly** - especially for production access
4. **Use minimal permissions** - follow principle of least privilege
5. **Monitor usage** - review API key activity logs

## Security Incidents

### If Database is Compromised

**Good News**: API keys are hashed with SHA-256
- Attackers cannot retrieve original keys
- Keys remain unusable even with database access

**Recommended Actions**:
1. Rotate all API keys as a precaution
2. Audit access logs for suspicious activity
3. Review and strengthen database security
4. Consider adding additional security layers (IP whitelisting, etc.)

### If API Key is Leaked

**Immediate Actions**:
1. Revoke the compromised key
   ```typescript
   await db.delete(apiKey).where(eq(apiKey.id, compromisedKeyId))
   ```
2. Generate a new key for the user
3. Notify the user of the incident
4. Review logs to assess potential damage

## Configuration Reference

### Better Auth Config

```typescript
// src/infrastructure/auth/better-auth.config.ts
apiKey({
  // Security: API Key Hashing - ENABLED
  disableKeyHashing: false, // ✅ Keys are hashed with SHA-256

  // Key Configuration
  defaultPrefix: "zuno_",
  defaultKeyLength: 32, // 256-bit entropy

  // Metadata Support
  enableMetadata: true, // For IP whitelist, origin validation, etc.
})
```

### Database Schema

```typescript
// src/infrastructure/database/drizzle/schema/auth.schema.ts
export const apiKey = pgTable("api_key", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull().unique(), // ⚠️ HASHED (SHA-256)
  start: text("start"),                // First 8 chars for UI
  prefix: text("prefix"),              // e.g., "zuno_"
  // ...
})
```

## Testing

### Unit Tests

```typescript
// Verify hashing is enabled
test('API keys should be hashed in database', async () => {
  const result = await auth.api.createApiKey({
    body: {
      userId: 'test_user',
      name: 'Test Key'
    }
  })

  // Fetch from DB
  const dbKey = await db.query.apiKey.findFirst({
    where: eq(apiKey.id, result.id)
  })

  // Key in DB should NOT match plaintext
  expect(dbKey.key).not.toBe(result.key)
  expect(dbKey.key.length).toBeGreaterThan(40) // Hash should be long
})
```

### Integration Tests

```typescript
// Verify authentication works with hashed keys
test('Hashed keys should authenticate correctly', async () => {
  const { key } = await createTestApiKey()

  // Verify with plaintext key
  const result = await auth.api.verifyApiKey({ body: { key } })

  expect(result.valid).toBe(true)
  expect(result.key).toBeDefined()
})
```

## References

- [Better Auth API Key Plugin Documentation](https://www.better-auth.com/docs/plugins/api-key)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [NIST SP 800-63B: Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [SHA-256 Specification (FIPS 180-4)](https://csrc.nist.gov/publications/detail/fips/180/4/final)

---

**Last Updated**: 2025-01-19
**Better Auth Version**: 1.3.27
**Security Status**: ✅ API Key Hashing ENABLED
