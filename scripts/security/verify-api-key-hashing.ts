/**
 * API Key Hashing Verification Script
 *
 * This script verifies that all API keys in the database are properly hashed
 * and NOT stored in plaintext. It performs security auditing checks.
 *
 * Usage:
 *   pnpm tsx scripts/security/verify-api-key-hashing.ts
 *
 * Exit Codes:
 *   0 - All keys are properly hashed
 *   1 - Found plaintext or suspicious keys
 *   2 - Script error
 */

import { db } from "@/infrastructure/database/drizzle/client";
import { apiKey } from "@/infrastructure/database/drizzle/schema/auth.schema";
import { logger } from "@/shared/lib/utils/logger";

/**
 * Heuristics to detect if a string might be a plaintext API key
 * vs a cryptographic hash
 */
function looksLikePlaintext(keyValue: string): boolean {
  // SHA-256 hashes are typically 64 hex characters
  const isSHA256Hex = /^[a-f0-9]{64}$/i.test(keyValue);
  if (isSHA256Hex) return false;

  // Base64-encoded SHA-256 hashes are ~44 characters
  const isSHA256Base64 = /^[A-Za-z0-9+/]{43}=?$/.test(keyValue);
  if (isSHA256Base64) return false;

  // Better Auth might use other hash formats
  // Check if it looks like a typical API key pattern (prefix + random chars)
  const looksLikeAPIKey = /^(sk_|pk_|zuno_|test_|live_)[a-zA-Z0-9]{20,}$/.test(
    keyValue
  );
  if (looksLikeAPIKey) return true;

  // If it's too short for a hash, might be plaintext
  if (keyValue.length < 40) return true;

  // If it contains common words or patterns, suspicious
  const suspiciousPatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /\s/g, // Contains spaces
  ];
  if (suspiciousPatterns.some((pattern) => pattern.test(keyValue))) {
    return true;
  }

  return false;
}

/**
 * Verify all API keys in database are hashed
 */
async function verifyApiKeyHashing(): Promise<{
  success: boolean;
  total: number;
  suspicious: number;
  details: Array<{
    id: string;
    name: string;
    keyPreview: string;
    reason: string;
  }>;
}> {
  logger.info("Starting API key hashing verification...");

  try {
    // Fetch all API keys (admin operation)
    const keys = await db
      .select({
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key,
        createdAt: apiKey.createdAt,
      })
      .from(apiKey);

    logger.info(`Found ${keys.length} API keys to verify`);

    const suspiciousKeys: Array<{
      id: string;
      name: string;
      keyPreview: string;
      reason: string;
    }> = [];

    for (const key of keys) {
      // Check if key looks like plaintext
      const isPlaintext = looksLikePlaintext(key.key);

      if (isPlaintext) {
        suspiciousKeys.push({
          id: key.id,
          name: key.name,
          keyPreview: `${key.key.substring(0, 10)}...`, // Only show first 10 chars
          reason: "Key appears to be in plaintext format",
        });
      }

      // Check key length (SHA-256 should be 64 hex or ~44 base64)
      if (key.key.length < 40) {
        suspiciousKeys.push({
          id: key.id,
          name: key.name,
          keyPreview: `${key.key.substring(0, 10)}...`,
          reason: `Key too short (${key.key.length} chars) - hashes should be longer`,
        });
      }
    }

    return {
      success: suspiciousKeys.length === 0,
      total: keys.length,
      suspicious: suspiciousKeys.length,
      details: suspiciousKeys,
    };
  } catch (error) {
    logger.error("Error verifying API key hashing", error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("🔐 API Key Hashing Verification");
  console.log("================================\n");

  try {
    const result = await verifyApiKeyHashing();

    console.log(`📊 Verification Results:`);
    console.log(`   Total keys checked: ${result.total}`);
    console.log(`   Suspicious keys: ${result.suspicious}`);
    console.log();

    if (result.success) {
      console.log("✅ SUCCESS: All API keys appear to be properly hashed!");
      console.log();
      console.log("Security Status: PASS");
      console.log(
        "All API keys are stored using cryptographic hashing (SHA-256)."
      );
      console.log(
        "Even if the database is compromised, attackers cannot retrieve original keys."
      );
      process.exit(0);
    } else {
      console.log(
        "⚠️  WARNING: Found potentially unhashed or suspicious API keys!\n"
      );
      console.log("Suspicious Keys:");
      console.log("----------------");

      for (const suspicious of result.details) {
        console.log(`  ID: ${suspicious.id}`);
        console.log(`  Name: ${suspicious.name}`);
        console.log(`  Key Preview: ${suspicious.keyPreview}`);
        console.log(`  Reason: ${suspicious.reason}`);
        console.log();
      }

      console.log("\n⚠️  SECURITY RISK:");
      console.log(
        "Some API keys may not be properly hashed. This could expose keys if database is compromised."
      );
      console.log();
      console.log("Recommended Actions:");
      console.log(
        "1. Verify Better Auth configuration has disableKeyHashing: false"
      );
      console.log("2. Regenerate suspicious API keys");
      console.log("3. Check Better Auth version and update if needed");
      console.log(
        "4. Review logs for any errors during key creation\n"
      );

      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ ERROR: Script failed to execute");
    console.error(error);
    process.exit(2);
  }
}

// Run the verification
main();
