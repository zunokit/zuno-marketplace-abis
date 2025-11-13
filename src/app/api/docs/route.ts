import { NextRequest, NextResponse } from "next/server";
import { API_DOCUMENTATION } from "@/shared/lib/api/api-documentation";
import { createSuccessResponse } from "@/shared/types";

/**
 * GET /api/docs - API Documentation
 *
 * Public endpoint that provides comprehensive API documentation
 * including endpoints, authentication methods, rate limits, and examples.
 *
 * No authentication required - this is a public documentation endpoint.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(createSuccessResponse(API_DOCUMENTATION), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}
