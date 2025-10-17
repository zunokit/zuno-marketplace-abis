import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { ContractAddressParamsSchema as ParamsSchema } from "@/shared/lib/validation/contract.dto";
import { ContractRepositoryImpl } from "@/infrastructure/database/repositories/contract.repository.impl";
import { AbiRepositoryImpl } from "@/infrastructure/database/repositories/abi.repository.impl";
import { ErrorCode } from "@/shared/types";

/**
 * GET /api/contracts/[address]/versions - Get all ABI versions for a contract
 *
 * Returns the version history of ABIs used by this contract.
 * Useful for tracking contract upgrades and changes over time.
 *
 * Query Parameters:
 * - networkId: Required - Network UUID to identify the contract
 */
export const GET = ApiWrapper.create(
  async (
    input: {
      query?: {
        networkId?: string;
      };
    },
    context
  ) => {
    const addressParam = context.params?.address;
    if (!addressParam) {
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

    const contractRepository = new ContractRepositoryImpl();
    const abiRepository = new AbiRepositoryImpl();

    // Find contract
    const contract = await contractRepository.findByAddress(
      addressParam,
      networkId
    );

    if (!contract) {
      throw new ApiError(
        `Contract ${addressParam} on network ${networkId} not found`,
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

    // Get all versions of this ABI
    const versions = await abiRepository.findVersions(contract.abiId);

    return {
      contract: {
        id: contract.id,
        address: contract.address,
        networkId: contract.networkId,
        abiId: contract.abiId,
        name: contract.name,
      },
      abi: {
        id: abi.id,
        name: abi.name,
        currentVersion: abi.version,
      },
      versions: versions.map((version) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        version: version.version,
        abiHash: version.abiHash,
        ipfsHash: version.ipfsHash,
        ipfsUrl: version.ipfsUrl,
        changeLog: version.changeLog,
        metadata: version.metadata,
        createdAt: version.createdAt.toISOString(),
      })),
      totalVersions: versions.length,
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
