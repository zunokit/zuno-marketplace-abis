/**
 * Test Slow Response Endpoint
 *
 * TEMPORARY ENDPOINT FOR SENTRY PERFORMANCE ALERT TESTING
 *
 * This endpoint simulates slow response time to test performance alerts.
 * Use this to verify P95 latency alerts trigger correctly.
 *
 * DELETE THIS ENDPOINT AFTER TESTING (see phase-05-alerts.md Test 5.3)
 *
 * Usage: GET /api/test-slow
 *
 * Expected behavior:
 * - Response takes 2.5 seconds (exceeds 2000ms threshold)
 * - Sentry records slow transaction
 * - Run 100+ times to trigger P95 alert
 *
 * Example script to trigger alert:
 * for i in {1..100}; do curl -w "\n" https://your-domain.com/api/test-slow & done
 */

import { NextResponse } from "next/server";

export async function GET() {
  // Simulate slow operation (2.5 second delay)
  // This exceeds the 2000ms threshold for performance alerts
  await new Promise((resolve) => setTimeout(resolve, 2500));

  return NextResponse.json({
    slow: true,
    duration_ms: 2500,
    message: "Slow response test. Transaction duration: 2500ms",
    instructions: [
      "1. Run this endpoint 100+ times to trigger P95 alert",
      "2. Check Sentry dashboard for performance alerts",
      "3. Verify Slack notification received",
      "4. Delete this endpoint after testing (see Test 5.3)",
      "5. Example: for i in {1..100}; do curl https://your-domain.com/api/test-slow & done",
    ],
  });
}
