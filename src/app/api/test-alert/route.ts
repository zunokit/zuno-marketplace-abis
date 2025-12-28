/**
 * Test Alert Endpoint
 *
 * TEMPORARY ENDPOINT FOR SENTRY ALERT TESTING
 *
 * This endpoint sends a test exception to Sentry to verify alert delivery.
 * Use this to test Slack notifications, GitHub issue creation, and email alerts.
 *
 * DELETE THIS ENDPOINT AFTER TESTING (see phase-05-alerts.md Test 5.3)
 *
 * Usage: GET /api/test-alert
 *
 * Expected behavior:
 * - Sentry captures the exception
 * - Slack receives notification (if configured)
 * - GitHub issue created (if configured)
 * - Email alert sent (if configured)
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  // Capture test exception in Sentry
  Sentry.captureException(new Error("Test alert - please ignore"), {
    tags: {
      test: "true",
      phase: "05-alerts",
    },
    user: {
      id: "test-user",
      email: "test@example.com",
    },
  });

  return NextResponse.json({
    test: "alert-sent",
    message: "Test exception sent to Sentry. Check your dashboard for alerts.",
    instructions: [
      "1. Check Sentry dashboard for new issue",
      "2. Verify Slack notification received",
      "3. Verify GitHub issue created",
      "4. Verify email notification sent",
      "5. Delete this endpoint after testing (see Test 5.3)",
    ],
  });
}
