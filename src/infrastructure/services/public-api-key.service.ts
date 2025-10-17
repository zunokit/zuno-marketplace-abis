/**
 * Public API Key Service
 *
 * Service for creating public API keys
 * Public keys have read-only permissions for public endpoints
 */

import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

export class PublicApiKeyService {
  /**
   * Create a public API key
   *
   * @param userId - User ID for the public API key
   * @param betterAuthApi - Better Auth API instance
   * @returns Created API key information
   * @throws ApiError if userId is not provided or creation fails
   */
  static async createPublic(userId: string | undefined, betterAuthApi: any) {
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
  }
}
