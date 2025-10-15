import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { isAdmin } from "@/infrastructure/auth/auth-helpers";
import { ErrorCode } from "@/shared/types";
import {
  CreateApiKeySchema,
  ListApiKeysSchema,
} from "@/shared/lib/validation/admin.dto";
import z from "zod";

// Validation schemas
// DTOs moved to shared lib

// GET /api/admin/api-keys - List API keys (admin only)
export const GET = ApiWrapper.create(
  async (input: z.infer<typeof ListApiKeysSchema>, context) => {
    if (!isAdmin(context)) {
      throw new ApiError("Admin access required", ErrorCode.FORBIDDEN, 403);
    }

    const query: any = {
      limit: input.limit,
      offset: input.offset,
    };

    if (input.userId) {
      query.userId = input.userId;
    }

    const result = await auth.api.listApiKeys({
      query,
    });

    return result;
  },
  {
    validation: {
      query: ListApiKeysSchema,
    },
    auth: {
      required: true,
      allowSession: true,
      requiredPermissions: ["admin:manage"],
    },
  }
);

// POST /api/admin/api-keys - Create API key
export const POST = ApiWrapper.create(
  async (input: { body: z.infer<typeof CreateApiKeySchema> }, context) => {
    const currentUserId = context.user?.id || context.apiKey?.userId;

    if (!currentUserId) {
      throw new ApiError(
        "User ID not found in authentication context",
        ErrorCode.UNAUTHORIZED,
        401
      );
    }

    let targetUserId = input.body.userId || currentUserId;

    if (input.body.userId && input.body.userId !== currentUserId) {
      if (!isAdmin(context)) {
        throw new ApiError(
          "Only admins can create API keys for other users",
          ErrorCode.FORBIDDEN,
          403
        );
      }
    }

    let expiresAt: Date | undefined;
    if (input.body.expiresIn) {
      expiresAt = new Date(Date.now() + input.body.expiresIn * 1000);
    }

    const metadata = {
      ...input.body.metadata,
      scopes: input.body.scopes || [],
    };

    const result = await auth.api.createApiKey({
      body: {
        userId: targetUserId,
        name: input.body.name,
        // Better Auth expects expiresIn (seconds). Use provided input directly when present.
        expiresIn: input.body.expiresIn,
        permissions: input.body.permissions,
        metadata,
        rateLimitEnabled: input.body.rateLimit?.enabled ?? undefined,
        rateLimitMax: input.body.rateLimit?.max ?? undefined,
        rateLimitTimeWindow: input.body.rateLimit?.timeWindow ?? undefined,
      },
    });

    return {
      id: result.id,
      key: result.key,
      name: result.name,
      userId: result.userId,
      expiresAt: result.expiresAt,
      permissions: result.permissions,
      metadata,
      createdAt: result.createdAt,
    };
  },
  {
    validation: {
      body: CreateApiKeySchema,
    },
    auth: {
      required: true,
      allowSession: true,
      allowApiKey: false,
    },
  }
);
