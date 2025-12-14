import { NextRequest } from "next/server";
import type { AuthApiKey, AuthUser } from "@/infrastructure/auth/auth-helpers";
import type { Session } from "@/infrastructure/database/drizzle/schema/auth.schema";

/**
 * Test utilities for API testing
 */

/**
 * Create a mock NextRequest for testing
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
  searchParams?: Record<string, string>;
}): NextRequest {
  const {
    method = "GET",
    url = "http://localhost:3000/api/test",
    headers = {},
    body,
    searchParams = {},
  } = options;

  // Build URL with search params
  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  // Create request init object compatible with Next.js RequestInit
  const requestInit: {
    method: string;
    headers: Headers;
    body?: string;
  } = {
    method,
    headers: new Headers(headers),
  };

  if (body && ["POST", "PUT", "PATCH"].includes(method)) {
    requestInit.body = JSON.stringify(body);
    requestInit.headers = new Headers({
      "content-type": "application/json",
      ...headers,
    });
  }

  return new NextRequest(urlObj.toString(), requestInit);
}

/**
 * Create a mock authenticated user
 */
export function createMockUser(overrides?: Partial<AuthUser>): AuthUser {
  return {
    id: "user_v1_test123",
    email: "test@example.com",
    name: "Test User",
    role: "user",
    ...overrides,
  };
}

/**
 * Create a mock admin user
 */
export function createMockAdmin(overrides?: Partial<AuthUser>): AuthUser {
  return createMockUser({
    id: "user_v1_admin123",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
    ...overrides,
  });
}

/**
 * Create a mock session
 */
export function createMockSession(
  user: AuthUser,
  overrides?: Partial<Session>
): Session {
  return {
    id: "session_test123",
    userId: user.id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    token: "test_session_token",
    ipAddress: null,
    userAgent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    impersonatedBy: null,
    ...overrides,
  };
}

/**
 * Create a mock API key
 */
export function createMockApiKey(overrides?: Partial<AuthApiKey>): AuthApiKey {
  return {
    id: "apiKey_v1_test123",
    userId: "user_v1_test123",
    name: "Test API Key",
    scopes: ["abis:read", "abis:write"],
    permissions: { abis: ["read", "write"] },
    enabled: true,
    expiresAt: null,
    ...overrides,
  };
}

/**
 * Create a mock public API key
 */
export function createMockPublicApiKey(
  overrides?: Partial<AuthApiKey>
): AuthApiKey {
  return createMockApiKey({
    id: "apiKey_v1_public",
    userId: "user_v1_public",
    name: "Public API Key",
    scopes: ["abis:read"],
    permissions: { abis: ["read"] },
    metadata: { type: "public" },
    ...overrides,
  });
}

/**
 * Create a mock enterprise API key (no rate limiting)
 */
export function createMockEnterpriseApiKey(
  overrides?: Partial<AuthApiKey>
): AuthApiKey {
  return createMockApiKey({
    id: "apiKey_v1_enterprise",
    userId: "user_v1_admin",
    name: "Enterprise API Key",
    scopes: ["*"],
    permissions: {
      abis: ["read", "list", "create", "update", "delete"],
      contracts: ["read", "list", "create", "update", "delete"],
      networks: ["read", "list", "create", "update", "delete"],
      admin: ["*"],
    },
    metadata: { type: "enterprise" },
    ...overrides,
  });
}

/**
 * Extract JSON from NextResponse
 */
export async function extractJsonFromResponse(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Mock sample ABI data
 */
export function createMockAbi() {
  return [
    {
      type: "function",
      name: "transfer",
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "balanceOf",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "event",
      name: "Transfer",
      inputs: [
        { name: "from", type: "address", indexed: true },
        { name: "to", type: "address", indexed: true },
        { name: "value", type: "uint256", indexed: false },
      ],
    },
  ];
}

/**
 * Mock ERC20 ABI
 */
export function createMockERC20Abi() {
  return [
    {
      type: "function",
      name: "totalSupply",
      inputs: [],
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "balanceOf",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "transfer",
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "transferFrom",
      inputs: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "approve",
      inputs: [
        { name: "spender", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "allowance",
      inputs: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
      ],
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "event",
      name: "Transfer",
      inputs: [
        { name: "from", type: "address", indexed: true },
        { name: "to", type: "address", indexed: true },
        { name: "value", type: "uint256", indexed: false },
      ],
    },
    {
      type: "event",
      name: "Approval",
      inputs: [
        { name: "owner", type: "address", indexed: true },
        { name: "spender", type: "address", indexed: true },
        { name: "value", type: "uint256", indexed: false },
      ],
    },
  ];
}

/**
 * Create mock contract address
 */
export function createMockContractAddress(): string {
  return "0x" + "1".repeat(40);
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
