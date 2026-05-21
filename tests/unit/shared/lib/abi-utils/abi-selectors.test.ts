import {
  findEventByTopic,
  findFunctionBySelector,
  getEventSignature,
  getEventTopic,
  getFunctionSelector,
  getFunctionSignature,
  keccak256Utf8,
} from "@/shared/lib/abi-utils/abi-selectors";
import type {
  AbiEvent,
  AbiFunction,
  ContractAbi,
} from "@/shared/types";

const transferFn: AbiFunction = {
  name: "transfer",
  type: "function",
  inputs: [
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
  ],
};

const balanceOfFn: AbiFunction = {
  name: "balanceOf",
  type: "function",
  inputs: [{ name: "owner", type: "address" }],
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view",
};

const transferEvent: AbiEvent = {
  name: "Transfer",
  type: "event",
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
};

const anonymousEvent: AbiEvent = {
  name: "Hidden",
  type: "event",
  inputs: [{ name: "x", type: "uint256" }],
  anonymous: true,
};

const tupleFn: AbiFunction = {
  name: "fill",
  type: "function",
  inputs: [
    {
      name: "order",
      type: "tuple",
      components: [
        { name: "maker", type: "address" },
        { name: "amount", type: "uint256" },
      ],
    },
    { name: "ids", type: "uint256[]" },
  ],
};

describe("abi-selectors", () => {
  it("renders canonical function signatures", () => {
    expect(getFunctionSignature(transferFn)).toBe(
      "transfer(address,uint256)",
    );
    expect(getFunctionSignature(balanceOfFn)).toBe("balanceOf(address)");
  });

  it("renders canonical event signatures", () => {
    expect(getEventSignature(transferEvent)).toBe(
      "Transfer(address,address,uint256)",
    );
  });

  it("expands tuple types in signatures", () => {
    expect(getFunctionSignature(tupleFn)).toBe(
      "fill((address,uint256),uint256[])",
    );
  });

  it("computes the canonical ERC-20 transfer selector", () => {
    expect(getFunctionSelector(transferFn)).toBe("0xa9059cbb");
  });

  it("computes the canonical ERC-20 balanceOf selector", () => {
    expect(getFunctionSelector(balanceOfFn)).toBe("0x70a08231");
  });

  it("computes the canonical ERC-20 Transfer event topic0", () => {
    expect(getEventTopic(transferEvent)).toBe(
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    );
  });

  it("returns null for anonymous events", () => {
    expect(getEventTopic(anonymousEvent)).toBeNull();
  });

  it("keccak256Utf8 returns a 0x-prefixed 64-char hex digest", () => {
    const h = keccak256Utf8("");
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
    expect(h).toBe(
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
    );
  });

  it("findFunctionBySelector locates the correct entry", () => {
    const abi: ContractAbi = [transferFn, balanceOfFn];
    expect(findFunctionBySelector(abi, "0xa9059cbb")).toBe(transferFn);
    expect(findFunctionBySelector(abi, "0xA9059CBB")).toBe(transferFn);
    expect(findFunctionBySelector(abi, "0x12345678")).toBeNull();
  });

  it("findEventByTopic locates the correct entry and skips anonymous events", () => {
    const abi: ContractAbi = [transferEvent, anonymousEvent];
    expect(
      findEventByTopic(
        abi,
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      ),
    ).toBe(transferEvent);
    expect(
      findEventByTopic(
        abi,
        "0xDDF252AD1BE2C89B69C2B068FC378DAA952BA7F163C4A11628F55A4DF523B3EF",
      ),
    ).toBe(transferEvent);
    expect(findEventByTopic(abi, "0xdeadbeef")).toBeNull();
  });
});
