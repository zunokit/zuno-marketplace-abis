const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{js,jsx,ts,tsx}",
    "!src/app/layout.tsx",
    "!src/app/globals.css",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@/app/(.*)$": "<rootDir>/src/app/$1",
    "^@/components/(.*)$": "<rootDir>/src/components/$1",
    "^@/shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@/core/(.*)$": "<rootDir>/src/core/$1",
    "^@/infrastructure/(.*)$": "<rootDir>/src/infrastructure/$1",
    "^@/hooks/(.*)$": "<rootDir>/src/hooks/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(.*\\.mjs$|@upstash/redis|better-auth))",
  ],
  testMatch: [
    "<rootDir>/tests/unit/**/*.{test,spec}.{js,jsx,ts,tsx}",
    "<rootDir>/tests/unit/**/__tests__/**/*.{js,jsx,ts,tsx}",
  ],
};

module.exports = createJestConfig(customJestConfig);
