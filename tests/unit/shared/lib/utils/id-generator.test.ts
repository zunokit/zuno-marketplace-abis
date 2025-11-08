import { IdGenerator, EntityPrefix } from "@/shared/lib/utils/id-generator";

describe("IdGenerator", () => {
  describe("generate", () => {
    it("should generate ID with prefix and API version", () => {
      const id = IdGenerator.generate({
        prefix: EntityPrefix.USER,
        apiVersion: "v1",
      });

      expect(id).toMatch(/^usr_v1_[A-Za-z0-9]+$/);
      expect(id.startsWith("usr_v1_")).toBe(true);
    });

    it("should generate ID with entity version", () => {
      const id = IdGenerator.generate({
        prefix: EntityPrefix.ABI,
        apiVersion: "v1",
        entityVersion: "1.0.0",
      });

      expect(id).toMatch(/^abi_v1_1\.0\.0_[A-Za-z0-9]+$/);
      expect(id.startsWith("abi_v1_1.0.0_")).toBe(true);
    });

    it("should generate ID with timestamp", () => {
      const id = IdGenerator.generate({
        prefix: EntityPrefix.CONTRACT,
        apiVersion: "v1",
        includeTimestamp: true,
      });

      const parts = id.split("_");
      expect(parts.length).toBe(4); // prefix_apiVersion_timestamp_random
      expect(parts[0]).toBe("ctr");
      expect(parts[1]).toBe("v1");
      expect(parts[2]).toMatch(/^[0-9a-z]+$/); // Base36 timestamp
      expect(parts[3]).toMatch(/^[A-Za-z0-9]+$/); // Random part (mocked)
    });

    it("should throw error if apiVersion is not provided", () => {
      expect(() =>
        IdGenerator.generate({
          prefix: EntityPrefix.USER,
          apiVersion: "" as any,
        })
      ).toThrow("apiVersion is required");
    });

    it("should throw error for invalid entity version format", () => {
      expect(() =>
        IdGenerator.generate({
          prefix: EntityPrefix.ABI,
          apiVersion: "v1",
          entityVersion: "invalid version",
        })
      ).toThrow("Invalid entity version format");
    });

    it("should accept valid entity version formats", () => {
      const validVersions = [
        "1.0.0",
        "2.1.3",
        "1.0.0-beta",
        "1.0.0-rc.1",
        "1",
        "1.0",
      ];

      validVersions.forEach((version) => {
        const id = IdGenerator.generate({
          prefix: EntityPrefix.ABI,
          apiVersion: "v1",
          entityVersion: version,
        });
        expect(id).toContain(`_${version}_`);
      });
    });

    it("should generate IDs with consistent format", () => {
      const id1 = IdGenerator.generate({
        prefix: EntityPrefix.USER,
        apiVersion: "v1",
      });
      const id2 = IdGenerator.generate({
        prefix: EntityPrefix.USER,
        apiVersion: "v1",
      });

      // In tests, nanoid is mocked so IDs will be the same
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^usr_v1_[A-Za-z0-9]+$/);
    });

    it("should support all entity prefixes", () => {
      Object.values(EntityPrefix).forEach((prefix) => {
        const id = IdGenerator.generate({
          prefix,
          apiVersion: "v1",
        });
        expect(id.startsWith(`${prefix}_v1_`)).toBe(true);
      });
    });

    it("should support different API versions", () => {
      const v1Id = IdGenerator.generate({
        prefix: EntityPrefix.USER,
        apiVersion: "v1",
      });
      const v2Id = IdGenerator.generate({
        prefix: EntityPrefix.USER,
        apiVersion: "v2",
      });

      expect(v1Id.startsWith("usr_v1_")).toBe(true);
      expect(v2Id.startsWith("usr_v2_")).toBe(true);
    });
  });

  describe("parse", () => {
    it("should parse ID with prefix and API version", () => {
      const id = "usr_v1_2fK9mP3xQ1wZ";
      const parsed = IdGenerator.parse(id);

      expect(parsed.isValid).toBe(true);
      expect(parsed.prefix).toBe(EntityPrefix.USER);
      expect(parsed.apiVersion).toBe("v1");
      expect(parsed.randomPart).toBe("2fK9mP3xQ1wZ");
      expect(parsed.entityVersion).toBeUndefined();
    });

    it("should parse ID with entity version", () => {
      const id = "abi_v1_1.0.0_2fK9mP3xQ1wZ";
      const parsed = IdGenerator.parse(id);

      expect(parsed.isValid).toBe(true);
      expect(parsed.prefix).toBe(EntityPrefix.ABI);
      expect(parsed.apiVersion).toBe("v1");
      expect(parsed.entityVersion).toBe("1.0.0");
      expect(parsed.randomPart).toBe("2fK9mP3xQ1wZ");
    });

    it("should parse ID with timestamp", () => {
      const id = "ctr_v1_abc123_randompart";
      const parsed = IdGenerator.parse(id);

      expect(parsed.isValid).toBe(true);
      expect(parsed.prefix).toBe(EntityPrefix.CONTRACT);
      expect(parsed.apiVersion).toBe("v1");
      // Could be either timestamp or entity version, depends on format
    });

    it("should mark invalid ID with too few parts as invalid", () => {
      const parsed = IdGenerator.parse("usr_v1");

      expect(parsed.isValid).toBe(false);
    });

    it("should mark ID with invalid prefix as invalid", () => {
      const parsed = IdGenerator.parse("xyz_v1_randompart");

      expect(parsed.isValid).toBe(false);
    });

    it("should mark ID with invalid API version as invalid", () => {
      const parsed = IdGenerator.parse("usr_x1_randompart");

      expect(parsed.isValid).toBe(false);
    });

    it("should handle empty string", () => {
      const parsed = IdGenerator.parse("");

      expect(parsed.isValid).toBe(false);
    });
  });

  describe("extractPrefix", () => {
    it("should extract prefix from valid ID", () => {
      expect(IdGenerator.extractPrefix("usr_v1_abc123")).toBe(EntityPrefix.USER);
      expect(IdGenerator.extractPrefix("abi_v1_1.0.0_xyz")).toBe(
        EntityPrefix.ABI
      );
      expect(IdGenerator.extractPrefix("ctr_v1_test")).toBe(
        EntityPrefix.CONTRACT
      );
    });

    it("should return null for invalid ID", () => {
      expect(IdGenerator.extractPrefix("invalid")).toBe(null);
      expect(IdGenerator.extractPrefix("")).toBe(null);
      // Note: extractPrefix only checks format, not if prefix is valid EntityPrefix
      const result = IdGenerator.extractPrefix("xyz_v1_test");
      expect(result).toBe("xyz"); // Returns the prefix even if not in EntityPrefix enum
    });
  });

  describe("validate", () => {
    it("should validate correct ID format", () => {
      expect(IdGenerator.validate("usr_v1_2fK9mP3xQ1wZ")).toBe(true);
      expect(IdGenerator.validate("abi_v1_1.0.0_abc123")).toBe(true);
    });

    it("should validate with expected prefix", () => {
      expect(
        IdGenerator.validate("usr_v1_abc123", EntityPrefix.USER)
      ).toBe(true);
      expect(
        IdGenerator.validate("usr_v1_abc123", EntityPrefix.ABI)
      ).toBe(false);
    });

    it("should reject invalid formats", () => {
      expect(IdGenerator.validate("invalid")).toBe(false);
      expect(IdGenerator.validate("usr_x1_abc")).toBe(false);
      expect(IdGenerator.validate("xyz_v1_abc")).toBe(false);
    });
  });

  describe("isType", () => {
    it("should check if ID belongs to specific entity type", () => {
      expect(IdGenerator.isType("usr_v1_abc", EntityPrefix.USER)).toBe(true);
      expect(IdGenerator.isType("usr_v1_abc", EntityPrefix.ABI)).toBe(false);
      expect(IdGenerator.isType("abi_v1_1.0.0_xyz", EntityPrefix.ABI)).toBe(
        true
      );
    });

    it("should return false for invalid ID", () => {
      expect(IdGenerator.isType("invalid", EntityPrefix.USER)).toBe(false);
    });
  });

  describe("extractApiVersion", () => {
    it("should extract API version from valid ID", () => {
      expect(IdGenerator.extractApiVersion("usr_v1_abc123")).toBe("v1");
      expect(IdGenerator.extractApiVersion("abi_v2_1.0.0_xyz")).toBe("v2");
    });

    it("should return null for invalid ID", () => {
      expect(IdGenerator.extractApiVersion("invalid")).toBe(null);
    });
  });

  describe("extractEntityVersion", () => {
    it("should extract entity version from ID", () => {
      expect(IdGenerator.extractEntityVersion("abi_v1_1.0.0_abc")).toBe(
        "1.0.0"
      );
      expect(IdGenerator.extractEntityVersion("abi_v1_2.1.3-beta_xyz")).toBe(
        "2.1.3-beta"
      );
    });

    it("should return null when no entity version", () => {
      expect(IdGenerator.extractEntityVersion("usr_v1_abc123")).toBe(null);
    });

    it("should return null for invalid ID", () => {
      expect(IdGenerator.extractEntityVersion("invalid")).toBe(null);
    });
  });

  describe("generateUUID (deprecated)", () => {
    it("should generate standard UUID format", () => {
      const uuid = IdGenerator.generateUUID();

      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should generate UUIDs", () => {
      const uuid1 = IdGenerator.generateUUID();
      const uuid2 = IdGenerator.generateUUID();

      // In tests, crypto.randomUUID is mocked to return same value
      expect(uuid1).toBe(uuid2);
      expect(uuid1).toBe("550e8400-e29b-41d4-a716-446655440000");
    });
  });
});
