import { ContractAbi } from "@/shared/types";

export interface AbiEntity {
  id: string;
  userId: string;
  name: string;
  description?: string;
  contractName?: string;
  abi: ContractAbi;
  abiHash: string;
  ipfsHash?: string;
  ipfsUrl?: string;
  version: string;
  tags: string[];
  standard?: string;
  metadata?: {
    originNetwork?: string;
    compatibleNetworks?: string[];
    compiler?: string;
    compilerVersion?: string;
    license?: string;
    sourceUrl?: string;
    bytecode?: string;
  };
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AbiVersionEntity {
  id: string;
  abiId: string;
  version: string;
  versionNumber: number;
  abi: ContractAbi;
  abiHash: string;
  ipfsHash?: string;
  ipfsUrl?: string;
  changeLog?: string;
  metadata?: {
    breaking?: boolean;
    deprecated?: boolean;
  };
  createdAt: Date;
}

export interface CreateAbiParams {
  userId: string;
  name: string;
  description?: string;
  contractName?: string;
  abi: ContractAbi;
  tags?: string[];
  standard?: string;
  metadata?: {
    originNetwork?: string;
    compatibleNetworks?: string[];
    compiler?: string;
    compilerVersion?: string;
    license?: string;
    sourceUrl?: string;
    bytecode?: string;
  };
}

export interface UpdateAbiParams {
  name?: string;
  description?: string;
  contractName?: string;
  abi?: ContractAbi;
  version?: string;
  tags?: string[];
  standard?: string;
  metadata?: {
    originNetwork?: string;
    compatibleNetworks?: string[];
    compiler?: string;
    compilerVersion?: string;
    license?: string;
    sourceUrl?: string;
    bytecode?: string;
  };
}

export interface CreateAbiVersionParams {
  abiId: string;
  abi: ContractAbi;
  changeLog?: string;
  metadata?: {
    breaking?: boolean;
    deprecated?: boolean;
  };
}

export interface AbiSearchFilters {
  userId?: string;
  contractName?: string;
  standard?: string;
  tags?: string[];
  compatibleNetworks?: string[];
  isDeleted?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface AbiListParams {
  page?: number;
  limit?: number;
  sortBy?: "name" | "createdAt" | "updatedAt" | "version";
  sortOrder?: "asc" | "desc";
  filters?: AbiSearchFilters;
  query?: string;
}

// Domain errors
export class AbiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "AbiError";
  }
}

export class AbiNotFoundError extends AbiError {
  constructor(id: string) {
    super(`ABI with id ${id} not found`, "ABI_NOT_FOUND", 404);
  }
}

export class AbiDuplicateError extends AbiError {
  constructor(hash: string) {
    super(`ABI with hash ${hash} already exists`, "ABI_DUPLICATE", 409);
  }
}

export class AbiInvalidError extends AbiError {
  constructor(reason: string) {
    super(`Invalid ABI: ${reason}`, "ABI_INVALID", 400);
  }
}

export class AbiVersionExistsError extends AbiError {
  constructor(abiId: string, version: string) {
    super(`Version ${version} already exists for ABI ${abiId}`, "ABI_VERSION_EXISTS", 409);
  }
}

// Value objects
export class AbiHash {
  constructor(private readonly value: string) {
    if (!value || value.length !== 64) {
      throw new AbiInvalidError("Invalid ABI hash format");
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: AbiHash): boolean {
    return this.value === other.value;
  }
}

export class AbiVersion {
  constructor(private readonly value: string) {
    if (!this.isValidVersion(value)) {
      throw new AbiInvalidError("Invalid version format. Use semantic versioning (e.g., 1.0.0)");
    }
  }

  toString(): string {
    return this.value;
  }

  private isValidVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*)?$/;
    return semverRegex.test(version);
  }

  getMajor(): number {
    return parseInt(this.value.split(".")[0]);
  }

  getMinor(): number {
    return parseInt(this.value.split(".")[1]);
  }

  getPatch(): number {
    return parseInt(this.value.split(".")[2].split("-")[0]);
  }

  isGreaterThan(other: AbiVersion): boolean {
    const [major1, minor1, patch1] = this.value.split(".").map(Number);
    const [major2, minor2, patch2] = other.value.split(".").map(Number);

    if (major1 !== major2) return major1 > major2;
    if (minor1 !== minor2) return minor1 > minor2;
    return patch1 > patch2;
  }
}

// Factory for creating ABI entities
export class AbiFactory {
  static createAbi(params: CreateAbiParams, hash: string): AbiEntity {
    const now = new Date();

    return {
      id: crypto.randomUUID(),
      userId: params.userId,
      name: params.name,
      description: params.description,
      contractName: params.contractName,
      abi: params.abi,
      abiHash: hash,
      version: "1.0.0", // Default first version
      tags: params.tags || [],
      standard: params.standard,
      metadata: params.metadata,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  static createAbiVersion(
    params: CreateAbiVersionParams,
    version: string,
    versionNumber: number,
    hash: string
  ): AbiVersionEntity {
    return {
      id: crypto.randomUUID(),
      abiId: params.abiId,
      version,
      versionNumber,
      abi: params.abi,
      abiHash: hash,
      changeLog: params.changeLog,
      metadata: params.metadata,
      createdAt: new Date(),
    };
  }
}