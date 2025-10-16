import { ContractRepository } from "@/core/domain/contract/contract.repository";
import {
  ContractEntity,
  ContractNotFoundError,
} from "@/core/domain/contract/contract.entity";
import { AbiEntity } from "@/core/domain/abi/abi.entity";
import { AbiRepository } from "@/core/domain/abi/abi.repository";
import { logger } from "@/shared/lib/utils/logger";

/**
 * Input parameters for retrieving a contract
 */
export interface GetContractInput {
  /** Contract ID or address to retrieve */
  identifier: string;
  /** Network ID (required if using address as identifier) */
  networkId?: string;
  /** Whether to include the full ABI in the response */
  includeAbi?: boolean;
}

/**
 * Output result containing contract details
 */
export interface GetContractOutput {
  contract: ContractEntity;
  abi?: AbiEntity;
}

/**
 * Use case for retrieving contract details by ID or address.
 *
 * This use case handles:
 * - Fetching contract by ID or by address+network
 * - Optionally loading the associated ABI
 * - Caching handled at repository level
 *
 * @example
 * ```typescript
 * const getContract = new GetContractUseCase(contractRepo, abiRepo);
 *
 * // By ID
 * const result = await getContract.execute({
 *   identifier: 'contract-uuid',
 *   includeAbi: true
 * });
 *
 * // By address
 * const result = await getContract.execute({
 *   identifier: '0x1234...',
 *   networkId: 'network-uuid',
 *   includeAbi: true
 * });
 * ```
 */
export class GetContractUseCase {
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly abiRepository: AbiRepository
  ) {}

  /**
   * Execute the get contract use case
   *
   * @param input - The retrieval parameters
   * @returns Promise<GetContractOutput> - Contract with optional ABI
   * @throws {ContractNotFoundError} When contract doesn't exist
   */
  async execute(input: GetContractInput): Promise<GetContractOutput> {
    logger.debug("Executing GetContractUseCase", input as any);

    // Determine if identifier is UUID or address
    const isUUID = this.isValidUUID(input.identifier);

    let contract: ContractEntity | null;

    if (isUUID) {
      // Fetch by ID
      contract = await this.contractRepository.findById(input.identifier);
    } else {
      // Fetch by address (requires networkId)
      if (!input.networkId) {
        throw new Error(
          "networkId is required when fetching contract by address"
        );
      }
      contract = await this.contractRepository.findByAddress(
        input.identifier,
        input.networkId
      );
    }

    // Throw if not found
    if (!contract) {
      throw new ContractNotFoundError(input.identifier);
    }

    // Optionally load ABI
    let abi: AbiEntity | undefined;
    if (input.includeAbi) {
      const abiResult = await this.abiRepository.findById(contract.abiId);
      if (abiResult) {
        abi = abiResult;
      } else {
        logger.warn("Contract references non-existent ABI", {
          contractId: contract.id,
          abiId: contract.abiId,
        } as any);
      }
    }

    logger.info("Contract retrieved successfully", {
      contractId: contract.id,
      includeAbi: input.includeAbi,
    } as any);

    return {
      contract,
      abi,
    };
  }

  /**
   * Check if a string is a valid UUID
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}
