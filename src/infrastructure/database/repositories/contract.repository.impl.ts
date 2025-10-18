import { eq, and, desc, asc, sql, ilike, count, inArray } from "drizzle-orm";
import type { ContractRepository } from "@/core/domain/contract/contract.repository";
import {
  ContractEntity,
  ContractListParams,
  CreateContractParams,
  UpdateContractParams,
  ContractNotFoundError,
  ContractDuplicateError,
} from "@/core/domain/contract/contract.entity";
import { PaginatedResult } from "@/shared/types";
import { db } from "@/infrastructure/database/drizzle";
import { contracts } from "@/infrastructure/database/drizzle/schema/contracts.schema";
import { CacheAdapter } from "@/infrastructure/cache/cache.adapter";
import { logger } from "@/shared/lib/utils/logger";
import { appConfig } from "@/shared/config/app.config";

export class ContractRepositoryImpl implements ContractRepository {
  private cache: CacheAdapter;
  private cacheTTL = appConfig.cache.contract || 3600; // 1 hour default

  constructor() {
    this.cache = CacheAdapter.getInstance();
  }

  // Helper method to map DB record to entity
  private mapToEntity(record: any): ContractEntity {
    return {
      id: record.id,
      address: record.address,
      networkId: record.networkId,
      abiId: record.abiId,
      name: record.name || undefined,
      type: record.type || undefined,
      isVerified: record.isVerified,
      verifiedAt: record.verifiedAt || undefined,
      verificationSource: record.verificationSource || undefined,
      metadata: record.metadata || undefined,
      deployedAt: record.deployedAt || undefined,
      deployer: record.deployer || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async create(contract: ContractEntity): Promise<ContractEntity> {
    try {
      // Check for duplicate
      const existing = await this.existsByAddress(
        contract.address,
        contract.networkId
      );
      if (existing) {
        throw new ContractDuplicateError(contract.address, contract.networkId);
      }

      const [inserted] = await db
        .insert(contracts)
        .values({
          id: contract.id,
          address: contract.address,
          networkId: contract.networkId,
          abiId: contract.abiId,
          name: contract.name,
          type: contract.type,
          isVerified: contract.isVerified,
          verifiedAt: contract.verifiedAt,
          verificationSource: contract.verificationSource,
          metadata: contract.metadata,
          deployedAt: contract.deployedAt,
          deployer: contract.deployer,
          createdAt: contract.createdAt,
          updatedAt: contract.updatedAt,
        })
        .returning();

      const entity = this.mapToEntity(inserted);

      // Cache the created contract
      await this.cache.set(`contract:${entity.id}`, entity, this.cacheTTL);
      await this.cache.set(
        `contract:${entity.address}:${entity.networkId}`,
        entity,
        this.cacheTTL
      );

      logger.info("Contract created", { contractId: entity.id } as any);
      return entity;
    } catch (error) {
      logger.error("Failed to create contract", error, contract as any);
      throw error;
    }
  }

  async findById(id: string): Promise<ContractEntity | null> {
    try {
      // Check cache first
      const cached = await this.cache.get<ContractEntity>(`contract:${id}`);
      if (cached) {
        return cached;
      }

      const [record] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, id))
        .limit(1);

      if (!record) {
        return null;
      }

      const entity = this.mapToEntity(record);

      // Cache the result
      await this.cache.set(`contract:${id}`, entity, this.cacheTTL);

      return entity;
    } catch (error) {
      logger.error("Failed to find contract by ID", error, { id } as any);
      return null;
    }
  }

  async findByAddress(
    address: string,
    networkId: string
  ): Promise<ContractEntity | null> {
    try {
      const cacheKey = `contract:${address}:${networkId}`;
      const cached = await this.cache.get<ContractEntity>(cacheKey);
      if (cached) {
        return cached;
      }

      const [record] = await db
        .select()
        .from(contracts)
        .where(
          and(
            eq(contracts.address, address.toLowerCase()),
            eq(contracts.networkId, networkId)
          )
        )
        .limit(1);

      if (!record) {
        return null;
      }

      const entity = this.mapToEntity(record);

      // Cache the result
      await this.cache.set(cacheKey, entity, this.cacheTTL);
      await this.cache.set(`contract:${entity.id}`, entity, this.cacheTTL);

      return entity;
    } catch (error) {
      logger.error("Failed to find contract by address", error, {
        address,
        networkId,
      } as any);
      return null;
    }
  }

  async update(
    id: string,
    params: UpdateContractParams
  ): Promise<ContractEntity | null> {
    try {
      const updateData: any = {
        ...params,
        updatedAt: new Date(),
      };

      // Set verifiedAt if marking as verified
      if (params.isVerified === true) {
        updateData.verifiedAt = new Date();
      }

      const [updated] = await db
        .update(contracts)
        .set(updateData)
        .where(eq(contracts.id, id))
        .returning();

      if (!updated) {
        return null;
      }

      const entity = this.mapToEntity(updated);

      // Invalidate cache
      await this.cache.del(`contract:${id}`);
      await this.cache.del(`contract:${entity.address}:${entity.networkId}`);

      logger.info("Contract updated", { contractId: id } as any);
      return entity;
    } catch (error) {
      logger.error("Failed to update contract", error, { id, params } as any);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const contract = await this.findById(id);
      if (!contract) {
        return false;
      }

      await db.delete(contracts).where(eq(contracts.id, id));

      // Invalidate cache
      await this.cache.del(`contract:${id}`);
      await this.cache.del(
        `contract:${contract.address}:${contract.networkId}`
      );

      logger.info("Contract deleted", { contractId: id } as any);
      return true;
    } catch (error) {
      logger.error("Failed to delete contract", error, { id } as any);
      return false;
    }
  }

  async list(
    params: ContractListParams = {}
  ): Promise<PaginatedResult<ContractEntity>> {
    try {
      const page = params.page || 1;
      const limit = params.limit || 20;
      const offset = (page - 1) * limit;
      const sortBy = params.sortBy || "createdAt";
      const sortOrder = params.sortOrder || "desc";

      // Build where conditions
      const whereConditions: any[] = [];

      if (params.filters) {
        if (params.filters.networkId) {
          whereConditions.push(
            eq(contracts.networkId, params.filters.networkId)
          );
        }
        if (params.filters.abiId) {
          whereConditions.push(eq(contracts.abiId, params.filters.abiId));
        }
        if (params.filters.type) {
          whereConditions.push(eq(contracts.type, params.filters.type));
        }
        if (params.filters.isVerified !== undefined) {
          whereConditions.push(
            eq(contracts.isVerified, params.filters.isVerified)
          );
        }
        if (params.filters.deployer) {
          whereConditions.push(
            eq(contracts.deployer, params.filters.deployer.toLowerCase())
          );
        }
        if (params.filters.createdAfter) {
          whereConditions.push(
            sql`${contracts.createdAt} >= ${params.filters.createdAfter}`
          );
        }
        if (params.filters.createdBefore) {
          whereConditions.push(
            sql`${contracts.createdAt} <= ${params.filters.createdBefore}`
          );
        }
      }

      if (params.query) {
        whereConditions.push(
          sql`(
            ${contracts.name} ILIKE ${`%${params.query}%`} OR
            ${contracts.address} ILIKE ${`%${params.query}%`}
          )`
        );
      }

      const whereClause =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(contracts)
        .where(whereClause);

      // Get paginated data
      const sortColumn =
        sortBy === "name"
          ? contracts.name
          : sortBy === "deployedAt"
            ? contracts.deployedAt
            : sortBy === "updatedAt"
              ? contracts.updatedAt
              : contracts.createdAt;

      const records = await db
        .select()
        .from(contracts)
        .where(whereClause)
        .orderBy(sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn))
        .limit(limit)
        .offset(offset);

      const data = records.map((record) => this.mapToEntity(record));

      return {
        data,
        pagination: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
          hasNext: page < Math.ceil(Number(total) / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error("Failed to list contracts", error, params as any);
      throw error;
    }
  }

  async findByNetworkId(
    networkId: string,
    params?: ContractListParams
  ): Promise<PaginatedResult<ContractEntity>> {
    return this.list({
      ...params,
      filters: {
        ...params?.filters,
        networkId,
      },
    });
  }

  async findByAbiId(
    abiId: string,
    params?: ContractListParams
  ): Promise<PaginatedResult<ContractEntity>> {
    return this.list({
      ...params,
      filters: {
        ...params?.filters,
        abiId,
      },
    });
  }

  async search(
    query: string,
    params?: ContractListParams
  ): Promise<PaginatedResult<ContractEntity>> {
    return this.list({
      ...params,
      query,
    });
  }

  async findVerifiedContracts(
    params?: ContractListParams
  ): Promise<PaginatedResult<ContractEntity>> {
    return this.list({
      ...params,
      filters: {
        ...params?.filters,
        isVerified: true,
      },
    });
  }

  async findUnverifiedContracts(
    params?: ContractListParams
  ): Promise<PaginatedResult<ContractEntity>> {
    return this.list({
      ...params,
      filters: {
        ...params?.filters,
        isVerified: false,
      },
    });
  }

  async exists(id: string): Promise<boolean> {
    try {
      const [result] = await db
        .select({ id: contracts.id })
        .from(contracts)
        .where(eq(contracts.id, id))
        .limit(1);

      return !!result;
    } catch (error) {
      logger.error("Failed to check contract existence", error, { id } as any);
      return false;
    }
  }

  async existsByAddress(address: string, networkId: string): Promise<boolean> {
    try {
      const [result] = await db
        .select({ id: contracts.id })
        .from(contracts)
        .where(
          and(
            eq(contracts.address, address.toLowerCase()),
            eq(contracts.networkId, networkId)
          )
        )
        .limit(1);

      return !!result;
    } catch (error) {
      logger.error("Failed to check contract existence by address", error, {
        address,
        networkId,
      } as any);
      return false;
    }
  }

  async countByNetworkId(networkId: string): Promise<number> {
    try {
      const [{ total }] = await db
        .select({ total: count() })
        .from(contracts)
        .where(eq(contracts.networkId, networkId));

      return Number(total);
    } catch (error) {
      logger.error("Failed to count contracts by network", error, {
        networkId,
      } as any);
      return 0;
    }
  }

  async countByAbiId(abiId: string): Promise<number> {
    try {
      const [{ total }] = await db
        .select({ total: count() })
        .from(contracts)
        .where(eq(contracts.abiId, abiId));

      return Number(total);
    } catch (error) {
      logger.error("Failed to count contracts by ABI", error, {
        abiId,
      } as any);
      return 0;
    }
  }

  async getVerificationStats(): Promise<{
    total: number;
    verified: number;
    unverified: number;
    verificationRate: number;
  }> {
    try {
      const [totalResult] = await db.select({ total: count() }).from(contracts);
      const [verifiedResult] = await db
        .select({ verified: count() })
        .from(contracts)
        .where(eq(contracts.isVerified, true));

      const total = Number(totalResult.total);
      const verified = Number(verifiedResult.verified);
      const unverified = total - verified;
      const verificationRate = total > 0 ? (verified / total) * 100 : 0;

      return {
        total,
        verified,
        unverified,
        verificationRate: Math.round(verificationRate * 100) / 100,
      };
    } catch (error) {
      logger.error("Failed to get verification stats", error);
      return {
        total: 0,
        verified: 0,
        unverified: 0,
        verificationRate: 0,
      };
    }
  }

  async createMany(contractsList: ContractEntity[]): Promise<ContractEntity[]> {
    try {
      if (contractsList.length === 0) {
        return [];
      }

      const values = contractsList.map((contract) => ({
        id: contract.id,
        address: contract.address,
        networkId: contract.networkId,
        abiId: contract.abiId,
        name: contract.name,
        type: contract.type,
        isVerified: contract.isVerified,
        verifiedAt: contract.verifiedAt,
        verificationSource: contract.verificationSource,
        metadata: contract.metadata,
        deployedAt: contract.deployedAt,
        deployer: contract.deployer,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
      }));

      const inserted = await db.insert(contracts).values(values).returning();

      const entities = inserted.map((record) => this.mapToEntity(record));

      // Cache all created contracts
      await Promise.all(
        entities.map((entity) =>
          this.cache.set(`contract:${entity.id}`, entity, this.cacheTTL)
        )
      );

      logger.info("Bulk contracts created", {
        count: entities.length,
      } as any);
      return entities;
    } catch (error) {
      logger.error("Failed to create contracts in bulk", error);
      throw error;
    }
  }

  async updateMany(
    ids: string[],
    params: Partial<UpdateContractParams>
  ): Promise<number> {
    try {
      if (ids.length === 0) {
        return 0;
      }

      const updateData: any = {
        ...params,
        updatedAt: new Date(),
      };

      const result = await db
        .update(contracts)
        .set(updateData)
        .where(inArray(contracts.id, ids));

      // Invalidate cache for all updated contracts
      await Promise.all(ids.map((id) => this.cache.del(`contract:${id}`)));

      logger.info("Bulk contracts updated", { count: ids.length } as any);
      return ids.length;
    } catch (error) {
      logger.error("Failed to update contracts in bulk", error);
      return 0;
    }
  }

  async deleteMany(ids: string[]): Promise<number> {
    try {
      if (ids.length === 0) {
        return 0;
      }

      await db.delete(contracts).where(inArray(contracts.id, ids));

      // Invalidate cache for all deleted contracts
      await Promise.all(ids.map((id) => this.cache.del(`contract:${id}`)));

      logger.info("Bulk contracts deleted", { count: ids.length } as any);
      return ids.length;
    } catch (error) {
      logger.error("Failed to delete contracts in bulk", error);
      return 0;
    }
  }
}
