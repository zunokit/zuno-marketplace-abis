import { createHash } from "crypto";
import { ContractAbi } from "@/shared/types";

export class AbiHasher {
  /**
   * Generate a deterministic hash for an ABI
   * This ensures that identical ABIs produce the same hash
   */
  static generateHash(abi: ContractAbi): string {
    // Normalize the ABI to ensure consistent hashing
    const normalizedAbi = this.normalizeAbi(abi);

    // Convert to canonical JSON string
    const abiString = JSON.stringify(normalizedAbi);

    // Generate SHA-256 hash
    return createHash("sha256").update(abiString).digest("hex");
  }

  /**
   * Normalize ABI for consistent hashing
   * Removes inconsistencies that don't affect functionality
   */
  private static normalizeAbi(abi: ContractAbi): ContractAbi {
    return abi
      .map(item => this.normalizeAbiItem(item))
      .sort((a, b) => {
        // Sort by type first, then by name
        if (a.type !== b.type) {
          return a.type.localeCompare(b.type);
        }

        const aName = "name" in a ? a.name : "";
        const bName = "name" in b ? b.name : "";
        return aName.localeCompare(bName);
      });
  }

  /**
   * Normalize individual ABI item
   */
  private static normalizeAbiItem(item: any): any {
    const normalized: any = {
      type: item.type,
    };

    // Add name if present
    if (item.name) {
      normalized.name = item.name;
    }

    // Add inputs if present, sorted by name
    if (item.inputs) {
      normalized.inputs = item.inputs
        .map((input: any) => this.normalizeInput(input))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    }

    // Add outputs if present, sorted by name
    if (item.outputs) {
      normalized.outputs = item.outputs
        .map((output: any) => this.normalizeOutput(output))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    }

    // Add stateMutability for functions
    if (item.stateMutability) {
      normalized.stateMutability = item.stateMutability;
    }

    // Add anonymous for events
    if (item.type === "event" && typeof item.anonymous === "boolean") {
      normalized.anonymous = item.anonymous;
    }

    // Handle legacy constant/payable flags
    if (item.type === "function") {
      if (typeof item.constant === "boolean") {
        normalized.constant = item.constant;
      }
      if (typeof item.payable === "boolean") {
        normalized.payable = item.payable;
      }
    }

    return normalized;
  }

  /**
   * Normalize input parameter
   */
  private static normalizeInput(input: any): any {
    const normalized: any = {
      name: input.name || "",
      type: input.type,
    };

    if (input.indexed !== undefined) {
      normalized.indexed = input.indexed;
    }

    if (input.internalType) {
      normalized.internalType = input.internalType;
    }

    if (input.components) {
      normalized.components = input.components
        .map((comp: any) => this.normalizeInput(comp))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    }

    return normalized;
  }

  /**
   * Normalize output parameter
   */
  private static normalizeOutput(output: any): any {
    const normalized: any = {
      name: output.name || "",
      type: output.type,
    };

    if (output.internalType) {
      normalized.internalType = output.internalType;
    }

    if (output.components) {
      normalized.components = output.components
        .map((comp: any) => this.normalizeOutput(comp))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    }

    return normalized;
  }

  /**
   * Verify if two ABIs are identical based on their hash
   */
  static areIdentical(abi1: ContractAbi, abi2: ContractAbi): boolean {
    return this.generateHash(abi1) === this.generateHash(abi2);
  }

  /**
   * Generate a short hash for display purposes
   */
  static generateShortHash(abi: ContractAbi, length = 8): string {
    const fullHash = this.generateHash(abi);
    return fullHash.substring(0, length);
  }

  /**
   * Alias for generateHash for compatibility
   */
  static hashAbi(abi: ContractAbi): string {
    return this.generateHash(abi);
  }
}