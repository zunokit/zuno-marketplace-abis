import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Test endpoint for Sentry integration verification
 * DELETE THIS FILE AFTER VERIFICATION (Phase 1 - Test 1.3)
 *
 * Visit: http://localhost:3000/api/test-sentry
 * Expected: Error should appear in Sentry dashboard
 *
 * Rate limited: 5 requests per minute per IP
 */

// Simple in-memory rate limiter for test endpoint
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // requests
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // First request or window expired
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  record.count++;
  return { allowed: true };
}

export async function GET(request: Request) {
  // Simple rate limiting by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
             request.headers.get("x-real-ip") ||
             "unknown";

  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rateLimit.retryAfter },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter || 60) } }
    );
  }

  // Capture a test exception
  Sentry.captureException(new Error("Test Sentry integration - Phase 1 Foundation"));

  return NextResponse.json({
    message: "Test error sent to Sentry",
    dsnConfigured: !!process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    rateLimitRemaining: RATE_LIMIT - (rateLimitMap.get(ip)?.count || 0),
  });
}
