import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { ContractNameParamsSchema as ParamsSchema } from "@/shared/lib/validation/contract.dto";
import { ContractRepositoryImpl } from "@/infrastructure/database/repositories/contract.repository.impl";
import { AbiRepositoryImpl } from "@/infrastructure/database/repositories/abi.repository.impl";
import { ErrorCode } from "@/shared/types";

/**
 * GET /api/contracts/by-name/[name]/versions - Get ABI versions for contracts with this name
 *
 * Returns all unique ABI versions used by contracts with the specified name.
 * This is useful to see the evolution of contract ABIs across different deployments.
 *
 * Query parameters:
 * - networkId: Optional - Filter by network
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
    const nameParam = context.params?.name;
    if (!nameParam) {
      throw new ApiError(
        "Contract name is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    const contractRepository = new ContractRepositoryImpl();
    const abiRepository = new AbiRepositoryImpl();

    // Build filters
    const filters: { networkId?: string } = {};
    if (input.query?.networkId) {
      filters.networkId = input.query.networkId;
    }

    // Find all contracts with this name
    const contractsResult = await contractRepository.list({
      query: nameParam,
      filters,
      limit: 1000, // Get all contracts with this name
    });

    // Get unique ABI IDs
    const uniqueAbiIds = Array.from(
      new Set(contractsResult.data.map((c) => c.abiId))
    );

    // Fetch all ABIs and their versions
    const abiVersionsMap = new Map<string, unknown[]>();

    for (const abiId of uniqueAbiIds) {
      const versions = await abiRepository.findVersions(abiId);
      if (versions.length > 0) {
        abiVersionsMap.set(abiId, versions);
      }
    }

    // Flatten all versions
    const allVersions: Array<{
      abiId: string;
      versionNumber: number;
      version: string;
      contractsCount: number;
      createdAt: string;
    }> = [];

    for (const [abiId, versions] of abiVersionsMap) {
      const contractsWithThisAbi = contractsResult.data.filter(
        (c) => c.abiId === abiId
      ).length;

      for (const version of versions) {
        allVersions.push({
          abiId,
          versionNumber: (version as { versionNumber: number }).versionNumber,
          version: (version as { version: string }).version,
          contractsCount: contractsWithThisAbi,
          createdAt: (version as { createdAt: Date }).createdAt.toISOString(),
        });
      }
    }

    // Sort by version number descending
    allVersions.sort((a, b) => b.versionNumber - a.versionNumber);

    return {
      name: nameParam,
      totalContracts: contractsResult.data.length,
      uniqueAbis: uniqueAbiIds.length,
      versions: allVersions,
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
