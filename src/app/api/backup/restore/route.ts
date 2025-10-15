import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { RestoreBackupBodySchema as BodySchema } from "@/shared/lib/validation/backup.dto";

// POST /api/backup/restore
export const POST = ApiWrapper.create(
  async (input: { body: z.infer<typeof BodySchema> }, context) => {
    // TODO: trigger restore job
    return { success: true, jobId: "restore-" + input.body.backupId };
  },
  {
    auth: {
      required: true,
      allowSession: true,
      requiredPermissions: ["admin:manage"],
    },
    validation: { body: BodySchema },
  }
);
