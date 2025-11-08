import { isValidAddress } from "@/shared/types";
import { ValidationError } from "@/shared/lib/utils/error-handler";

export interface ContractEntity {
  id: string;
  address: string;
  networkId: string;
  abiId: string;
  name?: string;
  type?: string;
  isVerified: boolean;
  verifiedAt?: Date;
  verificationSource?: string;
  metadata?: {
    symbol?: string;
    totalSupply?: string;
    decimals?: number;
    isProxy?: boolean;
    implementation?: string;
  };
  deployedAt?: Date;
  deployer?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContractParams {
  address: string;
  networkId: string;
  abiId: string;
  name?: string;
  type?: string;
  verificationSource?: string;
  metadata?: {
    symbol?: string;
    totalSupply?: string;
    decimals?: number;
    isProxy?: boolean;
    implementation?: string;
  };
  deployedAt?: Date;
  deployer?: string;
}

export interface UpdateContractParams {
  name?: string;
  type?: string;
  abiId?: string;
  isVerified?: boolean;
  verificationSource?: string;
  metadata?: {
    symbol?: string;
    totalSupply?: string;
    decimals?: number;
    isProxy?: boolean;
    implementation?: string;
  };
  deployedAt?: Date;
  deployer?: string;
}

export interface ContractSearchFilters {
  networkId?: string;
  abiId?: string;
  type?: string;
  isVerified?: boolean;
  deployer?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ContractListParams {
  page?: number;
  limit?: number;
  sortBy?: "name" | "createdAt" | "updatedAt" | "deployedAt";
  sortOrder?: "asc" | "desc";
  filters?: ContractSearchFilters;
  query?: string;
}

// Domain errors
export class ContractError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "ContractError";
  }
}

export class ContractNotFoundError extends ContractError {
  constructor(identifier: string) {
    super(`Contract ${identifier} not found`, "CONTRACT_NOT_FOUND", 404);
  }
}

export class ContractDuplicateError extends ContractError {
  constructor(address: string, networkId: string) {
    super(
      `Contract ${address} on network ${networkId} already exists`,
      "CONTRACT_DUPLICATE",
      409
    );
  }
}

export class ContractFactory {
  static createContract(params: CreateContractParams): ContractEntity {
    // Validate contract address format (defensive programming at domain boundary)
    if (!isValidAddress(params.address)) {
      throw new ValidationError(
        `Invalid contract address format: ${params.address}. Expected format: 0x followed by 40 hexadecimal characters.`
      );
    }

    // Validate deployer address if provided
    if (params.deployer && !isValidAddress(params.deployer)) {
      throw new ValidationError(
        `Invalid deployer address format: ${params.deployer}. Expected format: 0x followed by 40 hexadecimal characters.`
      );
    }

    // Validate implementation address in metadata if provided
    if (params.metadata?.implementation && !isValidAddress(params.metadata.implementation)) {
      throw new ValidationError(
        `Invalid implementation address format: ${params.metadata.implementation}. Expected format: 0x followed by 40 hexadecimal characters.`
      );
    }

    const now = new Date();

    return {
      id: crypto.randomUUID(),
      address: params.address.toLowerCase(), // Normalize to lowercase
      networkId: params.networkId,
      abiId: params.abiId,
      name: params.name,
      type: params.type,
      isVerified: false,
      verificationSource: params.verificationSource,
      metadata: params.metadata,
      deployedAt: params.deployedAt,
      deployer: params.deployer?.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };
  }
}
