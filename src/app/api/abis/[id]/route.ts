import { z } from "zod";
import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { GetAbiSchema, UpdateAbiSchema } from "@/shared/lib/validation/abi.dto";
import {
  getAbiRepository,
  getCacheService,
} from "@/infrastructure/di/container";
import { UpdateAbiUseCase } from "@/core/use-cases/abi/update-abi.use-case";
import { PinataStorageAdapter } from "@/infrastructure/storage/ipfs/pinata.adapter";
import { CacheAdapter } from "@/infrastructure/cache/cache.adapter";
import {
  AbiDtoMapper,
  type AbiResponseDto,
  type CreatedAbiResponseDto,
} from "@/shared/dto/abi.dto";
import { AuthContextService } from "@/core/services/auth/auth-context.service";
import { ErrorCode } from "@/shared/types";

/**
 * GET /api/abis/[id] - Get ABI by ID
 */
export const GET = ApiWrapper.create<
  z.infer<typeof GetAbiSchema>,
  AbiResponseDto
>(
  async (input, context) => {
    // 1. Extract ABI ID
    const abiId = context.params?.id;
    if (!abiId) {
      throw new ApiError("ABI ID is required", ErrorCode.VALIDATION_ERROR, 400);
    }

    // 2. Find ABI qua repository (already checks cache)
    const abiRepository = getAbiRepository();
    const abi = await abiRepository.findById(abiId);

    if (!abi) {
      throw new ApiError(`ABI not found: ${abiId}`, ErrorCode.NOT_FOUND, 404);
    }

    // 3. Check if ABI is soft-deleted and user has permission
    if (abi.isDeleted) {
      const hasAccess = AuthContextService.canAccessUserResource(
        context,
        abi.userId
      );

      if (!hasAccess) {
        throw new ApiError(`ABI not found: ${abiId}`, ErrorCode.NOT_FOUND, 404);
      }
    }

    // 4. Convert sang response DTO
    return AbiDtoMapper.toResponseDto(abi);
  },
  {
    validation: {
      params: GetAbiSchema,
    },
    auth: {
      required: true, // Require API key
      allowApiKey: true,
      allowSession: true,
    },
  }
);

/**
 * PUT /api/abis/[id] - Update ABI
 */
export const PUT = ApiWrapper.create<
  { body: z.infer<typeof UpdateAbiSchema> },
  CreatedAbiResponseDto
>(
  async (input, context) => {
    // 1. Extract ABI ID
    const abiId = context.params?.id;
    if (!abiId) {
      throw new ApiError("ABI ID is required", ErrorCode.VALIDATION_ERROR, 400);
    }

    // 2. Extract user ID qua service
    const userId = AuthContextService.extractUserId(context);

    // 3. Check ownership before updating
    const abiRepository = getAbiRepository();
    const existingAbi = await abiRepository.findById(abiId);

    if (!existingAbi) {
      throw new ApiError(`ABI not found: ${abiId}`, ErrorCode.NOT_FOUND, 404);
    }

    // 4. Only owner or admin can update
    AuthContextService.requireUserAccess(context, existingAbi.userId, "ABIs");

    // 5. Create use case (UpdateAbiUseCase requires concrete types for storeAbiVersion method)
    const updateAbiUseCase = new UpdateAbiUseCase(
      abiRepository,
      new PinataStorageAdapter(),
      CacheAdapter.getInstance()
    );

    // 6. Execute update
    const result = await updateAbiUseCase.execute({
      abiId,
      userId,
      ...input.body,
    });

    // 7. Convert sang response DTO
    return AbiDtoMapper.toCreatedResponseDto(result.abi, {
      hash: result.ipfsHash,
      url: result.ipfsUrl,
    });
  },
  {
    validation: {
      body: UpdateAbiSchema,
    },
    auth: {
      required: true,
      allowApiKey: true,
      allowSession: true,
      requiredPermissions: ["abis:write", "write:abis"],
    },
  }
);

/**
 * DELETE /api/abis/[id] - Delete ABI (soft delete)
 */
export const DELETE = ApiWrapper.create<
  unknown,
  { success: boolean; message: string; deletedAt: string }
>(
  async (input, context) => {
    // 1. Extract ABI ID
    const abiId = context.params?.id;
    if (!abiId) {
      throw new ApiError("ABI ID is required", ErrorCode.VALIDATION_ERROR, 400);
    }

    // 2. Extract user ID qua service
    const userId = AuthContextService.extractUserId(context);

    // 3. Find and check ownership
    const abiRepository = getAbiRepository();
    const abi = await abiRepository.findById(abiId);

    if (!abi) {
      throw new ApiError(`ABI not found: ${abiId}`, ErrorCode.NOT_FOUND, 404);
    }

    // 4. Only owner or admin can delete
    AuthContextService.requireUserAccess(context, abi.userId, "ABIs");

    // 5. Soft delete
    const success = await abiRepository.softDelete(abiId);

    if (!success) {
      throw new ApiError("Failed to delete ABI", ErrorCode.INTERNAL_ERROR, 500);
    }

    // 6. Invalidate cache
    const cacheService = getCacheService();
    await cacheService.del(`abi:${abiId}`);
    await cacheService.del(`user:${userId}:abis`);

    // 7. Return success response
    return {
      success: true,
      message: "ABI deleted successfully",
      deletedAt: new Date().toISOString(),
    };
  },
  {
    auth: {
      required: true,
      allowApiKey: true,
      allowSession: true,
      requiredPermissions: ["abis:delete", "delete:abis"],
    },
  }
);
