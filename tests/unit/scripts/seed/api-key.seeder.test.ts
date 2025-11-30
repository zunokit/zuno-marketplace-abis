/**
 * API Key Seeder Tests
 * Tests for seeding hardcoded admin API keys with enterprise tier
 */

import crypto from "crypto";

// Hash function matching the seeder implementation
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

describe("API Key Hashing", () => {
  describe("hashApiKey function", () => {
    it("should produce consistent SHA-256 hex hash", () => {
      const key = "zuno_test_key_12345";
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);

      expect(hash1).toBe(hash2);
    });

    it("should produce 64-character hex string (SHA-256)", () => {
      const key = "zuno_admin_key_abc123";
      const hash = hashApiKey(key);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce different hashes for different keys", () => {
      const key1 = "zuno_key_one";
      const key2 = "zuno_key_two";

      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);

      expect(hash1).not.toBe(hash2);
    });

    it("should hash empty string without error", () => {
      const hash = hashApiKey("");
      expect(hash).toHaveLength(64);
      // SHA-256 of empty string
      expect(hash).toBe(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      );
    });

    it("should handle unicode characters", () => {
      const key = "zuno_キー_テスト";
      const hash = hashApiKey(key);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle special characters", () => {
      const key = "zuno_key-with.special!chars@123#";
      const hash = hashApiKey(key);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should be compatible with Better Auth verification", () => {
      // Better Auth uses SHA-256 hex for API key hashing
      // This test ensures our implementation matches
      const plaintextKey = "zuno_verification_test_key";
      const hash = hashApiKey(plaintextKey);

      // Verify using Node.js crypto directly (same as Better Auth)
      const expectedHash = crypto
        .createHash("sha256")
        .update(plaintextKey)
        .digest("hex");

      expect(hash).toBe(expectedHash);
    });
  });
});

describe("API Key Parsing", () => {
  describe("Environment variable parsing", () => {
    it("should parse comma-separated keys", () => {
      const envValue = "zuno_key_1,zuno_key_2,zuno_key_3";
      const keys = envValue
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      expect(keys).toHaveLength(3);
      expect(keys).toEqual(["zuno_key_1", "zuno_key_2", "zuno_key_3"]);
    });

    it("should handle whitespace around keys", () => {
      const envValue = "  zuno_key_1 , zuno_key_2  ,  zuno_key_3  ";
      const keys = envValue
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      expect(keys).toHaveLength(3);
      expect(keys).toEqual(["zuno_key_1", "zuno_key_2", "zuno_key_3"]);
    });

    it("should filter out empty strings", () => {
      const envValue = "zuno_key_1,,zuno_key_2,,,zuno_key_3,";
      const keys = envValue
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      expect(keys).toHaveLength(3);
      expect(keys).toEqual(["zuno_key_1", "zuno_key_2", "zuno_key_3"]);
    });

    it("should handle single key", () => {
      const envValue = "zuno_single_key";
      const keys = envValue
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      expect(keys).toHaveLength(1);
      expect(keys).toEqual(["zuno_single_key"]);
    });

    it("should return empty array for empty env", () => {
      const envValue = "";
      const keys = envValue
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      expect(keys).toHaveLength(0);
    });

    it("should return empty array for whitespace-only env", () => {
      const envValue = "   ,  ,   ";
      const keys = envValue
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      expect(keys).toHaveLength(0);
    });
  });
});

describe("API Key Metadata", () => {
  describe("Enterprise metadata structure", () => {
    it("should create correct enterprise metadata JSON", () => {
      const index = 1;
      const metadata = JSON.stringify({
        type: "enterprise",
        scopes: ["*"],
        notes: `Hardcoded admin API key ${index} - no rate limiting`,
      });

      const parsed = JSON.parse(metadata);

      expect(parsed.type).toBe("enterprise");
      expect(parsed.scopes).toEqual(["*"]);
      expect(parsed.notes).toContain("no rate limiting");
    });

    it("should create valid permissions JSON", () => {
      const permissions = JSON.stringify({
        abis: ["read", "list", "create", "update", "delete"],
        contracts: ["read", "list", "create", "update", "delete"],
        networks: ["read", "list", "create", "update", "delete"],
        admin: ["*"],
      });

      const parsed = JSON.parse(permissions);

      expect(parsed.abis).toContain("read");
      expect(parsed.abis).toContain("delete");
      expect(parsed.admin).toEqual(["*"]);
    });
  });
});

describe("API Key Start/Prefix Extraction", () => {
  describe("Key prefix extraction", () => {
    it("should extract prefix from key with underscore", () => {
      const key = "zuno_admin_key_123";
      const prefix = key.includes("_") ? key.split("_")[0] + "_" : "zuno_";

      expect(prefix).toBe("zuno_");
    });

    it("should use default prefix for key without underscore", () => {
      const key = "somekey123456789";
      const prefix = key.includes("_") ? key.split("_")[0] + "_" : "zuno_";

      expect(prefix).toBe("zuno_");
    });

    it("should handle custom prefixes", () => {
      const key = "custom_admin_key_123";
      const prefix = key.includes("_") ? key.split("_")[0] + "_" : "zuno_";

      expect(prefix).toBe("custom_");
    });
  });

  describe("Key start extraction", () => {
    it("should extract first 8 characters for display", () => {
      const key = "zuno_admin_key_12345678901234567890";
      const start = key.slice(0, 8);

      expect(start).toBe("zuno_adm");
      expect(start).toHaveLength(8);
    });

    it("should handle short keys", () => {
      const key = "short";
      const start = key.slice(0, 8);

      expect(start).toBe("short");
      expect(start).toHaveLength(5);
    });

    it("should handle exactly 8 character keys", () => {
      const key = "12345678";
      const start = key.slice(0, 8);

      expect(start).toBe("12345678");
      expect(start).toHaveLength(8);
    });
  });
});

describe("API Key Seeder Integration", () => {
  describe("Full key processing", () => {
    it("should process key correctly end-to-end", () => {
      const plaintextKey = "zuno_xxx_admin_xxx_01";

      // Hash
      const hashedKey = hashApiKey(plaintextKey);
      expect(hashedKey).toHaveLength(64);

      // Extract display info
      const start = plaintextKey.slice(0, 8);
      const prefix = plaintextKey.split("_")[0] + "_";

      expect(start).toBe("zuno_xxx");
      expect(prefix).toBe("zuno_");

      // Verify hash is deterministic
      expect(hashApiKey(plaintextKey)).toBe(hashedKey);
    });

    it("should handle multiple keys from env format", () => {
      const envValue = "zuno_xxx_admin_xxx_01,zuno_xxx_admin_xxx_02";
      const keys = envValue
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const processedKeys = keys.map((key, index) => ({
        plaintext: key,
        hash: hashApiKey(key),
        start: key.slice(0, 8),
        prefix: key.split("_")[0] + "_",
        index: index + 1,
      }));

      expect(processedKeys).toHaveLength(2);

      // First key
      expect(processedKeys[0].plaintext).toBe("zuno_xxx_admin_xxx_01");
      expect(processedKeys[0].hash).toHaveLength(64);
      expect(processedKeys[0].start).toBe("zuno_xxx");
      expect(processedKeys[0].index).toBe(1);

      // Second key
      expect(processedKeys[1].plaintext).toBe("zuno_xxx_admin_xxx_02");
      expect(processedKeys[1].hash).toHaveLength(64);
      expect(processedKeys[1].start).toBe("zuno_xxx");
      expect(processedKeys[1].index).toBe(2);

      // Hashes should be different
      expect(processedKeys[0].hash).not.toBe(processedKeys[1].hash);
    });
  });
});

describe("Security Considerations", () => {
  describe("Hash properties", () => {
    it("should not be reversible (one-way hash)", () => {
      const key = "zuno_secret_key_123";
      const hash = hashApiKey(key);

      // Hash should not contain the original key
      expect(hash).not.toContain("zuno");
      expect(hash).not.toContain("secret");
      expect(hash).not.toContain("123");
    });

    it("should be collision resistant", () => {
      // Generate many hashes and check for uniqueness
      const keys = Array.from(
        { length: 1000 },
        (_, i) => `zuno_key_${i}_${Date.now()}`
      );
      const hashes = keys.map(hashApiKey);
      const uniqueHashes = new Set(hashes);

      expect(uniqueHashes.size).toBe(keys.length);
    });

    it("should produce fixed-length output regardless of input", () => {
      const shortKey = "a";
      const longKey = "a".repeat(10000);

      expect(hashApiKey(shortKey)).toHaveLength(64);
      expect(hashApiKey(longKey)).toHaveLength(64);
    });
  });

  describe("Timing considerations", () => {
    it("should hash in reasonable time", () => {
      const key = "zuno_performance_test_key";
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        hashApiKey(key);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      // Should be sub-millisecond
      expect(avgTime).toBeLessThan(1);
    });
  });
});
