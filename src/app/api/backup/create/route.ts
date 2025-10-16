import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { BackupService } from "@/core/services/backup.service";

/**
 * POST /api/backup/create - Create a full database backup
 *
 * This endpoint creates a complete backup of all database tables.
 * Requires admin permissions.
 *
 * @returns Backup job result with backup data
 */
export const POST = ApiWrapper.create(
  async () => {
    const backupService = new BackupService();
    const result = await backupService.createBackup();

    if (result.status === 'failed') {
      return {
        success: false,
        error: result.error,
        jobId: result.jobId,
      };
    }

    return {
      success: true,
      jobId: result.jobId,
      backup: result.backupData,
      metadata: result.backupData?.metadata,
      completedAt: result.completedAt,
    };
  },
  {
    auth: {
      required: true,
      allowSession: true,
      requiredPermissions: ["admin:manage"],
    },
  }
);
