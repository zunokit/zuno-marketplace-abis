import { ContractRepository } from "@/core/domain/contract/contract.repository";
import { ContractNotFoundError } from "@/core/domain/contract/contract.entity";
import type { ICacheService } from "@/infrastructure/di/container";
import { logger } from "@/shared/lib/utils/logger";

/**
 * Input parameters for deleting a contract
 */
export interface DeleteContractInput {
  /** ID of the contract to delete */
  contractId: string;
  /** User performing the deletion (for authorization/audit) */
  userId?: string;
  /** Whether this is a soft delete (future enhancement) */
  soft?: boolean;
}

/**
 * Output result confirming deletion
 */
export interface DeleteContractOutput {
  /** Whether deletion was successful */
  success: boolean;
  /** ID of the deleted contract */
  contractId: string;
  /** Message describing the result */
  message: string;
}

/**
 * Use case for deleting a smart contract from the system.
 *
 * This use case handles:
 * - Validating contract exists
 * - Performing hard delete
 * - Invalidating all related caches
 * - Logging the deletion for audit
 *
 * Business Rules:
 * - Contract must exist before deletion
 * - Deletion is permanent (hard delete)
 * - Associated data (ABI, Network) is NOT deleted (preserve references)
 * - Only authorized users can delete (enforced at API level)
 *
 * Future Enhancements:
 * - Soft delete option
 * - Cascading options for related data
 * - Restoration capability
 *
 * @example
 * ```typescript
 * const deleteContract = new DeleteContractUseCase(
 *   contractRepo,
 *   cache
 * );
 *
 * const result = await deleteContract.execute({
 *   contractId: 'contract-uuid',
 *   userId: 'user-uuid'
 * });
 *
 * if (result.success) {
 *   console.log('Contract deleted:', result.message);
 * }
 * ```
 */
export class DeleteContractUseCase {
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly cacheService: ICacheService
  ) {}

  /**
   * Execute the delete contract use case
   *
   * @param input - The deletion parameters
   * @returns Promise<DeleteContractOutput> - Deletion result
   * @throws {ContractNotFoundError} When contract doesn't exist
   */
  async execute(input: DeleteContractInput): Promise<DeleteContractOutput> {
    logger.debug("Executing DeleteContractUseCase", {
      contractId: input.contractId,
      userId: input.userId,
    } as any);

    // 1. Verify contract exists and get details before deletion
    const contract = await this.contractRepository.findById(input.contractId);
    if (!contract) {
      throw new ContractNotFoundError(input.contractId);
    }

    logger.info("Contract found for deletion", {
      contractId: contract.id,
      address: contract.address,
      networkId: contract.networkId,
      abiId: contract.abiId,
    } as any);

    // 2. Perform deletion
    const deleted = await this.contractRepository.delete(input.contractId);

    if (!deleted) {
      logger.error("Failed to delete contract", {
        contractId: input.contractId,
      } as any);
      return {
        success: false,
        contractId: input.contractId,
        message: "Failed to delete contract from database",
      };
    }

    // 3. Invalidate all related caches
    await this.invalidateRelatedCaches(contract);

    logger.info("Contract deleted successfully", {
      contractId: input.contractId,
      address: contract.address,
      deletedBy: input.userId,
    } as any);

    return {
      success: true,
      contractId: input.contractId,
      message: `Contract ${contract.address} on network ${contract.networkId} deleted successfully`,
    };
  }

  /**
   * Invalidate all caches related to the deleted contract
   */
  private async invalidateRelatedCaches(
    contract: { id: string; address: string; networkId: string; abiId: string }
  ): Promise<void> {
    try {
      // Invalidate contract-specific caches
      await this.cacheService.del(`contract:${contract.id}`);
      await this.cacheService.del(
        `contract:${contract.address}:${contract.networkId}`
      );

      // Invalidate network's contract list
      await this.cacheService.clear(`network:${contract.networkId}:contracts*`);

      // Invalidate ABI's contract list
      await this.cacheService.clear(`abi:${contract.abiId}:contracts*`);

      // Invalidate search results
      await this.cacheService.clear("search:contracts:*");

      // Invalidate verification stats
      await this.cacheService.del("contracts:verification:stats");

      logger.debug("Caches invalidated for deleted contract", {
        contractId: contract.id,
      } as any);
    } catch (error) {
      logger.warn("Failed to invalidate some caches after deletion", error as any);
      // Don't throw - cache invalidation failure shouldn't fail the operation
    }
  }
}
