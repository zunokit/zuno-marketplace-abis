import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { ContractNameParamsSchema as ParamsSchema } from "@/shared/lib/validation/contract.dto";
import { getContractRepository } from "@/infrastructure/di/container";
import { ErrorCode } from "@/shared/types";
import { resolveNetworkId } from "@/shared/lib/utils/resolve-network-id";

/**
 * GET /api/contracts/by-name/[name] - Find contracts by name
 *
 * Returns all contracts matching the given name (case-insensitive search).
 * Supports pagination and filtering.
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - chainId: Optional - Filter by network (integer)
 * - sortBy: Optional - Sort field (name, createdAt, updatedAt)
 * - sortOrder: Optional - Sort direction (asc, desc)
 */
export const GET = ApiWrapper.create(
  async (
    input: {
      query?: {
        page?: string;
        limit?: string;
        chainId?: string | number;
        sortBy?: string;
        sortOrder?: string;
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

    const contractRepository = getContractRepository();

    // Extract query params (handle nested structure like /contracts route)
    const queryParams = (input as any).query || input;

    // Parse pagination parameters
    const page = queryParams?.page ? parseInt(queryParams.page) : 1;
    const limit = queryParams?.limit
      ? Math.min(parseInt(queryParams.limit), 100)
      : 20;

    // Build filters - resolve networkId from chainId if provided
    const filters: { networkId?: string } = {};
    if (queryParams?.chainId) {
      filters.networkId = await resolveNetworkId(queryParams.chainId);
    }

    // Search contracts by name
    const result = await contractRepository.list({
      page,
      limit,
      query: nameParam,
      sortBy: (queryParams?.sortBy as "name" | "createdAt" | "updatedAt") || "name",
      sortOrder: (queryParams?.sortOrder as "asc" | "desc") || "asc",
      filters,
    });

    return {
      name: nameParam,
      contracts: result.data.map((contract) => ({
        id: contract.id,
        address: contract.address,
        networkId: contract.networkId,
        abiId: contract.abiId,
        name: contract.name,
        type: contract.type,
        isVerified: contract.isVerified,
        verifiedAt: contract.verifiedAt?.toISOString(),
        verificationSource: contract.verificationSource,
        metadata: contract.metadata,
        deployedAt: contract.deployedAt?.toISOString(),
        deployer: contract.deployer,
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
      })),
      pagination: result.pagination,
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
