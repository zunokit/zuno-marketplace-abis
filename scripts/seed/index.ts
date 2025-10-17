/**
 * Seed System Entry Point
 * Professional seed system with clean architecture
 */

import 'dotenv/config';
import { SeedOrchestrator } from './orchestrator';
import { NetworkSeeder } from './seeders/network.seeder';
import { UserSeeder } from './seeders/user.seeder';
import { ApiVersionSeeder } from './seeders/api-version.seeder';
import { AbiSeeder } from './seeders/abi.seeder';
import { SeedLogger } from './logger';
import { getSeedConfig, overrideConfig } from './config';

// Import database connection
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/infrastructure/database/drizzle/schema';
import { AdminSeeder } from './seeders/admin.seeder';
import { env } from '@/shared/config/env';

/**
 * Main seed function
 */
export async function seed(config?: {
  environment?: 'development' | 'staging' | 'production';
  clearExisting?: boolean;
  skipSeeders?: string[];
  batchSize?: number;
  useTransactions?: boolean;
  logLevel?: 'silent' | 'minimal' | 'verbose';
}): Promise<void> {
  const seedConfig = overrideConfig({ ...getSeedConfig(), ...config });
  const logger = new SeedLogger(seedConfig);

  try {
    logger.section('Initializing Seed System');

    // Initialize database connection
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    const db = drizzle(env.DATABASE_URL, { schema });

    logger.info('Database connection established');

    // Initialize orchestrator
    const orchestrator = new SeedOrchestrator(seedConfig);

    // Register seeders in dependency order
    orchestrator.register(new UserSeeder());
    orchestrator.register(new ApiVersionSeeder());
    orchestrator.register(new NetworkSeeder());
    orchestrator.register(new AbiSeeder());
    orchestrator.register(new AdminSeeder());

    // TODO: Register additional seeders as they are implemented
    // orchestrator.register(new ContractSeeder());

    logger.info(`Registered ${orchestrator.getSeeders().length} seeders`);

    // Execute seeding
    const results = await orchestrator.execute(db);

    // Check for failures
    const failedSeeders = results.filter((r) => !r.success);
    if (failedSeeders.length > 0) {
      logger.error(`${failedSeeders.length} seeders failed`);

      if (seedConfig.environment === 'production') {
        process.exit(1);
      }
    }

    logger.success('Seed system completed successfully');
  } catch (error: any) {
    logger.error(`Seed system failed: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });

    if (seedConfig.environment === 'production') {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

/**
 * CLI entry point
 */
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const config: any = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];

    if (key && value) {
      // Convert string values to appropriate types
      if (key === 'clearExisting') {
        config[key] = value === 'true';
      } else if (key === 'batchSize') {
        config[key] = parseInt(value);
      } else if (key === 'useTransactions') {
        config[key] = value === 'true';
      } else {
        config[key] = value;
      }
    }
  }

  // Run seeding
  seed(config)
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error.message);
      process.exit(1);
    });
}

// Export for programmatic use
export { SeedOrchestrator } from './orchestrator';
export { SeedLogger } from './logger';
export { getSeedConfig, overrideConfig } from './config';
export * from './types';
