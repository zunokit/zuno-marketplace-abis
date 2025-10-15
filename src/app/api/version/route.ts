import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { db } from "@/infrastructure/database/drizzle/client";
import { apiVersions } from "@/infrastructure/database/drizzle/schema";

// GET /api/version - current and supported versions
export const GET = ApiWrapper.create(
  async () => {
    const rows = await db.select().from(apiVersions);
    const current = rows.find((v) => v.isCurrent) || null;
    const supported = rows.map((v) => ({ id: v.id, deprecated: v.deprecated }));

    return {
      current: current ? { id: current.id, label: current.label } : null,
      supported,
      total: rows.length,
    };
  },
  { auth: { required: false } }
);
