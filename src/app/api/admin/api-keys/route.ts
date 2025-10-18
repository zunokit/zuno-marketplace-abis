import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { isAdmin } from "@/infrastructure/auth/auth-helpers";
import { ErrorCode } from "@/shared/types";
import {
  CreateApiKeySchema,
  ListApiKeysSchema,
} from "@/shared/lib/validation/admin.dto";
import z from "zod";
import { ApiKeyService } from "@/infrastructure/services/api-key.service";
import { unwrapOrThrow } from "@/shared/lib/utils/try-catch-wrapper";

// GET /api/admin/api-keys - List API keys (admin only)
export const GET = ApiWrapper.create<
  { query: z.infer<typeof ListApiKeysSchema> },
  any
>(
  async (input, context) => {
    // Admin authorization check
    if (!isAdmin(context)) {
      throw new ApiError("Admin access required", ErrorCode.FORBIDDEN, 403);
    }

    // Build params with validation
    const params = ApiKeyService.buildListParams(input.query, context);

    // Execute query through service layer
    const result = await ApiKeyService.list(params);
    return unwrapOrThrow(result);
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
    // Delegate all logic to service layer
    const result = await ApiKeyService.create(input.body, context, auth.api);
    return unwrapOrThrow(result);
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
