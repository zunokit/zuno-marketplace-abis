import {
  AbiEntity,
  AbiVersionEntity,
  AbiListParams,
  UpdateAbiParams,
} from "./abi.entity";
import { PaginatedResult } from "@/shared/types";

export interface AbiRepository {
  // Basic CRUD operations
  create(abi: AbiEntity): Promise<AbiEntity>;
  findById(id: string): Promise<AbiEntity | null>;
  findByHash(hash: string): Promise<AbiEntity | null>;
  update(id: string, params: UpdateAbiParams): Promise<AbiEntity | null>;
  delete(id: string): Promise<boolean>;
  softDelete(id: string): Promise<boolean>;

  // List and search operations
  list(params: AbiListParams): Promise<PaginatedResult<AbiEntity>>;
  findByUserId(
    userId: string,
    params?: AbiListParams
  ): Promise<PaginatedResult<AbiEntity>>;
  search(
    query: string,
    params?: AbiListParams
  ): Promise<PaginatedResult<AbiEntity>>;

  // Version management
  createVersion(version: AbiVersionEntity): Promise<AbiVersionEntity>;
  findVersions(abiId: string): Promise<AbiVersionEntity[]>;
  findVersionByNumber(
    abiId: string,
    versionNumber: number
  ): Promise<AbiVersionEntity | null>;
  getLatestVersion(abiId: string): Promise<AbiVersionEntity | null>;

  // Utility methods
  exists(id: string): Promise<boolean>;
  existsByHash(hash: string): Promise<boolean>;
  countByUserId(userId: string): Promise<number>;
  findDuplicates(hash: string): Promise<AbiEntity[]>;

  // Bulk operations
  createMany(abis: AbiEntity[]): Promise<AbiEntity[]>;
  updateMany(ids: string[], params: Partial<UpdateAbiParams>): Promise<number>;
  deleteMany(ids: string[]): Promise<number>;
}

export type AbiRepositoryImpl = AbiRepository;
