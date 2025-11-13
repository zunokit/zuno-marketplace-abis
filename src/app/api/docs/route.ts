import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { API_DOCUMENTATION } from "@/shared/lib/api/api-documentation";

/**
 * GET /api/docs - API Documentation
 *
 * Public endpoint that provides comprehensive API documentation
 * including endpoints, authentication methods, rate limits, and examples.
 *
 * No authentication required - this is a public documentation endpoint.
 */
export const GET = ApiWrapper.create(
  async () => {
    return API_DOCUMENTATION;
  },
  {
    auth: { required: false },
  }
);
