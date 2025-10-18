import { env } from "@/shared/config/env";

const BASE_URL = "http://localhost:3000";
const ADMIN_EMAIL = env.DEFAULT_ADMIN_EMAIL || "admin@zuno-marketplace.local";
const ADMIN_PASSWORD = env.DEFAULT_ADMIN_PASSWORD || "Admin123!@#";

async function main() {
  console.log("🔑 Testing POST /api/admin/api-keys Endpoint\n");

  // 1. Get admin session token
  console.log("1️⃣  Getting admin session token...");
  const signinResponse = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!signinResponse.ok) {
    console.error("❌ Failed to sign in:", await signinResponse.text());
    process.exit(1);
  }

  const cookies = signinResponse.headers.getSetCookie();
  const sessionCookie = cookies.find((c) => c.startsWith("better-auth.session_token"));

  if (!sessionCookie) {
    console.error("❌ No session cookie found");
    process.exit(1);
  }

  const sessionToken = sessionCookie.split(";")[0].split("=")[1];
  console.log(`   ✅ Admin session obtained: ${sessionToken.substring(0, 20)}...\n`);

  // 2. Test POST /api/admin/api-keys with different payloads
  const testCases = [
    {
      name: "Minimal payload",
      body: {
        name: "Test Key " + Date.now(),
      },
    },
    {
      name: "With expiry",
      body: {
        name: "Test Key with Expiry " + Date.now(),
        expiresIn: 86400,
      },
    },
    {
      name: "With permissions",
      body: {
        name: "Test Key with Permissions " + Date.now(),
        expiresIn: 86400,
        permissions: {
          abis: ["read", "write"],
        },
      },
    },
    {
      name: "Full payload",
      body: {
        name: "Test Key Full " + Date.now(),
        expiresIn: 86400,
        permissions: {
          abis: ["read", "write"],
          contracts: ["read"],
        },
        scopes: ["read:abis", "write:abis"],
        metadata: {
          description: "Test key created via script",
        },
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`2️⃣  Testing: ${testCase.name}`);
    console.log(`   Body: ${JSON.stringify(testCase.body, null, 2)}`);

    try {
      const response = await fetch(`${BASE_URL}/api/admin/api-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `better-auth.session_token=${sessionToken}`,
        },
        body: JSON.stringify(testCase.body),
      });

      console.log(`   Status: ${response.status}`);

      const data = await response.json();
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);

      if (response.ok) {
        console.log(`   ✅ Success!\n`);
      } else {
        console.log(`   ❌ Failed!\n`);
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error);
    }
  }
}

main().catch(console.error);
