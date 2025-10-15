import { PinataSDK } from "pinata";
import { env } from "@/shared/config/env";
import { appConfig } from "@/shared/config/app.config";

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
  async uploadJSON(data: unknown, metadata?: {
    name?: string;
    description?: string;
    keyvalues?: Record<string, string>;
  }): Promise<{ hash: string; url: string } | null> {
    try {
      const jsonData = JSON.stringify(data, null, 2);

      const result = await this.pinata.upload
        .json(data)
        .addMetadata({
          name: metadata?.name || "ABI JSON",
          description: metadata?.description || "Smart Contract ABI",
          keyvalues: {
            type: "abi",
            format: "json",
            ...metadata?.keyvalues,
          },
        });

      return {
        hash: result.IpfsHash,
        url: `${env.PINATA_GATEWAY_URL}/ipfs/${result.IpfsHash}`,
      };
    } catch (error) {
      console.error("IPFS upload error:", error);
      return null;
    }
  }

  // Upload file to IPFS
  async uploadFile(
    file: File | Buffer,
    metadata?: {
      name?: string;
      description?: string;
      keyvalues?: Record<string, string>;
    }
  ): Promise<{ hash: string; url: string } | null> {
    try {
      const result = await this.pinata.upload
        .file(file)
        .addMetadata({
          name: metadata?.name || "File",
          description: metadata?.description || "Uploaded file",
          keyvalues: {
            ...metadata?.keyvalues,
          },
        });

      return {
        hash: result.IpfsHash,
        url: `${env.PINATA_GATEWAY_URL}/ipfs/${result.IpfsHash}`,
      };
    } catch (error) {
      console.error("IPFS file upload error:", error);
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
        return await response.json() as T;
      } else {
        return await response.text() as T;
      }
    } catch (error) {
      console.error(`IPFS retrieve error for hash ${hash}:`, error);
      return null;
    }
  }

  // Pin existing IPFS hash
  async pin(hash: string, metadata?: {
    name?: string;
    description?: string;
    keyvalues?: Record<string, string>;
  }): Promise<boolean> {
    try {
      await this.pinata.pin.add(hash, {
        pinataMetadata: {
          name: metadata?.name || hash,
          keyvalues: metadata?.keyvalues,
        },
      });
      return true;
    } catch (error) {
      console.error(`IPFS pin error for hash ${hash}:`, error);
      return false;
    }
  }

  // Unpin IPFS hash
  async unpin(hash: string): Promise<boolean> {
    try {
      await this.pinata.pin.remove(hash);
      return true;
    } catch (error) {
      console.error(`IPFS unpin error for hash ${hash}:`, error);
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
      const result = await this.pinata.pin.list({
        status: filters?.status || "pinned",
        pageLimit: filters?.pageLimit || 100,
        pageOffset: filters?.pageOffset || 0,
        metadata: filters?.metadata,
      });

      return result.rows.map((pin) => ({
        hash: pin.ipfs_pin_hash,
        name: pin.metadata?.name || pin.ipfs_pin_hash,
        size: pin.size,
        pinDate: pin.date_pinned,
        metadata: pin.metadata?.keyvalues,
      }));
    } catch (error) {
      console.error("IPFS list pins error:", error);
      return null;
    }
  }

  // Get usage statistics
  async getUsage(): Promise<{
    pinCount: number;
    totalSize: number;
  } | null> {
    try {
      const result = await this.pinata.pin.list({
        status: "pinned",
        pageLimit: 1,
      });

      // Note: This is a simplified version. For accurate total size,
      // you'd need to paginate through all pins
      return {
        pinCount: result.count,
        totalSize: 0, // Would need to calculate from all pins
      };
    } catch (error) {
      console.error("IPFS usage error:", error);
      return null;
    }
  }

  // Health check
  async health(): Promise<boolean> {
    try {
      // Try to list pins as a health check
      const result = await this.pinata.pin.list({
        pageLimit: 1,
      });
      return !!result;
    } catch (error) {
      console.error("IPFS health check failed:", error);
      return false;
    }
  }

  // Validate IPFS hash format
  static isValidHash(hash: string): boolean {
    // Basic IPFS hash validation (v0 and v1)
    const ipfsHashRegex = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58}|baf[A-Za-z2-7]{54})$/;
    return ipfsHashRegex.test(hash);
  }

  // Generate gateway URL
  static getGatewayUrl(hash: string): string {
    return `${env.PINATA_GATEWAY_URL}/ipfs/${hash}`;
  }
}