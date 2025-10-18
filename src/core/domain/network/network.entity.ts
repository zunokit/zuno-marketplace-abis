export interface NetworkEntity {
  id: string;
  chainId: number;
  name: string;
  slug: string;
  type: string;
  isTestnet: boolean;
  rpcUrls: string[];
  explorerUrls?: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isActive: boolean;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNetworkParams {
  chainId: number;
  name: string;
  slug: string;
  type: string;
  isTestnet: boolean;
  rpcUrls: string[];
  explorerUrls?: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  icon?: string;
}

export interface UpdateNetworkParams {
  name?: string;
  slug?: string;
  type?: string;
  isTestnet?: boolean;
  rpcUrls?: string[];
  explorerUrls?: string[];
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isActive?: boolean;
  icon?: string;
}

export interface NetworkSearchFilters {
  type?: string;
  isTestnet?: boolean;
  isActive?: boolean;
}

export interface NetworkListParams {
  page?: number;
  limit?: number;
  sortBy?: "name" | "chainId" | "createdAt";
  sortOrder?: "asc" | "desc";
  filters?: NetworkSearchFilters;
  query?: string;
}

// Domain errors
export class NetworkError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class NetworkNotFoundError extends NetworkError {
  constructor(identifier: string) {
    super(`Network ${identifier} not found`, "NETWORK_NOT_FOUND", 404);
  }
}

export class NetworkDuplicateError extends NetworkError {
  constructor(chainId: number) {
    super(
      `Network with chain ID ${chainId} already exists`,
      "NETWORK_DUPLICATE",
      409
    );
  }
}

export class NetworkFactory {
  static createNetwork(params: CreateNetworkParams): NetworkEntity {
    const now = new Date();

    return {
      id: crypto.randomUUID(),
      chainId: params.chainId,
      name: params.name,
      slug: params.slug.toLowerCase(),
      type: params.type,
      isTestnet: params.isTestnet,
      rpcUrls: params.rpcUrls,
      explorerUrls: params.explorerUrls,
      nativeCurrency: params.nativeCurrency,
      isActive: true,
      icon: params.icon,
      createdAt: now,
      updatedAt: now,
    };
  }
}
