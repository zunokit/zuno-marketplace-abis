/**
 * Quick test for a specific API key to check rate limiting
 *
 * Usage: pnpm tsx scripts/quick-test-api-key.ts <api-key-value>
 * Example: pnpm tsx scripts/quick-test-api-key.ts zuno_xxx_admin_xxx_01
 */

import { db } from "@/infrastructure/database/drizzle/client";
import { apiKey as apiKeyTable, user as userTable } from "@/infrastructure/database/drizzle/schema/auth.schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const BASE_URL = "http://localhost:3000";
const TEST_ENDPOINT = "/api/contracts";

// Hash API key using SHA-256 with base64url encoding (Better Auth format)
function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("base64url");
}

async function checkApiKeyInDb(apiKeyValue: string) {
  console.log("\n🔍 Checking API key in database...");
  console.log("─".repeat(60));

  const hashedKey = hashApiKey(apiKeyValue);

  // Find API key by hashed value
  const result = await db
    .select({
      keyId: apiKeyTable.id,
      keyName: apiKeyTable.name,
      userId: apiKeyTable.userId,
      enabled: apiKeyTable.enabled,
      metadata: apiKeyTable.metadata,
      userEmail: userTable.email,
      userName: userTable.name,
      userRole: userTable.role,
    })
    .from(apiKeyTable)
    .innerJoin(userTable, eq(apiKeyTable.userId, userTable.id))
    .where(eq(apiKeyTable.key, hashedKey))
    .limit(1);

  if (result.length === 0) {
    console.log("❌ API key not found in database!");
    console.log("   Make sure the key is valid and exists.");
    return null;
  }

  const data = result[0];

  console.log("✅ API Key Found:");
  console.log(`  Key ID:      ${data.keyId}`);
  console.log(`  Key Name:    ${data.keyName}`);
  console.log(`  Enabled:     ${data.enabled}`);
  console.log("");
  console.log("👤 Owner:");
  console.log(`  User ID:     ${data.userId}`);
  console.log(`  Email:       ${data.userEmail}`);
  console.log(`  Name:        ${data.userName}`);
  console.log(`  Role:        ${data.userRole}`);
  console.log("");

  const metadata = data.metadata as any;
  const tier = metadata?.type || "free";

  console.log("📊 Rate Limit Info:");
  console.log(`  Tier:        ${tier}`);

  if (data.userRole === "admin") {
    console.log(`  ✅ USER IS ADMIN - Should bypass rate limiting`);
    console.log(`  ✅ Expected: Limit = Infinity, Remaining = Infinity`);
  } else {
    console.log(`  ⚠️  User is NOT admin`);
    console.log(`  ⚠️  Expected: Rate limited based on tier (${tier})`);
  }

  console.log("");

  return data;
}

async function testRateLimit(apiKeyValue: string) {
  console.log("\n🧪 Testing rate limiting with live API requests...");
  console.log("─".repeat(60));

  const numRequests = 5;

  for (let i = 1; i <= numRequests; i++) {
    try {
      const response = await fetch(`${BASE_URL}${TEST_ENDPOINT}`, {
        headers: {
          "x-api-key": apiKeyValue,
        },
      });

      const limit = response.headers.get("x-ratelimit-limit");
      const remaining = response.headers.get("x-ratelimit-remaining");
      const reset = response.headers.get("x-ratelimit-reset");

      const icon = response.ok ? "✅" : "❌";

      console.log(
        `${icon} Request #${i} | ` +
        `Status: ${response.status} | ` +
        `Limit: ${limit || "N/A"} | ` +
        `Remaining: ${remaining || "N/A"}`
      );

      if (i === 1) {
        console.log("");
        if (limit === "Infinity") {
          console.log("  ✅ CONFIRMED: No rate limiting (admin bypass working!)");
        } else {
          console.log(`  ⚠️  Rate limited: ${limit} requests per hour`);
        }
        console.log("");
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.log(`❌ Request #${i} | Error: ${error instanceof Error ? error.message : "Unknown"}`);
    }
  }

  console.log("");
}

async function main() {
  console.log("\n🚀 Quick Rate Limit Test");
  console.log("═".repeat(60));

  const apiKeyValue = process.argv[2];

  if (!apiKeyValue) {
    console.error("❌ Please provide API key value");
    console.error("");
    console.error("Usage:");
    console.error("  pnpm tsx scripts/quick-test-api-key.ts <api-key-value>");
    console.error("");
    console.error("Example:");
    console.error("  pnpm tsx scripts/quick-test-api-key.ts zuno_xxx_admin_xxx_01");
    process.exit(1);
  }

  console.log(`API Key: ${apiKeyValue.substring(0, 20)}...`);
  console.log(`Base URL: ${BASE_URL}`);

  // Step 1: Check database
  const dbData = await checkApiKeyInDb(apiKeyValue);

  if (!dbData) {
    process.exit(1);
  }

  if (!dbData.enabled) {
    console.log("❌ API key is disabled! Enable it first.");
    process.exit(1);
  }

  // Step 2: Test with actual requests
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/health`);
    if (!healthCheck.ok) {
      throw new Error("Health check failed");
    }
  } catch (error) {
    console.error("\n❌ Server is not running at", BASE_URL);
    console.error("   Start server with: pnpm dev");
    process.exit(1);
  }

  await testRateLimit(apiKeyValue);

  console.log("═".repeat(60));
  console.log("✅ Test completed!");
  console.log("═".repeat(60));
  console.log("");
}

main().catch(error => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
