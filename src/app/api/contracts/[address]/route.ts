import { z } from "zod";
import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import {
  ContractAddressParamsSchema,
  UpdateContractSchema,
} from "@/shared/lib/validation/contract.dto";
import { ContractRepositoryImpl } from "@/infrastructure/database/repositories/contract.repository.impl";
import { AbiRepositoryImpl } from "@/infrastructure/database/repositories/abi.repository.impl";
import { CacheAdapter } from "@/infrastructure/cache/cache.adapter";
import {
  GetContractUseCase,
  UpdateContractUseCase,
  DeleteContractUseCase,
} from "@/core/use-cases/contract";
import { ErrorCode } from "@/shared/types";

const ParamsSchema = ContractAddressParamsSchema;

/**
 * GET /api/contracts/[address] - Get contract by address
 *
 * Query parameters:
 * - networkId: Required - Network UUID to identify the contract
 * - includeAbi: Optional - Whether to include full ABI (default: false)
 */
export const GET = ApiWrapper.create(
  async (input: { query?: { networkId?: string; includeAbi?: string } }, context) => {
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

    // Initialize dependencies
    const contractRepository = new ContractRepositoryImpl();
    const abiRepository = new AbiRepositoryImpl();

    // Create use case
    const getContractUseCase = new GetContractUseCase(
      contractRepository,
      abiRepository
    );

    // Execute use case
    const result = await getContractUseCase.execute({
      identifier: address,
      networkId,
      includeAbi: input.query?.includeAbi === "true",
    });

    return {
      contract: {
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
      },
      abi: result.abi
        ? {
            id: result.abi.id,
            name: result.abi.name,
            abi: result.abi.abi,
            version: result.abi.version,
            standard: result.abi.standard,
          }
        : undefined,
    };
  },
  {
    auth: { required: false }, // Public endpoint
    validation: { params: ParamsSchema },
  }
);

/**
 * PUT /api/contracts/[address] - Update contract metadata
 *
 * Query parameters:
 * - networkId: Required - Network UUID to identify the contract
 *
 * Body: UpdateContractSchema
 */
export const PUT = ApiWrapper.create(
  async (
    input: {
      body: z.infer<typeof UpdateContractSchema>;
      query?: { networkId?: string };
    },
    context
  ) => {
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

    const userId = context.user?.id || context.apiKey?.userId;

    // Initialize dependencies
    const contractRepository = new ContractRepositoryImpl();
    const abiRepository = new AbiRepositoryImpl();
    const cacheService = CacheAdapter.getInstance();

    // First find contract by address
    const contract = await contractRepository.findByAddress(address, networkId);
    if (!contract) {
      throw new ApiError(
        `Contract ${address} on network ${networkId} not found`,
        ErrorCode.NOT_FOUND,
        404
      );
    }

    // Create use case
    const updateContractUseCase = new UpdateContractUseCase(
      contractRepository,
      abiRepository,
      cacheService
    );

    // Parse deployedAt if provided
    const deployedAt = input.body.deployedAt
      ? new Date(input.body.deployedAt)
      : undefined;

    // Execute use case
    const result = await updateContractUseCase.execute({
      contractId: contract.id,
      userId,
      updates: {
        ...input.body,
        deployedAt,
      },
    });

    return {
      contract: {
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
      },
      abiChanged: result.abiChanged,
    };
  },
  {
    auth: {
      required: true,
      allowApiKey: true,
      allowSession: true,
      requiredPermissions: ["contracts:write", "write:contracts"],
    },
    validation: {
      params: ParamsSchema,
      body: UpdateContractSchema,
    },
  }
);

/**
 * DELETE /api/contracts/[address] - Delete contract
 *
 * Query parameters:
 * - networkId: Required - Network UUID to identify the contract
 */
export const DELETE = ApiWrapper.create(
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

    const userId = context.user?.id || context.apiKey?.userId;

    // Initialize dependencies
    const contractRepository = new ContractRepositoryImpl();
    const cacheService = CacheAdapter.getInstance();

    // First find contract by address
    const contract = await contractRepository.findByAddress(address, networkId);
    if (!contract) {
      throw new ApiError(
        `Contract ${address} on network ${networkId} not found`,
        ErrorCode.NOT_FOUND,
        404
      );
    }

    // Create use case
    const deleteContractUseCase = new DeleteContractUseCase(
      contractRepository,
      cacheService
    );

    // Execute use case
    const result = await deleteContractUseCase.execute({
      contractId: contract.id,
      userId,
    });

    return result;
  },
  {
    auth: {
      required: true,
      allowApiKey: true,
      allowSession: true,
      requiredPermissions: ["contracts:delete", "delete:contracts"],
    },
    validation: { params: ParamsSchema },
  }
);
