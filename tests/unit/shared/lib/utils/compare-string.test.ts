import { constantTimeCompare } from "@/shared/lib/utils/compare-string";

describe("constantTimeCompare", () => {
  it("returns true for two identical strings", () => {
    expect(constantTimeCompare("hello", "hello")).toBe(true);
  });

  it("returns false when the strings differ at any byte", () => {
    expect(constantTimeCompare("hello", "hellp")).toBe(false);
  });

  it("returns false when lengths differ", () => {
    expect(constantTimeCompare("short", "shorter")).toBe(false);
    expect(constantTimeCompare("longer-thing", "short")).toBe(false);
  });

  it("returns true for two empty strings", () => {
    expect(constantTimeCompare("", "")).toBe(true);
  });

  it("returns false when one side is empty", () => {
    expect(constantTimeCompare("", "x")).toBe(false);
    expect(constantTimeCompare("x", "")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(constantTimeCompare("API_KEY", "api_key")).toBe(false);
  });

  it("handles multi-byte UTF-8 strings", () => {
    expect(constantTimeCompare("hellö", "hellö")).toBe(true);
    expect(constantTimeCompare("hellö", "helloo")).toBe(false);
  });
});
