/**
 * ABI Seeder
 * Seeds sample ABIs for testing
 */

import { Seeder, SeedContext, SeedResult } from "../types";
import { abis } from "@/infrastructure/database/drizzle/schema/abis.schema";
import { IdGenerator, EntityPrefix } from "@/shared/lib/utils/id-generator";
import { AbiHasher } from "@/shared/lib/abi-utils/abi-hasher";

export class AbiSeeder implements Seeder {
  name = "abis";
  dependencies: string[] = ["users"];
  parallel = false;

  async execute(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let created = 0;
    let skipped = 0;
    const updated = 0;

    try {
      // Get admin user ID from shared context
      const adminUserId = context.shared.adminUserId;
      if (!adminUserId) {
        throw new Error("Admin user ID not found in shared context");
      }

      const abiData = [
        {
          name: "ERC20 Token",
          description: "Standard ERC20 token interface",
          contractName: "ERC20",
          abi: [
            {
              inputs: [],
              name: "name",
              outputs: [{ internalType: "string", name: "", type: "string" }],
              stateMutability: "view" as const,
              type: "function" as const,
            },
            {
              inputs: [],
              name: "symbol",
              outputs: [{ internalType: "string", name: "", type: "string" }],
              stateMutability: "view" as const,
              type: "function" as const,
            },
            {
              inputs: [],
              name: "decimals",
              outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
              stateMutability: "view" as const,
              type: "function" as const,
            },
            {
              inputs: [],
              name: "totalSupply",
              outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
              stateMutability: "view" as const,
              type: "function" as const,
            },
          ],
          standard: "ERC20",
          tags: ["token", "erc20", "standard"],
        },
        {
          name: "ERC721 NFT",
          description: "Standard ERC721 non-fungible token interface",
          contractName: "ERC721",
          abi: [
            {
              inputs: [
                { internalType: "address", name: "to", type: "address" },
                { internalType: "uint256", name: "tokenId", type: "uint256" },
              ],
              name: "mint",
              outputs: [],
              stateMutability: "nonpayable" as const,
              type: "function" as const,
            },
            {
              inputs: [
                { internalType: "uint256", name: "tokenId", type: "uint256" },
              ],
              name: "ownerOf",
              outputs: [{ internalType: "address", name: "", type: "address" }],
              stateMutability: "view" as const,
              type: "function" as const,
            },
          ],
          standard: "ERC721",
          tags: ["nft", "erc721", "standard"],
        },
      ];

      for (const abiInfo of abiData) {
        try {
          const abiId = IdGenerator.generate({
            prefix: EntityPrefix.ABI,
            apiVersion: "v1",
          });

          const abiHash = AbiHasher.generateHash(abiInfo.abi);

          await context.db.insert(abis).values({
            id: abiId,
            userId: adminUserId,
            name: abiInfo.name,
            description: abiInfo.description,
            contractName: abiInfo.contractName,
            abi: abiInfo.abi,
            abiHash: abiHash,
            standard: abiInfo.standard,
            tags: abiInfo.tags,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          context.logger?.info(`Created ABI: ${abiInfo.name} (${abiId})`);
          created++;
        } catch (error: any) {
          if (this.isUniqueConstraintError(error)) {
            context.logger?.info(
              `ABI ${abiInfo.name} already exists, skipping...`
            );
            skipped++;
          } else {
            throw error;
          }
        }
      }

      const duration = Date.now() - startTime;

      context.logger?.success(
        `ABI seeding completed: ${created} created, ${skipped} skipped, ${updated} updated`,
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

      context.logger?.error(`ABI seeding failed: ${error.message}`, {
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
