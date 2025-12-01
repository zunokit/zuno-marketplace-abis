/**
 * Script to test rate limiting for admin vs non-admin API keys
 *
 * Usage:
 *   pnpm tsx scripts/test-rate-limit.ts
 *
 * Prerequisites:
 *   1. Server must be running (pnpm dev)
 *   2. Database must have:
 *      - Admin user with API key
 *      - Regular user with API key
 *
 * This script will:
 *   - Test admin API key (should bypass rate limiting)
 *   - Test regular API key (should be rate limited)
 *   - Display rate limit headers for each request
 */

import { env } from "@/shared/config/env";

const BASE_URL = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const TEST_ENDPOINT = "/api/contracts"; // Simple GET endpoint

interface TestResult {
  success: boolean;
  status: number;
  rateLimit?: {
    limit: string | null;
    remaining: string | null;
    reset: string | null;
  };
  error?: string;
  requestNumber: number;
}

async function makeRequest(
  apiKey: string,
  requestNumber: number
): Promise<TestResult> {
  try {
    const response = await fetch(`${BASE_URL}${TEST_ENDPOINT}`, {
      headers: {
        "x-api-key": apiKey,
      },
    });

    return {
      success: response.ok,
      status: response.status,
      rateLimit: {
        limit: response.headers.get("x-ratelimit-limit"),
        remaining: response.headers.get("x-ratelimit-remaining"),
        reset: response.headers.get("x-ratelimit-reset"),
      },
      requestNumber,
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error instanceof Error ? error.message : "Unknown error",
      requestNumber,
    };
  }
}

async function testApiKey(
  apiKey: string,
  description: string,
  numRequests: number = 10
) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🧪 Testing: ${description}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`API Key: ${apiKey.substring(0, 12)}...`);
  console.log(`Requests: ${numRequests}`);
  console.log("");

  const results: TestResult[] = [];

  for (let i = 1; i <= numRequests; i++) {
    const result = await makeRequest(apiKey, i);
    results.push(result);

    // Display result
    const icon = result.success ? "✅" : "❌";
    const statusColor = result.success ? "" : "";

    console.log(
      `${icon} Request #${i.toString().padStart(2)} | ` +
      `Status: ${result.status} | ` +
      `Limit: ${result.rateLimit?.limit || "N/A"} | ` +
      `Remaining: ${result.rateLimit?.remaining || "N/A"}`
    );

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Summary
  console.log("");
  console.log("📊 Summary:");
  console.log("─".repeat(60));

  const successful = results.filter((r) => r.success).length;
  const rateLimited = results.filter((r) => r.status === 429).length;

  console.log(`  Total Requests:     ${numRequests}`);
  console.log(`  Successful (2xx):   ${successful}`);
  console.log(`  Rate Limited (429): ${rateLimited}`);

  const firstResult = results[0];
  if (firstResult.rateLimit?.limit) {
    console.log(`  Rate Limit:         ${firstResult.rateLimit.limit}`);
    console.log(`  Last Remaining:     ${results[results.length - 1].rateLimit?.remaining}`);

    if (firstResult.rateLimit.limit === "Infinity") {
      console.log(`  ✅ ADMIN KEY - No rate limiting (Infinity)`);
    } else {
      console.log(`  ⚠️  REGULAR KEY - Rate limited (${firstResult.rateLimit.limit}/hr)`);
    }
  }

  return results;
}

async function main() {
  console.log("\n🚀 Rate Limiting Test Suite");
  console.log("═".repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Endpoint: ${TEST_ENDPOINT}`);
  console.log("");

  // Check if server is running
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/health`);
    if (!healthCheck.ok) {
      throw new Error(`Server health check failed: ${healthCheck.status}`);
    }
    console.log("✅ Server is running\n");
  } catch (error) {
    console.error("❌ Server is not running!");
    console.error("   Please start the server with: pnpm dev");
    process.exit(1);
  }

  // Get API keys from environment or prompt
  const adminApiKey = process.env.TEST_ADMIN_API_KEY;
  const regularApiKey = process.env.TEST_REGULAR_API_KEY;

  if (!adminApiKey && !regularApiKey) {
    console.error("❌ No API keys provided!");
    console.error("");
    console.error("Please provide API keys via environment variables:");
    console.error("  TEST_ADMIN_API_KEY=<admin-user-api-key>");
    console.error("  TEST_REGULAR_API_KEY=<regular-user-api-key>");
    console.error("");
    console.error("Example:");
    console.error("  TEST_ADMIN_API_KEY=sk_admin_123 TEST_REGULAR_API_KEY=sk_user_456 pnpm tsx scripts/test-rate-limit.ts");
    console.error("");
    console.error("Or create them first:");
    console.error("  pnpm tsx scripts/create-test-api-keys.ts");
    process.exit(1);
  }

  // Test 1: Admin API Key (should NOT be rate limited)
  if (adminApiKey) {
    await testApiKey(
      adminApiKey,
      "Admin User API Key (Should Bypass Rate Limiting)",
      15 // Test with more requests to verify no rate limiting
    );
  }

  // Test 2: Regular API Key (SHOULD be rate limited)
  if (regularApiKey) {
    await testApiKey(
      regularApiKey,
      "Regular User API Key (Should Be Rate Limited)",
      10
    );
  }

  console.log("\n═".repeat(60));
  console.log("✅ Test suite completed!");
  console.log("═".repeat(60));
  console.log("");
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
