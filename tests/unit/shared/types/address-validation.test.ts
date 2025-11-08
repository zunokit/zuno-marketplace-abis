import { isValidAddress, isValidChainId } from "@/shared/types";

describe("Address Validation Utilities", () => {
  describe("isValidAddress", () => {
    it("should validate correct Ethereum addresses", () => {
      const validAddresses = [
        "0x0000000000000000000000000000000000000000", // Zero address
        "0x1234567890123456789012345678901234567890", // Numbers
        "0xabcdefABCDEFabcdefABCDEFabcdefABCDEFabcd", // Mixed case
        "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", // All uppercase
        "0xffffffffffffffffffffffffffffffffffffffff", // All lowercase
        "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", // Common test address
      ];

      validAddresses.forEach((address) => {
        expect(isValidAddress(address)).toBe(true);
      });
    });

    it("should reject invalid Ethereum addresses", () => {
      const invalidAddresses = [
        "", // Empty string
        "0x", // Only prefix
        "0x123", // Too short
        "0x12345678901234567890123456789012345678901", // Too long (41 chars)
        "0x123456789012345678901234567890123456789", // Too short (39 chars)
        "1234567890123456789012345678901234567890", // Missing 0x prefix
        "0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", // Invalid hex characters
        "0x123456789012345678901234567890123456789g", // Invalid character at end
        "0X1234567890123456789012345678901234567890", // Uppercase X
        " 0x1234567890123456789012345678901234567890", // Leading space
        "0x1234567890123456789012345678901234567890 ", // Trailing space
        undefined as any, // Undefined
        null as any, // Null
        123 as any, // Number
        {} as any, // Object
      ];

      invalidAddresses.forEach((address) => {
        expect(isValidAddress(address)).toBe(false);
      });
    });

    it("should be case-insensitive for hex characters", () => {
      expect(isValidAddress("0xabcdef1234567890abcdef1234567890abcdef12")).toBe(
        true
      );
      expect(isValidAddress("0xABCDEF1234567890ABCDEF1234567890ABCDEF12")).toBe(
        true
      );
      expect(isValidAddress("0xAbCdEf1234567890aBcDeF1234567890AbCdEf12")).toBe(
        true
      );
    });

    it("should have exactly 40 hex characters after 0x", () => {
      // 39 characters - invalid
      expect(isValidAddress("0x123456789012345678901234567890123456789")).toBe(
        false
      );

      // 40 characters - valid
      expect(isValidAddress("0x1234567890123456789012345678901234567890")).toBe(
        true
      );

      // 41 characters - invalid
      expect(isValidAddress("0x12345678901234567890123456789012345678901")).toBe(
        false
      );
    });
  });

  describe("isValidChainId", () => {
    it("should validate positive integers", () => {
      const validChainIds = [
        1, // Ethereum Mainnet
        137, // Polygon
        56, // BSC
        42161, // Arbitrum
        10, // Optimism
        8453, // Base
        11155111, // Sepolia
      ];

      validChainIds.forEach((chainId) => {
        expect(isValidChainId(chainId)).toBe(true);
      });
    });

    it("should reject invalid chain IDs", () => {
      const invalidChainIds = [
        0, // Zero
        -1, // Negative
        -100, // Negative
        1.5, // Float
        3.14159, // Float
        NaN, // NaN
        Infinity, // Infinity
        -Infinity, // -Infinity
        "1" as any, // String
        undefined as any, // Undefined
        null as any, // Null
        {} as any, // Object
      ];

      invalidChainIds.forEach((chainId) => {
        expect(isValidChainId(chainId)).toBe(false);
      });
    });

    it("should require integer values", () => {
      expect(isValidChainId(1.0)).toBe(true); // 1.0 is an integer
      expect(isValidChainId(1.1)).toBe(false); // 1.1 is not an integer
      expect(isValidChainId(1.9)).toBe(false); // 1.9 is not an integer
    });
  });
});
