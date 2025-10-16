/**
 * Seed script for popular blockchain networks
 *
 * This script populates the networks table with well-known blockchain networks
 * including Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, and testnets.
 *
 * Usage:
 * ```bash
 * pnpm tsx scripts/seed-networks.ts
 * ```
 */

import { NetworkRepositoryImpl } from "../src/infrastructure/database/repositories/network.repository.impl";
import { NetworkFactory } from "../src/core/domain/network/network.entity";
import { logger } from "../src/shared/lib/utils/logger";

const popularNetworks = [
  // Ethereum Mainnet
  {
    chainId: 1,
    name: "Ethereum",
    slug: "ethereum",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: [
      "https://eth.llamarpc.com",
      "https://rpc.ankr.com/eth",
      "https://ethereum.publicnode.com",
    ],
    explorerUrls: ["https://etherscan.io"],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },

  // Polygon Mainnet
  {
    chainId: 137,
    name: "Polygon",
    slug: "polygon",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: [
      "https://polygon-rpc.com",
      "https://rpc.ankr.com/polygon",
      "https://polygon.llamarpc.com",
    ],
    explorerUrls: ["https://polygonscan.com"],
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
  },

  // BNB Smart Chain
  {
    chainId: 56,
    name: "BNB Smart Chain",
    slug: "bsc",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: [
      "https://bsc-dataseed1.binance.org",
      "https://rpc.ankr.com/bsc",
      "https://bsc.publicnode.com",
    ],
    explorerUrls: ["https://bscscan.com"],
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png",
  },

  // Arbitrum One
  {
    chainId: 42161,
    name: "Arbitrum One",
    slug: "arbitrum",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: [
      "https://arb1.arbitrum.io/rpc",
      "https://rpc.ankr.com/arbitrum",
      "https://arbitrum.llamarpc.com",
    ],
    explorerUrls: ["https://arbiscan.io"],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
  },

  // Optimism
  {
    chainId: 10,
    name: "Optimism",
    slug: "optimism",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: [
      "https://mainnet.optimism.io",
      "https://rpc.ankr.com/optimism",
      "https://optimism.llamarpc.com",
    ],
    explorerUrls: ["https://optimistic.etherscan.io"],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png",
  },

  // Base
  {
    chainId: 8453,
    name: "Base",
    slug: "base",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: [
      "https://mainnet.base.org",
      "https://base.llamarpc.com",
      "https://base.publicnode.com",
    ],
    explorerUrls: ["https://basescan.org"],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    icon: "https://avatars.githubusercontent.com/u/108554348?s=280&v=4",
  },

  // Avalanche C-Chain
  {
    chainId: 43114,
    name: "Avalanche C-Chain",
    slug: "avalanche",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: [
      "https://api.avax.network/ext/bc/C/rpc",
      "https://rpc.ankr.com/avalanche",
      "https://avalanche.public-rpc.com",
    ],
    explorerUrls: ["https://snowtrace.io"],
    nativeCurrency: {
      name: "AVAX",
      symbol: "AVAX",
      decimals: 18,
    },
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png",
  },

  // Fantom Opera
  {
    chainId: 250,
    name: "Fantom Opera",
    slug: "fantom",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: [
      "https://rpc.ftm.tools",
      "https://rpc.ankr.com/fantom",
      "https://fantom.publicnode.com",
    ],
    explorerUrls: ["https://ftmscan.com"],
    nativeCurrency: {
      name: "Fantom",
      symbol: "FTM",
      decimals: 18,
    },
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/fantom/info/logo.png",
  },

  // ===== TESTNETS =====

  // Sepolia (Ethereum Testnet)
  {
    chainId: 11155111,
    name: "Sepolia",
    slug: "sepolia",
    type: "testnet",
    isTestnet: true,
    rpcUrls: [
      "https://rpc.sepolia.org",
      "https://rpc.ankr.com/eth_sepolia",
      "https://ethereum-sepolia.publicnode.com",
    ],
    explorerUrls: ["https://sepolia.etherscan.io"],
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },

  // Polygon Mumbai (being deprecated, but still used)
  {
    chainId: 80001,
    name: "Polygon Mumbai",
    slug: "mumbai",
    type: "testnet",
    isTestnet: true,
    rpcUrls: [
      "https://rpc-mumbai.maticvigil.com",
      "https://rpc.ankr.com/polygon_mumbai",
    ],
    explorerUrls: ["https://mumbai.polygonscan.com"],
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
  },

  // Polygon Amoy (new testnet)
  {
    chainId: 80002,
    name: "Polygon Amoy",
    slug: "amoy",
    type: "testnet",
    isTestnet: true,
    rpcUrls: [
      "https://rpc-amoy.polygon.technology",
      "https://polygon-amoy.drpc.org",
    ],
    explorerUrls: ["https://amoy.polygonscan.com"],
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
  },

  // BSC Testnet
  {
    chainId: 97,
    name: "BNB Smart Chain Testnet",
    slug: "bsc-testnet",
    type: "testnet",
    isTestnet: true,
    rpcUrls: [
      "https://data-seed-prebsc-1-s1.binance.org:8545",
      "https://bsc-testnet.publicnode.com",
    ],
    explorerUrls: ["https://testnet.bscscan.com"],
    nativeCurrency: {
      name: "tBNB",
      symbol: "tBNB",
      decimals: 18,
    },
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png",
  },

  // Arbitrum Sepolia
  {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    slug: "arbitrum-sepolia",
    type: "testnet",
    isTestnet: true,
    rpcUrls: [
      "https://sepolia-rollup.arbitrum.io/rpc",
      "https://arbitrum-sepolia.publicnode.com",
    ],
    explorerUrls: ["https://sepolia.arbiscan.io"],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
  },

  // Base Sepolia
  {
    chainId: 84532,
    name: "Base Sepolia",
    slug: "base-sepolia",
    type: "testnet",
    isTestnet: true,
    rpcUrls: [
      "https://sepolia.base.org",
      "https://base-sepolia.publicnode.com",
    ],
    explorerUrls: ["https://sepolia.basescan.org"],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    icon: "https://avatars.githubusercontent.com/u/108554348?s=280&v=4",
  },

  // Local Development
  {
    chainId: 31337,
    name: "Hardhat",
    slug: "hardhat",
    type: "local",
    isTestnet: true,
    rpcUrls: ["http://localhost:8545"],
    explorerUrls: [],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },

  {
    chainId: 1337,
    name: "Ganache",
    slug: "ganache",
    type: "local",
    isTestnet: true,
    rpcUrls: ["http://localhost:7545"],
    explorerUrls: [],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
];

async function seedNetworks() {
  try {
    logger.info("Starting network seeding...");

    const networkRepository = new NetworkRepositoryImpl();

    // Check existing networks
    const existingNetworks = await networkRepository.getAll();
    logger.info(`Found ${existingNetworks.length} existing networks`);

    let created = 0;
    let skipped = 0;

    for (const networkData of popularNetworks) {
      try {
        // Check if network already exists by chainId
        const exists = await networkRepository.existsByChainId(
          networkData.chainId
        );

        if (exists) {
          logger.info(`Network ${networkData.name} (${networkData.chainId}) already exists, skipping`);
          skipped++;
          continue;
        }

        // Create network entity
        const networkEntity = NetworkFactory.createNetwork(networkData);

        // Save to database
        await networkRepository.create(networkEntity);

        logger.info(`✓ Created network: ${networkData.name} (Chain ID: ${networkData.chainId})`);
        created++;
      } catch (error) {
        logger.error(
          `Failed to create network ${networkData.name}:`,
          error
        );
      }
    }

    logger.info("\n=== Network Seeding Complete ===");
    logger.info(`Created: ${created}`);
    logger.info(`Skipped: ${skipped}`);
    logger.info(`Total networks: ${created + existingNetworks.length}`);

    process.exit(0);
  } catch (error) {
    logger.error("Network seeding failed:", error);
    process.exit(1);
  }
}

// Run the seed script
seedNetworks();
