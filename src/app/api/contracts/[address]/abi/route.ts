import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { ContractAddressParamsSchema as ParamsSchema } from "@/shared/lib/validation/contract.dto";
import { ContractRepositoryImpl } from "@/infrastructure/database/repositories/contract.repository.impl";
import { AbiRepositoryImpl } from "@/infrastructure/database/repositories/abi.repository.impl";
import { ErrorCode } from "@/shared/types";

/**
 * GET /api/contracts/[address]/abi - Get contract ABI
 *
 * Returns the ABI associated with the specified contract.
 *
 * Query parameters:
 * - networkId: Required - Network UUID to identify the contract
 */
export const GET = ApiWrapper.create(
  async (input: { query?: { networkId?: string } }, context) => {
    const address = context.params?.address;
    if (!address) {
      throw new ApiError(
        "Contract address is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    const networkId = input.query?.networkId;
    if (!networkId) {
      throw new ApiError(
        "networkId query parameter is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // Initialize repositories
    const contractRepository = new ContractRepositoryImpl();
    const abiRepository = new AbiRepositoryImpl();

    // Find contract
    const contract = await contractRepository.findByAddress(address, networkId);
    if (!contract) {
      throw new ApiError(
        `Contract ${address} on network ${networkId} not found`,
        ErrorCode.NOT_FOUND,
        404
      );
    }

    // Get ABI
    const abi = await abiRepository.findById(contract.abiId);
    if (!abi) {
      throw new ApiError(
        `ABI ${contract.abiId} not found for contract`,
        ErrorCode.NOT_FOUND,
        404
      );
    }

    return {
      contract: {
        id: contract.id,
        address: contract.address,
        networkId: contract.networkId,
        name: contract.name,
      },
      abi: {
        id: abi.id,
        name: abi.name,
        abi: abi.abi,
        abiHash: abi.abiHash,
        version: abi.version,
        standard: abi.standard,
        tags: abi.tags,
        contractName: abi.contractName,
        description: abi.description,
        metadata: abi.metadata,
        createdAt: abi.createdAt.toISOString(),
        updatedAt: abi.updatedAt.toISOString(),
      },
    };
  },
  {
    auth: {
      required: true, // Require API key
      allowApiKey: true,
      allowSession: true,
    },
    validation: { params: ParamsSchema },
  }
);
