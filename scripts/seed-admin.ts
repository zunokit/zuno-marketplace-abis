// Load environment variables first
import "dotenv/config";
import { db } from "@/infrastructure/database/drizzle";
import { user, account } from "@/infrastructure/database/drizzle/schema/auth.schema";
import { eq } from "drizzle-orm";
import { logger } from "@/shared/lib/utils/logger";
import { env } from "@/shared/config/env";
import { IdGenerator, EntityPrefix } from "@/shared/lib/utils/id-generator";
import crypto from "crypto";

/**
 * Seed Default Admin Account
 *
 * This script creates the first admin account for the system.
 * Priority: ENV variable > Auto-generate secure password
 *
 * Usage:
 *   pnpm db:seed:admin
 *
 * Environment Variables:
 *   DEFAULT_ADMIN_EMAIL    - Admin email (default: admin@zuno-marketplace.local)
 *   DEFAULT_ADMIN_PASSWORD - Admin password (if not set, auto-generates)
 */

interface AdminCredentials {
  email: string;
  password: string;
  wasGenerated: boolean;
}

/**
 * Get or generate admin credentials
 */
function getAdminCredentials(): AdminCredentials {
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
async function hashPassword(password: string): Promise<string> {
  // Use SHA-256 for initial hash
  // Better Auth will re-hash with bcrypt on first authentication
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}

/**
 * Seed admin user
 */
async function seedDefaultAdmin(): Promise<void> {
  logger.info("🔧 Seeding default admin account...");

  try {
    const credentials = getAdminCredentials();

    // Check if admin already exists
    const existing = await db
      .select()
      .from(user)
      .where(eq(user.email, credentials.email))
      .limit(1);

    if (existing.length > 0) {
      logger.info(`✓ Admin user already exists: ${credentials.email}`);
      logger.info(`  User ID: ${existing[0].id}`);
      logger.info(`  Role: ${existing[0].role}`);
      return;
    }

    // Generate friendly IDs (default v1 for auth entities)
    const userId = IdGenerator.generate({
      prefix: EntityPrefix.USER,
      apiVersion: 'v1',
    });
    const accountId = IdGenerator.generate({
      prefix: EntityPrefix.ACCOUNT,
      apiVersion: 'v1',
    });

    // Hash password
    const hashedPassword = await hashPassword(credentials.password);

    // Create admin user
    const [adminUser] = await db
      .insert(user)
      .values({
        id: userId,
        email: credentials.email,
        name: "System Administrator",
        emailVerified: true,
        role: "admin", // Set admin role
        banned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create account record (for password authentication)
    await db.insert(account).values({
      id: accountId,
      userId: adminUser.id,
      accountId: adminUser.email, // Use email as account ID
      providerId: "credential", // Better Auth uses "credential" for email/password
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info("✓ Admin user created successfully!");
    logger.info("");
    logger.info("╔════════════════════════════════════════════════════════════╗");
    logger.info("║             DEFAULT ADMIN CREDENTIALS                      ║");
    logger.info("╠════════════════════════════════════════════════════════════╣");
    logger.info(`║  User ID:  ${adminUser.id.padEnd(45)} ║`);
    logger.info(`║  Email:    ${credentials.email.padEnd(45)} ║`);
    logger.info(`║  Password: ${credentials.password.padEnd(45)} ║`);

    if (credentials.wasGenerated) {
      logger.info("╠════════════════════════════════════════════════════════════╣");
      logger.info("║  ⚠️  PASSWORD WAS AUTO-GENERATED                           ║");
      logger.info("║  📋 SAVE THIS PASSWORD - IT WON'T BE SHOWN AGAIN           ║");
      logger.info("║  🔒 CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN          ║");
    } else {
      logger.info("╠════════════════════════════════════════════════════════════╣");
      logger.info("║  ℹ️  Password from environment variable                    ║");
    }

    logger.info("╚════════════════════════════════════════════════════════════╝");
    logger.info("");

    // Save to .admin-credentials file (gitignored) for reference
    if (credentials.wasGenerated) {
      const fs = await import('fs/promises');
      const path = await import('path');

      const credentialsFile = path.join(process.cwd(), '.admin-credentials.txt');
      const credentialsContent = `
ZUNO MARKETPLACE - ADMIN CREDENTIALS
=====================================
Generated: ${new Date().toISOString()}

User ID:  ${adminUser.id}
Email:    ${credentials.email}
Password: ${credentials.password}

⚠️  IMPORTANT SECURITY NOTICE:
- Change this password immediately after first login
- Delete this file after saving the credentials securely
- Never commit this file to version control
`;

      await fs.writeFile(credentialsFile, credentialsContent, 'utf-8');
      logger.info(`📁 Credentials also saved to: .admin-credentials.txt`);
      logger.info("   (This file is gitignored - delete after saving credentials)");
      logger.info("");
    }

  } catch (error) {
    logger.error("❌ Failed to create admin user", error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await seedDefaultAdmin();
    logger.info("✅ Admin seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Admin seeding failed", error);
    process.exit(1);
  }
}

// Run the seed script
main();
