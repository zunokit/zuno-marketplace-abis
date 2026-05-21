/**
 * EVM selector / topic helpers.
 *
 * These functions derive the canonical 4-byte function selector and the
 * 32-byte event topic that the EVM uses to dispatch calls and emit logs.
 *
 * - Function selector:   `0x` + first 4 bytes of `keccak256(signature)`.
 * - Event topic (topic0): `0x` + full 32 bytes of `keccak256(signature)`.
 *
 * The canonical signature is `name(type1,type2,...)`, with tuple types
 * expanded as `(t1,t2,...)` so nested structs hash identically to how the
 * EVM encodes them.
 *
 * We re-use `crypto-js`'s SHA3 (legacy Keccak, output length 256) which is
 * already a transitive dependency of the project, so this introduces no new
 * runtime deps.
 */

import CryptoJS from "crypto-js";

import type {
  AbiEvent,
  AbiFunction,
  AbiInput,
  AbiItem,
  ContractAbi,
} from "@/shared/types";

/**
 * Expand a single ABI input into its canonical type string. Tuples (structs)
 * are rendered as `(t1,t2,...)` so the signature matches Solidity's encoding.
 */
function inputCanonicalType(input: AbiInput): string {
  const baseType = input.type;
  if (!baseType.startsWith("tuple")) {
    return baseType;
  }

  const componentTypes = (input.components ?? [])
    .map(inputCanonicalType)
    .join(",");

  // Preserve array suffixes that follow `tuple` (e.g. `tuple[]`, `tuple[3]`).
  const arraySuffix = baseType.slice("tuple".length);
  return `(${componentTypes})${arraySuffix}`;
}

/**
 * Build the canonical function signature, e.g. `transfer(address,uint256)`.
 */
export function getFunctionSignature(func: AbiFunction): string {
  const params = func.inputs.map(inputCanonicalType).join(",");
  return `${func.name}(${params})`;
}

/**
 * Build the canonical event signature, e.g. `Transfer(address,address,uint256)`.
 */
export function getEventSignature(event: AbiEvent): string {
  const params = event.inputs.map(inputCanonicalType).join(",");
  return `${event.name}(${params})`;
}

/**
 * keccak256 of a UTF-8 string, returned as a `0x`-prefixed hex digest.
 */
export function keccak256Utf8(value: string): string {
  const hash = CryptoJS.SHA3(value, { outputLength: 256 }).toString(
    CryptoJS.enc.Hex,
  );
  return `0x${hash}`;
}

/**
 * 4-byte function selector (`0x` + 8 hex chars).
 *
 * @example
 * getFunctionSelector({ name: "transfer", type: "function",
 *   inputs: [{ name: "to", type: "address" }, { name: "value", type: "uint256" }] })
 * // => "0xa9059cbb"
 */
export function getFunctionSelector(func: AbiFunction): string {
  const hash = keccak256Utf8(getFunctionSignature(func));
  return hash.slice(0, 10);
}

/**
 * 32-byte event topic (topic0) for non-anonymous events.
 *
 * Returns `null` for anonymous events because they do not emit topic0.
 *
 * @example
 * getEventTopic({ name: "Transfer", type: "event",
 *   inputs: [
 *     { name: "from", type: "address", indexed: true },
 *     { name: "to", type: "address", indexed: true },
 *     { name: "value", type: "uint256", indexed: false },
 *   ] })
 * // => "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
 */
export function getEventTopic(event: AbiEvent): string | null {
  if (event.anonymous) return null;
  return keccak256Utf8(getEventSignature(event));
}

function isAbiFunction(item: AbiItem): item is AbiFunction {
  return item.type === "function";
}

function isAbiEvent(item: AbiItem): item is AbiEvent {
  return item.type === "event";
}

/**
 * Look up a function in an ABI by its 4-byte selector. Returns `null` when
 * no function matches. Selector comparison is case-insensitive.
 */
export function findFunctionBySelector(
  abi: ContractAbi,
  selector: string,
): AbiFunction | null {
  const target = selector.toLowerCase();
  for (const item of abi) {
    if (!isAbiFunction(item)) continue;
    if (getFunctionSelector(item).toLowerCase() === target) {
      return item;
    }
  }
  return null;
}

/**
 * Look up an event in an ABI by its 32-byte topic0. Returns `null` when no
 * event matches. Anonymous events are skipped since they do not emit topic0.
 */
export function findEventByTopic(
  abi: ContractAbi,
  topic: string,
): AbiEvent | null {
  const target = topic.toLowerCase();
  for (const item of abi) {
    if (!isAbiEvent(item)) continue;
    const t = getEventTopic(item);
    if (t && t.toLowerCase() === target) {
      return item;
    }
  }
  return null;
}
