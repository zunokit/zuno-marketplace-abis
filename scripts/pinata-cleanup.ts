/**
 * Pinata Cleanup Script
 *
 * Deletes all IPFS files tagged with appName: "zuno-marketplace-abis"
 * Use with caution - deletions are permanent!
 *
 * Usage:
 *   tsx scripts/pinata-cleanup.ts --dry-run   # Preview deletions
 *   tsx scripts/pinata-cleanup.ts             # Interactive confirmation
 *   tsx scripts/pinata-cleanup.ts --force     # Skip confirmation
 */

import 'dotenv/config';
import { createInterface } from 'node:readline';
import { IPFSClient } from '@/infrastructure/storage/ipfs/ipfs.client';
import { env } from '@/shared/config/env';
import { logger } from '@/shared/lib/utils/logger';

const APP_NAME = "zuno-marketplace-abis";
const PAGE_LIMIT = 100;
const DELAY_MS = 5000; // 5 seconds between deletions

export interface CleanupOptions {
  dryRun: boolean;
  force: boolean;
}

export interface CleanupResult {
  deleted: number;
  failed: number;
}

/**
 * Cleanup function that can be imported and called programmatically
 */
export async function cleanupPinataFiles(
  options: CleanupOptions
): Promise<CleanupResult> {
  const ipfs = IPFSClient.getInstance();

  // List files with appName filter
  const files = await ipfs.listPins({
    metadata: { appName: APP_NAME },
    pageLimit: PAGE_LIMIT,
  });

  if (!files || files.length === 0) {
    return { deleted: 0, failed: 0 };
  }

  let deleted = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const success = await ipfs.unpin(file.hash);
      if (success) {
        deleted++;
      } else {
        failed++;
      }

      // Delay to avoid rate limits
      if (files.indexOf(file) < files.length - 1) {
        await sleep(DELAY_MS);
      }
    } catch (error: any) {
      logger.error(`Failed to delete ${file.name}: ${error.message}`);
      failed++;
    }
  }

  return { deleted, failed };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  // Parse CLI flags
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');

  console.log('🧹 Pinata Cleanup Script');
  console.log('================================\n');

  // Validate env
  if (!env.PINATA_JWT) {
    throw new Error('PINATA_JWT environment variable is required');
  }

  const ipfs = IPFSClient.getInstance();

  // List files with appName filter
  console.log(`📋 Listing files with appName: "${APP_NAME}"...\n`);

  const files = await ipfs.listPins({
    metadata: { appName: APP_NAME },
    pageLimit: PAGE_LIMIT,
  });

  if (!files || files.length === 0) {
    console.log('✅ No files found with appName tag\n');
    return;
  }

  console.log(`Found ${files.length} file(s):\n`);

  // List files
  files.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name}`);
    console.log(`     Hash: ${file.hash}`);
    console.log(`     Size: ${formatBytes(file.size)}`);
    console.log(`     Date: ${file.pinDate}\n`);
  });

  // Dry run mode
  if (dryRun) {
    console.log('🔍 Dry run mode - no files will be deleted\n');
    console.log(`Would delete ${files.length} file(s)\n`);
    return;
  }

  // Confirmation prompt
  if (!force) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        `Delete ${files.length} file(s)? This cannot be undone! (yes/no): `,
        resolve
      );
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Cancelled\n');
      return;
    }
  }

  // Delete files
  console.log('\n🗑️  Deleting files...\n');

  const result = await cleanupPinataFiles({ dryRun: false, force: true });

  // Summary
  console.log('================================');
  console.log('✅ Cleanup completed!\n');
  console.log(`Total: ${files.length}`);
  console.log(`Deleted: ${result.deleted}`);
  console.log(`Failed: ${result.failed}\n`);
}

// Run
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  });
