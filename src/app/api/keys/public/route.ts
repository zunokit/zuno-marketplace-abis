import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { auth } from "@/infrastructure/auth/better-auth.config";
import { env } from "@/shared/config/env";
import { PublicApiKeyService } from "@/infrastructure/services/public-api-key.service";

// POST /api/keys/public - issue public API key bound to a configured user
export const POST = ApiWrapper.create(
  async () => {
    return await PublicApiKeyService.createPublic(
      env.PUBLIC_API_USER_ID,
      auth.api
    );
  },
  { auth: { required: false } }
);
