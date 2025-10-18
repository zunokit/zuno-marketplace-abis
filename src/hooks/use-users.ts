/**
 * User Hooks
 * React Query hooks for user management via Better Auth admin API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/shared/constants/query-keys";
import { CACHE_TIME } from "@/shared/constants/cache-config";
import {
  getUsers,
  getUserById,
  createUser,
  updateUserRole,
  banUser,
  unbanUser,
  revokeUserSessions,
} from "@/app/admin/users/actions";

/**
 * Fetch all users
 */
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => getUsers(),
    staleTime: CACHE_TIME.STALE.SHORT,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch single user details
 */
export function useUserDetails(id: string | null) {
  return useQuery({
    queryKey: id ? queryKeys.users.detail(id) : [],
    queryFn: () => (id ? getUserById({ id }) : null),
    enabled: !!id,
    staleTime: CACHE_TIME.STALE.MEDIUM,
    gcTime: CACHE_TIME.GC.MEDIUM,
  });
}

/**
 * Create user mutation
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      email: string;
      name: string;
      password: string;
      role?: "user" | "admin";
    }) => {
      return createUser({
        ...input,
        role: input.role || "user",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success("User created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Update user role mutation
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { userId: string; role: "user" | "admin" }) => {
      return updateUserRole(input.userId, { role: input.role });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(variables.userId),
      });
      toast.success("User role updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Ban user mutation
 */
export function useBanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      userId: string;
      reason: string;
      expiresInDays?: number;
    }) => {
      return banUser(input.userId, {
        reason: input.reason,
        expiresInDays: input.expiresInDays,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(variables.userId),
      });
      toast.success("User banned successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Unban user mutation
 */
export function useUnbanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => unbanUser({ userId }),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(userId),
      });
      toast.success("User unbanned successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Revoke user sessions mutation
 */
export function useRevokeUserSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => revokeUserSessions({ userId }),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(userId),
      });
      toast.success("User sessions revoked successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
