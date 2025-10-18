import { RedisClient } from "./redis.client";
import { appConfig } from "@/shared/config/app.config";

export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(pattern?: string): Promise<number>;
  health(): Promise<boolean>;
}

export class CacheAdapter implements CachePort {
  private redis: RedisClient;
  private static instance: CacheAdapter;

  private constructor() {
    this.redis = RedisClient.getInstance();
  }

  static getInstance(): CacheAdapter {
    if (!CacheAdapter.instance) {
      CacheAdapter.instance = new CacheAdapter();
    }
    return CacheAdapter.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.redis.get<T>(key);
  }

  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    return this.redis.set(key, value, ttl);
  }

  async del(key: string): Promise<boolean> {
    return this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.redis.exists(key);
  }

  async clear(pattern = "*"): Promise<number> {
    return this.redis.deletePattern(pattern);
  }

  async health(): Promise<boolean> {
    return this.redis.ping();
  }
}

// Cache key builders for different resources
export class CacheKeys {
  // ABI cache keys
  static abi(abiId: string): string {
    return `abi:${abiId}`;
  }

  static abiByHash(hash: string): string {
    return `abi:hash:${hash}`;
  }

  static abiVersions(abiId: string): string {
    return `abi:${abiId}:versions`;
  }

  static abiSearch(query: string, filters?: Record<string, unknown>): string {
    const filterStr = filters ? `:${JSON.stringify(filters)}` : "";
    return `search:abis:${query}${filterStr}`;
  }

  // Contract cache keys
  static contract(contractId: string): string {
    return `contract:${contractId}`;
  }

  static contractByAddress(address: string, networkId: string): string {
    return `contract:${address}:${networkId}`;
  }

  static contractSearch(query: string, filters?: Record<string, unknown>): string {
    const filterStr = filters ? `:${JSON.stringify(filters)}` : "";
    return `search:contracts:${query}${filterStr}`;
  }

  // Network cache keys
  static network(networkId: string): string {
    return `network:${networkId}`;
  }

  static networkByChainId(chainId: number): string {
    return `network:chain:${chainId}`;
  }

  static allNetworks(): string {
    return "networks:all";
  }

  // User cache keys
  static user(userId: string): string {
    return `user:${userId}`;
  }

  static userAbis(userId: string, page = 1): string {
    return `user:${userId}:abis:page:${page}`;
  }

  static userApiKeys(userId: string): string {
    return `user:${userId}:apikeys`;
  }

  // API key cache keys
  static apiKey(keyId: string): string {
    return `apikey:${keyId}`;
  }

  static apiKeyByHash(keyHash: string): string {
    return `apikey:hash:${keyHash}`;
  }

  // Rate limiting keys
  static rateLimit(identifier: string, window: string): string {
    return `ratelimit:${identifier}:${window}`;
  }

  // Session cache keys
  static session(sessionId: string): string {
    return `session:${sessionId}`;
  }
}

// Cache service with business logic
export class CacheService {
  private cache: CacheAdapter;

  constructor() {
    this.cache = CacheAdapter.getInstance();
  }

  // ABI caching methods
  async cacheAbi(abiId: string, data: unknown): Promise<boolean> {
    return this.cache.set(CacheKeys.abi(abiId), data, appConfig.cache.abi);
  }

  async getAbi<T>(abiId: string): Promise<T | null> {
    return this.cache.get<T>(CacheKeys.abi(abiId));
  }

  async invalidateAbi(abiId: string): Promise<boolean> {
    // Invalidate specific ABI and related cache entries
    await this.cache.del(CacheKeys.abi(abiId));
    await this.cache.del(CacheKeys.abiVersions(abiId));
    // Clear search cache that might contain this ABI
    await this.cache.clear("search:abis:*");
    return true;
  }

  // Contract caching methods
  async cacheContract(contractId: string, data: unknown): Promise<boolean> {
    return this.cache.set(CacheKeys.contract(contractId), data, appConfig.cache.contract);
  }

  async getContract<T>(contractId: string): Promise<T | null> {
    return this.cache.get<T>(CacheKeys.contract(contractId));
  }

  async invalidateContract(contractId: string): Promise<boolean> {
    await this.cache.del(CacheKeys.contract(contractId));
    await this.cache.clear("search:contracts:*");
    return true;
  }

  // Network caching methods
  async cacheNetwork(networkId: string, data: unknown): Promise<boolean> {
    return this.cache.set(CacheKeys.network(networkId), data, appConfig.cache.network);
  }

  async getNetwork<T>(networkId: string): Promise<T | null> {
    return this.cache.get<T>(CacheKeys.network(networkId));
  }

  async cacheAllNetworks(data: unknown): Promise<boolean> {
    return this.cache.set(CacheKeys.allNetworks(), data, appConfig.cache.network);
  }

  async getAllNetworks<T>(): Promise<T | null> {
    return this.cache.get<T>(CacheKeys.allNetworks());
  }

  // Search result caching
  async cacheSearch(key: string, data: unknown): Promise<boolean> {
    return this.cache.set(key, data, appConfig.cache.search);
  }

  async getSearch<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }

  // User data caching
  async cacheUser(userId: string, data: unknown): Promise<boolean> {
    return this.cache.set(CacheKeys.user(userId), data, 3600); // 1 hour
  }

  async getUser<T>(userId: string): Promise<T | null> {
    return this.cache.get<T>(CacheKeys.user(userId));
  }

  async invalidateUser(userId: string): Promise<boolean> {
    await this.cache.clear(`user:${userId}:*`);
    return true;
  }

  // Health check
  async health(): Promise<boolean> {
    return this.cache.health();
  }
}