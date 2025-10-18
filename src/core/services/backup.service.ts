import { db } from "@/infrastructure/database/drizzle/client";
import { abis, abiVersions } from "@/infrastructure/database/drizzle/schema/abis.schema";
import { contracts } from "@/infrastructure/database/drizzle/schema/contracts.schema";
import { networks } from "@/infrastructure/database/drizzle/schema/networks.schema";
import { apiKey } from "@/infrastructure/database/drizzle/schema/auth.schema";
import { auditLogs } from "@/infrastructure/database/drizzle/schema/audit-logs.schema";

export interface BackupData {
  version: string;
  timestamp: string;
  data: {
    abis: unknown[];
    abiVersions: unknown[];
    contracts: unknown[];
    networks: unknown[];
    apiKeys: unknown[];
    auditLogs: unknown[];
  };
  metadata: {
    recordCounts: {
      abis: number;
      abiVersions: number;
      contracts: number;
      networks: number;
      apiKeys: number;
      auditLogs: number;
    };
  };
}

export interface BackupJobResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  backupData?: BackupData;
  error?: string;
}

export interface RestoreJobResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  recordsRestored?: {
    abis: number;
    abiVersions: number;
    contracts: number;
    networks: number;
    apiKeys: number;
    auditLogs: number;
  };
  error?: string;
}

export class BackupService {
  /**
   * Create a full database backup
   */
  async createBackup(): Promise<BackupJobResult> {
    const jobId = `backup-${Date.now()}-${crypto.randomUUID()}`;
    const startedAt = new Date().toISOString();

    try {
      // Fetch all data from database
      const [
        abiData,
        abiVersionData,
        contractData,
        networkData,
        apiKeyData,
        auditLogData,
      ] = await Promise.all([
        db.select().from(abis),
        db.select().from(abiVersions),
        db.select().from(contracts),
        db.select().from(networks),
        db.select().from(apiKey),
        db.select().from(auditLogs),
      ]);

      const backupData: BackupData = {
        version: '1.0.0',
        timestamp: startedAt,
        data: {
          abis: abiData,
          abiVersions: abiVersionData,
          contracts: contractData,
          networks: networkData,
          apiKeys: apiKeyData,
          auditLogs: auditLogData,
        },
        metadata: {
          recordCounts: {
            abis: abiData.length,
            abiVersions: abiVersionData.length,
            contracts: contractData.length,
            networks: networkData.length,
            apiKeys: apiKeyData.length,
            auditLogs: auditLogData.length,
          },
        },
      };

      return {
        jobId,
        status: 'completed',
        startedAt,
        completedAt: new Date().toISOString(),
        backupData,
      };
    } catch (error) {
      return {
        jobId,
        status: 'failed',
        startedAt,
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupData: BackupData): Promise<RestoreJobResult> {
    const jobId = `restore-${Date.now()}-${crypto.randomUUID()}`;
    const startedAt = new Date().toISOString();

    try {
      // Validate backup version
      if (backupData.version !== '1.0.0') {
        throw new Error(`Unsupported backup version: ${backupData.version}`);
      }

      // Start transaction for atomic restore
      const result = await db.transaction(async (tx) => {
        const recordsRestored = {
          abis: 0,
          abiVersions: 0,
          contracts: 0,
          networks: 0,
          apiKeys: 0,
          auditLogs: 0,
        };

        // Restore networks first (referenced by contracts)
        if (backupData.data.networks.length > 0) {
          await tx.insert(networks).values(backupData.data.networks as any).onConflictDoNothing();
          recordsRestored.networks = backupData.data.networks.length;
        }

        // Restore ABIs (referenced by contracts)
        if (backupData.data.abis.length > 0) {
          await tx.insert(abis).values(backupData.data.abis as any).onConflictDoNothing();
          recordsRestored.abis = backupData.data.abis.length;
        }

        // Restore ABI versions
        if (backupData.data.abiVersions.length > 0) {
          await tx.insert(abiVersions).values(backupData.data.abiVersions as any).onConflictDoNothing();
          recordsRestored.abiVersions = backupData.data.abiVersions.length;
        }

        // Restore contracts
        if (backupData.data.contracts.length > 0) {
          await tx.insert(contracts).values(backupData.data.contracts as any).onConflictDoNothing();
          recordsRestored.contracts = backupData.data.contracts.length;
        }

        // Restore API keys
        if (backupData.data.apiKeys.length > 0) {
          await tx.insert(apiKey).values(backupData.data.apiKeys as any).onConflictDoNothing();
          recordsRestored.apiKeys = backupData.data.apiKeys.length;
        }

        // Restore audit logs
        if (backupData.data.auditLogs.length > 0) {
          await tx.insert(auditLogs).values(backupData.data.auditLogs as any).onConflictDoNothing();
          recordsRestored.auditLogs = backupData.data.auditLogs.length;
        }

        return recordsRestored;
      });

      return {
        jobId,
        status: 'completed',
        startedAt,
        completedAt: new Date().toISOString(),
        recordsRestored: result,
      };
    } catch (error) {
      return {
        jobId,
        status: 'failed',
        startedAt,
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate backup data structure
   */
  validateBackup(backupData: unknown): backupData is BackupData {
    if (!backupData || typeof backupData !== 'object') {
      return false;
    }

    const data = backupData as Record<string, unknown>;

    return (
      typeof data.version === 'string' &&
      typeof data.timestamp === 'string' &&
      typeof data.data === 'object' &&
      data.data !== null &&
      typeof data.metadata === 'object' &&
      data.metadata !== null
    );
  }
}
