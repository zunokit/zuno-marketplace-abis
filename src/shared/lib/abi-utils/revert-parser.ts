/**
 * Solidity revert-data parser.
 *
 * On a reverted call, an EVM node returns the raw return-data as a hex
 * string. The first 4 bytes are a selector identifying which error type
 * was thrown; the rest is ABI-encoded arguments. This module decodes the
 * two well-known selectors (Error(string), Panic(uint256)) without any
 * heavy ABI library — useful in lightweight contexts (CLI, logs,
 * Workers) where you don't want to ship a full viem/ethers decoder.
 *
 * Pure, dependency-free; selectors come from the Solidity language
 * specification (https://docs.soliditylang.org/en/latest/control-structures.html#error-handling-assert-require-revert-and-exceptions).
 */

/** keccak256("Error(string)").slice(0, 4) */
export const ERROR_STRING_SELECTOR = "0x08c379a0";
/** keccak256("Panic(uint256)").slice(0, 4) */
export const PANIC_SELECTOR = "0x4e487b71";

export type RevertKind = "Error" | "Panic" | "Custom" | "Empty" | "Invalid";

export interface ParsedRevert {
  kind: RevertKind;
  /** The raw 0x-prefixed selector (e.g. '0x08c379a0'), or null if absent. */
  selector: string | null;
  /** Decoded human-readable reason for Error/Panic; null otherwise. */
  reason: string | null;
  /** Panic code (only set for kind='Panic'). */
  panicCode: number | null;
  /** Original (lower-cased, 0x-prefixed) data the parser saw. */
  data: string;
}

/**
 * Solidity Panic codes from spec section 4.10. Re-exported as a constant
 * so callers can correlate `panicCode` to human-readable labels.
 */
export const PANIC_REASONS: Record<number, string> = {
  0x00: "generic compiler panic",
  0x01: "assertion failed (assert)",
  0x11: "arithmetic overflow / underflow",
  0x12: "division or modulo by zero",
  0x21: "invalid enum conversion",
  0x22: "incorrectly encoded storage byte array",
  0x31: "pop on empty array",
  0x32: "out-of-bounds array access",
  0x41: "out-of-memory (too much allocated)",
  0x51: "call to zero-initialized function variable",
};

function normaliseHex(input: string): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed === "" || trimmed === "0x") return null;
  const lower = trimmed.toLowerCase();
  if (!/^0x[0-9a-f]*$/.test(lower)) return null;
  if (lower.length % 2 !== 0) return null;
  return lower;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Reads the trailing portion of a 32-byte big-endian unsigned word as a
 * JS Number. Solidity ABI offsets / lengths / panic codes are always
 * uint256, but the values we care about (string offset = 0x20, string
 * length, panic code) are always tiny. We safely read the rightmost
 * 6 bytes (48 bits, well under Number.MAX_SAFE_INTEGER).
 */
function readUint256AsSmallNumber(word: Uint8Array): number {
  if (word.length < 32) return -1;
  // If any of the high 26 bytes are non-zero, the value is too large to
  // fit in a JS Number — return -1 so callers treat it as invalid.
  for (let i = 0; i < 26; i += 1) {
    if (word[i] !== 0) return -1;
  }
  let result = 0;
  for (let i = 26; i < 32; i += 1) {
    result = result * 256 + word[i];
  }
  return result;
}

function decodeAbiString(data: Uint8Array): string | null {
  // Layout: [offset (32 bytes)] [length (32 bytes)] [bytes (padded to 32)]
  if (data.length < 64) return null;
  // Read offset (must be 0x20 for a top-level dynamic string).
  const offset = readUint256AsSmallNumber(data.subarray(0, 32));
  if (offset < 0 || offset + 32 > data.length) return null;

  const length = readUint256AsSmallNumber(data.subarray(offset, offset + 32));
  if (length < 0) return null;
  const start = offset + 32;
  if (start + length > data.length) return null;

  const raw = data.subarray(start, start + length);
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(raw);
  } catch {
    return null;
  }
}

/**
 * Parses raw revert data (the hex string an RPC node returns when a call
 * reverts) into a structured shape. Never throws — invalid input is
 * surfaced as `kind: 'Invalid'`.
 */
export function parseRevertData(data: string): ParsedRevert {
  const normalised = normaliseHex(data);
  if (normalised === null) {
    if (typeof data === "string" && (data.trim() === "" || data.trim() === "0x")) {
      return {
        kind: "Empty",
        selector: null,
        reason: null,
        panicCode: null,
        data: "0x",
      };
    }
    return {
      kind: "Invalid",
      selector: null,
      reason: null,
      panicCode: null,
      data: typeof data === "string" ? data : "",
    };
  }

  if (normalised.length < 2 + 8) {
    // shorter than a selector
    return {
      kind: normalised === "0x" ? "Empty" : "Invalid",
      selector: null,
      reason: null,
      panicCode: null,
      data: normalised,
    };
  }

  const selector = normalised.slice(0, 10);
  const argsHex = normalised.slice(10);
  const argsBytes = hexToBytes(argsHex);

  if (selector === ERROR_STRING_SELECTOR) {
    const reason = decodeAbiString(argsBytes);
    return {
      kind: "Error",
      selector,
      reason,
      panicCode: null,
      data: normalised,
    };
  }

  if (selector === PANIC_SELECTOR) {
    if (argsBytes.length < 32) {
      return {
        kind: "Panic",
        selector,
        reason: null,
        panicCode: null,
        data: normalised,
      };
    }
    const code = readUint256AsSmallNumber(argsBytes.subarray(0, 32));
    if (code < 0) {
      return {
        kind: "Panic",
        selector,
        reason: null,
        panicCode: null,
        data: normalised,
      };
    }
    const label = PANIC_REASONS[code];
    return {
      kind: "Panic",
      selector,
      reason: label ?? `panic code 0x${code.toString(16)}`,
      panicCode: code,
      data: normalised,
    };
  }

  return {
    kind: "Custom",
    selector,
    reason: null,
    panicCode: null,
    data: normalised,
  };
}

/**
 * Returns just the 4-byte selector at the head of revert data, or null
 * when the input is too short / malformed.
 */
export function getErrorSelector(data: string): string | null {
  const parsed = parseRevertData(data);
  return parsed.selector;
}

/**
 * Returns a human-readable one-liner suitable for logs or error toasts.
 *
 *   formatRevertReason(parseRevertData('0x08c379a0...')) // 'reverted: <reason>'
 *   formatRevertReason(parseRevertData('0x4e487b71...01')) // 'panic: assertion failed (assert) (0x01)'
 *   formatRevertReason(parseRevertData('0xdeadbeef')) // 'custom error 0xdeadbeef'
 */
export function formatRevertReason(parsed: ParsedRevert): string {
  switch (parsed.kind) {
    case "Error":
      return parsed.reason ? `reverted: ${parsed.reason}` : "reverted";
    case "Panic":
      return parsed.panicCode !== null
        ? `panic: ${parsed.reason ?? "unknown"} (0x${parsed.panicCode
            .toString(16)
            .padStart(2, "0")})`
        : "panic: unknown";
    case "Custom":
      return `custom error ${parsed.selector ?? ""}`.trim();
    case "Empty":
      return "reverted without reason";
    case "Invalid":
    default:
      return "invalid revert data";
  }
}
