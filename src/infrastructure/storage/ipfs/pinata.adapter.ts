import { IPFSClient } from "./ipfs.client";

export interface StoragePort {
  store(data: unknown, metadata?: Record<string, unknown>): Promise<{ hash: string; url: string; groupId?: string } | null>;
  retrieve<T>(hash: string): Promise<T | null>;
  remove(hash: string): Promise<boolean>;
  exists(hash: string): Promise<boolean>;
  health(): Promise<boolean>;
}

export class PinataAdapter implements StoragePort {
  private ipfs: IPFSClient;

  constructor() {
    this.ipfs = IPFSClient.getInstance();
  }

  async store(
    data: unknown,
    metadata?: Record<string, unknown>
  ): Promise<{ hash: string; url: string; groupId?: string } | null> {
    const ipfsMetadata = {
      name: metadata?.name as string,
      description: metadata?.description as string,
      keyvalues: metadata?.keyvalues as Record<string, string>,
      groupName: metadata?.groupName as string | undefined,
    };

    return this.ipfs.uploadJSON(data, ipfsMetadata);
  }

  async retrieve<T>(hash: string): Promise<T | null> {
    if (!IPFSClient.isValidHash(hash)) {
      console.error(`Invalid IPFS hash: ${hash}`);
      return null;
    }

    return this.ipfs.retrieve<T>(hash);
  }

  async remove(hash: string): Promise<boolean> {
    return this.ipfs.unpin(hash);
  }

  async exists(hash: string): Promise<boolean> {
    try {
      const data = await this.retrieve(hash);
      return data !== null;
    } catch {
      return false;
    }
  }

  async health(): Promise<boolean> {
    return this.ipfs.health();
  }
}

// IPFS-specific service for ABI management
export class IPFSStorageService {
  private storage: PinataAdapter;

  constructor() {
    this.storage = new PinataAdapter();
  }

  // Store ABI with metadata
  async storeAbi(
    abi: unknown,
    metadata: {
      name: string;
      contractName?: string;
      version?: string;
      abiVersion?: string;
      apiVersion?: string;
      standard?: string;
      userId: string;
      groupName?: string; // Optional: organize by group
    }
  ): Promise<{ hash: string; url: string; groupId?: string } | null> {
    // Generate descriptive filename: ContractName-v1-1.0.0-random.json
    const contractName = metadata.contractName || metadata.name;
    const apiVersion = metadata.apiVersion || "v1";
    const abiVersion = metadata.abiVersion || metadata.version || "1.0.0";
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filename = `${contractName}-${apiVersion}-${abiVersion}-${randomSuffix}.json`;

    const ipfsMetadata = {
      name: filename, // Descriptive filename for Pinata dashboard
      description: `ABI for ${contractName}`,
      groupName: metadata.groupName, // Group for organization
      keyvalues: {
        type: "abi",
        name: metadata.name,
        contractName,
        apiVersion,
        abiVersion,
        version: metadata.version || "1.0.0",
        standard: metadata.standard || "unknown",
        userId: metadata.userId,
        uploadedAt: new Date().toISOString(),
      },
    };

    return this.storage.store(abi, ipfsMetadata);
  }

  // Retrieve ABI by hash
  async getAbi<T = unknown>(hash: string): Promise<T | null> {
    return this.storage.retrieve<T>(hash);
  }

  // Store ABI version with changelog
  async storeAbiVersion(
    abi: unknown,
    metadata: {
      name: string;
      version: string;
      changeLog?: string;
      previousHash?: string;
      userId: string;
    }
  ): Promise<{ hash: string; url: string } | null> {
    const ipfsMetadata = {
      name: `${metadata.name} - v${metadata.version}`,
      description: `ABI version ${metadata.version} for ${metadata.name}`,
      keyvalues: {
        type: "abi-version",
        name: metadata.name,
        version: metadata.version,
        previousHash: metadata.previousHash || "",
        changeLog: metadata.changeLog || "",
        userId: metadata.userId,
        versionedAt: new Date().toISOString(),
      },
    };

    return this.storage.store(abi, ipfsMetadata);
  }

  // Verify ABI integrity
  async verifyAbi(hash: string, expectedAbi: unknown): Promise<boolean> {
    try {
      const storedAbi = await this.getAbi(hash);
      if (!storedAbi) return false;

      // Deep comparison of ABI structures
      return JSON.stringify(storedAbi) === JSON.stringify(expectedAbi);
    } catch {
      return false;
    }
  }

  // Get all ABIs for a user (via metadata query)
  async getUserAbis(userId: string): Promise<Array<{
    hash: string;
    name: string;
    version: string;
    uploadedAt: string;
  }> | null> {
    const ipfs = IPFSClient.getInstance();
    const pins = await ipfs.listPins({
      metadata: { userId, type: "abi" },
    });

    if (!pins) return null;

    return pins.map(pin => ({
      hash: pin.hash,
      name: pin.metadata?.name || "Unknown",
      version: pin.metadata?.version || "1.0.0",
      uploadedAt: pin.metadata?.uploadedAt || pin.pinDate,
    }));
  }

  // Remove ABI from IPFS
  async removeAbi(hash: string): Promise<boolean> {
    return this.storage.remove(hash);
  }

  // Health check
  async health(): Promise<boolean> {
    return this.storage.health();
  }

  // Batch operations
  async storeMultipleAbis(
    abis: Array<{
      abi: unknown;
      metadata: {
        name: string;
        contractName?: string;
        version?: string;
        standard?: string;
        userId: string;
      };
    }>
  ): Promise<Array<{ hash: string; url: string } | null>> {
    const results = await Promise.allSettled(
      abis.map(({ abi, metadata }) => this.storeAbi(abi, metadata))
    );

    return results.map(result =>
      result.status === "fulfilled" ? result.value : null
    );
  }

  // Get storage statistics
  async getStorageStats(): Promise<{
    totalPins: number;
    totalSize: number;
  } | null> {
    const ipfs = IPFSClient.getInstance();
    const usage = await ipfs.getUsage();
    if (!usage) return null;

    return {
      totalPins: usage.pinCount,
      totalSize: usage.totalSize,
    };
  }
}

// Alias for compatibility with use cases
export { IPFSStorageService as PinataStorageAdapter };