export interface ContractEntity {
  id: string;
  address: string;
  networkId: string;
  abiId: string;
  name?: string;
  type?: string; // token, nft, defi, dao, etc.
  isVerified: boolean;
  verifiedAt?: Date;
  verificationSource?: string; // etherscan, sourcify, manual
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
  verificationSource?: string;
  deployer?: string;
  deployedAfter?: Date;
  deployedBefore?: Date;
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
  constructor(id: string) {
    super(`Contract with id ${id} not found`, "CONTRACT_NOT_FOUND", 404);
  }
}

export class ContractDuplicateError extends ContractError {
  constructor(address: string, networkId: string) {
    super(
      `Contract with address ${address} already exists on network ${networkId}`,
      "CONTRACT_DUPLICATE",
      409
    );
  }
}

export class InvalidAddressError extends ContractError {
  constructor(address: string) {
    super(`Invalid contract address: ${address}`, "INVALID_ADDRESS", 400);
  }
}

// Value objects
export class ContractAddress {
  constructor(private readonly value: string) {
    if (!this.isValidAddress(value)) {
      throw new InvalidAddressError(value);
    }
  }

  toString(): string {
    return this.value.toLowerCase();
  }

  toChecksum(): string {
    // Simple checksum implementation - in production, use a proper library
    const address = this.value.slice(2).toLowerCase();
    const hash = this.simpleHash(address);

    let checksumAddress = "0x";
    for (let i = 0; i < address.length; i++) {
      if (parseInt(hash[i], 16) >= 8) {
        checksumAddress += address[i].toUpperCase();
      } else {
        checksumAddress += address[i];
      }
    }
    return checksumAddress;
  }

  equals(other: ContractAddress): boolean {
    return this.toString() === other.toString();
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private simpleHash(input: string): string {
    // Simple hash function for demonstration - use keccak256 in production
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(40, "0");
  }
}

// Factory for creating contract entities
export class ContractFactory {
  static createContract(params: CreateContractParams): ContractEntity {
    const now = new Date();

    // Validate address
    new ContractAddress(params.address);

    return {
      id: crypto.randomUUID(),
      address: params.address.toLowerCase(),
      networkId: params.networkId,
      abiId: params.abiId,
      name: params.name,
      type: params.type,
      isVerified: false,
      metadata: params.metadata,
      deployedAt: params.deployedAt,
      deployer: params.deployer?.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };
  }

  static verifyContract(
    contract: ContractEntity,
    source: string
  ): ContractEntity {
    return {
      ...contract,
      isVerified: true,
      verifiedAt: new Date(),
      verificationSource: source,
      updatedAt: new Date(),
    };
  }
}