/**
 * Quick Database Data Check Script
 *
 * Check if database has data in main tables
 */

// Load environment variables first
import "dotenv/config";

import { db } from "@/infrastructure/database/drizzle/client";
import { abis, contracts, networks, user } from "@/infrastructure/database/drizzle/schema";
import { sql } from "drizzle-orm";

async function checkDatabaseData() {
  console.log("🔍 Checking database for existing data...\n");

  try {
    // Check Users
    const userCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(user);
    console.log(`👥 Users: ${userCount[0]?.count || 0} records`);

    // Check Networks
    const networkCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(networks);
    console.log(`🌐 Networks: ${networkCount[0]?.count || 0} records`);

    // Check Contracts
    const contractCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(contracts);
    console.log(`📄 Contracts: ${contractCount[0]?.count || 0} records`);

    // Check ABIs
    const abiCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(abis);
    console.log(`📋 ABIs: ${abiCount[0]?.count || 0} records`);

    const totalRecords =
      Number(userCount[0]?.count || 0) +
      Number(networkCount[0]?.count || 0) +
      Number(contractCount[0]?.count || 0) +
      Number(abiCount[0]?.count || 0);

    console.log(`\n📊 Total records: ${totalRecords}`);

    if (totalRecords === 0) {
      console.log("\n⚠️  Database is EMPTY. Run seed script:");
      console.log("   pnpm db:seed");
    } else {
      console.log("\n✅ Database has data!");

      // Show sample data
      console.log("\n📦 Sample data:");

      if (Number(networkCount[0]?.count || 0) > 0) {
        const sampleNetworks = await db
          .select({ id: networks.id, name: networks.name, chainId: networks.chainId })
          .from(networks)
          .limit(3);
        console.log("\n🌐 Networks:");
        sampleNetworks.forEach(n =>
          console.log(`   - ${n.name} (Chain ID: ${n.chainId})`)
        );
      }

      if (Number(abiCount[0]?.count || 0) > 0) {
        const sampleAbis = await db
          .select({ id: abis.id, name: abis.name, version: abis.version })
          .from(abis)
          .limit(3);
        console.log("\n📋 ABIs:");
        sampleAbis.forEach(a =>
          console.log(`   - ${a.name} v${a.version}`)
        );
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error checking database:", error);
    process.exit(1);
  }
}

// Run the check
checkDatabaseData();
