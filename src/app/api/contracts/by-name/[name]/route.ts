import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { ContractNameParamsSchema as ParamsSchema } from "@/shared/lib/validation/contract.dto";
import { ContractRepositoryImpl } from "@/infrastructure/database/repositories/contract.repository.impl";
import { ErrorCode } from "@/shared/types";

/**
 * GET /api/contracts/by-name/[name] - Find contracts by name
 *
 * Returns all contracts matching the given name (case-insensitive search).
 * Supports pagination and filtering.
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - networkId: Optional - Filter by network
 * - sortBy: Optional - Sort field (name, createdAt, updatedAt)
 * - sortOrder: Optional - Sort direction (asc, desc)
 */
export const GET = ApiWrapper.create(
  async (
    input: {
      query?: {
        page?: string;
        limit?: string;
        networkId?: string;
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

    const contractRepository = new ContractRepositoryImpl();

    // Parse pagination parameters
    const page = input.query?.page ? parseInt(input.query.page) : 1;
    const limit = input.query?.limit
      ? Math.min(parseInt(input.query.limit), 100)
      : 20;

    // Build filters
    const filters: { networkId?: string } = {};
    if (input.query?.networkId) {
      filters.networkId = input.query.networkId;
    }

    // Search contracts by name
    const result = await contractRepository.list({
      page,
      limit,
      query: nameParam,
      sortBy: (input.query?.sortBy as "name" | "createdAt" | "updatedAt") || "name",
      sortOrder: (input.query?.sortOrder as "asc" | "desc") || "asc",
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
