/**
 * User Seeder
 * Seeds system and public users
 */

import { Seeder, SeedContext, SeedResult } from "../types";
import { user } from "@/infrastructure/database/drizzle/schema/auth.schema";
import { IdGenerator, EntityPrefix } from "@/shared/lib/utils/id-generator";
import { eq } from "drizzle-orm";

export class UserSeeder implements Seeder {
  name = "users";
  dependencies: string[] = [];
  parallel = false;

  async execute(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let created = 0;
    let skipped = 0;
    let updated = 0;

    try {
      // System user
      const systemUser = await this.createSystemUser(context);
      if (systemUser) created++;

      // Public API user
      const publicUser = await this.createPublicUser(context);
      if (publicUser) created++;

      const duration = Date.now() - startTime;

      context.logger?.success(
        `User seeding completed: ${created} created, ${skipped} skipped, ${updated} updated`,
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

      context.logger?.error(`User seeding failed: ${error.message}`, {
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

  private async createSystemUser(context: SeedContext): Promise<boolean> {
    try {
      const systemUserId = IdGenerator.generate({
        prefix: EntityPrefix.USER,
        apiVersion: "v1",
      });

      await context.db.insert(user).values({
        id: systemUserId,
        email: "system@zuno.marketplace",
        emailVerified: true,
        name: "System User",
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: "admin",
        banned: false,
        banReason: null,
        banExpires: null,
      });

      context.logger?.info(`Created system user: ${systemUserId}`);

      // Store system user ID in shared context for other seeders
      context.shared.systemUserId = systemUserId;

      return true;
    } catch (error: any) {
      if (this.isUniqueConstraintError(error)) {
        context.logger?.info("System user already exists, skipping...");
        // Fetch existing and set shared
        try {
          const existing = await context.db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.email, "system@zuno.marketplace"))
            .limit(1);
          if (existing?.[0]?.id) {
            context.shared.systemUserId = existing[0].id;
          }
        } catch {}
        return false;
      }
      throw error;
    }
  }

  private async createPublicUser(context: SeedContext): Promise<boolean> {
    try {
      const publicUserId = IdGenerator.generate({
        prefix: EntityPrefix.USER,
        apiVersion: "v1",
      });

      await context.db.insert(user).values({
        id: publicUserId,
        email: "public@zuno.marketplace",
        emailVerified: true,
        name: "Public API User",
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: "user",
        banned: false,
        banReason: null,
        banExpires: null,
      });

      context.logger?.info(`Created public user: ${publicUserId}`);
      return true;
    } catch (error: any) {
      if (this.isUniqueConstraintError(error)) {
        context.logger?.info("Public user already exists, skipping...");
        return false;
      }
      throw error;
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
