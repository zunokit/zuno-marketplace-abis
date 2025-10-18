/**
 * Dependency Injection Container
 */

import type { AbiRepository } from "@/core/domain/abi/abi.repository";
import type { ContractRepository } from "@/core/domain/contract/contract.repository";
import type { NetworkRepository } from "@/core/domain/network/network.repository";
import type { AuditLogRepository } from "@/core/domain/audit-log/audit-log.repository";
import { AbiRepositoryImpl } from "@/infrastructure/database/repositories/abi.repository.impl";
import { ContractRepositoryImpl } from "@/infrastructure/database/repositories/contract.repository.impl";
import { NetworkRepositoryImpl } from "@/infrastructure/database/repositories/network.repository.impl";
import { AuditLogRepositoryImpl } from "@/infrastructure/database/repositories/audit-log.repository.impl";
import { PinataStorageAdapter } from "@/infrastructure/storage/ipfs/pinata.adapter";
import { CacheAdapter } from "@/infrastructure/cache/cache.adapter";
import { logger } from "@/shared/lib/utils/logger";

// ============ Service Interfaces ============

/**
 * Storage Service Interface
 * Compatible với PinataStorageAdapter
 */
export interface IStorageService {
  storeAbi(
    abi: unknown,
    metadata?: {
      name: string;
      contractName?: string;
      version?: string;
      standard?: string;
      userId: string;
    }
  ): Promise<{ hash: string; url: string } | null>;
  getAbi<T = unknown>(hash: string): Promise<T | null>;
  removeAbi(hash: string): Promise<boolean>;
  health(): Promise<boolean>;
}

/**
 * Cache Service Interface
 * Compatible với CacheAdapter
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(pattern?: string): Promise<number>;
  health(): Promise<boolean>;
}

// ============ Container Registry ============

type ServiceKey =
  | "abiRepository"
  | "contractRepository"
  | "networkRepository"
  | "auditLogRepository"
  | "storageService"
  | "cacheService";

type ServiceMap = {
  abiRepository: AbiRepository;
  contractRepository: ContractRepository;
  networkRepository: NetworkRepository;
  auditLogRepository: AuditLogRepository;
  storageService: IStorageService;
  cacheService: ICacheService;
};

// ============ DI Container ============

class DIContainer {
  private static instance: DIContainer;
  private services: Partial<Record<ServiceKey, unknown>> = {};
  private factories: Partial<Record<ServiceKey, () => unknown>> = {};

  private constructor() {
    this.registerFactories();
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Register all factory functions
   */
  private registerFactories(): void {
    // Repositories
    this.factories.abiRepository = () => {
      logger.debug("Creating AbiRepository instance");
      return new AbiRepositoryImpl();
    };

    this.factories.contractRepository = () => {
      logger.debug("Creating ContractRepository instance");
      return new ContractRepositoryImpl();
    };

    this.factories.networkRepository = () => {
      logger.debug("Creating NetworkRepository instance");
      return new NetworkRepositoryImpl();
    };

    this.factories.auditLogRepository = () => {
      logger.debug("Creating AuditLogRepository instance");
      return new AuditLogRepositoryImpl();
    };

    // Services
    this.factories.storageService = () => {
      logger.debug("Creating StorageService instance");
      return new PinataStorageAdapter();
    };

    this.factories.cacheService = () => {
      logger.debug("Getting CacheService singleton");
      return CacheAdapter.getInstance();
    };
  }

  /**
   * Type-safe service resolution
   */
  get<K extends ServiceKey>(key: K): ServiceMap[K] {
    // Return cached instance if exists
    if (this.services[key]) {
      return this.services[key] as ServiceMap[K];
    }

    // Create new instance using factory
    const factory = this.factories[key];
    if (!factory) {
      throw new Error(`Service not registered: ${key}`);
    }

    const service = factory();
    this.services[key] = service;

    return service as ServiceMap[K];
  }

  /**
   * Override service for testing
   */
  set<K extends ServiceKey>(key: K, service: ServiceMap[K]): void {
    logger.debug(`Overriding service: ${key}`);
    this.services[key] = service;
  }

  /**
   * Clear all cached instances
   */
  reset(): void {
    logger.debug("Resetting DI container");
    this.services = {};
  }

  /**
   * Check if service is registered
   */
  has(key: ServiceKey): boolean {
    return !!this.factories[key];
  }
}

// ============ Exported Singleton ============

export const container = DIContainer.getInstance();

// ============ Helper Functions ============


export function getAbiRepository(): AbiRepository {
  return container.get("abiRepository");
}

export function getContractRepository(): ContractRepository {
  return container.get("contractRepository");
}

export function getNetworkRepository(): NetworkRepository {
  return container.get("networkRepository");
}

export function getAuditLogRepository(): AuditLogRepository {
  return container.get("auditLogRepository");
}

export function getStorageService(): IStorageService {
  return container.get("storageService");
}

export function getCacheService(): ICacheService {
  return container.get("cacheService");
}

/**
 * Batch resolution cho multiple dependencies
 */
export function getServices<K extends ServiceKey[]>(...keys: K): {
  [P in keyof K]: K[P] extends ServiceKey ? ServiceMap[K[P]] : never;
} {
  return keys.map(key => container.get(key)) as any;
}

// ============ Type Export ============

export type { ServiceMap, ServiceKey };
