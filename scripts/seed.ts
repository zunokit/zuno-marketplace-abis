// Load environment variables first
import "dotenv/config";
import { db } from "@/infrastructure/database/drizzle";
import { networks } from "@/infrastructure/database/drizzle/schema/networks.schema";
import { abis } from "@/infrastructure/database/drizzle/schema/abis.schema";
import { user } from "@/infrastructure/database/drizzle/schema/auth.schema";
import { apiVersions } from "@/infrastructure/database/drizzle/schema/versions.schema";
import { eq } from "drizzle-orm";
import { AbiHasher } from "@/shared/lib/abi-utils/abi-hasher";
import { logger } from "@/shared/lib/utils/logger";
import { env } from "@/shared/config/env";
import { IdGenerator, EntityPrefix } from "@/shared/lib/utils/id-generator";
import { AbiVersionService } from "@/infrastructure/services/abi-version.service";

// Popular networks data
const networksData = [
  {
    chainId: 1,
    name: "Ethereum Mainnet",
    slug: "ethereum",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
    explorerUrls: ["https://etherscan.io"],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    isActive: true,
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },
  {
    chainId: 5,
    name: "Ethereum Goerli Testnet",
    slug: "goerli",
    type: "testnet",
    isTestnet: true,
    rpcUrls: [
      "https://goerli.infura.io/v3/",
      "https://rpc.ankr.com/eth_goerli",
    ],
    explorerUrls: ["https://goerli.etherscan.io"],
    nativeCurrency: {
      name: "Goerli Ether",
      symbol: "ETH",
      decimals: 18,
    },
    isActive: true,
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },
  {
    chainId: 11155111,
    name: "Ethereum Sepolia Testnet",
    slug: "sepolia",
    type: "testnet",
    isTestnet: true,
    rpcUrls: [
      "https://sepolia.infura.io/v3/",
      "https://rpc.ankr.com/eth_sepolia",
    ],
    explorerUrls: ["https://sepolia.etherscan.io"],
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
    isActive: true,
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },
  {
    chainId: 137,
    name: "Polygon Mainnet",
    slug: "polygon",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: ["https://polygon-rpc.com", "https://rpc.ankr.com/polygon"],
    explorerUrls: ["https://polygonscan.com"],
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    isActive: true,
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
  },
  {
    chainId: 80001,
    name: "Polygon Mumbai Testnet",
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
    isActive: true,
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
  },
  {
    chainId: 56,
    name: "BNB Smart Chain Mainnet",
    slug: "bsc",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: ["https://bsc-dataseed.binance.org", "https://rpc.ankr.com/bsc"],
    explorerUrls: ["https://bscscan.com"],
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    isActive: true,
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png",
  },
  {
    chainId: 97,
    name: "BNB Smart Chain Testnet",
    slug: "bsc-testnet",
    type: "testnet",
    isTestnet: true,
    rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545"],
    explorerUrls: ["https://testnet.bscscan.com"],
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    isActive: true,
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png",
  },
  {
    chainId: 42161,
    name: "Arbitrum One",
    slug: "arbitrum",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: ["https://arb1.arbitrum.io/rpc", "https://rpc.ankr.com/arbitrum"],
    explorerUrls: ["https://arbiscan.io"],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    isActive: true,
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
  },
  {
    chainId: 10,
    name: "Optimism Mainnet",
    slug: "optimism",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: ["https://mainnet.optimism.io", "https://rpc.ankr.com/optimism"],
    explorerUrls: ["https://optimistic.etherscan.io"],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    isActive: true,
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png",
  },
  {
    chainId: 43114,
    name: "Avalanche C-Chain",
    slug: "avalanche",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: [
      "https://api.avax.network/ext/bc/C/rpc",
      "https://rpc.ankr.com/avalanche",
    ],
    explorerUrls: ["https://snowtrace.io"],
    nativeCurrency: {
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
    },
    isActive: true,
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png",
  },
  {
    chainId: 250,
    name: "Fantom Opera",
    slug: "fantom",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: ["https://rpc.ftm.tools", "https://rpc.ankr.com/fantom"],
    explorerUrls: ["https://ftmscan.com"],
    nativeCurrency: {
      name: "Fantom",
      symbol: "FTM",
      decimals: 18,
    },
    isActive: true,
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/fantom/info/logo.png",
  },
  {
    chainId: 8453,
    name: "Base Mainnet",
    slug: "base",
    type: "mainnet",
    isTestnet: false,
    rpcUrls: ["https://mainnet.base.org", "https://base.llamarpc.com"],
    explorerUrls: ["https://basescan.org"],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    isActive: true,
    icon: "https://avatars.githubusercontent.com/u/108554348?s=200&v=4",
  },
];

// Sample ABIs (ERC20, ERC721, ERC1155)
const sampleAbis = [
  {
    name: "ERC20 Token Standard",
    description: "Standard interface for fungible tokens",
    contractName: "ERC20",
    version: "1.0.0",
    standard: "ERC20",
    tags: ["token", "erc20", "fungible", "standard"],
    abi: [
      {
        constant: true,
        inputs: [],
        name: "name",
        outputs: [{ name: "", type: "string" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [],
        name: "symbol",
        outputs: [{ name: "", type: "string" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", type: "uint8" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [],
        name: "totalSupply",
        outputs: [{ name: "", type: "uint256" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [{ name: "_owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "balance", type: "uint256" }],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "_to", type: "address" },
          { name: "_value", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ name: "", type: "bool" }],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "_from", type: "address" },
          { name: "_to", type: "address" },
          { name: "_value", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [{ name: "", type: "bool" }],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "_spender", type: "address" },
          { name: "_value", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [
          { name: "_owner", type: "address" },
          { name: "_spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        type: "function",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "from", type: "address" },
          { indexed: true, name: "to", type: "address" },
          { indexed: false, name: "value", type: "uint256" },
        ],
        name: "Transfer",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "owner", type: "address" },
          { indexed: true, name: "spender", type: "address" },
          { indexed: false, name: "value", type: "uint256" },
        ],
        name: "Approval",
        type: "event",
      },
    ],
  },
  {
    name: "ERC721 NFT Standard",
    description: "Standard interface for non-fungible tokens (NFTs)",
    contractName: "ERC721",
    version: "1.0.0",
    standard: "ERC721",
    tags: ["nft", "erc721", "non-fungible", "standard"],
    abi: [
      {
        constant: true,
        inputs: [{ name: "_owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [{ name: "_tokenId", type: "uint256" }],
        name: "ownerOf",
        outputs: [{ name: "", type: "address" }],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "_from", type: "address" },
          { name: "_to", type: "address" },
          { name: "_tokenId", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "_approved", type: "address" },
          { name: "_tokenId", type: "uint256" },
        ],
        name: "approve",
        outputs: [],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "_operator", type: "address" },
          { name: "_approved", type: "bool" },
        ],
        name: "setApprovalForAll",
        outputs: [],
        type: "function",
      },
      {
        constant: true,
        inputs: [{ name: "_tokenId", type: "uint256" }],
        name: "getApproved",
        outputs: [{ name: "", type: "address" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [
          { name: "_owner", type: "address" },
          { name: "_operator", type: "address" },
        ],
        name: "isApprovedForAll",
        outputs: [{ name: "", type: "bool" }],
        type: "function",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "from", type: "address" },
          { indexed: true, name: "to", type: "address" },
          { indexed: true, name: "tokenId", type: "uint256" },
        ],
        name: "Transfer",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "owner", type: "address" },
          { indexed: true, name: "approved", type: "address" },
          { indexed: true, name: "tokenId", type: "uint256" },
        ],
        name: "Approval",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "owner", type: "address" },
          { indexed: true, name: "operator", type: "address" },
          { indexed: false, name: "approved", type: "bool" },
        ],
        name: "ApprovalForAll",
        type: "event",
      },
    ],
  },
  {
    name: "ERC1155 Multi Token Standard",
    description: "Standard interface for multi token contracts",
    contractName: "ERC1155",
    version: "1.0.0",
    standard: "ERC1155",
    tags: ["multi-token", "erc1155", "standard", "nft", "fungible"],
    abi: [
      {
        constant: true,
        inputs: [
          { name: "_owner", type: "address" },
          { name: "_id", type: "uint256" },
        ],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [
          { name: "_owners", type: "address[]" },
          { name: "_ids", type: "uint256[]" },
        ],
        name: "balanceOfBatch",
        outputs: [{ name: "", type: "uint256[]" }],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "_operator", type: "address" },
          { name: "_approved", type: "bool" },
        ],
        name: "setApprovalForAll",
        outputs: [],
        type: "function",
      },
      {
        constant: true,
        inputs: [
          { name: "_owner", type: "address" },
          { name: "_operator", type: "address" },
        ],
        name: "isApprovedForAll",
        outputs: [{ name: "", type: "bool" }],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "_from", type: "address" },
          { name: "_to", type: "address" },
          { name: "_id", type: "uint256" },
          { name: "_value", type: "uint256" },
          { name: "_data", type: "bytes" },
        ],
        name: "safeTransferFrom",
        outputs: [],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "_from", type: "address" },
          { name: "_to", type: "address" },
          { name: "_ids", type: "uint256[]" },
          { name: "_values", type: "uint256[]" },
          { name: "_data", type: "bytes" },
        ],
        name: "safeBatchTransferFrom",
        outputs: [],
        type: "function",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "_operator", type: "address" },
          { indexed: true, name: "_from", type: "address" },
          { indexed: true, name: "_to", type: "address" },
          { indexed: false, name: "_id", type: "uint256" },
          { indexed: false, name: "_value", type: "uint256" },
        ],
        name: "TransferSingle",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "_operator", type: "address" },
          { indexed: true, name: "_from", type: "address" },
          { indexed: true, name: "_to", type: "address" },
          { indexed: false, name: "_ids", type: "uint256[]" },
          { indexed: false, name: "_values", type: "uint256[]" },
        ],
        name: "TransferBatch",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "_owner", type: "address" },
          { indexed: true, name: "_operator", type: "address" },
          { indexed: false, name: "_approved", type: "bool" },
        ],
        name: "ApprovalForAll",
        type: "event",
      },
    ],
  },
];

async function seedSystemUser(): Promise<string> {
  logger.info("Seeding system user...");

  try {
    const systemEmail = "system@zuno-marketplace.local";

    // Check if system user already exists
    const existing = await db
      .select()
      .from(user)
      .where(eq(user.email, systemEmail))
      .limit(1);

    if (existing.length > 0) {
      logger.info("System user already exists, skipping...");
      return existing[0].id;
    }

    // Create system user with friendly ID (default v1)
    const systemUserId = IdGenerator.generate({
      prefix: EntityPrefix.USER,
      apiVersion: 'v1',
    });
    const [systemUser] = await db
      .insert(user)
      .values({
        id: systemUserId,
        email: systemEmail,
        name: "System",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info(`✓ System user created: ${systemUser.id}`);
    return systemUser.id;
  } catch (error) {
    logger.error("Failed to create system user", error);
    throw error;
  }
}

async function seedPublicUser(): Promise<string> {
  logger.info("Seeding public API user...");

  const publicEmail = "public@zuno-marketplace.local";

  const existing = await db
    .select()
    .from(user)
    .where(eq(user.email, publicEmail))
    .limit(1);

  if (existing.length > 0) {
    logger.info(`Public user already exists: ${existing[0].id}`);
    return existing[0].id;
  }

  const publicUserId = IdGenerator.generate({
    prefix: EntityPrefix.USER,
    apiVersion: 'v1',
  });
  const [created] = await db
    .insert(user)
    .values({
      id: publicUserId,
      email: publicEmail,
      name: "Public API",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  logger.info(`✓ Public API user created: ${created.id}`);
  logger.info(`  Set PUBLIC_API_USER_ID=${created.id} in your .env file`);
  return created.id;
}

async function seedApiVersions() {
  logger.info("Seeding API versions...");

  const versions = [
    { id: "v1", label: "v1", isCurrent: true, deprecated: false },
    { id: "1.0", label: "1.0", isCurrent: false, deprecated: false },
    { id: "1", label: "1", isCurrent: false, deprecated: false },
  ];

  for (const v of versions) {
    const existing = await db
      .select()
      .from(apiVersions)
      .where(eq(apiVersions.id, v.id))
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(apiVersions).values({
      id: v.id,
      label: v.label,
      isCurrent: v.isCurrent,
      deprecated: v.deprecated,
      releasedAt: new Date(),
    });
    logger.info(`Seeded API version: ${v.id}`);
  }
}

async function seedNetworks() {
  logger.info("Seeding networks...");

  try {
    for (const networkData of networksData) {
      // Check if network already exists
      const existing = await db
        .select()
        .from(networks)
        .where(eq(networks.chainId, networkData.chainId))
        .limit(1);

      if (existing.length > 0) {
        logger.info(`Network ${networkData.name} already exists, skipping...`);
        continue;
      }

      // Generate friendly ID with API version
      const networkId = IdGenerator.generate({
        prefix: EntityPrefix.NETWORK,
        apiVersion: 'v1',
      });

      await db.insert(networks).values({
        id: networkId,
        ...networkData,
      });
      logger.info(`Seeded network: ${networkData.name} (${networkId})`);
    }

    logger.info(`✓ Seeded ${networksData.length} networks successfully`);
  } catch (error) {
    logger.error("Failed to seed networks", error);
    throw error;
  }
}

async function seedAbis(userId: string) {
  logger.info("Seeding sample ABIs...");

  try {
    for (const abiData of sampleAbis) {
      // Generate hash for the ABI
      const abiHash = AbiHasher.hashAbi(abiData.abi as any);

      // Check if ABI already exists
      const existing = await db
        .select()
        .from(abis)
        .where(eq(abis.abiHash, abiHash))
        .limit(1);

      if (existing.length > 0) {
        logger.info(`ABI ${abiData.name} already exists, skipping...`);
        continue;
      }

      // Generate friendly ID with API version AND ABI version
      const abiId = IdGenerator.generate({
        prefix: EntityPrefix.ABI,
        apiVersion: 'v1',
        entityVersion: abiData.version,
      });

      await db.insert(abis).values({
        id: abiId,
        userId: userId,
        name: abiData.name,
        description: abiData.description,
        contractName: abiData.contractName,
        version: abiData.version,
        abi: abiData.abi as any,
        abiHash: abiHash,
        standard: abiData.standard,
        tags: abiData.tags,
      });

      logger.info(`Seeded ABI: ${abiData.name} (${abiId})`);
    }

    logger.info(`✓ Seeded ${sampleAbis.length} ABIs successfully`);
  } catch (error) {
    logger.error("Failed to seed ABIs", error);
    throw error;
  }
}

async function main() {
  logger.info("Starting database seeding...");

  try {
    // Create system user first
    const systemUserId = await seedSystemUser();

    // Ensure public user exists
    await seedPublicUser();

    // Seed networks
    await seedNetworks();

    // Seed ABIs using the system user
    await seedAbis(systemUserId);

    // Seed API versions
    await seedApiVersions();

    logger.info("✓ Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    logger.error("Database seeding failed", error);
    process.exit(1);
  }
}

// Run the seed script
main();
