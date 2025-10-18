/**
 * API Version Seeder
 * Seeds API version data
 */

import { Seeder, SeedContext, SeedResult } from "../types";
import { apiVersions } from "@/infrastructure/database/drizzle/schema/versions.schema";

export class ApiVersionSeeder implements Seeder {
  name = "api-versions";
  dependencies: string[] = [];
  parallel = false;

  async execute(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let created = 0;
    let skipped = 0;
    const updated = 0;

    try {
      const versionData = [
        {
          id: "v1",
          label: "v1.0.0",
          isCurrent: true,
          deprecated: false,
          releasedAt: new Date("2024-01-01T00:00:00Z"),
          sunsetAt: null,
        },
      ];

      for (const version of versionData) {
        try {
          await context.db.insert(apiVersions).values(version);
          context.logger?.info(`Created API version: ${version.id}`);
          created++;
        } catch (error: any) {
          if (this.isUniqueConstraintError(error)) {
            context.logger?.info(
              `API version ${version.id} already exists, skipping...`
            );
            skipped++;
          } else {
            throw error;
          }
        }
      }

      const duration = Date.now() - startTime;

      context.logger?.success(
        `API version seeding completed: ${created} created, ${skipped} skipped, ${updated} updated`,
        { duration }
      );

      return {
        seeder: this.name,
        created,
        skipped,
        updated,
        duration,
        success: true,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      context.logger?.error(`API version seeding failed: ${error.message}`, {
        error: error.message,
      });

      return {
        seeder: this.name,
        created,
        skipped,
        updated,
        duration,
        success: false,
        error: error.message,
      };
    }
  }

  private isUniqueConstraintError(error: any): boolean {
    const message = error.message?.toLowerCase() || "";
    return (
      message.includes("duplicate key") ||
      message.includes("unique constraint") ||
      message.includes("already exists")
    );
  }
}
