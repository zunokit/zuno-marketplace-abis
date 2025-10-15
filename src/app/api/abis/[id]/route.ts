import { z } from "zod";
import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { GetAbiSchema, UpdateAbiSchema } from "@/shared/lib/validation/abi.dto";
import { AbiRepositoryImpl } from "@/infrastructure/database/repositories/abi.repository.impl";
import { UpdateAbiUseCase } from "@/core/use-cases/abi/update-abi.use-case";
import { PinataStorageAdapter } from "@/infrastructure/storage/ipfs/pinata.adapter";
import { CacheAdapter } from "@/infrastructure/cache/cache.adapter";
import { canAccessResource } from "@/infrastructure/auth/auth-helpers";
import { ErrorCode } from "@/shared/types";

// GET /api/abis/[id] - Get ABI by ID
export const GET = ApiWrapper.create(
  async (input: z.infer<typeof GetAbiSchema>, context) => {
    const abiId = context.params?.id;

    if (!abiId) {
      throw new ApiError("ABI ID is required", ErrorCode.VALIDATION_ERROR, 400);
    }

    const abiRepository = new AbiRepositoryImpl();

    // Find ABI (repository already checks cache first)
    const abi = await abiRepository.findById(abiId);

    if (!abi) {
      throw new ApiError(`ABI not found: ${abiId}`, ErrorCode.NOT_FOUND, 404);
    }

    // Check if ABI is soft-deleted and user has permission
    if (abi.isDeleted) {
      const hasAccess = canAccessResource(context, abi.userId);

      if (!hasAccess) {
        throw new ApiError(`ABI not found: ${abiId}`, ErrorCode.NOT_FOUND, 404);
      }
    }

    return {
      id: abi.id,
      userId: abi.userId,
      name: abi.name,
      description: abi.description,
      contractName: abi.contractName,
      abi: abi.abi,
      abiHash: abi.abiHash,
      ipfsHash: abi.ipfsHash,
      ipfsUrl: abi.ipfsUrl,
      version: abi.version,
      tags: abi.tags,
      standard: abi.standard,
      metadata: abi.metadata,
      isDeleted: abi.isDeleted,
      createdAt: abi.createdAt?.toISOString(),
      updatedAt: abi.updatedAt?.toISOString(),
    };
  },
  {
    validation: {
      params: GetAbiSchema,
    },
    auth: {
      required: false, // Public endpoint for non-deleted ABIs
      allowApiKey: true,
      allowSession: true,
    },
  }
);

// PUT /api/abis/[id] - Update ABI
export const PUT = ApiWrapper.create(
  async (input: { body: z.infer<typeof UpdateAbiSchema> }, context) => {
    const abiId = context.params?.id;

    if (!abiId) {
      throw new ApiError("ABI ID is required", ErrorCode.VALIDATION_ERROR, 400);
    }

    const userId = context.user?.id || context.apiKey?.userId;

    if (!userId) {
      throw new ApiError(
        "User ID not found in authentication context",
        ErrorCode.UNAUTHORIZED,
        401
      );
    }

    // Check ownership before updating
    const abiRepository = new AbiRepositoryImpl();
    const existingAbi = await abiRepository.findById(abiId);

    if (!existingAbi) {
      throw new ApiError(`ABI not found: ${abiId}`, ErrorCode.NOT_FOUND, 404);
    }

    // Only owner or admin can update
    if (!canAccessResource(context, existingAbi.userId)) {
      throw new ApiError(
        "You can only update your own ABIs",
        ErrorCode.FORBIDDEN,
        403
      );
    }

    // Initialize use case
    const storageService = new PinataStorageAdapter();
    const cacheService = CacheAdapter.getInstance();
    const updateAbiUseCase = new UpdateAbiUseCase(
      abiRepository,
      storageService,
      cacheService
    );

    // Execute update
    const result = await updateAbiUseCase.execute({
      abiId,
      userId,
      ...input.body,
    });

    return {
      id: result.abi.id,
      name: result.abi.name,
      description: result.abi.description,
      contractName: result.abi.contractName,
      abi: result.abi.abi,
      abiHash: result.abi.abiHash,
      version: result.abi.version,
      tags: result.abi.tags,
      standard: result.abi.standard,
      metadata: result.abi.metadata,
      ipfsHash: result.ipfsHash,
      ipfsUrl: result.ipfsUrl,
      newVersion: result.newVersion
        ? {
            id: result.newVersion.id,
            version: result.newVersion.version,
            versionNumber: result.newVersion.versionNumber,
            changeLog: result.newVersion.changeLog,
          }
        : undefined,
      updatedAt: result.abi.updatedAt?.toISOString(),
    };
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

// DELETE /api/abis/[id] - Delete ABI (soft delete)
export const DELETE = ApiWrapper.create(
  async (input: unknown, context) => {
    const abiId = context.params?.id;

    if (!abiId) {
      throw new ApiError("ABI ID is required", ErrorCode.VALIDATION_ERROR, 400);
    }

    const userId = context.user?.id || context.apiKey?.userId;

    if (!userId) {
      throw new ApiError(
        "User ID not found in authentication context",
        ErrorCode.UNAUTHORIZED,
        401
      );
    }

    // Find and check ownership
    const abiRepository = new AbiRepositoryImpl();
    const abi = await abiRepository.findById(abiId);

    if (!abi) {
      throw new ApiError(`ABI not found: ${abiId}`, ErrorCode.NOT_FOUND, 404);
    }

    // Only owner or admin can delete
    if (!canAccessResource(context, abi.userId)) {
      throw new ApiError(
        "You can only delete your own ABIs",
        ErrorCode.FORBIDDEN,
        403
      );
    }

    // Soft delete
    const success = await abiRepository.softDelete(abiId);

    if (!success) {
      throw new ApiError("Failed to delete ABI", ErrorCode.INTERNAL_ERROR, 500);
    }

    // Invalidate cache
    const cacheService = CacheAdapter.getInstance();
    await cacheService.del(`abi:${abiId}`);
    await cacheService.del(`user:${userId}:abis`);

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
