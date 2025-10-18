/**
 * Server Actions for Contract Management
 */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContractRepository } from "@/infrastructure/di/container";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { headers } from "next/headers";

// ============ Schemas ============

const CreateContractSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number().int().positive(), // User inputs chainId, we convert to networkId
  abiId: z.string().min(1), // Required - contract must have ABI
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const UpdateContractSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  isVerified: z.boolean().optional(),
  abiId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============ Actions ============

/**
 * Get all contracts
 */
export async function getContracts(options?: {
  page?: number;
  limit?: number;
  search?: string;
  chainId?: number;
  verified?: boolean;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const contractRepository = getContractRepository();

  const params = {
    page: options?.page || 1,
    limit: options?.limit || 100,
    filters: {
      ...(options?.chainId && { networkId: options.chainId.toString() }),
      ...(options?.verified !== undefined && { isVerified: options.verified }),
    },
  };

  if (options?.search) {
    return contractRepository.search(options.search, params);
  }

  return contractRepository.list(params);
}

/**
 * Get contract by ID
 */
export async function getContractById({ id }: { id: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const contractRepository = getContractRepository();
  const contract = await contractRepository.findById(id);

  if (!contract) {
    throw new Error("Contract not found");
  }

  return contract;
}

/**
 * Create new contract
 */
export async function createContract(
  input: z.infer<typeof CreateContractSchema>
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const validated = CreateContractSchema.parse(input);

  const contractRepository = getContractRepository();

  // Check if contract already exists
  const existing = await contractRepository.findByAddress(
    validated.address,
    validated.chainId.toString()
  );

  if (existing) {
    throw new Error("Contract already exists at this address");
  }

  const contract = await contractRepository.create({
    id: crypto.randomUUID(),
    name: validated.name,
    address: validated.address,
    networkId: validated.chainId.toString(), // Convert chainId to networkId string
    abiId: validated.abiId,
    isVerified: false,
    metadata: validated.metadata as {
      symbol?: string;
      totalSupply?: string;
      decimals?: number;
      isProxy?: boolean;
      implementation?: string;
    } | undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  revalidatePath("/admin/contracts");

  return contract;
}

/**
 * Update contract
 */
export async function updateContract(
  id: string,
  input: z.infer<typeof UpdateContractSchema>
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const validated = UpdateContractSchema.parse(input);

  const contractRepository = getContractRepository();

  const existing = await contractRepository.findById(id);
  if (!existing) {
    throw new Error("Contract not found");
  }

  await contractRepository.update(id, validated);

  revalidatePath("/admin/contracts");
}

/**
 * Delete contract
 */
export async function deleteContract({ id }: { id: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const contractRepository = getContractRepository();

  const existing = await contractRepository.findById(id);
  if (!existing) {
    throw new Error("Contract not found");
  }

  await contractRepository.delete(id);

  revalidatePath("/admin/contracts");
}

/**
 * Get contracts by chain ID
 */
export async function getContractsByChain(chainId: number) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const contractRepository = getContractRepository();

  return contractRepository.findByNetworkId(chainId.toString(), {
    page: 1,
    limit: 100,
  });
}

/**
 * Search contracts
 */
export async function searchContracts(query: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const contractRepository = getContractRepository();

  return contractRepository.search(query, {
    page: 1,
    limit: 100,
  });
}
