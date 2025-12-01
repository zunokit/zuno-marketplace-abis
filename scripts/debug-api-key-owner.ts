/**
 * Debug script to check API key owner's role
 * Usage: pnpm tsx scripts/debug-api-key-owner.ts <api-key-id>
 */

import { db } from "@/infrastructure/database/drizzle/client";
import { apiKey as apiKeyTable, user as userTable } from "@/infrastructure/database/drizzle/schema/auth.schema";
import { eq } from "drizzle-orm";

async function debugApiKeyOwner(apiKeyId: string) {
  console.log(`\n🔍 Checking API key: ${apiKeyId}\n`);

  try {
    // Get API key with user info
    const result = await db
      .select({
        apiKeyId: apiKeyTable.id,
        apiKeyName: apiKeyTable.name,
        userId: apiKeyTable.userId,
        userEmail: userTable.email,
        userName: userTable.name,
        userRole: userTable.role,
        userBanned: userTable.banned,
        apiKeyEnabled: apiKeyTable.enabled,
        apiKeyMetadata: apiKeyTable.metadata,
      })
      .from(apiKeyTable)
      .innerJoin(userTable, eq(apiKeyTable.userId, userTable.id))
      .where(eq(apiKeyTable.id, apiKeyId))
      .limit(1);

    if (result.length === 0) {
      console.error(`❌ API key not found: ${apiKeyId}`);
      process.exit(1);
    }

    const data = result[0];

    console.log("📊 API Key Info:");
    console.log("─".repeat(50));
    console.log(`  Key ID:      ${data.apiKeyId}`);
    console.log(`  Key Name:    ${data.apiKeyName}`);
    console.log(`  Enabled:     ${data.apiKeyEnabled}`);
    console.log(`  Metadata:    ${JSON.stringify(data.apiKeyMetadata, null, 2)}`);
    console.log("");
    console.log("👤 Owner Info:");
    console.log("─".repeat(50));
    console.log(`  User ID:     ${data.userId}`);
    console.log(`  Email:       ${data.userEmail}`);
    console.log(`  Name:        ${data.userName}`);
    console.log(`  Role:        ${data.userRole}`);
    console.log(`  Banned:      ${data.userBanned}`);
    console.log("");
    console.log("🚦 Rate Limit Status:");
    console.log("─".repeat(50));

    if (data.userRole === "admin") {
      console.log(`  ✅ User is ADMIN - should bypass rate limiting`);
      console.log(`  ✅ Rate limit tier should be: UNLIMITED`);
    } else {
      console.log(`  ❌ User is NOT admin (role: ${data.userRole})`);
      console.log(`  ❌ Will be rate limited based on tier`);
      const metadata = data.apiKeyMetadata as any;
      const tier = metadata?.type || "free";
      console.log(`  📊 Tier: ${tier}`);
    }

    console.log("");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Get API key ID from command line
const apiKeyId = process.argv[2];

if (!apiKeyId) {
  console.error("❌ Usage: pnpm tsx scripts/debug-api-key-owner.ts <api-key-id>");
  process.exit(1);
}

debugApiKeyOwner(apiKeyId).then(() => {
  console.log("✅ Done");
  process.exit(0);
});
