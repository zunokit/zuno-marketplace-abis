/**
 * Network Seeder
 * Professional seeder for network data with proper error handling and validation
 */

import { Seeder, SeedContext, SeedResult } from '../types';
import { NetworkDataProvider } from '../data-providers/network.provider';
import { networks } from '@/infrastructure/database/drizzle/schema/networks.schema';
import { eq } from 'drizzle-orm';

export class NetworkSeeder implements Seeder {
  name = 'networks';
  dependencies: string[] = [];
  parallel = false;

  private provider: NetworkDataProvider;

  constructor() {
    this.provider = new NetworkDataProvider();
  }

  async execute(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let created = 0;
    let skipped = 0;
    let updated = 0;

    try {
      // Get network data
      const networkData = await this.provider.getAll();
      
      if (networkData.length === 0) {
        return {
          seeder: this.name,
          created: 0,
          skipped: 0,
          updated: 0,
          duration: Date.now() - startTime,
          success: true
        };
      }

      // Clear existing networks if configured
      if (context.config.clearExisting) {
        await this.clearExistingNetworks(context);
      }

      // Process networks in batches
      const batchSize = context.config.batchSize;
      const batches = this.chunkArray(networkData, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        context.logger?.progress(
          i * batchSize + batch.length, 
          networkData.length, 
          `Processing network batch ${i + 1}/${batches.length}`
        );

        const batchResult = await this.processBatch(context, batch);
        created += batchResult.created;
        skipped += batchResult.skipped;
        updated += batchResult.updated;
      }

      const duration = Date.now() - startTime;
      
      context.logger?.success(
        `Network seeding completed: ${created} created, ${skipped} skipped, ${updated} updated`,
        { duration, total: networkData.length }
      );

      return {
        seeder: this.name,
        created,
        skipped,
        updated,
        duration,
        success: true
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      context.logger?.error(
        `Network seeding failed: ${error.message}`,
        { error: error.message, stack: error.stack }
      );

      return {
        seeder: this.name,
        created,
        skipped,
        updated,
        duration,
        success: false,
        error: error.message
      };
    }
  }

  private async clearExistingNetworks(context: SeedContext): Promise<void> {
    try {
      // Check if there are any existing networks
      const existingCount = await context.db
        .select({ count: networks.id })
        .from(networks)
        .limit(1);

      if (existingCount.length > 0) {
        context.logger?.info('Clearing existing networks...');
        
        // Delete in batches to avoid timeout
        let deletedCount = 0;
        const batchSize = 100;
        
        while (true) {
          const batch = await context.db
            .select({ id: networks.id })
            .from(networks)
            .limit(batchSize);
          
          if (batch.length === 0) break;
          
          const ids = batch.map((row: { id: string }) => row.id);
          await context.db
            .delete(networks)
            .where(eq(networks.id, ids[0])); // Delete one by one to avoid FK issues
          
          deletedCount += batch.length;
        }
        
        context.logger?.info(`Cleared ${deletedCount} existing networks`);
      }
    } catch (error: any) {
      context.logger?.warn(`Failed to clear existing networks: ${error.message}`);
      // Don't throw - continue with seeding
    }
  }

  private async processBatch(
    context: SeedContext, 
    batch: any[]
  ): Promise<{ created: number; skipped: number; updated: number }> {
    let created = 0;
    let skipped = 0;
    const updated = 0;

    for (const networkData of batch) {
      try {
        // Validate data
        const isValid = await this.provider.validate(networkData);
        if (!isValid) {
          context.logger?.warn(`Invalid network data, skipping: ${networkData.name}`);
          skipped++;
          continue;
        }

        // Transform data
        const transformedData = await this.provider.transform(networkData);

        // Check if network already exists
        const existing = await context.db
          .select({ id: networks.id })
          .from(networks)
          .where(eq(networks.chainId, transformedData.chainId))
          .limit(1);

        if (existing.length > 0) {
          context.logger?.info(`Network ${transformedData.name} (chainId: ${transformedData.chainId}) already exists, skipping...`);
          skipped++;
          continue;
        }

        // Insert network
        await context.db.insert(networks).values({
          id: transformedData.id,
          chainId: transformedData.chainId,
          name: transformedData.name,
          slug: transformedData.slug,
          type: transformedData.type,
          isTestnet: transformedData.isTestnet,
          rpcUrls: transformedData.rpcUrls,
          explorerUrls: transformedData.explorerUrls,
          nativeCurrency: transformedData.nativeCurrency,
          isActive: transformedData.isActive,
          icon: transformedData.icon
        });

        context.logger?.info(`Created network: ${transformedData.name} (${transformedData.id})`);
        created++;

      } catch (error: any) {
        // Handle specific error types
        if (this.isUniqueConstraintError(error)) {
          context.logger?.info(`Network ${networkData.name} (chainId: ${networkData.chainId}) already exists, skipping...`);
          skipped++;
        } else {
          context.logger?.error(`Failed to seed network ${networkData.name}: ${error.message}`);
          throw error; // Re-throw to be handled by the main try-catch
        }
      }
    }

    return { created, skipped, updated };
  }

  private isUniqueConstraintError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('duplicate key') ||
      message.includes('unique constraint') ||
      message.includes('already exists') ||
      message.includes('violates unique constraint')
    );
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
