/**
 * ABI Version Seeder
 * Seeds sample ABI versions for testing
 */

import { Seeder, SeedContext, SeedResult } from "../types";
import { abiVersions, abis } from "@/infrastructure/database/drizzle/schema/abis.schema";
import { IdGenerator, EntityPrefix } from "@/shared/lib/utils/id-generator";
import { AbiHasher } from "@/shared/lib/abi-utils/abi-hasher";
import { eq } from "drizzle-orm";

export class AbiVersionSeeder implements Seeder {
  name = "abi-versions";
  dependencies: string[] = ["abis"];
  parallel = false;

  async execute(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let created = 0;
    let skipped = 0;
    const updated = 0;

    try {
      // Get existing ABIs
      const existingAbis = await context.db
        .select()
        .from(abis)
        .limit(10);

      if (existingAbis.length === 0) {
        context.logger?.warn("No ABIs found to create versions for");
        return {
          seeder: this.name,
          created: 0,
          skipped: 0,
          updated: 0,
          duration: Date.now() - startTime,
          success: true,
        };
      }

      // Create versions for each ABI
      for (const abi of existingAbis) {
        try {
          // Create version 2.0.0 - updated version
          const version2Abi = [
            ...(abi.abi as any[]),
            {
              inputs: [],
              name: "newFunction",
              outputs: [{ internalType: "bool", name: "", type: "bool" }],
              stateMutability: "view" as const,
              type: "function" as const,
            },
          ];

          const version2Id = IdGenerator.generate({
            prefix: EntityPrefix.ABI_VERSION,
            apiVersion: "v1",
          });
          const version2Hash = AbiHasher.generateHash(version2Abi);

          await context.db.insert(abiVersions).values({
            id: version2Id,
            abiId: abi.id,
            version: "2.0.0",
            versionNumber: 2,
            abi: version2Abi,
            abiHash: version2Hash,
            ipfsHash: null,
            ipfsUrl: null,
            changeLog: "Added newFunction for extended functionality",
            metadata: {
              breaking: false,
              deprecated: false,
            },
            createdAt: new Date(Date.now() + 86400000), // 1 day later
          });

          context.logger?.info(`Created version 2.0.0 for ABI: ${abi.name} (${version2Id})`);
          created++;

          // Create version 3.0.0 - breaking change
          const version3Abi = [
            {
              inputs: [
                { internalType: "address", name: "account", type: "address" },
              ],
              name: "balanceOfV3",
              outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
              stateMutability: "view" as const,
              type: "function" as const,
            },
          ];

          const version3Id = IdGenerator.generate({
            prefix: EntityPrefix.ABI_VERSION,
            apiVersion: "v1",
          });
          const version3Hash = AbiHasher.generateHash(version3Abi);

          await context.db.insert(abiVersions).values({
            id: version3Id,
            abiId: abi.id,
            version: "3.0.0",
            versionNumber: 3,
            abi: version3Abi,
            abiHash: version3Hash,
            ipfsHash: null,
            ipfsUrl: null,
            changeLog: "Breaking change: Restructured ABI with renamed functions",
            metadata: {
              breaking: true,
              deprecated: false,
            },
            createdAt: new Date(Date.now() + 172800000), // 2 days later
          });

          context.logger?.info(`Created version 3.0.0 for ABI: ${abi.name} (${version3Id})`);
          created++;

        } catch (error: any) {
          if (this.isUniqueConstraintError(error)) {
            context.logger?.info(
              `Version for ABI ${abi.name} already exists, skipping...`
            );
            skipped++;
          } else {
            throw error;
          }
        }
      }

      const duration = Date.now() - startTime;

      context.logger?.success(
        `ABI version seeding completed: ${created} created, ${skipped} skipped, ${updated} updated`,
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

      context.logger?.error(`ABI version seeding failed: ${error.message}`, {
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
