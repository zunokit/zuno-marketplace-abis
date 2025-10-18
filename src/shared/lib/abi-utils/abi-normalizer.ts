import { ContractAbi, AbiItem, AbiFunction, AbiEvent } from "@/shared/types";

export class AbiNormalizer {
  /**
   * Normalize ABI for consistent storage and comparison
   * Removes whitespace, sorts items, standardizes field names
   */
  static normalize(abi: ContractAbi): ContractAbi {
    return abi
      .map((item) => this.normalizeItem(item))
      .sort((a, b) => this.compareItems(a, b));
  }

  /**
   * Normalize individual ABI item
   */
  private static normalizeItem(item: AbiItem): AbiItem {
    const normalized: any = {
      type: item.type,
    };

    // Add name for functions and events
    if ("name" in item && item.name) {
      normalized.name = item.name.trim();
    }

    // Normalize inputs
    if ("inputs" in item && Array.isArray(item.inputs)) {
      normalized.inputs = item.inputs.map((input) =>
        this.normalizeParameter(input)
      );
    }

    // Normalize outputs for functions
    if (
      item.type === "function" &&
      "outputs" in item &&
      Array.isArray(item.outputs)
    ) {
      normalized.outputs = item.outputs.map((output) =>
        this.normalizeParameter(output)
      );
    }

    // Add stateMutability for functions
    if (item.type === "function" && "stateMutability" in item) {
      normalized.stateMutability = item.stateMutability;
    } else if (item.type === "function") {
      // Derive from legacy constant/payable flags
      if ("constant" in item && item.constant === true) {
        normalized.stateMutability = "view";
      } else if ("payable" in item && item.payable === true) {
        normalized.stateMutability = "payable";
      } else {
        normalized.stateMutability = "nonpayable";
      }
    }

    // Add anonymous for events
    if (item.type === "event" && "anonymous" in item) {
      normalized.anonymous = item.anonymous === true;
    }

    return normalized;
  }

  /**
   * Normalize parameter (input/output)
   */
  private static normalizeParameter(param: any): any {
    const normalized: any = {
      name: param.name?.trim() || "",
      type: param.type.trim(),
    };

    if (param.indexed !== undefined) {
      normalized.indexed = param.indexed === true;
    }

    if (param.internalType) {
      normalized.internalType = param.internalType.trim();
    }

    if (param.components && Array.isArray(param.components)) {
      normalized.components = param.components.map((comp: any) =>
        this.normalizeParameter(comp)
      );
    }

    return normalized;
  }

  /**
   * Compare two ABI items for sorting
   */
  private static compareItems(a: AbiItem, b: AbiItem): number {
    // Sort by type first
    const typeOrder = [
      "constructor",
      "receive",
      "fallback",
      "function",
      "event",
    ];
    const aTypeIndex = typeOrder.indexOf(a.type);
    const bTypeIndex = typeOrder.indexOf(b.type);

    if (aTypeIndex !== bTypeIndex) {
      return aTypeIndex - bTypeIndex;
    }

    // Then sort by name
    const aName = "name" in a ? a.name : "";
    const bName = "name" in b ? b.name : "";

    return aName.localeCompare(bName);
  }

  /**
   * Remove duplicate items from ABI
   */
  static removeDuplicates(abi: ContractAbi): ContractAbi {
    const seen = new Set<string>();
    return abi.filter((item) => {
      const key = this.getItemKey(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate unique key for ABI item
   */
  private static getItemKey(item: AbiItem): string {
    const normalized = this.normalizeItem(item);
    return JSON.stringify(normalized);
  }

  /**
   * Strip comments and metadata from ABI
   */
  static stripMetadata(abi: ContractAbi): ContractAbi {
    return abi.map((item) => {
      const { ...essential } = item;
      // Remove any custom metadata fields
      delete (essential as any).__metadata;
      delete (essential as any).comment;
      delete (essential as any).devdoc;
      delete (essential as any).userdoc;
      return essential;
    });
  }

  /**
   * Convert legacy ABI format to modern format
   */
  static modernize(abi: ContractAbi): ContractAbi {
    return abi.map((item) => {
      if (item.type !== "function") {
        return item;
      }

      const func = item as AbiFunction;
      const modernized: any = {
        ...func,
      };

      // Convert constant/payable to stateMutability
      if (!modernized.stateMutability) {
        if (func.constant === true) {
          modernized.stateMutability = "view";
        } else if (func.payable === true) {
          modernized.stateMutability = "payable";
        } else {
          modernized.stateMutability = "nonpayable";
        }
      }

      // Remove legacy fields if stateMutability is present
      if (modernized.stateMutability) {
        delete modernized.constant;
        delete modernized.payable;
      }

      return modernized;
    });
  }

  /**
   * Validate and fix common ABI issues
   */
  static fix(abi: ContractAbi): {
    fixed: ContractAbi;
    issues: string[];
  } {
    const issues: string[] = [];
    const fixed: AbiItem[] = [];

    abi.forEach((item, index) => {
      const fixedItem = { ...item };

      // Fix missing inputs/outputs
      if (item.type === "function" || item.type === "event") {
        if (!("inputs" in fixedItem) || !Array.isArray(fixedItem.inputs)) {
          fixedItem.inputs = [];
          issues.push(`Item ${index}: Added missing inputs array`);
        }

        if (item.type === "function") {
          if (
            !("outputs" in fixedItem) ||
            !Array.isArray((fixedItem as any).outputs)
          ) {
            (fixedItem as any).outputs = [];
            issues.push(`Item ${index}: Added missing outputs array`);
          }
        }
      }

      // Fix missing stateMutability for functions
      if (item.type === "function" && !("stateMutability" in fixedItem)) {
        (fixedItem as any).stateMutability = "nonpayable";
        issues.push(`Item ${index}: Added missing stateMutability`);
      }

      // Fix empty names
      if (
        (item.type === "function" || item.type === "event") &&
        !("name" in fixedItem || !(fixedItem as any).name)
      ) {
        (fixedItem as any).name = `unnamed_${item.type}_${index}`;
        issues.push(`Item ${index}: Added default name`);
      }

      fixed.push(fixedItem);
    });

    return {
      fixed: fixed as ContractAbi,
      issues,
    };
  }

  /**
   * Minify ABI (remove unnecessary fields)
   */
  static minify(abi: ContractAbi): ContractAbi {
    return abi.map((item) => {
      const minified: any = {
        type: item.type,
      };

      if ("name" in item) {
        minified.name = item.name;
      }

      if ("inputs" in item) {
        minified.inputs = (item as any).inputs.map((input: any) => ({
          name: input.name || "",
          type: input.type,
          ...(input.indexed !== undefined && { indexed: input.indexed }),
          ...(input.components && { components: input.components }),
        }));
      }

      if (item.type === "function") {
        const func = item as AbiFunction;
        if (func.outputs) {
          minified.outputs = func.outputs.map((output: any) => ({
            name: output.name || "",
            type: output.type,
            ...(output.components && { components: output.components }),
          }));
        }
        if (func.stateMutability) {
          minified.stateMutability = func.stateMutability;
        }
      }

      if (item.type === "event") {
        const event = item as AbiEvent;
        if (event.anonymous !== undefined) {
          minified.anonymous = event.anonymous;
        }
      }

      return minified;
    });
  }

  /**
   * Compare two ABIs and return differences
   */
  static diff(
    oldAbi: ContractAbi,
    newAbi: ContractAbi
  ): {
    added: AbiItem[];
    removed: AbiItem[];
    modified: Array<{ old: AbiItem; new: AbiItem }>;
  } {
    const oldNormalized = this.normalize(oldAbi);
    const newNormalized = this.normalize(newAbi);

    const oldKeys = new Map(
      oldNormalized.map((item) => [this.getItemKey(item), item])
    );
    const newKeys = new Map(
      newNormalized.map((item) => [this.getItemKey(item), item])
    );

    const added: AbiItem[] = [];
    const removed: AbiItem[] = [];
    const modified: Array<{ old: AbiItem; new: AbiItem }> = [];

    // Find added and modified
    for (const [key, newItem] of newKeys) {
      if (!oldKeys.has(key)) {
        const oldItem = this.findSimilarItem(newItem, oldNormalized);
        if (oldItem) {
          modified.push({ old: oldItem, new: newItem });
        } else {
          added.push(newItem);
        }
      }
    }

    // Find removed
    for (const [key, oldItem] of oldKeys) {
      if (!newKeys.has(key)) {
        const newItem = this.findSimilarItem(oldItem, newNormalized);
        if (!newItem) {
          removed.push(oldItem);
        }
      }
    }

    return { added, removed, modified };
  }

  /**
   * Find similar item by name and type (for diff comparison)
   */
  private static findSimilarItem(
    item: AbiItem,
    abi: ContractAbi
  ): AbiItem | null {
    if (!("name" in item)) return null;

    return (
      abi.find(
        (other) =>
          other.type === item.type &&
          "name" in other &&
          other.name === item.name
      ) || null
    );
  }
}
