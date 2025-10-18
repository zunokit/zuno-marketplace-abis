/**
 * Contract Seeder
 * Seeds sample contracts for testing
 */

import { Seeder, SeedContext, SeedResult } from "../types";
import { contracts } from "@/infrastructure/database/drizzle/schema/contracts.schema";
import { abis } from "@/infrastructure/database/drizzle/schema/abis.schema";
import { networks } from "@/infrastructure/database/drizzle/schema/networks.schema";
import { IdGenerator, EntityPrefix } from "@/shared/lib/utils/id-generator";
import { eq } from "drizzle-orm";

export class ContractSeeder implements Seeder {
  name = "contracts";
  dependencies: string[] = ["networks", "abis"];
  parallel = false;

  async execute(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let created = 0;
    let skipped = 0;
    const updated = 0;

    try {
      // Get existing ABIs and networks
      const existingAbis = await context.db.select().from(abis).limit(10);
      const existingNetworks = await context.db
        .select()
        .from(networks)
        .limit(10);

      if (existingAbis.length === 0) {
        context.logger?.warn("No ABIs found to create contracts for");
        return {
          seeder: this.name,
          created: 0,
          skipped: 0,
          updated: 0,
          duration: Date.now() - startTime,
          success: true,
        };
      }

      if (existingNetworks.length === 0) {
        context.logger?.warn("No networks found to create contracts for");
        return {
          seeder: this.name,
          created: 0,
          skipped: 0,
          updated: 0,
          duration: Date.now() - startTime,
          success: true,
        };
      }

      // Sample contract addresses (example addresses)
      const contractData = [
        {
          address: "0x6b175474e89094c44da98b954eedeac495271d0f",
          name: "DAI Stablecoin",
          type: "token",
          isVerified: true,
          verificationSource: "etherscan",
          metadata: {
            symbol: "DAI",
            decimals: 18,
            isProxy: false,
          },
          deployer: "0x9759a6ac90977b93b58547b4a71c78317f391a28",
        },
        {
          address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          name: "USD Coin",
          type: "token",
          isVerified: true,
          verificationSource: "etherscan",
          metadata: {
            symbol: "USDC",
            decimals: 6,
            isProxy: true,
            implementation: "0x43506849d7c04f9138d1a2050bbf3a0c054402dd",
          },
          deployer: "0x95ba4cf87d6723ad9c0db21737d862be80e93911",
        },
        {
          address: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
          name: "Bored Ape Yacht Club",
          type: "nft",
          isVerified: true,
          verificationSource: "etherscan",
          metadata: {
            symbol: "BAYC",
            isProxy: false,
          },
          deployer: "0xaba7161a7fb69c88e16ed9f455ce62b791ee4d03",
        },
        {
          address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
          name: "Uniswap V2 Router",
          type: "defi",
          isVerified: true,
          verificationSource: "etherscan",
          metadata: {
            isProxy: false,
          },
          deployer: "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f",
        },
        {
          address: "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",
          name: "Uniswap V3 Router",
          type: "defi",
          isVerified: true,
          verificationSource: "etherscan",
          metadata: {
            isProxy: false,
          },
          deployer: "0x1f98431c8ad98523631ae4a59f267346ea31f984",
        },
      ];

      // Create contracts for each ABI across different networks
      for (const contractInfo of contractData) {
        try {
          // Pick a random ABI and network
          const randomAbi =
            existingAbis[Math.floor(Math.random() * existingAbis.length)];
          const randomNetwork =
            existingNetworks[
              Math.floor(Math.random() * existingNetworks.length)
            ];

          const contractId = IdGenerator.generate({
            prefix: EntityPrefix.CONTRACT,
            apiVersion: "v1",
          });

          // Check if contract already exists on this network
          const existing = await context.db
            .select({ id: contracts.id })
            .from(contracts)
            .where(eq(contracts.address, contractInfo.address))
            .limit(1);

          if (existing.length > 0) {
            context.logger?.info(
              `Contract ${contractInfo.name} at ${contractInfo.address} already exists, skipping...`
            );
            skipped++;
            continue;
          }

          await context.db.insert(contracts).values({
            id: contractId,
            address: contractInfo.address,
            networkId: randomNetwork.id,
            abiId: randomAbi.id,
            name: contractInfo.name,
            type: contractInfo.type,
            isVerified: contractInfo.isVerified,
            verifiedAt: contractInfo.isVerified ? new Date() : undefined,
            verificationSource: contractInfo.verificationSource,
            metadata: contractInfo.metadata,
            deployer: contractInfo.deployer,
            deployedAt: new Date(Date.now() - Math.random() * 31536000000), // Random date within last year
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          context.logger?.info(
            `Created contract: ${contractInfo.name} at ${contractInfo.address} (${contractId})`
          );
          created++;
        } catch (error: any) {
          if (this.isUniqueConstraintError(error)) {
            context.logger?.info(
              `Contract ${contractInfo.name} at ${contractInfo.address} already exists, skipping...`
            );
            skipped++;
          } else {
            throw error;
          }
        }
      }

      const duration = Date.now() - startTime;

      context.logger?.success(
        `Contract seeding completed: ${created} created, ${skipped} skipped, ${updated} updated`,
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

      context.logger?.error(`Contract seeding failed: ${error.message}`, {
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
