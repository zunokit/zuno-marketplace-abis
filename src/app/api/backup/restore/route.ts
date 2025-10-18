import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { RestoreBackupBodySchema } from "@/shared/lib/validation/backup.dto";
import { BackupService } from "@/core/services/backup.service";
import { ErrorCode } from "@/shared/types";
import z from "zod";

/**
 * POST /api/backup/restore - Restore database from backup
 *
 * This endpoint restores the database from a backup file.
 * All data is restored in a transaction to ensure atomicity.
 * Requires admin permissions.
 *
 * @param backupData - The complete backup data object
 * @returns Restore job result with records restored count
 */
export const POST = ApiWrapper.create(
  async (input: { body: z.infer<typeof RestoreBackupBodySchema> }) => {
    const backupService = new BackupService();

    // Validate backup data structure
    if (!backupService.validateBackup(input.body.backupData)) {
      throw new ApiError(
        "Invalid backup data structure",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // Perform restore
    const result = await backupService.restoreBackup(input.body.backupData);

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
      recordsRestored: result.recordsRestored,
      completedAt: result.completedAt,
    };
  },
  {
    auth: {
      required: true,
      allowSession: true,
      requiredPermissions: ["admin:manage"],
    },
    validation: {
      body: RestoreBackupBodySchema,
    },
  }
);
