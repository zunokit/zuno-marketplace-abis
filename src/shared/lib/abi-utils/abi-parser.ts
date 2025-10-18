import { ContractAbi, AbiFunction, AbiEvent, AbiItem } from "@/shared/types";

export class AbiParser {
  /**
   * Extract all function signatures from ABI
   */
  static getFunctionSignatures(abi: ContractAbi): string[] {
    return abi
      .filter((item): item is AbiFunction => item.type === "function")
      .map((func) => this.generateFunctionSignature(func));
  }

  /**
   * Extract all event signatures from ABI
   */
  static getEventSignatures(abi: ContractAbi): string[] {
    return abi
      .filter((item): item is AbiEvent => item.type === "event")
      .map((event) => this.generateEventSignature(event));
  }

  /**
   * Generate function signature (e.g., "transfer(address,uint256)")
   */
  static generateFunctionSignature(func: AbiFunction): string {
    const params = func.inputs.map((input) => input.type).join(",");
    return `${func.name}(${params})`;
  }

  /**
   * Generate event signature
   */
  static generateEventSignature(event: AbiEvent): string {
    const params = event.inputs.map((input) => input.type).join(",");
    return `${event.name}(${params})`;
  }

  /**
   * Extract functions by name
   */
  static getFunctionsByName(abi: ContractAbi, name: string): AbiFunction[] {
    return abi.filter(
      (item): item is AbiFunction => item.type === "function" && item.name === name
    );
  }

  /**
   * Extract events by name
   */
  static getEventsByName(abi: ContractAbi, name: string): AbiEvent[] {
    return abi.filter(
      (item): item is AbiEvent => item.type === "event" && item.name === name
    );
  }

  /**
   * Get all read-only functions (view/pure)
   */
  static getReadOnlyFunctions(abi: ContractAbi): AbiFunction[] {
    return abi.filter(
      (item): item is AbiFunction =>
        item.type === "function" &&
        (item.stateMutability === "view" || item.stateMutability === "pure" || item.constant === true)
    );
  }

  /**
   * Get all state-changing functions
   */
  static getWriteFunctions(abi: ContractAbi): AbiFunction[] {
    return abi.filter(
      (item): item is AbiFunction =>
        item.type === "function" &&
        (item.stateMutability === "nonpayable" || item.stateMutability === "payable") &&
        item.constant !== true
    );
  }

  /**
   * Get payable functions
   */
  static getPayableFunctions(abi: ContractAbi): AbiFunction[] {
    return abi.filter(
      (item): item is AbiFunction =>
        item.type === "function" &&
        (item.stateMutability === "payable" || item.payable === true)
    );
  }

  /**
   * Extract constructor
   */
  static getConstructor(abi: ContractAbi): AbiFunction | null {
    const constructor = abi.find((item) => item.type === "constructor") as AbiFunction | undefined;
    return constructor || null;
  }

  /**
   * Check if ABI has a specific function
   */
  static hasFunction(abi: ContractAbi, functionName: string): boolean {
    return abi.some(
      (item) => item.type === "function" && item.name === functionName
    );
  }

  /**
   * Check if ABI has a specific event
   */
  static hasEvent(abi: ContractAbi, eventName: string): boolean {
    return abi.some((item) => item.type === "event" && item.name === eventName);
  }

  /**
   * Get ABI statistics
   */
  static getStats(abi: ContractAbi): {
    totalItems: number;
    functions: number;
    events: number;
    readOnly: number;
    write: number;
    payable: number;
  } {
    const functions = abi.filter((item) => item.type === "function");
    const events = abi.filter((item) => item.type === "event");
    const readOnly = this.getReadOnlyFunctions(abi);
    const write = this.getWriteFunctions(abi);
    const payable = this.getPayableFunctions(abi);

    return {
      totalItems: abi.length,
      functions: functions.length,
      events: events.length,
      readOnly: readOnly.length,
      write: write.length,
      payable: payable.length,
    };
  }

  /**
   * Detect token standard from ABI
   */
  static detectStandard(abi: ContractAbi): string | null {
    // ERC20
    if (
      this.hasFunction(abi, "totalSupply") &&
      this.hasFunction(abi, "balanceOf") &&
      this.hasFunction(abi, "transfer") &&
      this.hasFunction(abi, "transferFrom") &&
      this.hasFunction(abi, "approve") &&
      this.hasFunction(abi, "allowance") &&
      this.hasEvent(abi, "Transfer") &&
      this.hasEvent(abi, "Approval")
    ) {
      return "ERC20";
    }

    // ERC721
    if (
      this.hasFunction(abi, "ownerOf") &&
      this.hasFunction(abi, "safeTransferFrom") &&
      this.hasFunction(abi, "transferFrom") &&
      this.hasFunction(abi, "approve") &&
      this.hasFunction(abi, "setApprovalForAll") &&
      this.hasFunction(abi, "getApproved") &&
      this.hasFunction(abi, "isApprovedForAll") &&
      this.hasEvent(abi, "Transfer") &&
      this.hasEvent(abi, "Approval") &&
      this.hasEvent(abi, "ApprovalForAll")
    ) {
      return "ERC721";
    }

    // ERC1155
    if (
      this.hasFunction(abi, "balanceOf") &&
      this.hasFunction(abi, "balanceOfBatch") &&
      this.hasFunction(abi, "setApprovalForAll") &&
      this.hasFunction(abi, "isApprovedForAll") &&
      this.hasFunction(abi, "safeTransferFrom") &&
      this.hasFunction(abi, "safeBatchTransferFrom") &&
      this.hasEvent(abi, "TransferSingle") &&
      this.hasEvent(abi, "TransferBatch") &&
      this.hasEvent(abi, "ApprovalForAll")
    ) {
      return "ERC1155";
    }

    return null;
  }

  /**
   * Extract function input types
   */
  static getFunctionInputTypes(func: AbiFunction): string[] {
    return func.inputs.map((input) => input.type);
  }

  /**
   * Extract function output types
   */
  static getFunctionOutputTypes(func: AbiFunction): string[] {
    return (func.outputs || []).map((output) => output.type);
  }

  /**
   * Validate ABI structure
   */
  static validate(abi: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(abi)) {
      errors.push("ABI must be an array");
      return { valid: false, errors };
    }

    if (abi.length === 0) {
      errors.push("ABI cannot be empty");
    }

    abi.forEach((item, index) => {
      if (typeof item !== "object" || item === null) {
        errors.push(`Item at index ${index} is not an object`);
        return;
      }

      if (!("type" in item) || typeof item.type !== "string") {
        errors.push(`Item at index ${index} missing valid 'type' field`);
      }

      const validTypes = ["function", "constructor", "event", "fallback", "receive"];
      if ("type" in item && !validTypes.includes(item.type as string)) {
        errors.push(`Item at index ${index} has invalid type: ${item.type}`);
      }

      // Validate function/event has name
      if (
        ("type" in item && (item.type === "function" || item.type === "event")) &&
        (!("name" in item) || typeof item.name !== "string")
      ) {
        errors.push(`${item.type} at index ${index} missing valid 'name' field`);
      }

      // Validate inputs
      if ("inputs" in item && !Array.isArray(item.inputs)) {
        errors.push(`Item at index ${index} has invalid 'inputs' field (must be array)`);
      }

      // Validate outputs for functions
      if (
        "type" in item &&
        item.type === "function" &&
        "outputs" in item &&
        !Array.isArray(item.outputs)
      ) {
        errors.push(`Function at index ${index} has invalid 'outputs' field (must be array)`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
