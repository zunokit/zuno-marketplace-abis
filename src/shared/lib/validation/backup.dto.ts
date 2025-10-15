import { z } from "zod";

export const RestoreBackupBodySchema = z.object({
  backupId: z.string().min(1),
});
