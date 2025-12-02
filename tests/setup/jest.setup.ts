require("@testing-library/jest-dom");

// Mock environment variables for testing
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.UPSTASH_REDIS_REST_URL = "https://test-redis.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
process.env.PINATA_JWT = "test-jwt";
process.env.PINATA_GATEWAY_URL = "https://test-gateway.pinata.cloud";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
Object.defineProperty(process.env, "NODE_ENV", { value: "test" });
process.env.SKIP_ENV_VALIDATION = "1";

// Mock the env module to avoid ESM issues with @t3-oss/env-nextjs
jest.mock("@/shared/config/env", () => ({
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    PINATA_JWT: process.env.PINATA_JWT,
    PINATA_GATEWAY_URL: process.env.PINATA_GATEWAY_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    PUBLIC_API_USER_ID: process.env.PUBLIC_API_USER_ID,
    DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL,
    DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD,
    FOUNDRY_OUT_DIR:
      process.env.FOUNDRY_OUT_DIR || "../zuno-marketplace-contracts/out",
    FOUNDRY_BROADCAST_DIR:
      process.env.FOUNDRY_BROADCAST_DIR ||
      "../zuno-marketplace-contracts/broadcast",
  },
}));

// Mock nanoid to avoid ESM issues
jest.mock("nanoid", () => ({
  nanoid: jest.fn(() => "mocknanoid123456"),
  customAlphabet: jest.fn(() => jest.fn(() => "mocknanoid123456")),
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock crypto.randomUUID
Object.defineProperty(global.crypto, "randomUUID", {
  value: () => "550e8400-e29b-41d4-a716-446655440000",
});

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "/";
  },
}));

// Suppress console.error during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render is deprecated")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

