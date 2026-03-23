import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface NotificationResult {
  ok: boolean;
  error?: string;
}

interface BackupSummary {
  jobId: string;
  createdAt: string;
  completedAt: string;
  totalMs: number;
  totalRecords: number;
  totalTables: number;
  backupSizeBytes: number;
  tables: Record<string, number>;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

function buildSuccessPayload(summary: BackupSummary) {
  const tableLines = Object.entries(summary.tables)
    .map(([table, count]) => `• ${table}: ${count}`)
    .join("\n");

  return {
    text:
      `✅ Database backup OK (${summary.totalMs}ms)\n` +
      `📦 ${summary.totalRecords} records across ${summary.totalTables} tables`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "✅ Database Backup OK",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Job ID:*\n\`${summary.jobId}\``,
          },
          {
            type: "mrkdwn",
            text: `*Duration:*\n${summary.totalMs}ms`,
          },
          {
            type: "mrkdwn",
            text: `*Records:*\n${summary.totalRecords}`,
          },
          {
            type: "mrkdwn",
            text: `*Backup Size:*\n${summary.backupSizeBytes.toLocaleString()} bytes`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Table Breakdown:*\n${tableLines}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Completed at ${new Date(summary.completedAt).toUTCString()}`,
          },
        ],
      },
    ],
  };
}

function buildFailurePayload(error: string, totalMs: number, jobId: string) {
  return {
    text: "🚨 Database backup FAILED",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚨 Database Backup FAILED",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `*Job ID:* \`${jobId}\``,
            `*Duration:* ${totalMs}ms`,
            `*Error:* \`${error}\``,
          ].join("\n"),
        },
      },
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

async function sendSlackPayload(payload: object): Promise<NotificationResult> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return {
      ok: false,
      error: "SLACK_WEBHOOK_URL is not configured",
    };
  }

  try {
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
  const createdAt = new Date().toISOString();
  const jobId = `backup-${Date.now()}-${crypto.randomUUID()}`;

  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured");
    }

    const sql = neon(databaseUrl);
    const [
      networks,
      abis,
      abiVersions,
      contracts,
      auditLogs,
      users,
      accountRows,
      apiKeyRows,
      apiVersions,
    ] = await Promise.all([
      sql`SELECT * FROM networks`,
      sql`SELECT * FROM abis`,
      sql`SELECT * FROM abi_versions`,
      sql`SELECT * FROM contracts`,
      sql`SELECT * FROM audit_logs`,
      sql`SELECT * FROM "user"`,
      sql`SELECT * FROM account`,
      sql`SELECT * FROM api_key`,
      sql`SELECT * FROM api_versions`,
    ]);

    const accounts = (accountRows as Array<Record<string, unknown>>).map((account) => {
      const { password, ...accountWithoutPassword } = account;
      return accountWithoutPassword;
    });

    const apiKeys = (apiKeyRows as Array<Record<string, unknown>>).map((apiKey) => {
      const { key, ...apiKeyWithoutSecret } = apiKey;
      return apiKeyWithoutSecret;
    });

    const tables = {
      networks: networks.length,
      abis: abis.length,
      abiVersions: abiVersions.length,
      contracts: contracts.length,
      auditLogs: auditLogs.length,
      users: users.length,
      accounts: accounts.length,
      apiKeys: apiKeys.length,
      apiVersions: apiVersions.length,
    };

    const totalRecords = Object.values(tables).reduce((sum, count) => sum + count, 0);
    const backup = {
      metadata: {
        version: "1.0.0",
        createdAt,
        tables,
        totalRecords,
      },
      data: {
        networks,
        abis,
        abiVersions,
        contracts,
        auditLogs,
        users,
        accounts,
        apiKeys,
        apiVersions,
      },
    };

    const summary: BackupSummary = {
      jobId,
      createdAt,
      completedAt: new Date().toISOString(),
      totalMs: Date.now() - startedAt,
      totalRecords,
      totalTables: Object.keys(tables).length,
      backupSizeBytes: Buffer.byteLength(JSON.stringify(backup)),
      tables,
    };

    const notification = await sendSlackPayload(buildSuccessPayload(summary));
    const ok = notification.ok;

    return NextResponse.json(
      {
        ok,
        jobOk: true,
        timestamp: summary.completedAt,
        summary,
        notification,
      },
      { status: ok ? 200 : 207 },
    );
  } catch (error) {
    const totalMs = Date.now() - startedAt;
    const message = getErrorMessage(error);
    const notification = await sendSlackPayload(
      buildFailurePayload(message, totalMs, jobId),
    );

    return NextResponse.json(
      {
        ok: false,
        jobOk: false,
        timestamp: new Date().toISOString(),
        error: message,
        totalMs,
        notification,
      },
      { status: 207 },
    );
  }
}
