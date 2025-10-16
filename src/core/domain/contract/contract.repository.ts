import {
  ContractEntity,
  ContractListParams,
  UpdateContractParams,
} from "./contract.entity";
import { PaginatedResult } from "@/shared/types";

export interface ContractRepository {
  // Basic CRUD operations
  create(contract: ContractEntity): Promise<ContractEntity>;
  findById(id: string): Promise<ContractEntity | null>;
  findByAddress(
    address: string,
    networkId: string
  ): Promise<ContractEntity | null>;
  update(
    id: string,
    params: UpdateContractParams
  ): Promise<ContractEntity | null>;
  delete(id: string): Promise<boolean>;

  // List and search operations
  list(params: ContractListParams): Promise<PaginatedResult<ContractEntity>>;
  findByNetworkId(
    networkId: string,
    params?: ContractListParams
  ): Promise<PaginatedResult<ContractEntity>>;
  findByAbiId(
    abiId: string,
    params?: ContractListParams
  ): Promise<PaginatedResult<ContractEntity>>;
  search(
    query: string,
    params?: ContractListParams
  ): Promise<PaginatedResult<ContractEntity>>;

  // Verification methods
  findVerifiedContracts(
    params?: ContractListParams
  ): Promise<PaginatedResult<ContractEntity>>;
  findUnverifiedContracts(
    params?: ContractListParams
  ): Promise<PaginatedResult<ContractEntity>>;

  // Utility methods
  exists(id: string): Promise<boolean>;
  existsByAddress(address: string, networkId: string): Promise<boolean>;
  countByNetworkId(networkId: string): Promise<number>;
  countByAbiId(abiId: string): Promise<number>;

  // Statistics
  getVerificationStats(): Promise<{
    total: number;
    verified: number;
    unverified: number;
    verificationRate: number;
  }>;

  // Bulk operations
  createMany(contracts: ContractEntity[]): Promise<ContractEntity[]>;
  updateMany(
    ids: string[],
    params: Partial<UpdateContractParams>
  ): Promise<number>;
  deleteMany(ids: string[]): Promise<number>;
}

export type ContractRepositoryImpl = ContractRepository;
