/**
 * Contract Hooks
 * React Query hooks for contract management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/shared/constants/query-keys";
import { CACHE_TIME, PAGINATION } from "@/shared/constants/cache-config";
import {
  getContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract,
  getContractsByChain,
  searchContracts,
} from "@/app/admin/contracts/actions";

/**
 * Fetch paginated contracts
 */
export function useContracts(
  page: number = PAGINATION.DEFAULT_PAGE,
  limit: number = PAGINATION.DEFAULT_LIMIT,
  options?: {
    search?: string;
    chainId?: number;
    verified?: boolean;
  }
) {
  return useQuery({
    queryKey: queryKeys.contracts.list(page, limit),
    queryFn: () =>
      getContracts({
        page,
        limit,
        ...options,
      }),
    staleTime: CACHE_TIME.STALE.SHORT,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch single contract details
 */
export function useContractDetails(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.contracts.detail(id) : [],
    queryFn: () => (id ? getContractById({ id }) : null),
    enabled: !!id,
    staleTime: CACHE_TIME.STALE.MEDIUM,
    gcTime: CACHE_TIME.GC.MEDIUM,
  });
}

/**
 * Create contract mutation
 */
export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      address: string;
      chainId: number;
      abiId: string;
      metadata?: Record<string, unknown>;
    }) => {
      return createContract(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.lists() });
      toast.success("Contract created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Update contract mutation
 */
export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      verified?: boolean;
      metadata?: Record<string, unknown>;
    }) => {
      const { id, ...updateData } = input;
      return updateContract(id, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.contracts.detail(variables.id),
      });
      toast.success("Contract updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Delete contract mutation
 */
export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteContract({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.lists() });
      toast.success("Contract deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Search contracts hook
 */
export function useSearchContracts(query: string) {
  return useQuery({
    queryKey: queryKeys.contracts.lists(),
    queryFn: () => searchContracts(query),
    enabled: !!query,
    staleTime: CACHE_TIME.STALE.SHORT,
  });
}

/**
 * Get contracts by chain ID hook
 */
export function useContractsByChain(chainId: number | null) {
  return useQuery({
    queryKey: [...queryKeys.contracts.lists(), "chain", chainId],
    queryFn: () => (chainId ? getContractsByChain(chainId) : null),
    enabled: !!chainId,
    staleTime: CACHE_TIME.STALE.MEDIUM,
  });
}
