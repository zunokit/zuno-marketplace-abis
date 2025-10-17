/**
 * Admin Seeder
 * Seeds default admin account with proper authentication setup
 */

import { Seeder, SeedContext, SeedResult } from "../types";
import { user, account } from "@/infrastructure/database/drizzle/schema/auth.schema";
import { IdGenerator, EntityPrefix } from "@/shared/lib/utils/id-generator";
import { eq } from "drizzle-orm";
import { env } from "@/shared/config/env";
import crypto from "crypto";

interface AdminCredentials {
  email: string;
  password: string;
  wasGenerated: boolean;
}

export class AdminSeeder implements Seeder {
  name = "admin";
  dependencies: string[] = [];
  parallel = false;

  async execute(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let created = 0;
    let skipped = 0;
    let updated = 0;

    try {
      const adminCreated = await this.createDefaultAdmin(context);
      if (adminCreated) created++;
      else skipped++;

      const duration = Date.now() - startTime;

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

  private async createDefaultAdmin(context: SeedContext): Promise<boolean> {
    try {
      const credentials = this.getAdminCredentials();

      // Debug database instance
      context.logger?.info(`Database instance type: ${typeof context.db}`);
      context.logger?.info(`Database methods: ${Object.getOwnPropertyNames(context.db).slice(0, 10).join(', ')}`);

      // Check if admin already exists using Drizzle select
      context.logger?.info(`Checking for existing admin: ${credentials.email}`);
      let existing;
      try {
        existing = await context.db
          .select()
          .from(user)
          .where(eq(user.email, credentials.email))
          .limit(1);
        context.logger?.info(`Query completed successfully, found ${existing.length} records`);
      } catch (queryError: any) {
        context.logger?.error(`Query failed with specific error: ${queryError.message}`);
        context.logger?.error(`Query error type: ${queryError.constructor.name}`);
        throw queryError;
      }

      if (existing.length > 0) {
        context.logger?.info(`Admin user already exists: ${credentials.email}`);
        context.shared.adminUserId = existing[0].id;
        return false;
      }

      // Generate friendly IDs
      const userId = IdGenerator.generate({
        prefix: EntityPrefix.USER,
        apiVersion: 'v1',
      });
      const accountId = IdGenerator.generate({
        prefix: EntityPrefix.ACCOUNT,
        apiVersion: 'v1',
      });

      // Hash password
      const hashedPassword = await this.hashPassword(credentials.password);

      // Create admin user using Drizzle insert
      const [adminUser] = await context.db
        .insert(user)
        .values({
          id: userId,
          email: credentials.email,
          name: "System Administrator",
          emailVerified: true,
          role: "admin",
          banned: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Create account record (for password authentication)
      await context.db.insert(account).values({
        id: accountId,
        userId: adminUser.id,
        accountId: adminUser.email,
        providerId: "credential",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Store admin user ID in shared context
      context.shared.adminUserId = adminUser.id;

      // Log credentials if generated
      if (credentials.wasGenerated) {
        context.logger?.warn("⚠️  AUTO-GENERATED ADMIN PASSWORD");
        context.logger?.info(`Email: ${credentials.email}`);
        context.logger?.info(`Password: ${credentials.password}`);
        context.logger?.warn("🔒 CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN");

        // Save to credentials file
        await this.saveCredentialsFile(adminUser.id, credentials);
      }

      context.logger?.info(`Created admin user: ${adminUser.id}`);
      return true;

    } catch (error: any) {
      if (this.isUniqueConstraintError(error)) {
        context.logger?.info("Admin user already exists, skipping...");
        return false;
      }
      throw error;
    }
  }

  /**
   * Get or generate admin credentials
   */
  private getAdminCredentials(): AdminCredentials {
    const email = env.DEFAULT_ADMIN_EMAIL || "admin@zuno-marketplace.local";

    // Priority 1: Use env variable if set
    if (env.DEFAULT_ADMIN_PASSWORD) {
      return {
        email,
        password: env.DEFAULT_ADMIN_PASSWORD,
        wasGenerated: false,
      };
    }

    // Priority 2: Auto-generate secure password
    const password = crypto.randomBytes(16).toString('hex');

    return {
      email,
      password,
      wasGenerated: true,
    };
  }

  /**
   * Hash password using Node crypto
   * Note: Better Auth will re-hash this on first login using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    return crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');
  }

  /**
   * Save credentials to file for reference
   */
  private async saveCredentialsFile(userId: string, credentials: AdminCredentials): Promise<void> {
    if (!credentials.wasGenerated) return;

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const credentialsFile = path.join(process.cwd(), '.admin-credentials.txt');
      const credentialsContent = `
ZUNO MARKETPLACE - ADMIN CREDENTIALS
=====================================
Generated: ${new Date().toISOString()}

User ID:  ${userId}
Email:    ${credentials.email}
Password: ${credentials.password}

⚠️  IMPORTANT SECURITY NOTICE:
- Change this password immediately after first login
- Delete this file after saving the credentials securely
- Never commit this file to version control
`;

      await fs.writeFile(credentialsFile, credentialsContent, 'utf-8');
    } catch (error) {
      // Non-critical error, continue without failing
      console.warn('Could not save credentials file:', error);
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