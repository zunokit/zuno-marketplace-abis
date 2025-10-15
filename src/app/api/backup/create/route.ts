import { ApiWrapper } from "@/shared/lib/api/api-handler";

// POST /api/backup/create
export const POST = ApiWrapper.create(
  async (_: unknown, context) => {
    // TODO: trigger backup job
    return { success: true, jobId: "backup-" + Date.now() };
  },
  {
    auth: {
      required: true,
      allowSession: true,
      requiredPermissions: ["admin:manage"],
    },
  }
);
