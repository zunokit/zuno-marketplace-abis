import { z } from "zod";

/**
 * Schema for restore backup request body
 */
export const RestoreBackupBodySchema = z.object({
  backupData: z.object({
    version: z.string(),
    timestamp: z.string(),
    data: z.object({
      abis: z.array(z.any()),
      abiVersions: z.array(z.any()),
      contracts: z.array(z.any()),
      networks: z.array(z.any()),
      apiKeys: z.array(z.any()),
      auditLogs: z.array(z.any()),
    }),
    metadata: z.object({
      recordCounts: z.object({
        abis: z.number(),
        abiVersions: z.number(),
        contracts: z.number(),
        networks: z.number(),
        apiKeys: z.number(),
        auditLogs: z.number(),
      }),
    }),
  }),
});
