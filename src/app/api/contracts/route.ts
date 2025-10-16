import { z } from "zod";
import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import {
  CreateContractSchema,
  ListContractsSchema,
} from "@/shared/lib/validation/contract.dto";
import { ContractRepositoryImpl } from "@/infrastructure/database/repositories/contract.repository.impl";
import { AbiRepositoryImpl } from "@/infrastructure/database/repositories/abi.repository.impl";
import { CacheAdapter } from "@/infrastructure/cache/cache.adapter";
import { CreateContractUseCase } from "@/core/use-cases/contract/create-contract.use-case";
import { ErrorCode } from "@/shared/types";

/**
 * GET /api/contracts - List contracts with filtering, pagination, and search
 *
 * Query parameters:
 * - page, limit: Pagination
 * - query: Search by name or address
 * - sortBy, sortOrder: Sorting
 * - networkId: Filter by network
 * - abiId: Filter by ABI
 * - type: Filter by contract type
 * - isVerified: Filter by verification status
 * - deployer: Filter by deployer address
 */
export const GET = ApiWrapper.create(
  async (input: z.infer<typeof ListContractsSchema>, context) => {
    const contractRepository = new ContractRepositoryImpl();

    // Build filters
    const filters: any = {};

    if (input.networkId) {
      filters.networkId = input.networkId;
    }

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

    // List contracts
    const result = await contractRepository.list({
      page: input.page as number,
      limit: input.limit as number,
      sortBy: input.sortBy as any,
      sortOrder: input.sortOrder as "asc" | "desc",
      query: input.query as string | undefined,
      filters,
    });

    return result;
  },
  {
    validation: {
      query: ListContractsSchema,
    },
    auth: {
      required: false, // Public endpoint
      allowApiKey: true,
      allowSession: true,
    },
  }
);

/**
 * POST /api/contracts - Register a new smart contract
 *
 * Body:
 * - address: Contract address (0x...)
 * - networkId: Network UUID
 * - abiId: ABI UUID
 * - name: Optional contract name
 * - type: Optional contract type
 * - metadata: Optional metadata (symbol, decimals, etc.)
 * - deployedAt: Optional deployment timestamp
 * - deployer: Optional deployer address
 */
export const POST = ApiWrapper.create(
  async (input: { body: z.infer<typeof CreateContractSchema> }, context) => {
    const userId = context.user?.id || context.apiKey?.userId;

    if (!userId) {
      throw new ApiError(
        "User ID not found in authentication context",
        ErrorCode.UNAUTHORIZED,
        401
      );
    }

    // Initialize dependencies
    const contractRepository = new ContractRepositoryImpl();
    const abiRepository = new AbiRepositoryImpl();
    const cacheService = CacheAdapter.getInstance();

    // Create use case
    const createContractUseCase = new CreateContractUseCase(
      contractRepository,
      abiRepository,
      cacheService
    );

    // Parse deployedAt if provided
    const deployedAt = input.body.deployedAt
      ? new Date(input.body.deployedAt)
      : undefined;

    // Execute use case
    const result = await createContractUseCase.execute({
      userId,
      address: input.body.address,
      networkId: input.body.networkId,
      abiId: input.body.abiId,
      name: input.body.name,
      type: input.body.type,
      metadata: input.body.metadata,
      deployedAt,
      deployer: input.body.deployer,
    });

    return {
      id: result.contract.id,
      address: result.contract.address,
      networkId: result.contract.networkId,
      abiId: result.contract.abiId,
      name: result.contract.name,
      type: result.contract.type,
      isVerified: result.contract.isVerified,
      verifiedAt: result.contract.verifiedAt?.toISOString(),
      verificationSource: result.contract.verificationSource,
      metadata: result.contract.metadata,
      deployedAt: result.contract.deployedAt?.toISOString(),
      deployer: result.contract.deployer,
      createdAt: result.contract.createdAt.toISOString(),
      updatedAt: result.contract.updatedAt.toISOString(),
    };
  },
  {
    validation: {
      body: CreateContractSchema,
    },
    auth: {
      required: true,
      allowApiKey: true,
      allowSession: true,
      requiredPermissions: ["contracts:write", "write:contracts"],
    },
  }
);


