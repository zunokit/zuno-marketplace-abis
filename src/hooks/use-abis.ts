/**
 * ABI Data Hooks
 * React Query hooks for ABI management
 *
 * Architecture:
 * - Hooks handle React Query logic only
 * - Server actions handle data operations
 * - Types imported from shared types
 * - Cache keys from centralized factory
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/shared/constants/query-keys";
import { CACHE_TIME, PAGINATION } from "@/shared/constants/cache-config";
import {
  getAbis,
  getAbiById,
  createAbi,
  updateAbi,
  deleteAbi,
  getAbisDefault,
  searchAbis,
  getAbisByStandard,
  getAbisByTags,
} from "@/app/admin/abis/actions";
import type {
  AbiResponseDto,
  PaginatedAbiResponseDto,
} from "@/shared/dto/abi.dto";
import type {
  CreateAbiDto,
  UpdateAbiDto,
} from "@/shared/lib/validation/abi.dto";

/**
 * Fetch paginated ABIs (lightweight - NO ABI JSON)
 * Use for: Admin dashboard, browse pages
 */
export function useAbis(
  page: number = PAGINATION.DEFAULT_PAGE,
  limit: number = PAGINATION.DEFAULT_LIMIT,
  options?: {
    search?: string;
    standard?: string;
    tags?: string;
    sortBy?: "name" | "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
  }
) {
  return useQuery({
    queryKey: queryKeys.abis.list(page, limit),
    queryFn: () =>
      getAbis({
        page,
        limit,
        sortBy: options?.sortBy || "createdAt",
        sortOrder: options?.sortOrder || "desc",
        search: options?.search,
        standard: options?.standard,
        tags: options?.tags,
      }),
    staleTime: CACHE_TIME.STALE.SHORT,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch paginated ABIs WITH full ABI JSON
 * Use for: Web3 DApp integration, contract interaction
 *
 * Example use case:
 * ```typescript
 * const { data } = useAbisWithAbi(1, 10, { standard: 'ERC20' });
 * const contract = new ethers.Contract(address, data[0].abi, signer);
 * ```
 */
export function useAbisWithAbi(
  page: number = PAGINATION.DEFAULT_PAGE,
  limit: number = PAGINATION.DEFAULT_LIMIT,
  options?: {
    search?: string;
    standard?: string;
    tags?: string;
    sortBy?: "name" | "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
  }
) {
  return useQuery({
    queryKey: [...queryKeys.abis.list(page, limit), "full"],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: options?.sortBy || "createdAt",
        sortOrder: options?.sortOrder || "desc",
        ...(options?.search && { search: options.search }),
        ...(options?.standard && { standard: options.standard }),
        ...(options?.tags && { tags: options.tags }),
      });

      const res = await fetch(`/api/abis/full?${params}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || "Failed to fetch ABIs");
      }

      const response = await res.json();
      return response.data || { data: [], pagination: {} };
    },
    staleTime: CACHE_TIME.STALE.MEDIUM, // Cache longer since ABI rarely changes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch single ABI details
 */
export function useAbiDetails(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.abis.detail(id) : [],
    queryFn: () => (id ? getAbiById({ id }) : null),
    enabled: !!id,
    staleTime: CACHE_TIME.STALE.MEDIUM,
    gcTime: CACHE_TIME.GC.MEDIUM,
  });
}

/**
 * Create ABI mutation
 */
export function useCreateAbi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAbiDto) => {
      return createAbi(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.abis.lists() });
      toast.success("ABI created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Update ABI mutation
 */
export function useUpdateAbi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: {
        id: string;
      } & UpdateAbiDto
    ) => {
      const { id, ...updateData } = input;
      return updateAbi(id, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.abis.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.abis.detail(variables.id),
      });
      toast.success("ABI updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Delete ABI mutation
 */
export function useDeleteAbi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAbi({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.abis.lists() });
      toast.success("ABI deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============ Additional Hooks ============

/**
 * Search ABIs hook
 */
export function useSearchAbis(query: string) {
  return useQuery({
    queryKey: queryKeys.abis.lists(),
    queryFn: () => searchAbis(query),
    enabled: !!query,
    staleTime: CACHE_TIME.STALE.SHORT,
  });
}

/**
 * Get ABIs by standard hook
 */
export function useAbisByStandard(standard: string) {
  return useQuery({
    queryKey: [...queryKeys.abis.lists(), "standard", standard],
    queryFn: () => getAbisByStandard(standard),
    enabled: !!standard,
    staleTime: CACHE_TIME.STALE.MEDIUM,
  });
}

/**
 * Get ABIs by tags hook
 */
export function useAbisByTags(tags: string[]) {
  return useQuery({
    queryKey: [...queryKeys.abis.lists(), "tags", tags],
    queryFn: () => getAbisByTags(tags),
    enabled: tags.length > 0,
    staleTime: CACHE_TIME.STALE.MEDIUM,
  });
}

/**
 * Get default ABIs hook (for initial load)
 */
export function useAbisDefault() {
  return useQuery({
    queryKey: queryKeys.abis.list(
      PAGINATION.DEFAULT_PAGE,
      PAGINATION.DEFAULT_LIMIT
    ),
    queryFn: getAbisDefault,
    staleTime: CACHE_TIME.STALE.SHORT,
  });
}
