import { z } from "zod";
import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { ChainContractsParamsSchema } from "@/shared/lib/validation/network.dto";
import { ListContractsSchema } from "@/shared/lib/validation/contract.dto";
import { NetworkRepositoryImpl } from "@/infrastructure/database/repositories/network.repository.impl";
import { ContractRepositoryImpl } from "@/infrastructure/database/repositories/contract.repository.impl";
import { ErrorCode } from "@/shared/types";

/**
 * GET /api/networks/[chainId]/contracts - List contracts on a specific network
 *
 * Returns all contracts deployed on the specified blockchain network.
 *
 * Path parameters:
 * - chainId: The blockchain network chain ID (e.g., 1 for Ethereum, 137 for Polygon)
 *
 * Query parameters:
 * - page, limit: Pagination
 * - query: Search by contract name or address
 * - sortBy, sortOrder: Sorting
 * - type: Filter by contract type
 * - isVerified: Filter by verification status
 * - deployer: Filter by deployer address
 */
export const GET = ApiWrapper.create(
  async (input: z.infer<typeof ListContractsSchema>, context) => {
    const chainId = context.params?.chainId;
    if (!chainId) {
      throw new ApiError(
        "Chain ID is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // Initialize repositories
    const networkRepository = new NetworkRepositoryImpl();
    const contractRepository = new ContractRepositoryImpl();

    // Parse and validate chain ID
    const chainIdNum = parseInt(chainId, 10);
    if (isNaN(chainIdNum)) {
      throw new ApiError(
        `Invalid chain ID: ${chainId}`,
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // Find network by chain ID
    const network = await networkRepository.findByChainId(chainIdNum);
    if (!network) {
      throw new ApiError(
        `Network with chain ID ${chainId} not found`,
        ErrorCode.NOT_FOUND,
        404
      );
    }

    // Build filters
    const filters: any = {
      networkId: network.id,
    };

    if (input.abiId) {
      filters.abiId = input.abiId;
    }

    if (input.type) {
      filters.type = input.type;
    }

    if (input.isVerified !== undefined) {
      filters.isVerified = input.isVerified === "true";
    }

    if (input.deployer) {
      filters.deployer = input.deployer;
    }

    // List contracts for this network
    const result = await contractRepository.list({
      page: input.page as number,
      limit: input.limit as number,
      sortBy: input.sortBy as any,
      sortOrder: input.sortOrder as "asc" | "desc",
      query: input.query as string | undefined,
      filters,
    });

    return {
      network: {
        chainId: network.chainId,
        name: network.name,
        slug: network.slug,
        type: network.type,
      },
      ...result,
    };
  },
  {
    validation: {
      params: ChainContractsParamsSchema,
      query: ListContractsSchema,
    },
    auth: {
      required: true, // Require API key
      allowApiKey: true,
      allowSession: true,
    },
  }
);
