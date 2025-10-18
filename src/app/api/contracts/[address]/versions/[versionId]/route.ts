import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { ContractVersionParamsSchema as ParamsSchema } from "@/shared/lib/validation/contract.dto";
import { ContractRepositoryImpl } from "@/infrastructure/database/repositories/contract.repository.impl";
import { AbiRepositoryImpl } from "@/infrastructure/database/repositories/abi.repository.impl";
import { ErrorCode } from "@/shared/types";

/**
 * GET /api/contracts/[address]/versions/[versionId] - Get specific ABI version for a contract
 *
 * Returns detailed information about a specific ABI version used by this contract.
 * Includes the full ABI JSON, changelog, IPFS links, and metadata.
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
    const { address, versionId } = context.params as {
      address: string;
      versionId: string;
    };

    if (!address) {
      throw new ApiError(
        "Contract address is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    if (!versionId) {
      throw new ApiError(
        "Version ID is required",
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

    // Find all versions
    const versions = await abiRepository.findVersions(contract.abiId);

    // Find the requested version
    const version = versions.find((v) => v.id === versionId);
    if (!version) {
      throw new ApiError(
        `Version ${versionId} not found for this contract`,
        ErrorCode.NOT_FOUND,
        404
      );
    }

    // Check if this is the current version
    const isCurrentVersion = abi.version === version.version;

    // Get next and previous versions
    const sortedVersions = [...versions].sort(
      (a, b) => a.versionNumber - b.versionNumber
    );
    const currentIndex = sortedVersions.findIndex((v) => v.id === versionId);
    const previousVersion =
      currentIndex > 0 ? sortedVersions[currentIndex - 1] : null;
    const nextVersion =
      currentIndex < sortedVersions.length - 1
        ? sortedVersions[currentIndex + 1]
        : null;

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
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        version: version.version,
        abi: version.abi,
        abiHash: version.abiHash,
        ipfsHash: version.ipfsHash,
        ipfsUrl: version.ipfsUrl,
        changeLog: version.changeLog,
        metadata: version.metadata,
        createdAt: version.createdAt.toISOString(),
        isCurrentVersion,
      },
      navigation: {
        previous: previousVersion
          ? {
              id: previousVersion.id,
              versionNumber: previousVersion.versionNumber,
              version: previousVersion.version,
            }
          : null,
        next: nextVersion
          ? {
              id: nextVersion.id,
              versionNumber: nextVersion.versionNumber,
              version: nextVersion.version,
            }
          : null,
        totalVersions: versions.length,
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
