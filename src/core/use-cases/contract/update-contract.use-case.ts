import { ContractRepository } from "@/core/domain/contract/contract.repository";
import {
  ContractEntity,
  UpdateContractParams,
  ContractNotFoundError,
} from "@/core/domain/contract/contract.entity";
import { AbiRepository } from "@/core/domain/abi/abi.repository";
import { AbiNotFoundError } from "@/core/domain/abi/abi.entity";
import type { ICacheService } from "@/infrastructure/di/container";
import { logger } from "@/shared/lib/utils/logger";

/**
 * Input parameters for updating a contract
 */
export interface UpdateContractInput {
  /** ID of the contract to update */
  contractId: string;
  /** User performing the update (for authorization) */
  userId?: string;
  /** Update parameters */
  updates: UpdateContractParams;
}

/**
 * Output result containing the updated contract
 */
export interface UpdateContractOutput {
  contract: ContractEntity;
  /** Indicates if ABI was changed */
  abiChanged: boolean;
}

/**
 * Use case for updating an existing smart contract.
 *
 * This use case handles:
 * - Validating contract exists
 * - Verifying new ABI exists (if changing)
 * - Applying updates
 * - Handling verification status changes
 * - Invalidating related caches
 *
 * Business Rules:
 * - Contract must exist
 * - If changing ABI, new ABI must exist
 * - Verification can only be set to true (not unverified)
 * - When marking verified, verifiedAt timestamp is set automatically
 * - Metadata is merged, not replaced
 *
 * @example
 * ```typescript
 * const updateContract = new UpdateContractUseCase(
 *   contractRepo,
 *   abiRepo,
 *   cache
 * );
 *
 * const result = await updateContract.execute({
 *   contractId: 'contract-uuid',
 *   updates: {
 *     name: 'USDC Token V2',
 *     isVerified: true,
 *     verificationSource: 'etherscan',
 *     metadata: {
 *       symbol: 'USDC',
 *       decimals: 6
 *     }
 *   }
 * });
 * ```
 */
export class UpdateContractUseCase {
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly abiRepository: AbiRepository,
    private readonly cacheService: ICacheService
  ) {}

  /**
   * Execute the update contract use case
   *
   * @param input - The update parameters
   * @returns Promise<UpdateContractOutput> - The updated contract
   * @throws {ContractNotFoundError} When contract doesn't exist
   * @throws {AbiNotFoundError} When new ABI doesn't exist
   */
  async execute(input: UpdateContractInput): Promise<UpdateContractOutput> {
    logger.debug("Executing UpdateContractUseCase", {
      contractId: input.contractId,
      updates: input.updates,
    } as any);

    // 1. Verify contract exists
    const existingContract = await this.contractRepository.findById(
      input.contractId
    );
    if (!existingContract) {
      throw new ContractNotFoundError(input.contractId);
    }

    // 2. If changing ABI, verify new ABI exists
    let abiChanged = false;
    if (input.updates.abiId && input.updates.abiId !== existingContract.abiId) {
      const newAbi = await this.abiRepository.findById(input.updates.abiId);
      if (!newAbi) {
        throw new AbiNotFoundError(input.updates.abiId);
      }
      abiChanged = true;
      logger.info("Contract ABI will be updated", {
        contractId: input.contractId,
        oldAbiId: existingContract.abiId,
        newAbiId: input.updates.abiId,
      } as any);
    }

    // 3. Validate verification changes
    if (input.updates.isVerified === true && !existingContract.isVerified) {
      logger.info("Contract will be marked as verified", {
        contractId: input.contractId,
        source: input.updates.verificationSource || "unknown",
      } as any);
    }

    // 4. Merge metadata if provided (don't replace entirely)
    const updateParams = { ...input.updates };
    if (input.updates.metadata && existingContract.metadata) {
      updateParams.metadata = {
        ...existingContract.metadata,
        ...input.updates.metadata,
      };
    }

    // 5. Perform update
    const updatedContract = await this.contractRepository.update(
      input.contractId,
      updateParams
    );

    if (!updatedContract) {
      throw new ContractNotFoundError(input.contractId);
    }

    // 6. Invalidate related caches
    await this.invalidateRelatedCaches(updatedContract, existingContract);

    logger.info("Contract updated successfully", {
      contractId: updatedContract.id,
      abiChanged,
      fieldsUpdated: Object.keys(input.updates),
    } as any);

    return {
      contract: updatedContract,
      abiChanged,
    };
  }

  /**
   * Invalidate caches related to the updated contract
   */
  private async invalidateRelatedCaches(
    updated: ContractEntity,
    original: ContractEntity
  ): Promise<void> {
    try {
      // Invalidate network's contract list
      await this.cacheService.clear(`network:${updated.networkId}:contracts*`);

      // Invalidate both old and new ABI's contract lists if ABI changed
      await this.cacheService.clear(`abi:${updated.abiId}:contracts*`);
      if (original.abiId !== updated.abiId) {
        await this.cacheService.clear(`abi:${original.abiId}:contracts*`);
      }

      // Invalidate search results
      await this.cacheService.clear("search:contracts:*");

      // Invalidate verification stats if verification status changed
      if (original.isVerified !== updated.isVerified) {
        await this.cacheService.del("contracts:verification:stats");
      }
    } catch (error) {
      logger.warn("Failed to invalidate some caches", error as any);
    }
  }
}
