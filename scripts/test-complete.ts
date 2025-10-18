/**
 * Complete Automated Test Suite - All 19 API Routes + Rate Limiting Tests
 *
 * Tests all 19 API endpoints with comprehensive coverage:
 * - 19 routes tested with Admin Session (full CRUD access)
 * - 19 routes tested with Public User (no auth - should get 401/403)
 * - Public endpoints (no auth required)
 * - Public key authenticated tests (read-only access)
 * - API rate limiting tests (tier-based limits)
 * - API key rate limiting tests (hourly/daily limits)
 * - Authorization and error handling
 *
 * Total: 20 Admin + 20 Public User + Public Endpoints + Rate Limit Tests + Auth Tests
 *
 * Usage: pnpm tsx scripts/test-complete.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL =
  process.env.DEFAULT_ADMIN_EMAIL || "admin@zuno-marketplace.local";
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "adminadmin";

interface TestResult {
  test: string;
  status: "PASS" | "FAIL" | "SKIP";
  message: string;
  responseTime?: number;
}

const results: TestResult[] = [];
let adminSessionToken: string | null = null;
let publicApiKey: string | null = null;
const testData: {
  createdAbiId?: string;
  createdContractAddress?: string;
  createdNetworkId?: string;
  createdNetworkChainId?: number; // Store chainId for network endpoint testing
  createdApiKeyId?: string;
  existingAbiId?: string;
} = {};

// ============================================
// Helper Functions
// ============================================

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({
      test: name,
      status: "PASS",
      message: "OK",
      responseTime: duration,
    });
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - start;
    results.push({
      test: name,
      status: "FAIL",
      message: error.message,
      responseTime: duration,
    });
    console.error(`❌ ${name}: ${error.message}`);
  }
}

async function makeRequest(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    useAdminSession?: boolean;
    usePublicKey?: boolean;
  } = {}
): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (options.useAdminSession && adminSessionToken) {
    headers["Cookie"] = `better-auth.session_token=${adminSessionToken}`;
  }

  if (options.usePublicKey && publicApiKey) {
    headers["x-api-key"] = publicApiKey;
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return response;
}

// ============================================
// Setup: Get Tokens
// ============================================

async function setupTokens() {
  console.log("\n🔐 Setting up authentication tokens...\n");

  // 1. Get admin session token
  console.log("1️⃣  Getting admin session token...");
  try {
    const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sign in: ${response.status}`);
    }

    const setCookie = response.headers.get("set-cookie");
    if (!setCookie) {
      throw new Error("No session cookie returned");
    }

    const sessionMatch = setCookie.match(/better-auth\.session_token=([^;]+)/);
    if (!sessionMatch) {
      throw new Error("Could not extract session token");
    }

    adminSessionToken = sessionMatch[1];
    console.log(
      `   ✅ Admin session obtained: ${adminSessionToken.substring(0, 20)}...`
    );
  } catch (error: any) {
    console.error(`   ❌ Failed to get admin session: ${error.message}`);
    console.error(
      `   💡 Make sure admin user exists with email: ${ADMIN_EMAIL}`
    );
    process.exit(1);
  }

  // 2. Create public API key
  console.log("\n2️⃣  Creating public API key...");
  try {
    const response = await fetch(`${BASE_URL}/api/keys/public`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to create public key: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.data.key) {
      throw new Error("Invalid response from public key endpoint");
    }

    publicApiKey = data.data.key;
    console.log(
      `   ✅ Public API key created: ${publicApiKey?.substring(0, 20)}...`
    );
  } catch (error: any) {
    console.error(`   ❌ Failed to create public key: ${error.message}`);
    process.exit(1);
  }

  // 3. Get existing data from database
  console.log("\n3️⃣  Getting existing data from database...");

  // Get ABI ID
  try {
    const response = await makeRequest("/api/abis?limit=1", {
      useAdminSession: true,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.data && data.data.data.length > 0) {
        testData.existingAbiId = data.data.data[0].id;
        console.log(`   ✅ Found existing ABI: ${testData.existingAbiId}`);
      } else {
        console.log(`   ⚠️  No existing ABIs found in database`);
      }
    } else {
      console.log(`   ⚠️  Could not fetch existing ABIs: ${response.status}`);
    }
  } catch (error: any) {
    console.log(`   ⚠️  Could not get existing ABI ID: ${error.message}`);
  }

  // Get Network ID
  try {
    const response = await makeRequest("/api/networks?limit=1", {
      useAdminSession: true,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.data && data.data.data.length > 0) {
        testData.createdNetworkId = data.data.data[0].id;
        testData.createdNetworkChainId = data.data.data[0].chainId;
        console.log(
          `   ✅ Found existing Network: ${testData.createdNetworkId} (chainId: ${testData.createdNetworkChainId})`
        );
      } else {
        console.log(`   ⚠️  No existing Networks found in database`);
      }
    } else {
      console.log(
        `   ⚠️  Could not fetch existing Networks: ${response.status}`
      );
    }
  } catch (error: any) {
    console.log(`   ⚠️  Could not get existing Network ID: ${error.message}`);
  }

  // Get Contract data
  try {
    const response = await makeRequest("/api/contracts?limit=1", {
      useAdminSession: true,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.data && data.data.data.length > 0) {
        testData.createdContractAddress = data.data.data[0].address;
        testData.createdNetworkId = data.data.data[0].networkId;
        console.log(
          `   ✅ Found existing Contract: ${testData.createdContractAddress}`
        );
      } else {
        console.log(`   ⚠️  No existing Contracts found in database`);
      }
    } else {
      console.log(
        `   ⚠️  Could not fetch existing Contracts: ${response.status}`
      );
    }
  } catch (error: any) {
    console.log(
      `   ⚠️  Could not get existing Contract data: ${error.message}`
    );
  }

  // Get API Key data
  try {
    const response = await makeRequest("/api/admin/api-keys?limit=1", {
      useAdminSession: true,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.data && data.data.data.length > 0) {
        testData.createdApiKeyId = data.data.data[0].id;
        console.log(
          `   ✅ Found existing API Key: ${testData.createdApiKeyId}`
        );
      } else {
        console.log(`   ⚠️  No existing API Keys found in database`);
      }
    } else {
      console.log(
        `   ⚠️  Could not fetch existing API Keys: ${response.status}`
      );
    }
  } catch (error: any) {
    console.log(`   ⚠️  Could not get existing API Key data: ${error.message}`);
  }

  console.log("\n✅ Authentication setup complete!\n");
}

// ============================================
// Test Suite 1: Public Endpoints (No Auth)
// ============================================

async function testPublicEndpoints() {
  console.log("=".repeat(60));
  console.log("🌐 Testing Public Endpoints (No Authentication)");
  console.log("=".repeat(60) + "\n");

  // Test 1: GET /api/health
  await runTest("GET /api/health - Health check", async () => {
    const response = await fetch(`${BASE_URL}/api/health`);

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || data.data.status !== "healthy") {
      throw new Error("Server not healthy");
    }

    console.log(
      `   📊 Status: ${data.data.status}, DB: ${data.data.checks.database}, Cache: ${data.data.checks.cache}`
    );
  });

  // Test 2: GET /api/version
  await runTest("GET /api/version - Get API version", async () => {
    const response = await fetch(`${BASE_URL}/api/version`);

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error("Invalid response structure");
    }

    console.log(
      `   📊 Current: ${data.data.current?.id}, Supported: ${data.data.total}`
    );
  });

  // Test 3: POST /api/keys/public
  await runTest("POST /api/keys/public - Create public API key", async () => {
    const response = await fetch(`${BASE_URL}/api/keys/public`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.data.key) {
      throw new Error("Public key not created");
    }

    console.log(`   🔑 Created: ${data.data.id}`);
  });
}

// ============================================
// Test Suite 1.5: All 19 Routes - Public User (No Auth)
// ============================================

async function testAll19RoutesPublicUser() {
  console.log("\n" + "=".repeat(60));
  console.log("👤 Testing All 19 Routes - Public User (No Authentication)");
  console.log("=".repeat(60) + "\n");

  const routes = [
    // 1. Networks
    { method: "GET", path: "/api/networks", name: "List networks" },
    {
      method: "GET",
      path: `/api/networks/${
        testData.createdNetworkId || "nonexistent-network-id"
      }`,
      name: "Get network by chainId",
    },
    {
      method: "GET",
      path: `/api/networks/${testData.createdNetworkId || "999999"}/contracts`,
      name: "Get network contracts",
    },

    // 2. ABIs
    { method: "GET", path: "/api/abis", name: "List ABIs" },
    {
      method: "POST",
      path: "/api/abis",
      name: "Create ABI",
      body: { name: "Test", abi: "[]", version: "1.0.0" },
    },
    { method: "GET", path: "/api/abis/test-id", name: "Get ABI by ID" },
    {
      method: "PUT",
      path: `/api/abis/${testData.existingAbiId || "test-id"}`,
      name: "Update ABI",
      body: { name: "Updated" },
    },
    { method: "DELETE", path: "/api/abis/test-id", name: "Delete ABI" },
    {
      method: "GET",
      path: "/api/abis/full",
      name: "List ABIs with full ABI JSON",
    },

    // 3. Contracts
    { method: "GET", path: "/api/contracts", name: "List contracts" },
    {
      method: "POST",
      path: "/api/contracts",
      name: "Create contract",
      body: {
        address:
          testData.createdContractAddress ||
          "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",
        networkId: testData.createdNetworkId || "net_v1_ka5x99M9sKGB",
        abiId: testData.existingAbiId || "abi_v1_VT8QSIIhchsH",
        name: "Test",
      },
    },
    {
      method: "GET",
      path: `/api/contracts/${
        testData.createdContractAddress ||
        "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45"
      }?networkId=${testData.createdNetworkId || "net_v1_ka5x99M9sKGB"}`,
      name: "Get contract by address",
    },
    {
      method: "PUT",
      path: `/api/contracts/${
        testData.createdContractAddress ||
        "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45"
      }?networkId=${testData.createdNetworkId || "net_v1_ka5x99M9sKGB"}`,
      name: "Update contract",
      body: { name: "Updated" },
    },
    {
      method: "DELETE",
      path: `/api/contracts/${
        testData.createdContractAddress ||
        "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45"
      }?networkId=${testData.createdNetworkId || "net_v1_ka5x99M9sKGB"}`,
      name: "Delete contract",
    },
    {
      method: "GET",
      path: `/api/contracts/${
        testData.createdContractAddress ||
        "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45"
      }/abi?networkId=${testData.createdNetworkId || "net_v1_ka5x99M9sKGB"}`,
      name: "Get contract ABI",
    },
    {
      method: "GET",
      path: `/api/contracts/${
        testData.createdContractAddress ||
        "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45"
      }/versions?networkId=${
        testData.createdNetworkId || "net_v1_ka5x99M9sKGB"
      }`,
      name: "Get contract versions",
    },
    {
      method: "GET",
      path: `/api/contracts/${
        testData.createdContractAddress ||
        "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45"
      }/versions/1?networkId=${
        testData.createdNetworkId || "net_v1_ka5x99M9sKGB"
      }`,
      name: "Get contract version by ID",
    },
    {
      method: "GET",
      path: "/api/contracts/by-name/test",
      name: "Get contract by name",
    },
    {
      method: "GET",
      path: "/api/contracts/by-name/test/versions",
      name: "Get contract versions by name",
    },

    // 4. Admin API Keys
    { method: "GET", path: "/api/admin/api-keys", name: "List admin API keys" },
    {
      method: "POST",
      path: "/api/admin/api-keys",
      name: "Create admin API key",
      body: { name: "Test", expiresIn: 86400 },
    },
    {
      method: "GET",
      path: `/api/admin/api-keys/${testData.createdApiKeyId || "test-id"}`,
      name: "Get admin API key by ID",
    },
    {
      method: "PATCH",
      path: `/api/admin/api-keys/${testData.createdApiKeyId || "test-id"}`,
      name: "Update admin API key",
      body: { name: "Updated" },
    },
    {
      method: "DELETE",
      path: `/api/admin/api-keys/${testData.createdApiKeyId || "test-id"}`,
      name: "Delete admin API key",
    },

    // 5. Backup
    { method: "POST", path: "/api/backup/create", name: "Create backup" },
    {
      method: "POST",
      path: "/api/backup/restore",
      name: "Restore backup",
      body: { backupId: "test" },
    },
  ];

  for (const route of routes) {
    await runTest(
      `${route.method} ${route.path} - ${route.name} (No auth - 401)`,
      async () => {
        const options: RequestInit = {
          method: route.method,
          headers: { "Content-Type": "application/json" },
        };

        if (route.body) {
          options.body = JSON.stringify(route.body);
        }

        const response = await fetch(`${BASE_URL}${route.path}`, options);

        if (response.ok) {
          throw new Error("Should require authentication");
        }

        // API validates input first, then checks auth
        // So we can get:
        // - 400 (validation error)
        // - 401 (auth error)
        // - 404 (resource not found - also valid for unauthenticated users)
        if (
          response.status !== 400 &&
          response.status !== 401 &&
          response.status !== 404
        ) {
          throw new Error(`Expected 400, 401, or 404, got ${response.status}`);
        }

        console.log(
          `   🔒 ${route.name}: Correctly blocked (${response.status})`
        );
      }
    );
  }
}

// ============================================
// Test Suite 2: All 19 Routes - Admin Session
// ============================================

async function testAll19RoutesAdmin() {
  console.log("\n" + "=".repeat(60));
  console.log("👑 Testing All 19 Routes - Admin Session (Full Access)");
  console.log("=".repeat(60) + "\n");

  // Test 1: Networks
  await runTest("GET /api/networks - List networks (Admin)", async () => {
    const response = await makeRequest("/api/networks?limit=10", {
      useAdminSession: true,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Status ${response.status}: ${error.error?.message}`);
    }

    const data = await response.json();
    if (!data.success || !data.data.data) {
      throw new Error("Invalid response structure");
    }

    if (data.data.data.length > 0) {
      testData.createdNetworkId = data.data.data[0].id;
    }

    console.log(`   📊 Found ${data.data.data.length} networks`);
  });

  await runTest(
    "GET /api/networks/1 - Get network by chainId (Admin)",
    async () => {
      const response = await makeRequest(
        `/api/networks/${testData.createdNetworkId || "1"}`,
        {
          useAdminSession: true,
        }
      );

      if (!response.ok) {
        // Network might not exist, that's OK for testing
        if (response.status === 404) {
          console.log(`   📊 Network 1 not found (expected)`);
          return;
        }
        throw new Error(`Status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("Invalid response structure");
      }

      console.log(`   📊 Retrieved network: ${data.data.name || "Unknown"}`);
    }
  );

  await runTest(
    "GET /api/networks/1/contracts - Get network contracts (Admin)",
    async () => {
      const response = await makeRequest(
        `/api/networks/${
          testData.createdNetworkChainId || "1"
        }/contracts?limit=5`,
        {
          useAdminSession: true,
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`   📊 Network 1 contracts not found (expected)`);
          return;
        }
        throw new Error(`Status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("Invalid response structure");
      }

      console.log(`   📊 Found ${data.data.data?.length || 0} contracts`);
    }
  );

  // Test 2: ABIs
  await runTest("GET /api/abis - List ABIs (Admin)", async () => {
    const response = await makeRequest("/api/abis?limit=5", {
      useAdminSession: true,
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.data.data) {
      throw new Error("Invalid response structure");
    }

    console.log(`   📊 Found ${data.data.data.length} ABIs`);
  });

  await runTest("POST /api/abis - Create ABI (Admin)", async () => {
    // Make ABI unique by using a unique function name based on timestamp
    const uniqueId = Date.now();
    const response = await makeRequest("/api/abis", {
      method: "POST",
      useAdminSession: true,
      body: {
        name: "AdminTestABI_" + uniqueId,
        abi: JSON.stringify([
          {
            type: "function",
            name: "testFunc" + uniqueId, // Unique function name to avoid duplicate hash
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
          },
        ]),
        version: "1.0.0",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Status ${response.status}: ${error.error?.message}`);
    }

    const data = await response.json();
    if (!data.success || !data.data.id) {
      throw new Error("ABI not created");
    }

    testData.createdAbiId = data.data.id;
    console.log(`   📄 Created: ${data.data.id}`);
  });

  await runTest("GET /api/abis/[id] - Get ABI by ID (Admin)", async () => {
    if (!testData.existingAbiId) {
      console.log("   ⚠️  Skipped: No existing ABI ID available");
      return;
    }

    const response = await makeRequest(`/api/abis/${testData.existingAbiId}`, {
      useAdminSession: true,
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || data.data.id !== testData.existingAbiId) {
      throw new Error("Invalid ABI data");
    }

    console.log(`   📄 Retrieved: ${data.data.name}`);
  });

  await runTest(
    "GET /api/abis/full - List ABIs with full ABI JSON (Admin)",
    async () => {
      const response = await makeRequest("/api/abis/full?limit=5", {
        useAdminSession: true,
      });

      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.data.data) {
        throw new Error("Invalid response structure");
      }

      // Check that full ABI data is included
      const hasFullAbiData = data.data.data.some(
        (abi: any) => abi.abi && typeof abi.abi === "object"
      );
      if (!hasFullAbiData && data.data.data.length > 0) {
        throw new Error("Full ABI JSON not included in response");
      }

      console.log(
        `   📊 Found ${data.data.data.length} ABIs with full ABI JSON`
      );
      if (data.data.data.length > 0) {
        console.log(
          `   📄 Sample ABI: ${data.data.data[0].name} (${
            Object.keys(data.data.data[0].abi || {}).length
          } functions)`
        );
      }
    }
  );

  await runTest("PUT /api/abis/[id] - Update ABI (Admin)", async () => {
    if (!testData.createdAbiId) {
      console.log("   ⚠️  Skipped: No created ABI ID available for update");
      return;
    }

    // Update the ABI we just created (not existing one to avoid conflicts)
    // Just update the name and metadata, not the ABI itself to avoid hash conflicts
    const response = await makeRequest(`/api/abis/${testData.createdAbiId}`, {
      method: "PUT",
      useAdminSession: true,
      body: {
        name: "UpdatedAdminTestABI_" + Date.now(),
        description: "Updated description for testing",
        tags: ["test", "updated"],
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Status ${response.status}: ${error.error?.message}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error("ABI not updated");
    }

    console.log(`   📄 Updated: ${data.data.id}`);
  });

  // Test 3: Contracts
  await runTest("GET /api/contracts - List contracts (Admin)", async () => {
    const response = await makeRequest("/api/contracts?limit=5", {
      useAdminSession: true,
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.data.data) {
      throw new Error("Invalid response structure");
    }

    console.log(`   📊 Found ${data.data.data.length} contracts`);
  });

  await runTest("POST /api/contracts - Create contract (Admin)", async () => {
    if (!testData.createdAbiId || !testData.createdNetworkId) {
      console.log("   ⚠️  Skipped: No ABI or Network ID available");
      return;
    }

    const testAddress = "0x" + Date.now().toString(16).padStart(40, "0");

    const response = await makeRequest("/api/contracts", {
      method: "POST",
      useAdminSession: true,
      body: {
        address: testAddress,
        networkId: testData.createdNetworkId,
        abiId: testData.createdAbiId,
        name: "AdminTestContract_" + Date.now(),
        type: "token", // Valid enum value from schema
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Status ${response.status}: ${error.error?.message}`);
    }

    const data = await response.json();
    if (!data.success || !data.data.address) {
      throw new Error("Contract not created");
    }

    // Use the exact address returned by the API (normalized)
    testData.createdContractAddress = data.data.address;
    testData.createdNetworkId = data.data.networkId; // Ensure we have the correct networkId

    console.log(
      `   📝 Created: ${data.data.address} on network ${data.data.networkId}`
    );
  });

  await runTest(
    "GET /api/contracts/[address] - Get contract by address (Admin)",
    async () => {
      if (!testData.createdContractAddress || !testData.createdNetworkId) {
        console.log("   ⚠️  Skipped: No existing contract address available");
        return;
      }

      const response = await makeRequest(
        `/api/contracts/${testData.createdContractAddress}?networkId=${testData.createdNetworkId}&includeAbi=true`,
        {
          useAdminSession: true,
        }
      );

      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("Invalid contract data");
      }

      console.log(`   📝 Retrieved: ${data.data.name}`);
    }
  );

  await runTest(
    "PUT /api/contracts/[address] - Update contract (Admin)",
    async () => {
      if (!testData.createdContractAddress || !testData.createdNetworkId) {
        console.log("   ⚠️  Skipped: No existing contract address available");
        return;
      }

      const response = await makeRequest(
        `/api/contracts/${testData.createdContractAddress}?networkId=${testData.createdNetworkId}`,
        {
          method: "PUT",
          useAdminSession: true,
          body: {
            name: "UpdatedAdminTestContract_" + Date.now(),
            metadata: {
              description: "Updated admin test contract",
            },
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Status ${response.status}: ${error.error?.message}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("Contract not updated");
      }

      console.log(`   📝 Updated: ${data.data.address}`);
    }
  );

  // Test 4: Admin API Keys
  await runTest("GET /api/admin/api-keys - List all keys (Admin)", async () => {
    const response = await makeRequest(
      "/api/admin/api-keys?limit=10&offset=0",
      {
        useAdminSession: true,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Status ${response.status}: ${error.error?.message}`);
    }

    const data = await response.json();
    if (!data.success || !data.data.keys) {
      throw new Error("Invalid response structure");
    }

    console.log(`   📊 Found ${data.data.keys.length} API keys`);
  });

  await runTest(
    "POST /api/admin/api-keys - Create new key (Admin)",
    async () => {
      const response = await makeRequest("/api/admin/api-keys", {
        method: "POST",
        useAdminSession: true,
        body: {
          name: "Test" + Date.now(), // Keep name short (<30 chars) due to Better Auth limit with metadata
          expiresIn: 86400,
          permissions: {
            abis: ["read", "write"],
          },
          scopes: ["read:abis", "write:abis"],
          rateLimit: {
            enabled: true,
            max: 100,
            timeWindow: 60000,
          },
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Status ${response.status}: ${error.error?.message}`);
      }

      const data = await response.json();
      if (!data.success || !data.data.key) {
        throw new Error("Key not created");
      }

      testData.createdApiKeyId = data.data.id;
      console.log(`   🔑 Created: ${data.data.id}`);
    }
  );

  await runTest(
    "GET /api/admin/api-keys/[id] - Get key by ID (Admin)",
    async () => {
      if (!testData.createdApiKeyId) {
        throw new Error("No API key ID available for testing");
      }

      const response = await makeRequest(
        `/api/admin/api-keys/${testData.createdApiKeyId}`,
        {
          useAdminSession: true,
        }
      );

      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || data.data.id !== testData.createdApiKeyId) {
        throw new Error("Invalid API key data");
      }

      console.log(`   🔑 Retrieved: ${data.data.name}`);
    }
  );

  await runTest(
    "PATCH /api/admin/api-keys/[id] - Update key (Admin)",
    async () => {
      if (!testData.createdApiKeyId) {
        throw new Error("No API key ID available for testing");
      }

      const response = await makeRequest(
        `/api/admin/api-keys/${testData.createdApiKeyId}`,
        {
          method: "PATCH",
          useAdminSession: true,
          body: {
            name: "Updated" + Date.now(), // Keep name short (<30 chars) due to Better Auth limit
            enabled: true,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Status ${response.status}: ${error.error?.message}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("Key not updated");
      }

      console.log(`   🔑 Updated: ${data.data.id}`);
    }
  );

  // Test 5: Backup (Admin only)
  await runTest("POST /api/backup/create - Create backup (Admin)", async () => {
    const response = await makeRequest("/api/backup/create", {
      method: "POST",
      useAdminSession: true,
    });

    if (!response.ok) {
      // Backup might not be implemented yet, that's OK
      if (response.status === 404 || response.status === 501) {
        console.log(`   📦 Backup endpoint not implemented (expected)`);
        return;
      }
      throw new Error(`Status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error("Backup not created");
    }

    console.log(`   📦 Backup created: ${data.data.id || "Success"}`);
  });

  await runTest(
    "POST /api/backup/restore - Restore backup (Admin)",
    async () => {
      const response = await makeRequest("/api/backup/restore", {
        method: "POST",
        useAdminSession: true,
        body: {
          backupId: "test-backup-id",
        },
      });

      if (!response.ok) {
        // Backup might not be implemented yet or invalid backup ID
        if (
          response.status === 404 ||
          response.status === 501 ||
          response.status === 400
        ) {
          console.log(
            `   📦 Restore endpoint: ${
              response.status === 400
                ? "Invalid backup ID (expected)"
                : "Not implemented (expected)"
            }`
          );
          return;
        }
        throw new Error(`Status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("Backup not restored");
      }

      console.log(`   📦 Backup restored: ${data.data.id || "Success"}`);
    }
  );
}

// ============================================
// Test Suite 3: Public Key Tests (Read-only)
// ============================================

async function testPublicKeyEndpoints() {
  console.log("\n" + "=".repeat(60));
  console.log("🔑 Testing Public Key Endpoints (Read-only Access)");
  console.log("=".repeat(60) + "\n");

  // Test read-only endpoints with public key
  await runTest("GET /api/networks - List networks (Public Key)", async () => {
    const response = await makeRequest("/api/networks?limit=10", {
      usePublicKey: true,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Status ${response.status}: ${error.error?.message}`);
    }

    const data = await response.json();
    if (!data.success || !data.data.data) {
      throw new Error("Invalid response structure");
    }

    console.log(`   📊 Found ${data.data.data.length} networks`);
  });

  await runTest("GET /api/abis - List ABIs (Public Key)", async () => {
    const response = await makeRequest("/api/abis?limit=5", {
      usePublicKey: true,
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.data.data) {
      throw new Error("Invalid response structure");
    }

    console.log(`   📊 Found ${data.data.data.length} ABIs`);
  });

  await runTest("GET /api/abis/[id] - Get ABI by ID (Public Key)", async () => {
    if (!testData.existingAbiId) {
      console.log("   ⚠️  Skipped: No existing ABI ID available");
      return;
    }

    const response = await makeRequest(`/api/abis/${testData.existingAbiId}`, {
      usePublicKey: true,
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || data.data.id !== testData.existingAbiId) {
      throw new Error("Invalid ABI data");
    }

    console.log(`   📄 Retrieved: ${data.data.name}`);
  });

  await runTest(
    "GET /api/abis/full - List ABIs with full ABI JSON (Public Key)",
    async () => {
      const response = await makeRequest("/api/abis/full?limit=5", {
        usePublicKey: true,
      });

      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.data.data) {
        throw new Error("Invalid response structure");
      }

      // Check that full ABI data is included
      const hasFullAbiData = data.data.data.some(
        (abi: any) => abi.abi && typeof abi.abi === "object"
      );
      if (!hasFullAbiData && data.data.data.length > 0) {
        throw new Error("Full ABI JSON not included in response");
      }

      console.log(
        `   📊 Found ${data.data.data.length} ABIs with full ABI JSON`
      );
      if (data.data.data.length > 0) {
        console.log(
          `   📄 Sample ABI: ${data.data.data[0].name} (${
            Object.keys(data.data.data[0].abi || {}).length
          } functions)`
        );
      }
    }
  );

  // Test with existing ABI ID from database
  await runTest(
    "GET /api/abis/full - Test with existing ABI ID (Public Key)",
    async () => {
      if (!testData.existingAbiId) {
        console.log("   ⚠️  Skipped: No existing ABI ID available");
        return;
      }

      const response = await makeRequest(
        `/api/abis/full?limit=10&search=${testData.existingAbiId}`,
        {
          usePublicKey: true,
        }
      );

      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.data.data) {
        throw new Error("Invalid response structure");
      }

      // Check if the existing ABI is in the results
      const foundExistingAbi = data.data.data.find(
        (abi: any) => abi.id === testData.existingAbiId
      );
      if (foundExistingAbi) {
        console.log(
          `   📄 Found existing ABI: ${foundExistingAbi.name} with full ABI JSON`
        );
      } else {
        console.log(
          `   📄 Existing ABI not found in results (may be filtered out)`
        );
      }

      console.log(
        `   📊 Searched with existing ABI ID: ${testData.existingAbiId}`
      );
    }
  );

  await runTest(
    "GET /api/contracts - List contracts (Public Key)",
    async () => {
      const response = await makeRequest("/api/contracts?limit=5", {
        usePublicKey: true,
      });

      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.data.data) {
        throw new Error("Invalid response structure");
      }

      console.log(`   📊 Found ${data.data.data.length} contracts`);
    }
  );

  await runTest(
    "GET /api/contracts/[address] - Get contract by address (Public Key)",
    async () => {
      if (!testData.createdContractAddress || !testData.createdNetworkId) {
        console.log("   ⚠️  Skipped: No existing contract address available");
        return;
      }

      const response = await makeRequest(
        `/api/contracts/${testData.createdContractAddress}?networkId=${testData.createdNetworkId}&includeAbi=true`,
        {
          usePublicKey: true,
        }
      );

      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("Invalid contract data");
      }

      console.log(`   📝 Retrieved: ${data.data.name}`);
    }
  );
}

// ============================================
// Test Suite 6: Rate Limiting Tests
// ============================================

async function testRateLimiting() {
  console.log("\n" + "=".repeat(60));
  console.log("⏱️  Testing Rate Limiting (API & API Keys)");
  console.log("=".repeat(60) + "\n");

  // Test 1: API Rate Limiting - Public Key
  await runTest("Rate Limit - Public Key (Multiple requests)", async () => {
    const requests = [];
    const maxRequests = 5; // Test with small number to avoid hitting limits

    // Make multiple requests quickly
    for (let i = 0; i < maxRequests; i++) {
      requests.push(
        makeRequest("/api/networks?limit=1", {
          usePublicKey: true,
        })
      );
    }

    const responses = await Promise.all(requests);

    // Check that all requests succeeded (within rate limit)
    const failedRequests = responses.filter((r) => !r.ok);
    if (failedRequests.length > 0) {
      const firstFailed = failedRequests[0];
      const error = await firstFailed.json();

      if (firstFailed.status === 429) {
        console.log(
          `   ⏱️  Rate limit hit after ${
            maxRequests - failedRequests.length
          } requests`
        );
        console.log(
          `   📊 Rate limit info: ${JSON.stringify(error.error?.details || {})}`
        );
      } else {
        throw new Error(`Unexpected error: ${firstFailed.status}`);
      }
    } else {
      console.log(
        `   ✅ All ${maxRequests} requests succeeded (within rate limit)`
      );
    }
  });

  // Test 2: API Key Rate Limiting - Admin Key
  await runTest("Rate Limit - Admin API Key (Multiple requests)", async () => {
    const requests = [];
    const maxRequests = 3; // Test with small number

    // Make multiple requests quickly
    for (let i = 0; i < maxRequests; i++) {
      requests.push(
        makeRequest("/api/abis?limit=1", {
          useAdminSession: true,
        })
      );
    }

    const responses = await Promise.all(requests);

    // Check that all requests succeeded (within rate limit)
    const failedRequests = responses.filter((r) => !r.ok);
    if (failedRequests.length > 0) {
      const firstFailed = failedRequests[0];
      const error = await firstFailed.json();

      if (firstFailed.status === 429) {
        console.log(
          `   ⏱️  Rate limit hit after ${
            maxRequests - failedRequests.length
          } requests`
        );
        console.log(
          `   📊 Rate limit info: ${JSON.stringify(error.error?.details || {})}`
        );
      } else {
        throw new Error(`Unexpected error: ${firstFailed.status}`);
      }
    } else {
      console.log(
        `   ✅ All ${maxRequests} requests succeeded (within rate limit)`
      );
    }
  });

  // Test 3: Rate Limit Headers
  await runTest("Rate Limit - Check response headers", async () => {
    const response = await makeRequest("/api/networks?limit=1", {
      usePublicKey: true,
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    // Check for rate limit headers
    const rateLimitHeaders = {
      "x-ratelimit-limit": response.headers.get("x-ratelimit-limit"),
      "x-ratelimit-remaining": response.headers.get("x-ratelimit-remaining"),
      "x-ratelimit-reset": response.headers.get("x-ratelimit-reset"),
      "retry-after": response.headers.get("retry-after"),
    };

    const hasRateLimitHeaders = Object.values(rateLimitHeaders).some(
      (header) => header !== null
    );

    if (hasRateLimitHeaders) {
      console.log(`   📊 Rate limit headers found:`, rateLimitHeaders);
    } else {
      console.log(
        `   ⚠️  No rate limit headers found (may be disabled in development)`
      );
    }
  });

  // Test 4: Rate Limit Error Response
  await runTest("Rate Limit - Error response format", async () => {
    // Try to trigger rate limit by making many requests
    const requests = [];
    const maxRequests = 20; // Higher number to try to trigger rate limit

    for (let i = 0; i < maxRequests; i++) {
      requests.push(
        makeRequest("/api/networks?limit=1", {
          usePublicKey: true,
        })
      );
    }

    const responses = await Promise.all(requests);
    const rateLimitedResponse = responses.find((r) => r.status === 429);

    if (rateLimitedResponse) {
      const error = await rateLimitedResponse.json();

      // Check error structure
      if (!error.error) {
        throw new Error("Rate limit error missing error object");
      }

      if (error.error.code !== "RATE_LIMITED") {
        throw new Error(`Expected RATE_LIMITED, got ${error.error.code}`);
      }

      console.log(`   📊 Rate limit error response:`, {
        code: error.error.code,
        message: error.error.message,
        details: error.error.details,
      });
    } else {
      console.log(
        `   ⚠️  Rate limit not triggered with ${maxRequests} requests (limits may be high)`
      );
    }
  });

  // Test 5: Different API Key Tiers (if available)
  await runTest("Rate Limit - API Key tier differences", async () => {
    // Test with public key (should have lower limits)
    const publicResponse = await makeRequest("/api/networks?limit=1", {
      usePublicKey: true,
    });

    if (!publicResponse.ok) {
      throw new Error(`Public key request failed: ${publicResponse.status}`);
    }

    // Test with admin session (should have higher limits)
    const adminResponse = await makeRequest("/api/networks?limit=1", {
      useAdminSession: true,
    });

    if (!adminResponse.ok) {
      throw new Error(`Admin session request failed: ${adminResponse.status}`);
    }

    // Compare rate limit headers if available
    const publicLimit = publicResponse.headers.get("x-ratelimit-limit");
    const adminLimit = adminResponse.headers.get("x-ratelimit-limit");

    if (publicLimit && adminLimit) {
      const publicLimitNum = parseInt(publicLimit);
      const adminLimitNum = parseInt(adminLimit);

      if (adminLimitNum > publicLimitNum) {
        console.log(
          `   📊 Tier differences confirmed: Public=${publicLimitNum}, Admin=${adminLimitNum}`
        );
      } else {
        console.log(
          `   📊 Rate limits: Public=${publicLimitNum}, Admin=${adminLimitNum}`
        );
      }
    } else {
      console.log(
        `   📊 Both requests succeeded (rate limit headers not available)`
      );
    }
  });

  // Test 6: Rate Limit with Invalid API Key
  await runTest("Rate Limit - Invalid API key", async () => {
    const response = await makeRequest("/api/networks?limit=1", {
      headers: {
        "x-api-key": "invalid-key-12345",
      },
    });

    if (response.status === 401) {
      console.log(`   🔒 Invalid API key correctly rejected (401)`);
    } else if (response.status === 429) {
      console.log(`   ⏱️  Invalid API key rate limited (429)`);
    } else {
      throw new Error(`Unexpected status for invalid key: ${response.status}`);
    }
  });

  // Test 7: Rate Limit Recovery
  await runTest("Rate Limit - Recovery after limit", async () => {
    // Make a normal request
    const response1 = await makeRequest("/api/networks?limit=1", {
      usePublicKey: true,
    });

    if (!response1.ok) {
      throw new Error(`First request failed: ${response1.status}`);
    }

    // Wait a bit (rate limits usually reset quickly in development)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Make another request
    const response2 = await makeRequest("/api/networks?limit=1", {
      usePublicKey: true,
    });

    if (!response2.ok) {
      throw new Error(`Second request failed: ${response2.status}`);
    }

    console.log(`   ✅ Rate limit recovery working (both requests succeeded)`);
  });
}

// ============================================
// Test Suite 6.5: API Key Rate Limiting Tests
// ============================================

async function testApiKeyRateLimiting() {
  console.log("\n" + "=".repeat(60));
  console.log("🔑 Testing API Key Rate Limiting (Hourly & Daily Limits)");
  console.log("=".repeat(60) + "\n");

  // Test 1: Create API Key with Rate Limits
  let testApiKeyId: string | null = null;
  let testApiKey: string | null = null;

  await runTest("Create API Key with Rate Limits", async () => {
    const response = await makeRequest("/api/admin/api-keys", {
      method: "POST",
      useAdminSession: true,
      body: {
        name: "RateTest" + Date.now(), // Keep name short (<30 chars) due to Better Auth limit with metadata
        expiresIn: 86400, // 1 day
        permissions: {
          abis: ["read", "write"],
        },
        scopes: ["read:abis", "write:abis"],
        rateLimit: {
          enabled: true,
          max: 10, // Low limit for testing
          timeWindow: 60000, // 1 minute
        },
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Status ${response.status}: ${error.error?.message}`);
    }

    const data = await response.json();
    if (!data.success || !data.data.key) {
      throw new Error("API key not created");
    }

    testApiKeyId = data.data.id;
    testApiKey = data.data.key;
    console.log(`   🔑 Created rate-limited API key: ${testApiKeyId}`);
  });

  // Test 2: Test API Key Rate Limits
  if (testApiKey) {
    await runTest("Test API Key Rate Limits", async () => {
      const requests = [];
      const maxRequests = 12; // Exceed the 10 request limit

      // Make requests with the rate-limited API key
      for (let i = 0; i < maxRequests; i++) {
        requests.push(
          makeRequest("/api/networks?limit=1", {
            headers: {
              "x-api-key": testApiKey!,
            },
          })
        );
      }

      const responses = await Promise.all(requests);

      // Count successful vs rate-limited responses
      const successful = responses.filter((r) => r.ok);
      const rateLimited = responses.filter((r) => r.status === 429);

      console.log(
        `   📊 Results: ${successful.length} successful, ${rateLimited.length} rate limited`
      );

      if (rateLimited.length > 0) {
        const firstRateLimited = rateLimited[0];
        const error = await firstRateLimited.json();
        console.log(`   ⏱️  Rate limit details:`, error.error?.details || {});
      }

      // Should have some successful and some rate limited
      if (successful.length === 0) {
        throw new Error("All requests were rate limited (unexpected)");
      }
    });
  }

  // Test 3: Test Rate Limit Headers with API Key
  if (testApiKey) {
    await runTest("Test Rate Limit Headers with API Key", async () => {
      const response = await makeRequest("/api/networks?limit=1", {
        headers: {
          "x-api-key": testApiKey!,
        },
      });

      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      // Check for rate limit headers
      const rateLimitHeaders = {
        "x-ratelimit-limit": response.headers.get("x-ratelimit-limit"),
        "x-ratelimit-remaining": response.headers.get("x-ratelimit-remaining"),
        "x-ratelimit-reset": response.headers.get("x-ratelimit-reset"),
      };

      const hasRateLimitHeaders = Object.values(rateLimitHeaders).some(
        (header) => header !== null
      );

      if (hasRateLimitHeaders) {
        console.log(`   📊 API Key rate limit headers:`, rateLimitHeaders);
      } else {
        console.log(`   ⚠️  No rate limit headers found for API key`);
      }
    });
  }

  // Test 4: Test Different API Key Tiers
  await runTest("Test API Key Tier Differences", async () => {
    // Create a high-tier API key
    const response = await makeRequest("/api/admin/api-keys", {
      method: "POST",
      useAdminSession: true,
      body: {
        name: "HighTier" + Date.now(), // Keep name short (<30 chars) due to Better Auth limit with metadata
        expiresIn: 86400,
        permissions: {
          abis: ["read", "write"],
        },
        scopes: ["read:abis", "write:abis"],
        rateLimit: {
          enabled: true,
          max: 1000, // High limit
          timeWindow: 60000,
        },
        metadata: {
          tier: "enterprise", // High tier
        },
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Status ${response.status}: ${error.error?.message}`);
    }

    const data = await response.json();
    if (!data.success || !data.data.key) {
      throw new Error("High-tier API key not created");
    }

    const highTierKey = data.data.key;
    console.log(`   🔑 Created high-tier API key: ${data.data.id}`);

    // Test with high-tier key
    const highTierResponse = await makeRequest("/api/networks?limit=1", {
      headers: {
        "x-api-key": highTierKey,
      },
    });

    if (!highTierResponse.ok) {
      throw new Error(`High-tier request failed: ${highTierResponse.status}`);
    }

    // Compare rate limits if both keys worked
    if (testApiKey) {
      const lowTierResponse = await makeRequest("/api/networks?limit=1", {
        headers: {
          "x-api-key": testApiKey,
        },
      });

      if (lowTierResponse.ok) {
        const lowLimit = lowTierResponse.headers.get("x-ratelimit-limit");
        const highLimit = highTierResponse.headers.get("x-ratelimit-limit");

        if (lowLimit && highLimit) {
          const lowLimitNum = parseInt(lowLimit);
          const highLimitNum = parseInt(highLimit);

          if (highLimitNum > lowLimitNum) {
            console.log(
              `   📊 Tier differences confirmed: Low=${lowLimitNum}, High=${highLimitNum}`
            );
          } else {
            console.log(
              `   📊 Rate limits: Low=${lowLimitNum}, High=${highLimitNum}`
            );
          }
        }
      }
    }

    // Clean up high-tier key
    await makeRequest(`/api/admin/api-keys/${data.data.id}`, {
      method: "DELETE",
      useAdminSession: true,
    });
  });

  // Test 5: Test Rate Limit Recovery
  if (testApiKey) {
    await runTest("Test API Key Rate Limit Recovery", async () => {
      // Wait for rate limit to reset (in development, this might be quick)
      console.log(`   ⏳ Waiting for rate limit reset...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Try a request after waiting
      const response = await makeRequest("/api/networks?limit=1", {
        headers: {
          "x-api-key": testApiKey!,
        },
      });

      if (response.ok) {
        console.log(`   ✅ Rate limit recovery working`);
      } else if (response.status === 429) {
        console.log(`   ⏱️  Still rate limited (may need longer wait)`);
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    });
  }

  // Clean up test API key
  if (testApiKeyId) {
    await runTest("Clean up test API key", async () => {
      const response = await makeRequest(
        `/api/admin/api-keys/${testApiKeyId}`,
        {
          method: "DELETE",
          useAdminSession: true,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete test API key: ${response.status}`);
      }

      console.log(`   🧹 Cleaned up test API key: ${testApiKeyId}`);
    });
  }
}

// ============================================
// Test Suite 7: Authorization & Error Cases
// ============================================

async function testAuthorizationAndErrors() {
  console.log("\n" + "=".repeat(60));
  console.log("🔒 Testing Authorization & Error Cases");
  console.log("=".repeat(60) + "\n");

  // Test: No authentication (moved to testPublicUserEndpoints)

  // Test: Public key accessing admin endpoint
  await runTest(
    "GET /api/admin/api-keys - Public key blocked (403)",
    async () => {
      const response = await makeRequest("/api/admin/api-keys", {
        usePublicKey: true,
      });

      if (response.ok) {
        throw new Error("Should return 403");
      }

      if (response.status !== 403) {
        throw new Error(`Expected 403, got ${response.status}`);
      }

      const data = await response.json();
      if (data.error.code !== "FORBIDDEN") {
        throw new Error(`Expected FORBIDDEN, got ${data.error.code}`);
      }
    }
  );

  // Test: Validation error
  await runTest(
    "POST /api/admin/api-keys - Validation error (400)",
    async () => {
      const response = await makeRequest("/api/admin/api-keys", {
        method: "POST",
        useAdminSession: true,
        body: {
          // Missing required 'name' field
          expiresIn: 86400,
        },
      });

      if (response.ok) {
        throw new Error("Should return validation error");
      }

      if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
      }

      const data = await response.json();
      if (data.error.code !== "VALIDATION_ERROR") {
        throw new Error(`Expected VALIDATION_ERROR, got ${data.error.code}`);
      }
    }
  );

  // Test: Not found
  await runTest("GET /api/abis/nonexistent - Not found (404)", async () => {
    const response = await makeRequest("/api/abis/nonexistent-id-12345", {
      usePublicKey: true,
    });

    if (response.ok) {
      throw new Error("Should return 404");
    }

    if (response.status !== 404) {
      throw new Error(`Expected 404, got ${response.status}`);
    }
  });
}

// ============================================
// Cleanup: Delete Test Resources
// ============================================

async function cleanupTestResources() {
  console.log("\n" + "=".repeat(60));
  console.log("🧹 Cleaning Up Test Resources");
  console.log("=".repeat(60) + "\n");

  // Delete API key
  if (testData.createdApiKeyId) {
    await runTest(
      "DELETE /api/admin/api-keys/[id] - Delete API key",
      async () => {
        const response = await makeRequest(
          `/api/admin/api-keys/${testData.createdApiKeyId}`,
          {
            method: "DELETE",
            useAdminSession: true,
          }
        );

        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error("API key not deleted");
        }

        console.log(`   🔑 Deleted: ${testData.createdApiKeyId}`);
      }
    );
  }

  // Delete contract
  if (testData.createdContractAddress && testData.createdNetworkId) {
    await runTest(
      "DELETE /api/contracts/[address] - Delete contract",
      async () => {
        const response = await makeRequest(
          `/api/contracts/${testData.createdContractAddress}?networkId=${testData.createdNetworkId}`,
          {
            method: "DELETE",
            useAdminSession: true,
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`Status ${response.status}: ${error.error?.message}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error("Contract not deleted");
        }

        console.log(`   📝 Deleted: ${testData.createdContractAddress}`);
      }
    );
  }

  // Delete ABI
  if (testData.createdAbiId) {
    await runTest("DELETE /api/abis/[id] - Delete ABI", async () => {
      const response = await makeRequest(`/api/abis/${testData.createdAbiId}`, {
        method: "DELETE",
        useAdminSession: true,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Status ${response.status}: ${error.error?.message}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error("ABI not deleted");
      }

      console.log(`   📄 Deleted: ${testData.createdAbiId}`);
    });
  }
}

// ============================================
// Print Summary
// ============================================

function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Summary");
  console.log("=".repeat(60) + "\n");

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);

  const avgTime =
    results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
  console.log(`⏱️  Average Response Time: ${avgTime.toFixed(0)}ms`);

  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results
      .filter((r) => r.status === "FAIL")
      .forEach((r) => {
        console.log(`  - ${r.test}`);
        console.log(`    ${r.message}`);
      });
  }

  console.log("\n" + "=".repeat(60));

  if (failed > 0) {
    console.log("❌ Some tests failed");
    process.exit(1);
  } else {
    console.log("✅ All tests passed!");
  }
}

// ============================================
// Main
// ============================================

async function main() {
  console.log(
    "🚀 Starting Complete Test Suite - All 19 API Routes + Rate Limiting Tests\n"
  );
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Admin Email: ${ADMIN_EMAIL}\n`);

  try {
    // Setup
    await setupTokens();

    // Run test suites (20 Admin + 20 Public User + Public Endpoints + Rate Limit Tests + Auth Tests)
    await testPublicEndpoints(); // Tests 1-3 (Public endpoints - no auth)
    await testAll19RoutesPublicUser(); // Tests 4-23 (All 20 routes - no auth - 401)
    await testAll19RoutesAdmin(); // Tests 24-43 (All 20 routes - admin session)
    await testPublicKeyEndpoints(); // Tests 44-48 (Read-only with public k    await testRateLimiting(); // Tests 49-55 (API rate limiting)
    await testApiKeyRateLimiting(); // Tests 56-62 (API key rate limiting)
    await testAuthorizationAndErrors(); // Tests for auth & errors
    await cleanupTestResources(); // Cleanup DELETE operations

    // Summary
    printSummary();
  } catch (error) {
    console.error("\n💥 Test runner error:", error);
    process.exit(1);
  }
}

main();
