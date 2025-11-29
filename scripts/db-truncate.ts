/**
 * Database Truncate Script
 * Truncates all tables in the database (respecting foreign key constraints)
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { env } from '@/shared/config/env';

// Tables in order (children first, parents last)
const TABLES_TO_TRUNCATE = [
  // Children tables (have foreign keys)
  'audit_logs',
  'contracts',
  'abi_versions',
  
  // Middle level
  'abis',
  'api_versions',
  'rate_limits',
  
  // Auth tables
  'session',
  'account',
  'verification',
  'api_key',
  
  // Parent tables
  'networks',
  'user',
];

async function truncateAll(): Promise<void> {
  console.log('🗑️  Database Truncate Script');
  console.log('================================\n');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const db = drizzle(env.DATABASE_URL);

  console.log('📡 Connected to database\n');

  // Option 1: TRUNCATE CASCADE (faster, resets sequences)
  const useCascade = process.argv.includes('--cascade');
  
  if (useCascade) {
    console.log('⚠️  Using TRUNCATE CASCADE - this will truncate all related tables\n');
    
    for (const table of TABLES_TO_TRUNCATE) {
      try {
        await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`));
        console.log(`✅ Truncated: ${table}`);
      } catch (error: any) {
        if (error.message.includes('does not exist')) {
          console.log(`⏭️  Skipped (not exists): ${table}`);
        } else {
          console.log(`❌ Failed: ${table} - ${error.message}`);
        }
      }
    }
  } else {
    // Option 2: DELETE in order (respects FK constraints)
    console.log('📋 Deleting data in FK-safe order...\n');
    
    for (const table of TABLES_TO_TRUNCATE) {
      try {
        const result = await db.execute(sql.raw(`DELETE FROM "${table}"`));
        console.log(`✅ Cleared: ${table}`);
      } catch (error: any) {
        if (error.message.includes('does not exist')) {
          console.log(`⏭️  Skipped (not exists): ${table}`);
        } else if (error.message.includes('violates foreign key')) {
          console.log(`⚠️  FK violation: ${table} - try --cascade flag`);
        } else {
          console.log(`❌ Failed: ${table} - ${error.message}`);
        }
      }
    }
  }

  console.log('\n================================');
  console.log('✅ Database truncate completed!');
  console.log('\nNext steps:');
  console.log('  npm run db:seed    # Re-seed the database');
}

// Run
truncateAll()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Truncate failed:', error.message);
    process.exit(1);
  });
