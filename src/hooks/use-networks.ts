/**
 * Network Hooks
 * React Query hooks for network management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/shared/constants/query-keys";
import { CACHE_TIME, PAGINATION } from "@/shared/constants/cache-config";
import {
  getNetworks,
  getNetworkById,
  createNetwork,
  updateNetwork,
  deleteNetwork,
  searchNetworks,
  getActiveNetworks,
} from "@/app/admin/networks/actions";

/**
 * Fetch paginated networks
 */
export function useNetworks(
  page: number = PAGINATION.DEFAULT_PAGE,
  limit: number = PAGINATION.DEFAULT_LIMIT,
  options?: {
    search?: string;
    status?: string;
  }
) {
  return useQuery({
    queryKey: queryKeys.networks.list(page, limit),
    queryFn: () =>
      getNetworks({
        page,
        limit,
        ...options,
      }),
    staleTime: CACHE_TIME.STALE.SHORT,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch single network details
 */
export function useNetworkDetails(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.networks.detail(id) : [],
    queryFn: () => (id ? getNetworkById({ id }) : null),
    enabled: !!id,
    staleTime: CACHE_TIME.STALE.MEDIUM,
    gcTime: CACHE_TIME.GC.MEDIUM,
  });
}

/**
 * Create network mutation
 */
export function useCreateNetwork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      chainId: number;
      name: string;
      slug: string;
      type: string;
      isTestnet: boolean;
      rpcUrls: string[];
      nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
      };
      explorerUrls?: string[];
      icon?: string;
    }) => {
      return createNetwork(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.networks.lists() });
      toast.success("Network created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Update network mutation
 */
export function useUpdateNetwork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      symbol?: string;
      rpcUrl?: string;
      explorerUrl?: string;
      status?: "active" | "inactive";
      metadata?: Record<string, unknown>;
    }) => {
      const { id, ...updateData } = input;
      return updateNetwork(id, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.networks.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.networks.detail(variables.id),
      });
      toast.success("Network updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Delete network mutation
 */
export function useDeleteNetwork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteNetwork({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.networks.lists() });
      toast.success("Network deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Search networks hook
 */
export function useSearchNetworks(query: string) {
  return useQuery({
    queryKey: queryKeys.networks.lists(),
    queryFn: () => searchNetworks(query),
    enabled: !!query,
    staleTime: CACHE_TIME.STALE.SHORT,
  });
}

/**
 * Get active networks hook
 */
export function useActiveNetworks() {
  return useQuery({
    queryKey: [...queryKeys.networks.lists(), "active"],
    queryFn: () => getActiveNetworks(),
    staleTime: CACHE_TIME.STALE.MEDIUM,
  });
}
