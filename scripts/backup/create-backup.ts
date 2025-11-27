/**
 * Database Backup Script
 * Creates a backup of all data from PostgreSQL database
 * Stores backup as JSON files in the backups directory
 *
 * Usage: pnpm exec tsx scripts/backup/create-backup.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/infrastructure/database/drizzle/schema";
import * as fs from "fs";
import * as path from "path";

// Initialize database connection
function initializeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  return drizzle(databaseUrl, { schema });
}

// Logger utility
const logger = {
  info: (message: string) => console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
  error: (message: string) => console.error(`[ERROR] ${new Date().toISOString()} - ${message}`),
  success: (message: string) => console.log(`✅ ${new Date().toISOString()} - ${message}`),
};

// Generate backup filename with timestamp
function generateBackupFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `backup-${timestamp}.json`;
}

// Main backup function
async function createBackup(): Promise<void> {
  logger.info("Starting database backup...");

  const db = initializeDatabase();
  const backupDir = path.join(process.cwd(), "backups");
  const backupFilename = generateBackupFilename();
  const backupPath = path.join(backupDir, backupFilename);

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    logger.info(`Created backup directory: ${backupDir}`);
  }

  try {
    // Collect data from all tables
    logger.info("Fetching data from database tables...");

    const [networks, abis, abiVersions, contracts, auditLogs, users, apiKeys, apiVersions] =
      await Promise.all([
        db.select().from(schema.networks),
        db.select().from(schema.abis),
        db.select().from(schema.abiVersions),
        db.select().from(schema.contracts),
        db.select().from(schema.auditLogs),
        db.select().from(schema.user),
        db.select().from(schema.apiKey),
        db.select().from(schema.apiVersions),
      ]);

    // Create backup object
    const backup = {
      metadata: {
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        tables: {
          networks: networks.length,
          abis: abis.length,
          abiVersions: abiVersions.length,
          contracts: contracts.length,
          auditLogs: auditLogs.length,
          users: users.length,
          apiKeys: apiKeys.length,
          apiVersions: apiVersions.length,
        },
        totalRecords:
          networks.length +
          abis.length +
          abiVersions.length +
          contracts.length +
          auditLogs.length +
          users.length +
          apiKeys.length +
          apiVersions.length,
      },
      data: {
        networks,
        abis,
        abiVersions,
        contracts,
        auditLogs,
        users: users.map((user) => ({
          ...user,
          // Exclude sensitive fields from backup
          password: undefined,
        })),
        apiKeys: apiKeys.map((key) => ({
          ...key,
          // Exclude sensitive hash from backup
          key: undefined,
        })),
        apiVersions,
      },
    };

    // Write backup to file
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    logger.success(`Backup completed successfully!`);
    logger.info(`Backup file: ${backupPath}`);
    logger.info(`Total records backed up: ${backup.metadata.totalRecords}`);
    logger.info(`Table breakdown:`);

    Object.entries(backup.metadata.tables).forEach(([table, count]) => {
      logger.info(`  - ${table}: ${count} records`);
    });

    // Keep only the last 10 backups to save disk space
    const backupFiles = fs
      .readdirSync(backupDir)
      .filter((file) => file.startsWith("backup-") && file.endsWith(".json"))
      .sort()
      .reverse();

    if (backupFiles.length > 10) {
      const filesToDelete = backupFiles.slice(10);
      filesToDelete.forEach((file) => {
        fs.unlinkSync(path.join(backupDir, file));
        logger.info(`Deleted old backup: ${file}`);
      });
    }
  } catch (error: any) {
    logger.error(`Backup failed: ${error.message}`);
    throw error;
  }
}

// Run backup
createBackup()
  .then(() => {
    console.log("\n✅ Database backup completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Database backup failed:", error.message);
    process.exit(1);
  });
