const nextJest = require("next/jest");
const path = require("path");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  // Since config is in tests/setup/, we need to go up two levels to project root
  dir: path.resolve(__dirname, "../.."),
});

// Base configuration for both environments
const baseConfig = {
  rootDir: path.resolve(__dirname, "../.."),
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.ts"],
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
  },
  testMatch: ["<rootDir>/tests/unit/**/*.{test,spec}.{js,jsx,ts,tsx}"],
};

// Create the config using Next.js's Jest setup, which includes SWC transformer
const createConfig = async () => {
  const nextJestConfig = await createJestConfig(baseConfig)();

  // Add projects to separate node and jsdom environments
  return {
    ...nextJestConfig,
    projects: [
      await createJestConfig({
        ...baseConfig,
        displayName: "node",
        testEnvironment: "node",
        testMatch: ["<rootDir>/tests/unit/**/*.{test,spec}.{js,ts}"],
        testPathIgnorePatterns: [
          "<rootDir>/tests/unit/components/",
          "<rootDir>/.next/",
          "<rootDir>/node_modules/",
        ],
      })(),
      await createJestConfig({
        ...baseConfig,
        displayName: "jsdom",
        testEnvironment: "jsdom",
        testMatch: [
          "<rootDir>/tests/unit/**/*.{test,spec}.{jsx,tsx}",
          "<rootDir>/tests/unit/components/**/*.{test,spec}.{js,jsx,ts,tsx}",
        ],
      })(),
    ],
  };
};

module.exports = createConfig();
