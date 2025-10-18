/**
 * Server Actions for Network Management
 */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getNetworkRepository } from "@/infrastructure/di/container";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { headers } from "next/headers";

// ============ Schemas ============

const CreateNetworkSchema = z.object({
  chainId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1),
  type: z.string().min(1),
  isTestnet: z.boolean().default(false),
  rpcUrls: z.array(z.string().url()),
  explorerUrls: z.array(z.string().url()).optional(),
  nativeCurrency: z.object({
    name: z.string(),
    symbol: z.string().min(1).max(10),
    decimals: z.number().int().min(0).max(18),
  }),
  icon: z.string().optional(),
});

const UpdateNetworkSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  isTestnet: z.boolean().optional(),
  rpcUrls: z.array(z.string().url()).optional(),
  explorerUrls: z.array(z.string().url()).optional(),
  nativeCurrency: z.object({
    name: z.string(),
    symbol: z.string().min(1).max(10),
    decimals: z.number().int().min(0).max(18),
  }).optional(),
  isActive: z.boolean().optional(),
  icon: z.string().optional(),
});

// ============ Actions ============

/**
 * Get all networks
 */
export async function getNetworks(options?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const networkRepository = getNetworkRepository();

  const params = {
    page: options?.page || 1,
    limit: options?.limit || 100,
    filters: {
      ...(options?.status && { isActive: options.status === "active" }),
    },
  };

  if (options?.search) {
    return networkRepository.search(options.search, params);
  }

  return networkRepository.list(params);
}

/**
 * Get network by ID
 */
export async function getNetworkById({ id }: { id: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const networkRepository = getNetworkRepository();
  const network = await networkRepository.findById(id);

  if (!network) {
    throw new Error("Network not found");
  }

  return network;
}

/**
 * Create new network
 */
export async function createNetwork(
  input: z.infer<typeof CreateNetworkSchema>
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const validated = CreateNetworkSchema.parse(input);

  const networkRepository = getNetworkRepository();

  // Check if network already exists
  const existing = await networkRepository.findByChainId(validated.chainId);

  if (existing) {
    throw new Error("Network with this chain ID already exists");
  }

  const network = await networkRepository.create({
    id: crypto.randomUUID(),
    chainId: validated.chainId,
    name: validated.name,
    slug: validated.slug,
    type: validated.type,
    isTestnet: validated.isTestnet,
    rpcUrls: validated.rpcUrls,
    explorerUrls: validated.explorerUrls,
    nativeCurrency: validated.nativeCurrency,
    isActive: true,
    icon: validated.icon,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  revalidatePath("/admin/networks");

  return network;
}

/**
 * Update network
 */
export async function updateNetwork(
  id: string,
  input: z.infer<typeof UpdateNetworkSchema>
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const validated = UpdateNetworkSchema.parse(input);

  const networkRepository = getNetworkRepository();

  const existing = await networkRepository.findById(id);
  if (!existing) {
    throw new Error("Network not found");
  }

  await networkRepository.update(id, validated);

  revalidatePath("/admin/networks");
}

/**
 * Delete network
 */
export async function deleteNetwork({ id }: { id: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const networkRepository = getNetworkRepository();

  const existing = await networkRepository.findById(id);
  if (!existing) {
    throw new Error("Network not found");
  }

  await networkRepository.delete(id);

  revalidatePath("/admin/networks");
}

/**
 * Search networks
 */
export async function searchNetworks(query: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const networkRepository = getNetworkRepository();

  return networkRepository.search(query, {
    page: 1,
    limit: 100,
  });
}

/**
 * Get active networks
 */
export async function getActiveNetworks() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const networkRepository = getNetworkRepository();

  return networkRepository.findActive({
    page: 1,
    limit: 100,
  });
}
