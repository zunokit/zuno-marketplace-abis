import {
  parseRevertData,
  getErrorSelector,
  formatRevertReason,
  PANIC_REASONS,
  ERROR_STRING_SELECTOR,
  PANIC_SELECTOR,
} from "@/shared/lib/abi-utils/revert-parser";

const ASSERT_FAILED_REVERT =
  "0x4e487b71" +
  "0000000000000000000000000000000000000000000000000000000000000001";

const OVERFLOW_REVERT =
  "0x4e487b71" +
  "0000000000000000000000000000000000000000000000000000000000000011";

// Encoding of Error("not allowed"):
//   selector 0x08c379a0
//   offset   0x0..20  (32 bytes -> 0x20)
//   length   0x0..0b  (11 chars)
//   value    "not allowed" padded to 32 bytes
const NOT_ALLOWED_REVERT =
  "0x08c379a0" +
  "0000000000000000000000000000000000000000000000000000000000000020" +
  "000000000000000000000000000000000000000000000000000000000000000b" +
  "6e6f7420616c6c6f7765640000000000000000000000000000000000000000";

describe("parseRevertData — Error(string)", () => {
  it("decodes a standard require/revert message", () => {
    const r = parseRevertData(NOT_ALLOWED_REVERT);
    expect(r.kind).toBe("Error");
    expect(r.selector).toBe(ERROR_STRING_SELECTOR);
    expect(r.reason).toBe("not allowed");
    expect(r.panicCode).toBeNull();
  });

  it("normalises mixed-case hex input", () => {
    const r = parseRevertData(NOT_ALLOWED_REVERT.toUpperCase().replace("0X", "0x"));
    expect(r.kind).toBe("Error");
    expect(r.reason).toBe("not allowed");
  });

  it("returns reason=null when the payload is malformed but selector is valid", () => {
    const r = parseRevertData("0x08c379a0");
    expect(r.kind).toBe("Error");
    expect(r.reason).toBeNull();
  });
});

describe("parseRevertData — Panic(uint256)", () => {
  it("decodes panic code 0x01 (assert)", () => {
    const r = parseRevertData(ASSERT_FAILED_REVERT);
    expect(r.kind).toBe("Panic");
    expect(r.selector).toBe(PANIC_SELECTOR);
    expect(r.panicCode).toBe(0x01);
    expect(r.reason).toBe(PANIC_REASONS[0x01]);
  });

  it("decodes panic code 0x11 (overflow)", () => {
    const r = parseRevertData(OVERFLOW_REVERT);
    expect(r.kind).toBe("Panic");
    expect(r.panicCode).toBe(0x11);
    expect(r.reason).toBe(PANIC_REASONS[0x11]);
  });

  it("falls back to a generic label for an unknown panic code", () => {
    const unknown =
      "0x4e487b71" +
      "00000000000000000000000000000000000000000000000000000000000000ff";
    const r = parseRevertData(unknown);
    expect(r.kind).toBe("Panic");
    expect(r.panicCode).toBe(0xff);
    expect(r.reason).toBe("panic code 0xff");
  });
});

describe("parseRevertData — Custom error / edge cases", () => {
  it("identifies a custom (4-byte) error selector", () => {
    const r = parseRevertData("0xdeadbeef");
    expect(r.kind).toBe("Custom");
    expect(r.selector).toBe("0xdeadbeef");
    expect(r.reason).toBeNull();
  });

  it("returns Empty for the canonical empty revert", () => {
    expect(parseRevertData("0x").kind).toBe("Empty");
    expect(parseRevertData("").kind).toBe("Empty");
  });

  it("returns Invalid for non-hex strings, odd-length data, and wrong types", () => {
    expect(parseRevertData("not hex").kind).toBe("Invalid");
    expect(parseRevertData("0xZZZZ").kind).toBe("Invalid");
    expect(parseRevertData("0xabc").kind).toBe("Invalid");
    // @ts-expect-error — runtime guard test
    expect(parseRevertData(null).kind).toBe("Invalid");
    // @ts-expect-error — runtime guard test
    expect(parseRevertData(42).kind).toBe("Invalid");
  });
});

describe("getErrorSelector", () => {
  it("extracts the leading 4 bytes when the input is long enough", () => {
    expect(getErrorSelector(NOT_ALLOWED_REVERT)).toBe(ERROR_STRING_SELECTOR);
    expect(getErrorSelector("0xdeadbeef00112233")).toBe("0xdeadbeef");
  });

  it("returns null when the input is too short or invalid", () => {
    expect(getErrorSelector("0x")).toBeNull();
    expect(getErrorSelector("0xabc")).toBeNull();
    expect(getErrorSelector("not hex")).toBeNull();
  });
});

describe("formatRevertReason", () => {
  it("renders a one-line label for each kind", () => {
    expect(formatRevertReason(parseRevertData(NOT_ALLOWED_REVERT))).toBe(
      "reverted: not allowed",
    );
    expect(formatRevertReason(parseRevertData(ASSERT_FAILED_REVERT))).toBe(
      `panic: ${PANIC_REASONS[0x01]} (0x01)`,
    );
    expect(formatRevertReason(parseRevertData("0xdeadbeef"))).toBe(
      "custom error 0xdeadbeef",
    );
    expect(formatRevertReason(parseRevertData("0x"))).toBe(
      "reverted without reason",
    );
    expect(formatRevertReason(parseRevertData("nope"))).toBe(
      "invalid revert data",
    );
  });
});
