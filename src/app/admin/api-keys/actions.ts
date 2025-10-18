/**
 * Server Actions for API Key Management
 */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { headers } from "next/headers";
import { ApiKeyService } from "@/infrastructure/services/api-key.service";
import { db } from "@/infrastructure/database/drizzle/client";
import { apiKey as apiKeyTable } from "@/infrastructure/database/drizzle/schema/auth.schema";
import { eq } from "drizzle-orm";

// ============ Schemas ============

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  permissions: z.record(z.string(), z.array(z.string())),
  expiresIn: z.number().optional(),
});

const UpdateApiKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  enabled: z.boolean().optional(),
  permissions: z.record(z.string(), z.array(z.string())).optional(),
});

// ============ Actions ============

/**
 * Get all API keys for current user with pagination
 */
export async function getApiKeys(options?: { page?: number; limit?: number }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const offset = (page - 1) * limit;

  // Build context for service
  const context = {
    user: {
      id: session.user.id,
      role: session.user.role,
    },
  };

  // Use service to list keys
  const params = ApiKeyService.buildListParams(
    {
      limit,
      offset,
      // Admin sees all keys, users see only their keys
      ...(session.user.role !== "admin" && { userId: session.user.id }),
    },
    context
  );

  const result = await ApiKeyService.list(params);

  // Handle TryCatchResult - unwrap or throw
  if (!result.success) {
    throw result.error;
  }

  // Return paginated response
  const total = result.data.total || result.data.keys.length;
  const totalPages = Math.ceil(total / limit);

  return {
    data: result.data.keys,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Get API key by ID
 */
export async function getApiKeyById({ id }: { id: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const [apiKey] = await db
    .select()
    .from(apiKeyTable)
    .where(eq(apiKeyTable.id, id))
    .limit(1);

  if (!apiKey) {
    throw new Error("API key not found");
  }

  // Check ownership
  if (session.user.role !== "admin" && apiKey.userId !== session.user.id) {
    throw new Error("Forbidden");
  }

  return {
    id: apiKey.id,
    name: apiKey.name,
    userId: apiKey.userId,
    enabled: apiKey.enabled,
    start: apiKey.start,
    expiresAt: apiKey.expiresAt?.toISOString() || null,
    permissions: apiKey.permissions
      ? JSON.parse(apiKey.permissions as string)
      : {},
    metadata: apiKey.metadata,
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString(),
  };
}

/**
 * Create new API key
 */
export async function createApiKey(input: z.infer<typeof CreateApiKeySchema>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const validated = CreateApiKeySchema.parse(input);

  // Build context for service
  const context = {
    user: {
      id: session.user.id,
      role: session.user.role,
    },
  };

  // Use service to create key
  const result = await ApiKeyService.create(
    {
      userId: session.user.id,
      name: validated.name,
      permissions: validated.permissions as Record<string, string[]>,
      expiresIn: validated.expiresIn,
    },
    context,
    auth.api
  );

  // Handle TryCatchResult - unwrap or throw
  if (!result.success) {
    throw result.error;
  }

  revalidatePath("/admin/api-keys");

  return result.data;
}

/**
 * Update API key
 */
export async function updateApiKey(
  id: string,
  input: z.infer<typeof UpdateApiKeySchema>
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const validated = UpdateApiKeySchema.parse(input);

  // Check ownership
  const [existing] = await db
    .select()
    .from(apiKeyTable)
    .where(eq(apiKeyTable.id, id))
    .limit(1);

  if (!existing) {
    throw new Error("API key not found");
  }

  if (session.user.role !== "admin" && existing.userId !== session.user.id) {
    throw new Error("Forbidden");
  }

  // Build update data
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (validated.name !== undefined) {
    updateData.name = validated.name;
  }
  if (validated.enabled !== undefined) {
    updateData.enabled = validated.enabled;
  }
  if (validated.permissions !== undefined) {
    updateData.permissions = JSON.stringify(validated.permissions);
  }

  // Update
  await db.update(apiKeyTable).set(updateData).where(eq(apiKeyTable.id, id));

  revalidatePath("/admin/api-keys");
}

/**
 * Delete API key
 */
export async function deleteApiKey({ id }: { id: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Check ownership
  const [existing] = await db
    .select()
    .from(apiKeyTable)
    .where(eq(apiKeyTable.id, id))
    .limit(1);

  if (!existing) {
    throw new Error("API key not found");
  }

  if (session.user.role !== "admin" && existing.userId !== session.user.id) {
    throw new Error("Forbidden");
  }

  await db.delete(apiKeyTable).where(eq(apiKeyTable.id, id));

  revalidatePath("/admin/api-keys");
}

/**
 * Regenerate API key
 * Note: Better Auth doesn't have a built-in regenerate method
 * So we delete and create a new one
 */
export async function regenerateApiKey({ id }: { id: string }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Check ownership
  const [existing] = await db
    .select()
    .from(apiKeyTable)
    .where(eq(apiKeyTable.id, id))
    .limit(1);

  if (!existing) {
    throw new Error("API key not found");
  }

  if (session.user.role !== "admin" && existing.userId !== session.user.id) {
    throw new Error("Forbidden");
  }

  // Parse permissions
  const permissions = existing.permissions
    ? JSON.parse(existing.permissions as string)
    : {};

  // Delete old key
  await db.delete(apiKeyTable).where(eq(apiKeyTable.id, id));

  // Create new key with same settings
  const context = {
    user: {
      id: session.user.id,
      role: session.user.role,
    },
  };

  const result = await ApiKeyService.create(
    {
      userId: existing.userId,
      name: existing.name,
      permissions,
      expiresIn: existing.expiresAt
        ? Math.floor((existing.expiresAt.getTime() - Date.now()) / 1000)
        : undefined,
    },
    context,
    auth.api
  );

  // Handle TryCatchResult - unwrap or throw
  if (!result.success) {
    throw result.error;
  }

  revalidatePath("/admin/api-keys");

  return result.data;
}
