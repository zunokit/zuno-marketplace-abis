import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface PingResult {
  label: string;
  emoji: string;
  ok: boolean;
  status?: number | string;
  error?: string;
  ms: number;
}

interface NotificationResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function getAppUrl(req: NextRequest): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  return baseUrl.replace(/\/$/, "");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

async function pingHealthEndpoint(appUrl: string): Promise<PingResult> {
  const startedAt = Date.now();

  try {
    const response = await fetch(`${appUrl}/api/health`, {
      method: "GET",
      headers: {
        "User-Agent": "External-Cron-Keepalive",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });

    let healthStatus: string = "unknown";

    try {
      const body = (await response.json()) as { status?: string };
      if (typeof body.status === "string") {
        healthStatus = body.status;
      }
    } catch {
      healthStatus = "unknown";
    }

    const ok = response.status === 200 && healthStatus !== "unhealthy";

    return {
      label: "App health",
      emoji: "🏥",
      ok,
      status: response.status === 200 ? healthStatus : response.status,
      error: ok
        ? undefined
        : response.status !== 200
          ? `Health endpoint returned HTTP ${response.status}`
          : `Health endpoint reported ${healthStatus}`,
      ms: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      label: "App health",
      emoji: "🏥",
      ok: false,
      error: getErrorMessage(error),
      ms: Date.now() - startedAt,
    };
  }
}

async function pingDatabase(): Promise<PingResult> {
  const startedAt = Date.now();

  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured");
    }

    const sql = neon(databaseUrl);
    await sql`SELECT 1`;

    return {
      label: "Neon DB",
      emoji: "🗄️",
      ok: true,
      status: 200,
      ms: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      label: "Neon DB",
      emoji: "🗄️",
      ok: false,
      error: getErrorMessage(error),
      ms: Date.now() - startedAt,
    };
  }
}

function buildSuccessPayload(results: PingResult[], totalMs: number) {
  return {
    text:
      `✅ Keepalive OK (${totalMs}ms)\n` +
      results
        .map((result) => `${result.emoji} *${result.label}*: ✅ ${result.ms}ms`)
        .join("\n"),
  };
}

function buildFailurePayload(results: PingResult[], totalMs: number) {
  const failed = results.filter((result) => !result.ok);
  const passed = results.filter((result) => result.ok);

  return {
    text: "🚨 Keepalive FAILED",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚨 Keepalive FAILED",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${failed.length} service(s) failed* out of ${results.length} — ${totalMs}ms`,
        },
      },
      { type: "divider" },
      ...failed.map((result) => ({
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `${result.emoji} *${result.label}* ❌`,
            result.status !== undefined ? `• Status: \`${result.status}\`` : "",
            result.error ? `• Error: \`${result.error}\`` : "",
            `• Latency: ${result.ms}ms`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      })),
      ...(passed.length > 0
        ? [
            { type: "divider" },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text:
                  "*Still healthy:* " +
                  passed
                    .map((result) => `${result.emoji} ${result.label} (${result.ms}ms)`)
                    .join(" · "),
              },
            },
          ]
        : []),
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `At ${new Date().toUTCString()}`,
          },
        ],
      },
    ],
  };
}

async function sendSlackNotification(
  results: PingResult[],
  totalMs: number,
): Promise<NotificationResult> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return {
      ok: true,
      skipped: true,
    };
  }

  try {
    const payload = results.every((result) => result.ok)
      ? buildSuccessPayload(results, totalMs)
      : buildFailurePayload(results, totalMs);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Slack webhook returned HTTP ${response.status}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error),
    };
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const results = await Promise.all([
    pingHealthEndpoint(getAppUrl(req)),
    pingDatabase(),
  ]);
  const totalMs = Date.now() - startedAt;
  const jobOk = results.every((result) => result.ok);
  const notification = await sendSlackNotification(results, totalMs);

  return NextResponse.json(
    {
      ok: jobOk,
      jobOk,
      timestamp: new Date().toISOString(),
      totalMs,
      results,
      notification,
    },
    { status: jobOk ? 200 : 207 },
  );
}
