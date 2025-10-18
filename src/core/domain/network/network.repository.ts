import {
  NetworkEntity,
  NetworkListParams,
  UpdateNetworkParams,
} from "./network.entity";
import { PaginatedResult } from "@/shared/types";

export interface NetworkRepository {
  // Basic CRUD operations
  create(network: NetworkEntity): Promise<NetworkEntity>;
  findById(id: string): Promise<NetworkEntity | null>;
  findByChainId(chainId: number): Promise<NetworkEntity | null>;
  findBySlug(slug: string): Promise<NetworkEntity | null>;
  update(id: string, params: UpdateNetworkParams): Promise<NetworkEntity | null>;
  delete(id: string): Promise<boolean>;

  // List and search operations
  list(params?: NetworkListParams): Promise<PaginatedResult<NetworkEntity>>;
  findActive(params?: NetworkListParams): Promise<PaginatedResult<NetworkEntity>>;
  findByType(type: string, params?: NetworkListParams): Promise<PaginatedResult<NetworkEntity>>;
  findTestnets(params?: NetworkListParams): Promise<PaginatedResult<NetworkEntity>>;
  findMainnets(params?: NetworkListParams): Promise<PaginatedResult<NetworkEntity>>;
  search(query: string, params?: NetworkListParams): Promise<PaginatedResult<NetworkEntity>>;

  // Utility methods
  exists(id: string): Promise<boolean>;
  existsByChainId(chainId: number): Promise<boolean>;
  existsBySlug(slug: string): Promise<boolean>;
  getAll(): Promise<NetworkEntity[]>;
  getAllActive(): Promise<NetworkEntity[]>;

  // Statistics
  getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    testnets: number;
    mainnets: number;
  }>;

  // Bulk operations
  createMany(networks: NetworkEntity[]): Promise<NetworkEntity[]>;
  updateMany(ids: string[], params: Partial<UpdateNetworkParams>): Promise<number>;
  deleteMany(ids: string[]): Promise<number>;
}
