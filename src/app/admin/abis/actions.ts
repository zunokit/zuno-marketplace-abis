/**
 * Server Actions for ABI Management
 *
 * Server actions provide type-safe server-side operations
 * that can be called directly from client components.
 *
 * Benefits:
 * - Type safety end-to-end
 * - Automatic serialization/deserialization
 * - Built-in error handling
 * - No need for API routes for simple operations
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getAbiRepository,
  getStorageService,
  getCacheService,
} from "@/infrastructure/di/container";
import { CreateAbiUseCase } from "@/core/use-cases/abi/create-abi.use-case";
import { UpdateAbiUseCase } from "@/core/use-cases/abi/update-abi.use-case";
import { AuthContextService } from "@/core/services/auth/auth-context.service";
import {
  CreateAbiSchema,
  UpdateAbiSchema,
  type CreateAbiDto,
  type UpdateAbiDto,
} from "@/shared/lib/validation/abi.dto";
import {
  AbiDtoMapper,
  type AbiResponseDto,
  type PaginatedAbiResponseDto,
  type AbiListItemDto,
} from "@/shared/dto/abi.dto";
import { PAGINATION } from "@/shared/constants/cache-config";

// ============ Input Validation Schemas ============

const GetAbisSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  standard: z.string().optional(),
  tags: z.string().optional(),
  sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const GetAbiByIdSchema = z.object({
  id: z.string().min(1),
});

const DeleteAbiSchema = z.object({
  id: z.string().min(1),
});

// ============ Server Actions ============

/**
 * Get paginated list of ABIs
 */
export async function getAbis(
  input: z.infer<typeof GetAbisSchema>
): Promise<PaginatedAbiResponseDto> {
  try {
    // Validate input
    const validatedInput = GetAbisSchema.parse(input);

    // Get repository
    const abiRepository = getAbiRepository();

    // Build query parameters
    const listParams = {
      page: validatedInput.page,
      limit: validatedInput.limit,
      search: validatedInput.search,
      standard: validatedInput.standard,
      tags: validatedInput.tags ? validatedInput.tags.split(",") : undefined,
      sortBy: validatedInput.sortBy,
      sortOrder: validatedInput.sortOrder,
    };

    // Fetch data
    const result = await abiRepository.list(listParams);

    // Convert to DTO
    return AbiDtoMapper.toPaginatedResponseDto(result);
  } catch (error) {
    console.error("Error fetching ABIs:", error);
    throw new Error("Failed to fetch ABIs");
  }
}

/**
 * Get single ABI by ID
 */
export async function getAbiById(
  input: z.infer<typeof GetAbiByIdSchema>
): Promise<AbiResponseDto | null> {
  try {
    // Validate input
    const validatedInput = GetAbiByIdSchema.parse(input);

    // Get repository
    const abiRepository = getAbiRepository();

    // Fetch ABI
    const abi = await abiRepository.findById(validatedInput.id);

    if (!abi) {
      return null;
    }

    // Convert to DTO
    return AbiDtoMapper.toResponseDto(abi);
  } catch (error) {
    console.error("Error fetching ABI:", error);
    throw new Error("Failed to fetch ABI");
  }
}

/**
 * Create new ABI
 */
export async function createAbi(input: CreateAbiDto): Promise<AbiResponseDto> {
  try {
    // Validate input
    const validatedInput = CreateAbiSchema.parse(input);

    // Get services
    const abiRepository = getAbiRepository();
    const storageService = getStorageService();
    const cacheService = getCacheService();

    // Create use case
    const createAbiUseCase = new CreateAbiUseCase(
      abiRepository,
      storageService as any, // TODO: Fix type compatibility
      cacheService as any
    );

    // Execute use case
    const result = await createAbiUseCase.execute({
      userId: "admin", // TODO: Get from auth context
      ...validatedInput,
    });

    // Revalidate cache
    revalidatePath("/admin/abis");

    // Convert to DTO
    return AbiDtoMapper.toResponseDto(result.abi);
  } catch (error) {
    console.error("Error creating ABI:", error);
    throw new Error("Failed to create ABI");
  }
}

/**
 * Update existing ABI
 */
export async function updateAbi(
  id: string,
  input: UpdateAbiDto
): Promise<AbiResponseDto> {
  try {
    // Validate input
    const validatedInput = UpdateAbiSchema.parse(input);

    // Get services
    const abiRepository = getAbiRepository();
    const storageService = getStorageService();
    const cacheService = getCacheService();

    // Create use case
    const updateAbiUseCase = new UpdateAbiUseCase(
      abiRepository,
      storageService as any, // TODO: Fix type compatibility
      cacheService as any
    );

    // Execute use case
    const result = await updateAbiUseCase.execute({
      abiId: id,
      userId: "admin", // TODO: Get from auth context
      ...validatedInput,
    });

    // Revalidate cache
    revalidatePath("/admin/abis");
    revalidatePath(`/admin/abis/${id}`);

    // Convert to DTO
    return AbiDtoMapper.toResponseDto(result.abi);
  } catch (error) {
    console.error("Error updating ABI:", error);
    throw new Error("Failed to update ABI");
  }
}

/**
 * Delete ABI
 */
export async function deleteAbi(
  input: z.infer<typeof DeleteAbiSchema>
): Promise<{ success: boolean }> {
  try {
    // Validate input
    const validatedInput = DeleteAbiSchema.parse(input);

    // Get repository
    const abiRepository = getAbiRepository();

    // Delete ABI
    await abiRepository.delete(validatedInput.id);

    // Revalidate cache
    revalidatePath("/admin/abis");

    return { success: true };
  } catch (error) {
    console.error("Error deleting ABI:", error);
    throw new Error("Failed to delete ABI");
  }
}

// ============ Helper Functions ============

/**
 * Get ABIs with default pagination
 */
export async function getAbisDefault() {
  return getAbis({
    page: PAGINATION.DEFAULT_PAGE,
    limit: PAGINATION.DEFAULT_LIMIT,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
}

/**
 * Search ABIs by query
 */
export async function searchAbis(query: string) {
  return getAbis({
    page: 1,
    limit: PAGINATION.DEFAULT_LIMIT,
    search: query,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
}

/**
 * Get ABIs by standard
 */
export async function getAbisByStandard(standard: string) {
  return getAbis({
    page: 1,
    limit: PAGINATION.DEFAULT_LIMIT,
    standard,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
}

/**
 * Get ABIs by tags
 */
export async function getAbisByTags(tags: string[]) {
  return getAbis({
    page: 1,
    limit: PAGINATION.DEFAULT_LIMIT,
    tags: tags.join(","),
    sortBy: "createdAt",
    sortOrder: "desc",
  });
}
