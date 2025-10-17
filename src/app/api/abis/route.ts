import { z } from "zod";
import { ApiWrapper } from "@/shared/lib/api/api-handler";
import {
  ListAbisSchema,
  CreateAbiSchema,
} from "@/shared/lib/validation/abi.dto";
import { CreateAbiUseCase } from "@/core/use-cases/abi/create-abi.use-case";
import {
  getAbiRepository,
  getStorageService,
  getCacheService,
} from "@/infrastructure/di/container";
import {
  AbiDtoMapper,
  type PaginatedAbiResponseDto,
  type CreatedAbiResponseDto,
} from "@/shared/dto/abi.dto";
import { AbiQueryService } from "@/core/services/abi/abi-query.service";
import { AuthContextService } from "@/core/services/auth/auth-context.service";

/**
 * GET /api/abis - List ABIs
 *
 */
export const GET = ApiWrapper.create<
  z.infer<typeof ListAbisSchema>,
  PaginatedAbiResponseDto
>(
  async (input, context) => {
    // Extract query from nested input structure
    const queryParams = (input as any).query || input;

    // 1. Build list params qua service
    const listParams = AbiQueryService.buildListParams(queryParams, context);

    // 2. Fetch data qua repository
    const abiRepository = getAbiRepository();
    const result = await abiRepository.list(listParams);

    // 3. Convert sang DTOs
    return AbiDtoMapper.toPaginatedResponseDto(result);
  },
  {
    validation: {
      query: ListAbisSchema,
    },
    auth: {
      required: true, // Require API key
      allowApiKey: true,
      allowSession: true,
    },
  }
);

/**
 * POST /api/abis - Create ABI
 */
export const POST = ApiWrapper.create<
  { body: z.infer<typeof CreateAbiSchema> },
  CreatedAbiResponseDto
>(
  async (input, context) => {
    // 1. Extract user ID qua service
    const userId = AuthContextService.extractUserId(context);

    // 2. Create use case với DI
    const createAbiUseCase = new CreateAbiUseCase(
      getAbiRepository(),
      getStorageService(),
      getCacheService()
    );

    // 3. Execute use case
    const result = await createAbiUseCase.execute({
      userId,
      ...input.body,
    });

    // 4. Convert sang response DTO
    return AbiDtoMapper.toCreatedResponseDto(result.abi, {
      hash: result.ipfsHash,
      url: result.ipfsUrl,
    });
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
