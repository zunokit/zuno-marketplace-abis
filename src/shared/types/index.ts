// Common types used across the application

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SearchParams extends PaginationParams, SortParams {
  query?: string;
  filters?: Record<string, unknown>;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

// ABI related types
export interface AbiFunction {
  name: string;
  type: "function" | "constructor" | "receive" | "fallback";
  inputs: AbiInput[];
  outputs?: AbiOutput[];
  stateMutability?: "pure" | "view" | "nonpayable" | "payable";
  constant?: boolean;
  payable?: boolean;
}

export interface AbiEvent {
  name: string;
  type: "event";
  inputs: AbiInput[];
  anonymous?: boolean;
}

export interface AbiInput {
  name: string;
  type: string;
  indexed?: boolean;
  components?: AbiInput[];
  internalType?: string;
}

export interface AbiOutput {
  name: string;
  type: string;
  components?: AbiOutput[];
  internalType?: string;
}

export type AbiItem = AbiFunction | AbiEvent;
export type ContractAbi = AbiItem[];

// Network types
export interface NetworkInfo {
  chainId: number;
  name: string;
  slug: string;
  type: "mainnet" | "testnet" | "local";
  isTestnet: boolean;
  rpcUrls: string[];
  explorerUrls?: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  icon?: string;
  isActive: boolean;
}

// Contract types
export interface ContractInfo {
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
}

// File upload types
export interface FileUpload {
  name: string;
  size: number;
  type: string;
  content: ArrayBuffer | string;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Cache types
export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  key?: string;
}

// Audit types
export interface AuditContext {
  userId?: string;
  apiKeyId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
}

// Common enums
export enum ResourceType {
  ABI = "abi",
  CONTRACT = "contract",
  NETWORK = "network",
  USER = "user",
  API_KEY = "api_key",
}

export enum ActionType {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  SEARCH = "search",
}

export enum ErrorCode {
  // Generic errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  RATE_LIMITED = "RATE_LIMITED",

  // ABI specific errors
  ABI_INVALID = "ABI_INVALID",
  ABI_DUPLICATE = "ABI_DUPLICATE",
  ABI_NOT_FOUND = "ABI_NOT_FOUND",
  ABI_VERSION_EXISTS = "ABI_VERSION_EXISTS",

  // Contract specific errors
  CONTRACT_NOT_FOUND = "CONTRACT_NOT_FOUND",
  CONTRACT_DUPLICATE = "CONTRACT_DUPLICATE",
  INVALID_ADDRESS = "INVALID_ADDRESS",

  // Network specific errors
  NETWORK_NOT_FOUND = "NETWORK_NOT_FOUND",
  INVALID_CHAIN_ID = "INVALID_CHAIN_ID",

  // Storage errors
  STORAGE_ERROR = "STORAGE_ERROR",
  IPFS_ERROR = "IPFS_ERROR",

  // Cache errors
  CACHE_ERROR = "CACHE_ERROR",
}

// Standard response formats
export const createSuccessResponse = <T>(
  data: T,
  meta?: Record<string, unknown>
): ApiResponse<T> => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    version: "v1",
    ...meta,
  },
});

export const createErrorResponse = (
  code: ErrorCode,
  message: string,
  statusCode = 500,
  details?: unknown
): ApiResponse => ({
  success: false,
  error: {
    code,
    message,
    details,
  },
  meta: {
    timestamp: new Date().toISOString(),
    version: "v1",
  },
});

// Type guards
export const isContractAbi = (abi: unknown): abi is ContractAbi => {
  return Array.isArray(abi) && abi.every(item =>
    typeof item === "object" &&
    item !== null &&
    "type" in item &&
    typeof item.type === "string"
  );
};

export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const isValidChainId = (chainId: number): boolean => {
  return Number.isInteger(chainId) && chainId > 0;
};