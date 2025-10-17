import { z } from "zod";
import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import {
  ContractAddressParamsSchema,
  UpdateContractSchema,
} from "@/shared/lib/validation/contract.dto";
import {
  getContractRepository,
  getAbiRepository,
  getCacheService,
} from "@/infrastructure/di/container";
import {
  GetContractUseCase,
  UpdateContractUseCase,
  DeleteContractUseCase,
} from "@/core/use-cases/contract";
import {
  ContractDtoMapper,
  type ContractWithAbiResponseDto,
  type UpdatedContractResponseDto,
  type DeletedContractResponseDto,
} from "@/shared/dto/contract.dto";
import { AuthContextService } from "@/core/services/auth/auth-context.service";
import { ErrorCode } from "@/shared/types";
import { ContractError } from "@/core/domain/contract/contract.entity";

const ParamsSchema = ContractAddressParamsSchema;

/**
 * GET /api/contracts/[address] - Get contract by address
 */
export const GET = ApiWrapper.create<
  { query?: { networkId?: string; includeAbi?: string } },
  ContractWithAbiResponseDto
>(
  async (input, context) => {
    // 1. Extract params
    const address = context.params?.address;
    if (!address) {
      throw new ApiError(
        "Contract address is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // Extract query from nested input structure
    const queryParams = (input as any).query || input;
    const networkId = queryParams?.networkId;
    if (!networkId) {
      throw new ApiError(
        "networkId query parameter is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // 2. Create use case với DI
    const getContractUseCase = new GetContractUseCase(
      getContractRepository(),
      getAbiRepository()
    );

    // 3. Execute use case
    const result = await getContractUseCase.execute({
      identifier: address,
      networkId,
      includeAbi: queryParams?.includeAbi === "true",
    });

    // 4. Convert sang response DTO
    return ContractDtoMapper.toResponseWithAbiDto(result.contract, result.abi);
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

/**
 * PUT /api/contracts/[address] - Update contract metadata
 */
export const PUT = ApiWrapper.create<
  {
    body: z.infer<typeof UpdateContractSchema>;
    query?: { networkId?: string };
  },
  UpdatedContractResponseDto
>(
  async (input, context) => {
    // 1. Extract params
    const address = context.params?.address;
    if (!address) {
      throw new ApiError(
        "Contract address is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // Extract query from nested input structure
    const queryParams = (input as any).query || input;
    const networkId = queryParams?.networkId;
    if (!networkId) {
      throw new ApiError(
        "networkId query parameter is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // 2. Extract user ID qua service
    const userId = AuthContextService.extractUserId(context);

    // 3. Find contract by address
    const contractRepository = getContractRepository();
    const contract = await contractRepository.findByAddress(address, networkId);
    if (!contract) {
      throw new ApiError(
        `Contract ${address} on network ${networkId} not found`,
        ErrorCode.NOT_FOUND,
        404
      );
    }

    // 4. Create use case với DI
    const updateContractUseCase = new UpdateContractUseCase(
      contractRepository,
      getAbiRepository(),
      getCacheService()
    );

    // 5. Parse deployedAt if provided
    const deployedAt = input.body.deployedAt
      ? new Date(input.body.deployedAt)
      : undefined;

    // 6. Execute use case
    const result = await updateContractUseCase.execute({
      contractId: contract.id,
      userId,
      updates: {
        ...input.body,
        deployedAt,
      },
    });

    // 7. Convert sang response DTO
    return ContractDtoMapper.toUpdatedResponseDto(
      result.contract,
      result.abiChanged
    );
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
 */
export const DELETE = ApiWrapper.create<
  { query?: { networkId?: string } },
  DeletedContractResponseDto
>(
  async (input, context) => {
    // 1. Extract params
    const address = context.params?.address;
    if (!address) {
      throw new ApiError(
        "Contract address is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // Extract query from nested input structure
    const queryParams = (input as any).query || input;
    const networkId = queryParams?.networkId;
    if (!networkId) {
      throw new ApiError(
        "networkId query parameter is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // 2. Extract user ID qua service
    const userId = AuthContextService.extractUserId(context);

    // 3. Find contract by address
    const contractRepository = getContractRepository();
    const contract = await contractRepository.findByAddress(address, networkId);
    if (!contract) {
      throw new ApiError(
        `Contract ${address} on network ${networkId} not found`,
        ErrorCode.NOT_FOUND,
        404
      );
    }

    // 4. Create use case với DI
    const deleteContractUseCase = new DeleteContractUseCase(
      contractRepository,
      getCacheService()
    );

    // 5. Execute use case
    await deleteContractUseCase.execute({
      contractId: contract.id,
      userId,
    });

    // 6. Convert sang response DTO
    return ContractDtoMapper.toDeletedResponseDto();
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
