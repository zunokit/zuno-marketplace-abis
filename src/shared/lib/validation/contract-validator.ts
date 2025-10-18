import { isValidAddress, isValidChainId } from "@/shared/types";
import { ValidationError } from "@/shared/lib/utils/error-handler";

export class ContractValidator {
  /**
   * Validate Ethereum address format
   */
  static validateAddress(address: string): void {
    if (!isValidAddress(address)) {
      throw new ValidationError(
        `Invalid contract address: ${address}. Must be a valid Ethereum address (0x followed by 40 hex characters)`
      );
    }
  }

  /**
   * Validate chain ID
   */
  static validateChainId(chainId: number): void {
    if (!isValidChainId(chainId)) {
      throw new ValidationError(
        `Invalid chain ID: ${chainId}. Must be a positive integer`
      );
    }
  }

  /**
   * Validate contract metadata
   */
  static validateMetadata(metadata: unknown): void {
    if (metadata === null || metadata === undefined) {
      return; // Metadata is optional
    }

    if (typeof metadata !== "object") {
      throw new ValidationError("Contract metadata must be an object");
    }

    const meta = metadata as Record<string, unknown>;

    // Validate decimals if present
    if (meta.decimals !== undefined) {
      if (
        typeof meta.decimals !== "number" ||
        meta.decimals < 0 ||
        meta.decimals > 77
      ) {
        throw new ValidationError(
          "Contract decimals must be a number between 0 and 77"
        );
      }
    }

    // Validate symbol if present
    if (meta.symbol !== undefined && typeof meta.symbol !== "string") {
      throw new ValidationError("Contract symbol must be a string");
    }

    // Validate totalSupply if present
    if (
      meta.totalSupply !== undefined &&
      typeof meta.totalSupply !== "string"
    ) {
      throw new ValidationError("Contract totalSupply must be a string");
    }

    // Validate implementation address if present
    if (meta.implementation !== undefined) {
      if (typeof meta.implementation !== "string") {
        throw new ValidationError("Contract implementation must be a string");
      }
      this.validateAddress(meta.implementation);
    }

    // Validate isProxy if present
    if (meta.isProxy !== undefined && typeof meta.isProxy !== "boolean") {
      throw new ValidationError("Contract isProxy must be a boolean");
    }
  }

  /**
   * Validate deployer address if present
   */
  static validateDeployer(deployer?: string): void {
    if (deployer) {
      this.validateAddress(deployer);
    }
  }

  /**
   * Validate contract type
   */
  static validateType(type?: string): void {
    if (!type) return; // Type is optional

    const validTypes = [
      "token",
      "nft",
      "defi",
      "dao",
      "bridge",
      "multisig",
      "other",
    ];
    if (!validTypes.includes(type.toLowerCase())) {
      throw new ValidationError(
        `Invalid contract type: ${type}. Must be one of: ${validTypes.join(
          ", "
        )}`
      );
    }
  }

  /**
   * Validate verification source
   */
  static validateVerificationSource(source?: string): void {
    if (!source) return; // Source is optional

    const validSources = ["etherscan", "sourcify", "manual", "blockscout"];
    if (!validSources.includes(source.toLowerCase())) {
      throw new ValidationError(
        `Invalid verification source: ${source}. Must be one of: ${validSources.join(
          ", "
        )}`
      );
    }
  }

  /**
   * Validate contract name
   */
  static validateName(name?: string): void {
    if (!name) return; // Name is optional

    if (typeof name !== "string") {
      throw new ValidationError("Contract name must be a string");
    }

    if (name.length > 255) {
      throw new ValidationError(
        "Contract name must be less than 255 characters"
      );
    }
  }

  /**
   * Validate entire contract data
   */
  static validate(data: {
    address: string;
    chainId?: number;
    networkId?: string;
    name?: string;
    type?: string;
    deployer?: string;
    metadata?: unknown;
    verificationSource?: string;
  }): void {
    this.validateAddress(data.address);

    if (data.chainId !== undefined) {
      this.validateChainId(data.chainId);
    }

    if (!data.networkId) {
      throw new ValidationError("Network ID is required");
    }

    this.validateName(data.name);
    this.validateType(data.type);
    this.validateDeployer(data.deployer);
    this.validateMetadata(data.metadata);
    this.validateVerificationSource(data.verificationSource);
  }
}
