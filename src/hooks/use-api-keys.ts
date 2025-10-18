/**
 * API Key Hooks
 * React Query hooks for API key management
 *
 * Architecture:
 * - Hooks handle React Query logic only
 * - Server actions handle data operations
 * - Cache keys from centralized factory
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/shared/constants/query-keys";
import { CACHE_TIME } from "@/shared/constants/cache-config";
import {
  getApiKeys,
  getApiKeyById,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  regenerateApiKey,
} from "@/app/admin/api-keys/actions";
import type { ApiKeyDto } from "@/infrastructure/services/api-key.service";

/**
 * View model for API Key display
 * Transforms DTO with parsed permissions for UI consumption
 */
export interface ApiKeyViewModel {
  id: string;
  name: string;
  enabled: boolean;
  permissions: Record<string, string[]>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  userId: string;
}

/**
 * Transform API Key DTO to View Model
 * Handles JSON parsing and type safety at the data layer
 */
function transformApiKeyDto(dto: ApiKeyDto): ApiKeyViewModel {
  let parsedPermissions: Record<string, string[]> = {};

  if (dto.permissions) {
    try {
      parsedPermissions = JSON.parse(dto.permissions);
    } catch (error) {
      console.error('Failed to parse API key permissions:', error);
      // Return empty permissions on parse error instead of crashing
    }
  }

  return {
    id: dto.id,
    name: dto.name,
    enabled: dto.enabled,
    permissions: parsedPermissions,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    expiresAt: dto.expiresAt,
    userId: dto.userId,
  };
}

/**
 * Fetch all API keys with transformed data and pagination
 */
export function useApiKeys(page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: [...queryKeys.apiKeys.all, page, limit],
    queryFn: async () => {
      const result = await getApiKeys({ page, limit });
      return {
        data: result.data.map(transformApiKeyDto),
        pagination: result.pagination,
      };
    },
    staleTime: CACHE_TIME.STALE.SHORT,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch single API key details
 */
export function useApiKeyDetails(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.apiKeys.detail(id) : [],
    queryFn: () => (id ? getApiKeyById({ id }) : null),
    enabled: !!id,
    staleTime: CACHE_TIME.STALE.MEDIUM,
    gcTime: CACHE_TIME.GC.MEDIUM,
  });
}

/**
 * Create API key mutation
 */
export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      permissions: Record<string, string[]>;
      expiresIn?: number;
    }) => {
      return createApiKey(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
      toast.success("API key created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Update API key mutation
 */
export function useUpdateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      enabled?: boolean;
      permissions?: Record<string, string[]>;
    }) => {
      const { id, ...updateData } = input;
      return updateApiKey(id, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.apiKeys.detail(variables.id),
      });
      toast.success("API key updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Delete API key mutation
 */
export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteApiKey({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
      toast.success("API key deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Regenerate API key mutation
 */
export function useRegenerateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => regenerateApiKey({ id }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.apiKeys.detail(id),
      });
      toast.success("API key regenerated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
