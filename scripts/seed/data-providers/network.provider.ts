/**
 * Network Data Provider
 * Provides real-world network data for seeding
 */

import { SeedDataProvider } from "../types";
import { NetworkFactory, NetworkData } from "../factories/network.factory";

export class NetworkDataProvider implements SeedDataProvider<NetworkData> {
  private factory: NetworkFactory;

  constructor() {
    this.factory = new NetworkFactory();
  }

  async getAll(): Promise<NetworkData[]> {
    // Major networks that should be seeded in production
    const majorNetworks = [
      "ethereum",
      "polygon",
      "bsc",
      "arbitrum",
      "optimism",
      "base",
    ];

    // Test networks for development
    const testNetworks = ["testnet"];

    const networks: NetworkData[] = [];

    // Add major networks
    for (const networkType of majorNetworks) {
      networks.push(this.factory.state(networkType).create());
    }

    // Add test networks for non-production environments
    if (process.env.NODE_ENV !== "production") {
      for (const networkType of testNetworks) {
        networks.push(this.factory.state(networkType).create());
      }
    }

    return networks;
  }

  async getBy(criteria: Partial<NetworkData>): Promise<NetworkData[]> {
    const allNetworks = await this.getAll();

    return allNetworks.filter((network) => {
      return Object.entries(criteria).every(([key, value]) => {
        return network[key as keyof NetworkData] === value;
      });
    });
  }

  async validate(data: NetworkData): Promise<boolean> {
    // Validate required fields
    if (!data.id || !data.chainId || !data.name || !data.slug) {
      return false;
    }

    // Validate chain ID is positive
    if (data.chainId <= 0) {
      return false;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(data.slug)) {
      return false;
    }

    // Validate RPC URLs
    if (!Array.isArray(data.rpcUrls) || data.rpcUrls.length === 0) {
      return false;
    }

    for (const url of data.rpcUrls) {
      try {
        new URL(url);
      } catch {
        return false;
      }
    }

    // Validate explorer URLs
    if (!Array.isArray(data.explorerUrls) || data.explorerUrls.length === 0) {
      return false;
    }

    for (const url of data.explorerUrls) {
      try {
        new URL(url);
      } catch {
        return false;
      }
    }

    // Validate native currency
    if (
      !data.nativeCurrency ||
      !data.nativeCurrency.name ||
      !data.nativeCurrency.symbol ||
      typeof data.nativeCurrency.decimals !== "number"
    ) {
      return false;
    }

    // Validate icon URL
    if (data.icon) {
      try {
        new URL(data.icon);
      } catch {
        return false;
      }
    }

    return true;
  }

  async transform(data: NetworkData): Promise<NetworkData> {
    // Ensure slug is lowercase and kebab-case
    data.slug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    // Ensure name is properly capitalized
    data.name = data.name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    // Ensure symbol is uppercase
    data.nativeCurrency.symbol = data.nativeCurrency.symbol.toUpperCase();

    // Ensure decimals is a valid number
    data.nativeCurrency.decimals = Math.max(
      0,
      Math.min(18, data.nativeCurrency.decimals)
    );

    return data;
  }
}
