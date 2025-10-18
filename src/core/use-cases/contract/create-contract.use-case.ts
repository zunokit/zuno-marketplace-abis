import { ContractRepository } from "@/core/domain/contract/contract.repository";
import {
  ContractEntity,
  ContractFactory,
  CreateContractParams,
  ContractDuplicateError,
} from "@/core/domain/contract/contract.entity";
import { AbiRepository } from "@/core/domain/abi/abi.repository";
import { AbiNotFoundError } from "@/core/domain/abi/abi.entity";
import type { ICacheService } from "@/infrastructure/di/container";
import { logger } from "@/shared/lib/utils/logger";

/**
 * Input parameters for creating a new contract
 */
export interface CreateContractInput extends CreateContractParams {
  /** The user creating the contract (for authorization) */
  userId?: string;
}

/**
 * Output result containing the created contract
 */
export interface CreateContractOutput {
  contract: ContractEntity;
}

/**
 * Use case for registering a new smart contract in the system.
 *
 * This use case handles:
 * - Validating contract address format
 * - Ensuring the referenced ABI exists
 * - Checking for duplicate contracts (address + network)
 * - Creating the contract entity
 * - Invalidating related caches
 *
 * Business Rules:
 * - Contract address must be valid EVM address (0x + 40 hex chars)
 * - Contract must reference an existing ABI
 * - Contract address + network combination must be unique
 * - Address is normalized to lowercase for consistency
 *
 * @example
 * ```typescript
 * const createContract = new CreateContractUseCase(
 *   contractRepo,
 *   abiRepo,
 *   cache
 * );
 *
 * const result = await createContract.execute({
 *   address: '0x1234567890123456789012345678901234567890',
 *   networkId: 'network-uuid',
 *   abiId: 'abi-uuid',
 *   name: 'USDC Token',
 *   type: 'token',
 *   metadata: {
 *     symbol: 'USDC',
 *     decimals: 6,
 *     totalSupply: '1000000000000'
 *   }
 * });
 * ```
 */
export class CreateContractUseCase {
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly abiRepository: AbiRepository,
    private readonly cacheService: ICacheService
  ) {}

  /**
   * Execute the create contract use case
   *
   * @param input - The contract creation parameters
   * @returns Promise<CreateContractOutput> - The created contract
   * @throws {Error} When address format is invalid
   * @throws {AbiNotFoundError} When referenced ABI doesn't exist
   * @throws {ContractDuplicateError} When contract already exists
   */
  async execute(input: CreateContractInput): Promise<CreateContractOutput> {
    logger.debug("Executing CreateContractUseCase", {
      address: input.address,
      networkId: input.networkId,
      abiId: input.abiId,
    } as any);

    // 1. Validate address format
    this.validateAddress(input.address);

    // 2. Verify the ABI exists
    const abi = await this.abiRepository.findById(input.abiId);
    if (!abi) {
      throw new AbiNotFoundError(input.abiId);
    }

    // 3. Check for existing contract (handled in repository)
    const exists = await this.contractRepository.existsByAddress(
      input.address,
      input.networkId
    );
    if (exists) {
      throw new ContractDuplicateError(input.address, input.networkId);
    }

    // 4. Create contract entity using factory
    const contractEntity = ContractFactory.createContract({
      address: input.address,
      networkId: input.networkId,
      abiId: input.abiId,
      name: input.name,
      type: input.type,
      verificationSource: input.verificationSource,
      metadata: input.metadata,
      deployedAt: input.deployedAt,
      deployer: input.deployer,
    });

    // 5. Persist to database (caching handled in repository)
    const createdContract = await this.contractRepository.create(
      contractEntity
    );

    // 6. Invalidate related caches
    await this.invalidateRelatedCaches(createdContract);

    logger.info("Contract created successfully", {
      contractId: createdContract.id,
      address: createdContract.address,
      networkId: createdContract.networkId,
      abiId: createdContract.abiId,
    } as any);

    return {
      contract: createdContract,
    };
  }

  /**
   * Validate Ethereum address format
   * @throws {Error} If address format is invalid
   */
  private validateAddress(address: string): void {
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(address)) {
      throw new Error(
        "Invalid Ethereum address format. Must be 0x followed by 40 hexadecimal characters."
      );
    }
  }

  /**
   * Invalidate caches related to contracts
   */
  private async invalidateRelatedCaches(
    contract: ContractEntity
  ): Promise<void> {
    try {
      // Invalidate network's contract list
      await this.cacheService.clear(`network:${contract.networkId}:contracts*`);

      // Invalidate ABI's contract list
      await this.cacheService.clear(`abi:${contract.abiId}:contracts*`);

      // Invalidate search results
      await this.cacheService.clear("search:contracts:*");
    } catch (error) {
      logger.warn("Failed to invalidate some caches", error as any);
      // Don't throw - cache invalidation failure shouldn't fail the operation
    }
  }
}
