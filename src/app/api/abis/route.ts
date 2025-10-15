import { z } from "zod";
import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import {
  ListAbisSchema,
  CreateAbiSchema,
} from "@/shared/lib/validation/abi.dto";
import { AbiRepositoryImpl } from "@/infrastructure/database/repositories/abi.repository.impl";
import { CreateAbiUseCase } from "@/core/use-cases/abi/create-abi.use-case";
import { PinataStorageAdapter } from "@/infrastructure/storage/ipfs/pinata.adapter";
import { CacheAdapter } from "@/infrastructure/cache/cache.adapter";
import { ErrorCode } from "@/shared/types";

// GET /api/abis - List ABIs
export const GET = ApiWrapper.create(
  async (input: z.infer<typeof ListAbisSchema>, context) => {
    const abiRepository = new AbiRepositoryImpl();

    // Build filters
    const filters: any = {};

    if (input.standard) {
      filters.standard = input.standard;
    }

    if (input.tags && typeof input.tags === "string") {
      filters.tags = input.tags.split(",");
    }

    // If userId is specified, only admins can query other users' ABIs
    if (input.userId) {
      const isAdmin = context.user?.role === "admin";
      const isOwnUser =
        context.user?.id === input.userId ||
        context.apiKey?.userId === input.userId;

      if (!isAdmin && !isOwnUser) {
        throw new ApiError(
          "You can only list your own ABIs unless you're an admin",
          ErrorCode.FORBIDDEN,
          403
        );
      }

      filters.userId = input.userId;
    }

    if (
      input.compatibleNetworks &&
      typeof input.compatibleNetworks === "string"
    ) {
      filters.compatibleNetworks = input.compatibleNetworks.split(",");
    }

    const listParams: any = {
      page: input.page as number,
      limit: input.limit as number,
      sortBy: input.sortBy as string | undefined,
      sortOrder: input.sortOrder as "asc" | "desc" | undefined,
      query: input.query as string | undefined,
      filters,
    };

    return await abiRepository.list(listParams);
  },
  {
    validation: {
      query: ListAbisSchema,
    },
    auth: {
      required: false, // Public endpoint for listing
      allowApiKey: true,
      allowSession: true,
    },
  }
);

// POST /api/abis - Create ABI
export const POST = ApiWrapper.create(
  async (input: { body: z.infer<typeof CreateAbiSchema> }, context) => {
    const userId = context.user?.id || context.apiKey?.userId;

    if (!userId) {
      throw new ApiError(
        "User ID not found in authentication context",
        ErrorCode.UNAUTHORIZED,
        401
      );
    }

    // Initialize dependencies
    const abiRepository = new AbiRepositoryImpl();
    const storageService = new PinataStorageAdapter();
    const cacheService = CacheAdapter.getInstance();

    // Create use case
    const createAbiUseCase = new CreateAbiUseCase(
      abiRepository,
      storageService,
      cacheService
    );

    // Execute
    const result = await createAbiUseCase.execute({
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
      createdAt: result.abi.createdAt?.toISOString(),
      updatedAt: result.abi.updatedAt?.toISOString(),
    };
  },
  {
    validation: {
      body: CreateAbiSchema,
    },
    auth: {
      required: true,
      allowApiKey: true,
      allowSession: true,
      requiredPermissions: ["abis:write", "write:abis"],
    },
  }
);
