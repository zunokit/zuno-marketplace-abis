/**
 * Public API Key Service
 *
 * Service for creating public API keys
 * Public keys have read-only permissions for public endpoints
 */

import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import {
  tryCatch,
  type TryCatchResult,
} from "@/shared/lib/utils/try-catch-wrapper";

export class PublicApiKeyService {
  /**
   * Create a public API key
   *
   * @param userId - User ID for the public API key
   * @param betterAuthApi - Better Auth API instance
   * @returns TryCatchResult with created API key information or ApiError
   */
  static async createPublic(
    userId: string | undefined,
    betterAuthApi: any
  ): Promise<
    TryCatchResult<{
      id: string;
      key: string;
      name: string;
    }>
  > {
    return tryCatch(
      async () => {
        // Validate userId
        if (!userId) {
          throw new ApiError(
            "Public API user is not configured",
            ErrorCode.INTERNAL_ERROR,
            500
          );
        }

        // Create API key with read-only permissions
        const result = await betterAuthApi.createApiKey({
          body: {
            userId,
            name: "Public API Key",
            permissions: {
              abis: ["read", "list"],
              networks: ["read", "list"],
              contracts: ["read", "list"],
            },
            metadata: {
              type: "public",
              scopes: [
                "read:abis",
                "list:abis",
                "read:networks",
                "list:networks",
                "read:contracts",
                "list:contracts",
              ],
            },
          },
        });

        // Return minimal key information
        return {
          id: result.id,
          key: result.key,
          name: result.name,
        };
      },
      {
        errorMessage: "Failed to create public API key",
        errorCode: ErrorCode.INTERNAL_ERROR,
        context: { userId: userId ? "provided" : "missing" },
      }
    );
  }
}
