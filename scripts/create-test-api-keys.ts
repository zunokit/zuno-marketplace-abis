/**
 * Create test API keys for rate limiting verification
 *
 * Usage:
 *   pnpm tsx scripts/create-test-api-keys.ts
 *
 * This will create:
 *   1. Admin user with API key (role: admin) - should bypass rate limiting
 *   2. Regular user with API key (role: user) - should be rate limited
 */

import { db } from "@/infrastructure/database/drizzle/client";
import { user as userTable, apiKey as apiKeyTable } from "@/infrastructure/database/drizzle/schema/auth.schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";

// Generate API key value (similar to Better Auth format)
function generateApiKeyValue(prefix: string = "sk_test"): string {
  return `${prefix}_${nanoid(32)}`;
}

// Hash API key using SHA-256 with base64url encoding (Better Auth format)
function hashApiKey(apiKey: string): string {
  return crypto
    .createHash("sha256")
    .update(apiKey)
    .digest("base64url");
}

async function createTestUser(email: string, role: "admin" | "user") {
  console.log(`\n📝 Creating ${role} user: ${email}`);

  // Check if user exists
  const existingUser = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    console.log(`  ✅ User already exists (ID: ${existingUser[0].id})`);
    return existingUser[0];
  }

  // Create user
  const userId = `usr_v1_${nanoid(16)}`;
  const [newUser] = await db
    .insert(userTable)
    .values({
      id: userId,
      email,
      name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)} User`,
      emailVerified: true,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  console.log(`  ✅ Created user (ID: ${newUser.id})`);
  return newUser;
}

async function createApiKeyForUser(
  userId: string,
  userName: string,
  keyName: string
): Promise<{ id: string; value: string }> {
  console.log(`\n🔑 Creating API key for user: ${userName}`);

  // Generate API key value
  const apiKeyValue = generateApiKeyValue();
  const hashedKey = hashApiKey(apiKeyValue);
  const keyId = `key_v1_${nanoid(16)}`;

  // Get user role for metadata
  const [user] = await db
    .select({ role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  const isAdmin = user?.role === "admin";

  // Create API key
  await db.insert(apiKeyTable).values({
    id: keyId,
    name: keyName,
    key: hashedKey,
    start: apiKeyValue.substring(0, 8),
    prefix: "sk_test_",
    userId,
    enabled: true,
    rateLimitEnabled: false, // Better Auth rate limiting disabled (we use custom Redis)
    permissions: JSON.stringify({
      contracts: ["read"],
      abis: ["read"],
    }),
    metadata: JSON.stringify({
      type: isAdmin ? "enterprise" : "personal", // Admin = enterprise tier (unlimited)
      scopes: ["read:contracts", "read:abis"],
      notes: `Test key for ${isAdmin ? "admin" : "regular"} user - rate limit testing`,
    }),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`  ✅ Created API key (ID: ${keyId})`);
  console.log(`  📋 Key value: ${apiKeyValue}`);
  console.log(`  📦 Tier: ${isAdmin ? "enterprise (unlimited)" : "personal (free tier)"}`);

  return { id: keyId, value: apiKeyValue };
}

async function main() {
  console.log("\n🚀 Creating Test API Keys for Rate Limiting Tests");
  console.log("═".repeat(60));

  try {
    // 1. Create admin user
    const adminUser = await createTestUser(
      "test-admin@zuno.local",
      "admin"
    );

    // 2. Create regular user
    const regularUser = await createTestUser(
      "test-user@zuno.local",
      "user"
    );

    // 3. Create API keys
    const adminApiKey = await createApiKeyForUser(
      adminUser.id,
      adminUser.name || "Admin",
      "Admin Test Key - Rate Limit Bypass"
    );

    const regularApiKey = await createApiKeyForUser(
      regularUser.id,
      regularUser.name || "User",
      "Regular Test Key - Rate Limited"
    );

    // 4. Display results
    console.log("\n═".repeat(60));
    console.log("✅ Test API Keys Created Successfully!");
    console.log("═".repeat(60));
    console.log("");
    console.log("📋 Admin API Key (Should Bypass Rate Limiting):");
    console.log("─".repeat(60));
    console.log(`  User:     ${adminUser.email} (role: admin)`);
    console.log(`  Key ID:   ${adminApiKey.id}`);
    console.log(`  Key:      ${adminApiKey.value}`);
    console.log(`  Tier:     ENTERPRISE (Unlimited)`);
    console.log("");
    console.log("📋 Regular API Key (Should Be Rate Limited):");
    console.log("─".repeat(60));
    console.log(`  User:     ${regularUser.email} (role: user)`);
    console.log(`  Key ID:   ${regularApiKey.id}`);
    console.log(`  Key:      ${regularApiKey.value}`);
    console.log(`  Tier:     FREE (500 req/hr)`);
    console.log("");
    console.log("🧪 Next Steps:");
    console.log("─".repeat(60));
    console.log("1. Start the dev server:");
    console.log("   pnpm dev");
    console.log("");
    console.log("2. Run the rate limit test:");
    console.log(`   TEST_ADMIN_API_KEY="${adminApiKey.value}" \\`);
    console.log(`   TEST_REGULAR_API_KEY="${regularApiKey.value}" \\`);
    console.log("   pnpm tsx scripts/test-rate-limit.ts");
    console.log("");
    console.log("Or on Windows (PowerShell):");
    console.log(`   $env:TEST_ADMIN_API_KEY="${adminApiKey.value}"`);
    console.log(`   $env:TEST_REGULAR_API_KEY="${regularApiKey.value}"`);
    console.log("   pnpm tsx scripts/test-rate-limit.ts");
    console.log("");

  } catch (error) {
    console.error("\n❌ Error creating test keys:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Failed:", error);
  process.exit(1);
});
