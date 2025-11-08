import { NextResponse } from "next/server";
import { openApiSchema } from "@/shared/config/openapi.schema";

/**
 * OpenAPI Schema JSON Endpoint
 *
 * Serves the OpenAPI 3.1 schema as JSON for external tools.
 * This endpoint can be used by:
 * - API testing tools (Postman, Insomnia)
 * - Code generation tools
 * - API documentation tools
 * - CI/CD validation pipelines
 *
 * @public GET /api/openapi.json
 */
export async function GET() {
  return NextResponse.json(openApiSchema, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
