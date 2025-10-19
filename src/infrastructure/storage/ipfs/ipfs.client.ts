import { PinataSDK } from "pinata";
import { env } from "@/shared/config/env";
import { appConfig } from "@/shared/config/app.config";
import { logger } from "@/shared/lib/utils/logger";

export class IPFSClient {
  private pinata: PinataSDK;
  private static instance: IPFSClient;

  private constructor() {
    this.pinata = new PinataSDK({
      pinataJwt: env.PINATA_JWT,
      pinataGateway: env.PINATA_GATEWAY_URL,
    });
  }

  public static getInstance(): IPFSClient {
    if (!IPFSClient.instance) {
      IPFSClient.instance = new IPFSClient();
    }
    return IPFSClient.instance;
  }

  // Upload JSON data to IPFS
  async uploadJSON(
    data: unknown,
    metadata?: {
      name?: string;
      description?: string;
      keyvalues?: Record<string, string>;
    }
  ): Promise<{ hash: string; url: string } | null> {
    try {
      // Generate descriptive filename (Pinata will use this as display name)
      const filename = metadata?.name || "data.json";

      const result = await this.pinata.upload.public.json(data as object, {
        metadata: {
          name: filename, // This appears as filename in Pinata dashboard
          keyvalues: {
            type: "abi",
            format: "json",
            description: metadata?.description || "Smart Contract ABI",
            ...metadata?.keyvalues,
          },
        },
      });

      return {
        hash: result.cid,
        url: `${env.PINATA_GATEWAY_URL}/ipfs/${result.cid}`,
      };
    } catch (error) {
      logger.error("IPFS upload error", error);
      return null;
    }
  }

  // Upload file to IPFS
  async uploadFile(
    file: File,
    metadata?: {
      name?: string;
      description?: string;
      keyvalues?: Record<string, string>;
    }
  ): Promise<{ hash: string; url: string } | null> {
    try {
      const result = await this.pinata.upload.public.file(file, {
        metadata: {
          name: metadata?.name || "File",
          keyvalues: {
            description: metadata?.description || "Uploaded file",
            ...metadata?.keyvalues,
          },
        },
      });

      return {
        hash: result.cid,
        url: `${env.PINATA_GATEWAY_URL}/ipfs/${result.cid}`,
      };
    } catch (error) {
      logger.error("IPFS file upload error", error);
      return null;
    }
  }

  // Retrieve data from IPFS
  async retrieve<T = unknown>(hash: string): Promise<T | null> {
    try {
      const response = await fetch(`${env.PINATA_GATEWAY_URL}/ipfs/${hash}`, {
        signal: AbortSignal.timeout(appConfig.ipfs.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return (await response.json()) as T;
      } else {
        return (await response.text()) as T;
      }
    } catch (error) {
      logger.error(`IPFS retrieve error for hash ${hash}`, error);
      return null;
    }
  }

  // Pin existing IPFS hash
  async pin(
    hash: string,
    metadata?: {
      name?: string;
      description?: string;
      keyvalues?: Record<string, string>;
    }
  ): Promise<boolean> {
    try {
      await this.pinata.upload.public.cid(hash, {
        metadata: {
          name: metadata?.name || hash,
          keyvalues: metadata?.keyvalues,
        },
      });
      return true;
    } catch (error) {
      logger.error(`IPFS pin error for hash ${hash}`, error);
      return false;
    }
  }

  // Unpin IPFS hash
  async unpin(hash: string): Promise<boolean> {
    try {
      // Pinata v2 uses file ID for deletion, so we need to find the file first
      const files = await this.pinata.files.public.list().cid(hash).limit(1);
      if (files && files.files.length > 0) {
        await this.pinata.files.public.delete([files.files[0].id]);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`IPFS unpin error for hash ${hash}`, error);
      return false;
    }
  }

  // List pinned files
  async listPins(filters?: {
    status?: "pinned" | "unpinned" | "pinning" | "unpinning";
    pageLimit?: number;
    pageOffset?: number;
    metadata?: Record<string, string>;
  }): Promise<Array<{
    hash: string;
    name: string;
    size: number;
    pinDate: string;
    metadata?: Record<string, string>;
  }> | null> {
    try {
      let query = this.pinata.files.public.list().limit(filters?.pageLimit || 100);

      // Apply metadata filters if provided
      if (filters?.metadata) {
        query = query.keyvalues(filters.metadata);
      }

      const result = await query;

      return result.files.map((file: any) => ({
        hash: file.cid === "pending" ? "" : file.cid,
        name: file.name || file.cid,
        size: file.size,
        pinDate: file.created_at,
        metadata: file.keyvalues,
      }));
    } catch (error) {
      logger.error("IPFS list pins error", error);
      return null;
    }
  }

  // Get usage statistics
  async getUsage(): Promise<{
    pinCount: number;
    totalSize: number;
  } | null> {
    try {
      // Get a larger batch to calculate total size
      const result = await this.pinata.files.public.list().limit(1000);

      const totalSize = result.files.reduce(
        (sum: number, file: any) => sum + file.size,
        0
      );

      return {
        pinCount: result.files.length,
        totalSize,
      };
    } catch (error) {
      logger.error("IPFS usage error", error);
      return null;
    }
  }

  // Health check
  async health(): Promise<boolean> {
    try {
      // Try to list files as a health check
      const result = await this.pinata.files.public.list().limit(1);
      return !!result;
    } catch (error) {
      logger.error("IPFS health check failed", error);
      return false;
    }
  }

  // Validate IPFS hash format
  static isValidHash(hash: string): boolean {
    // Basic IPFS hash validation (v0 and v1)
    const ipfsHashRegex =
      /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58}|baf[A-Za-z2-7]{54})$/;
    return ipfsHashRegex.test(hash);
  }

  // Generate gateway URL
  static getGatewayUrl(hash: string): string {
    return `${env.PINATA_GATEWAY_URL}/ipfs/${hash}`;
  }
}
