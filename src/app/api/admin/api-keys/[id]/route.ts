import { z } from "zod";
import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { canAccessResource } from "@/infrastructure/auth/auth-helpers";
import { db } from "@/infrastructure/database/drizzle/client";
import { apiKey as apiKeyTable } from "@/infrastructure/database/drizzle/schema/auth.schema";
import { eq } from "drizzle-orm";
import { ErrorCode } from "@/shared/types";
import { UpdateApiKeySchema } from "@/shared/lib/validation/admin.dto";

// Validation schemas
// DTO moved to shared lib

// GET /api/admin/api-keys/[id]
export const GET = ApiWrapper.create(
  async (input: unknown, context) => {
    const keyId = context.params?.id;

    if (!keyId) {
      throw new ApiError(
        "API key ID is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    const [apiKey] = await db
      .select()
      .from(apiKeyTable)
      .where(eq(apiKeyTable.id, keyId))
      .limit(1);

    if (!apiKey) {
      throw new ApiError(
        `API key not found: ${keyId}`,
        ErrorCode.NOT_FOUND,
        404
      );
    }

    if (!canAccessResource(context, apiKey.userId)) {
      throw new ApiError(
        "You can only view your own API keys",
        ErrorCode.FORBIDDEN,
        403
      );
    }

    return {
      id: apiKey.id,
      name: apiKey.name,
      userId: apiKey.userId,
      enabled: apiKey.enabled,
      expiresAt: apiKey.expiresAt?.toISOString(),
      permissions: apiKey.permissions
        ? JSON.parse(apiKey.permissions as string)
        : {},
      metadata: apiKey.metadata,
      rateLimitEnabled: apiKey.rateLimitEnabled,
      rateLimitMax: apiKey.rateLimitMax,
      rateLimitTimeWindow: apiKey.rateLimitTimeWindow,
      remaining: apiKey.remaining,
      lastRequest: apiKey.lastRequest?.toISOString(),
      createdAt: apiKey.createdAt.toISOString(),
      updatedAt: apiKey.updatedAt.toISOString(),
    };
  },
  {
    auth: {
      required: true,
      allowSession: true,
      allowApiKey: false,
    },
  }
);

// PATCH /api/admin/api-keys/[id]
export const PATCH = ApiWrapper.create(
  async (input: { body: z.infer<typeof UpdateApiKeySchema> }, context) => {
    const keyId = context.params?.id;

    if (!keyId) {
      throw new ApiError(
        "API key ID is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    const [apiKey] = await db
      .select()
      .from(apiKeyTable)
      .where(eq(apiKeyTable.id, keyId))
      .limit(1);

    if (!apiKey) {
      throw new ApiError(
        `API key not found: ${keyId}`,
        ErrorCode.NOT_FOUND,
        404
      );
    }

    if (!canAccessResource(context, apiKey.userId)) {
      throw new ApiError(
        "You can only update your own API keys",
        ErrorCode.FORBIDDEN,
        403
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (input.body.name !== undefined) {
      updateData.name = input.body.name;
    }
    if (input.body.enabled !== undefined) {
      updateData.enabled = input.body.enabled;
    }
    if (input.body.permissions !== undefined) {
      updateData.permissions = JSON.stringify(input.body.permissions);
    }
    if (input.body.rateLimit !== undefined) {
      updateData.rateLimitEnabled = input.body.rateLimit.enabled;
      if (input.body.rateLimit.max !== undefined) {
        updateData.rateLimitMax = input.body.rateLimit.max;
      }
      if (input.body.rateLimit.timeWindow !== undefined) {
        updateData.rateLimitTimeWindow = input.body.rateLimit.timeWindow;
      }
    }
    if (input.body.metadata !== undefined || input.body.scopes !== undefined) {
      const currentMetadata = (apiKey.metadata || {}) as any;
      updateData.metadata = {
        ...currentMetadata,
        ...input.body.metadata,
        ...(input.body.scopes && { scopes: input.body.scopes }),
      };
    }

    const [updated] = await db
      .update(apiKeyTable)
      .set(updateData)
      .where(eq(apiKeyTable.id, keyId))
      .returning();

    return {
      id: updated.id,
      name: updated.name,
      userId: updated.userId,
      enabled: updated.enabled,
      expiresAt: updated.expiresAt?.toISOString(),
      permissions: updated.permissions
        ? JSON.parse(updated.permissions as string)
        : {},
      metadata: updated.metadata,
      updatedAt: updated.updatedAt.toISOString(),
    };
  },
  {
    validation: {
      body: UpdateApiKeySchema,
    },
    auth: {
      required: true,
      allowSession: true,
      allowApiKey: false,
    },
  }
);

// DELETE /api/admin/api-keys/[id]
export const DELETE = ApiWrapper.create(
  async (input: unknown, context) => {
    const keyId = context.params?.id;

    if (!keyId) {
      throw new ApiError(
        "API key ID is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    const [apiKey] = await db
      .select()
      .from(apiKeyTable)
      .where(eq(apiKeyTable.id, keyId))
      .limit(1);

    if (!apiKey) {
      throw new ApiError(
        `API key not found: ${keyId}`,
        ErrorCode.NOT_FOUND,
        404
      );
    }

    if (!canAccessResource(context, apiKey.userId)) {
      throw new ApiError(
        "You can only revoke your own API keys",
        ErrorCode.FORBIDDEN,
        403
      );
    }

    await db.delete(apiKeyTable).where(eq(apiKeyTable.id, keyId));

    return {
      success: true,
      message: "API key revoked successfully",
      revokedAt: new Date().toISOString(),
    };
  },
  {
    auth: {
      required: true,
      allowSession: true,
      allowApiKey: false,
    },
  }
);
