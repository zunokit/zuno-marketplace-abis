import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { env } from "@/shared/config/env";
import { PublicApiKeyService } from "@/infrastructure/services/public-api-key.service";
import { unwrapOrThrow } from "@/shared/lib/utils/try-catch-wrapper";

// POST /api/keys/public - issue public API key bound to a configured user
export const POST = ApiWrapper.create(
  async () => {
    const result = await PublicApiKeyService.createPublic(
      env.PUBLIC_API_USER_ID,
      auth.api
    );

    // Unwrap the result or throw error
    return unwrapOrThrow(result);
  },
  { auth: { required: false } }
);
