/**
 * API Key Seeder
 * Seeds hardcoded admin API keys from environment with no rate limiting
 */

import { Seeder, SeedContext, SeedResult } from "../types";
import { apiKey } from "@/infrastructure/database/drizzle/schema/auth.schema";
import { IdGenerator, EntityPrefix } from "@/shared/lib/utils/id-generator";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * Hash API key using SHA-256 + base64url (Better Auth compatible)
 * Better Auth uses: SHA-256 → base64url encoding (no padding)
 * See: https://github.com/better-auth/better-auth defaultKeyHasher
 */
function hashApiKey(key: string): string {
  const hash = crypto.createHash("sha256").update(key).digest();
  // Convert to base64url without padding (matches Better Auth's defaultKeyHasher)
  return hash.toString("base64url");
}

export class ApiKeySeeder implements Seeder {
  name = "api-keys";
  dependencies = ["users"];
  parallel = false;

  async execute(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let created = 0;
    let skipped = 0;
    const updated = 0;

    try {
      const apiKeysEnv = process.env.API_KEYS;

      if (!apiKeysEnv) {
        context.logger?.info("No API_KEYS env variable found, skipping...");
        return {
          seeder: this.name,
          created: 0,
          skipped: 0,
          updated: 0,
          duration: Date.now() - startTime,
          success: true,
        };
      }

      const keys = apiKeysEnv
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      if (keys.length === 0) {
        context.logger?.info("No valid API keys found in API_KEYS env");
        return {
          seeder: this.name,
          created: 0,
          skipped: 0,
          updated: 0,
          duration: Date.now() - startTime,
          success: true,
        };
      }

      context.logger?.info(`Found ${keys.length} API keys to seed`);

      // Get admin user ID from shared context or use a default
      const adminUserId = context.shared.adminUserId || "usr_v1_admin_system";

      for (let i = 0; i < keys.length; i++) {
        const plaintextKey = keys[i];
        const keyCreated = await this.createApiKey(
          context,
          plaintextKey,
          adminUserId,
          i + 1
        );

        if (keyCreated) {
          created++;
        } else {
          skipped++;
        }
      }

      const duration = Date.now() - startTime;

      context.logger?.success(
        `API key seeding completed: ${created} created, ${skipped} skipped`,
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

      context.logger?.error(`API key seeding failed: ${error.message}`, {
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

  /**
   * Create a single API key with SHA-256 hashing
   */
  private async createApiKey(
    context: SeedContext,
    plaintextKey: string,
    userId: string,
    index: number
  ): Promise<boolean> {
    try {
      // Hash the API key using SHA-256 (Better Auth compatible)
      const hashedKey = hashApiKey(plaintextKey);

      // Check if key already exists (by hash)
      const existing = await context.db
        .select()
        .from(apiKey)
        .where(eq(apiKey.key, hashedKey))
        .limit(1);

      if (existing.length > 0) {
        context.logger?.info(
          `API key ${index} already exists (hash match), skipping...`
        );
        return false;
      }

      // Generate ID
      const keyId = IdGenerator.generate({
        prefix: EntityPrefix.API_KEY,
        apiVersion: "v1",
      });

      // Extract prefix and start for display
      const keyStart = plaintextKey.slice(0, 8);
      const keyPrefix = plaintextKey.includes("_")
        ? plaintextKey.split("_")[0] + "_"
        : "zuno_";

      // Metadata for enterprise tier (no rate limiting)
      const metadata = JSON.stringify({
        type: "enterprise",
        scopes: ["*"],
        notes: `Hardcoded admin API key ${index} - no rate limiting`,
      });

      // Insert API key
      await context.db.insert(apiKey).values({
        id: keyId,
        name: `Admin API Key ${index}`,
        key: hashedKey,
        start: keyStart,
        prefix: keyPrefix,
        userId: userId,
        enabled: true,
        rateLimitEnabled: false,
        permissions: JSON.stringify({
          abis: ["read", "list", "create", "update", "delete"],
          contracts: ["read", "list", "create", "update", "delete"],
          networks: ["read", "list", "create", "update", "delete"],
          admin: ["*"],
        }),
        metadata: metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      context.logger?.info(
        `Created admin API key ${index}: ${keyStart}... (enterprise tier, no rate limit)`
      );
      return true;
    } catch (error: any) {
      if (this.isUniqueConstraintError(error)) {
        context.logger?.info(
          `API key ${index} already exists (unique constraint), skipping...`
        );
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
