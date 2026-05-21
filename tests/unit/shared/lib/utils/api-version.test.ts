import { extractApiVersionFromId } from "@/shared/lib/utils/api-version";

describe("extractApiVersionFromId", () => {
  it("returns the version segment for a well-formed ID", () => {
    expect(extractApiVersionFromId("usr_v1_abc123")).toBe("v1");
    expect(extractApiVersionFromId("abi_v2_xyz789")).toBe("v2");
  });

  it("returns the second segment regardless of the resource prefix", () => {
    expect(extractApiVersionFromId("contract_v1_xxx")).toBe("v1");
    expect(extractApiVersionFromId("a_v3_b_c_d")).toBe("v3");
  });

  it("returns null when there is no underscore", () => {
    expect(extractApiVersionFromId("usr")).toBeNull();
  });

  it("returns an empty string when the second segment is empty", () => {
    expect(extractApiVersionFromId("usr__abc")).toBe("");
  });

  it("returns null for an empty string", () => {
    expect(extractApiVersionFromId("")).toBeNull();
  });
});
