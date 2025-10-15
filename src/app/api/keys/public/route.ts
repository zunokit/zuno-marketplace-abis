import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { env } from "@/shared/config/env";
import { ErrorCode } from "@/shared/types";

// POST /api/keys/public - issue public API key bound to a configured user
export const POST = ApiWrapper.create(
  async () => {
    const userId = env.PUBLIC_API_USER_ID;
    if (!userId) {
      throw new ApiError(
        "Public API user is not configured",
        ErrorCode.INTERNAL_ERROR,
        500
      );
    }

    const result = await auth.api.createApiKey({
      body: {
        userId,
        name: "Public API Key",
        permissions: {
          abis: ["read", "list"],
          networks: ["read", "list"],
          contracts: ["read", "list"],
        },
        rateLimitEnabled: true,
        rateLimitMax: 100,
        rateLimitTimeWindow: 3600000,
        metadata: {
          type: "public",
          scopes: ["read:abis", "list:abis", "read:networks", "list:networks"],
        },
      },
    });

    return { id: result.id, key: result.key, name: result.name };
  },
  { auth: { required: false } }
);
