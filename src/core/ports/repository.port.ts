import { AbiRepository } from "@/core/domain/abi/abi.repository";
import { ContractRepository } from "@/core/domain/contract/contract.repository";

// Port interfaces for dependency injection
export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(pattern?: string): Promise<number>;
  health(): Promise<boolean>;
}

export interface StoragePort {
  store(data: unknown, metadata?: Record<string, unknown>): Promise<{ hash: string; url: string } | null>;
  retrieve<T>(hash: string): Promise<T | null>;
  remove(hash: string): Promise<boolean>;
  exists(hash: string): Promise<boolean>;
  health(): Promise<boolean>;
}

export interface RepositoryPorts {
  abiRepository: AbiRepository;
  contractRepository: ContractRepository;
  cachePort: CachePort;
  storagePort: StoragePort;
}