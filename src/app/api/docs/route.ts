import { NextResponse } from "next/server";
import { getOpenApiSchema } from "@/shared/config/openapi.schema";
import { getCurrentUrl } from "@/shared/lib/utils/url";

/**
 * GET /api/docs - API Documentation
 *
 * Serves the OpenAPI 3.1 schema as JSON for external tools.
 * This endpoint can be used by:
 * - API testing tools (Postman, Insomnia)
 * - Code generation tools
 * - API documentation tools
 * - CI/CD validation pipelines
 *
 * @public endpoint - no authentication required
 */
export async function GET() {
  const baseUrl = getCurrentUrl();
  const schema = getOpenApiSchema(baseUrl);

  return NextResponse.json(schema, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
