/**
 * Contract ABI From Artifacts Seeder
 *
 * Senior-level implementation with:
 * - Extract ALL ABIs from out/ directory (not just deployed contracts)
 * - Batch processing with retry logic
 * - IPFS upload for production-grade storage
 * - Clean error handling and logging
 * - Type-safe artifact parsing
 * - Transaction support
 *
 * @author Senior Developer
 */

import { Seeder, SeedContext, SeedResult } from "../types";
import {
  abis,
  abiVersions,
} from "@/infrastructure/database/drizzle/schema/abis.schema";
import { contracts } from "@/infrastructure/database/drizzle/schema/contracts.schema";
import { networks } from "@/infrastructure/database/drizzle/schema/networks.schema";
import { IdGenerator, EntityPrefix } from "@/shared/lib/utils/id-generator";
import { AbiHasher } from "@/shared/lib/abi-utils/abi-hasher";
import { IPFSStorageService } from "@/infrastructure/storage/ipfs/pinata.adapter";
import { env } from "@/shared/config/env";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

/**
 * Type definitions for Foundry deployment artifacts
 */
interface DeploymentTransaction {
  hash: string;
  transactionType: "CREATE" | "CALL";
  contractName: string;
  contractAddress: string;
  transaction: {
    from: string;
    gas: string;
    value: string;
    input: string;
    nonce: string;
    chainId: string;
  };
}

interface DeploymentArtifact {
  transactions: DeploymentTransaction[];
}

interface ContractArtifact {
  abi: any[];
  bytecode: {
    object: string;
  };
  deployedBytecode: {
    object: string;
  };
  metadata:
    | {
        compiler?: {
          version?: string;
        };
      }
    | string; // Can be object or string depending on Foundry version
}

interface ContractData {
  name: string;
  address?: string; // Optional - only for deployed contracts
  deploymentTx?: string; // Optional - only for deployed contracts
  deployer?: string; // Optional - only for deployed contracts
  abi: any[];
  bytecode: string;
  compilerVersion: string;
  isDeployed: boolean; // Flag to distinguish deployed vs compiled contracts
}

/**
 * Get configuration from environment variables
 */
function getContractsConfig() {
  // ENV variables already contain absolute paths (e.g., E:/zuno-marketplace-contracts/out)
  const foundryOutDir = env.FOUNDRY_OUT_DIR;
  const foundryBroadcastDir = env.FOUNDRY_BROADCAST_DIR;

  return {
    CONTRACTS_DIR: foundryOutDir,
    DEPLOYMENT_FILE: path.join(
      foundryBroadcastDir,
      "DeployAll.s.sol/31337/run-latest.json"
    ),
    BATCH_SIZE: 10, // Process 10 contracts per batch (increased for more ABIs)
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
    ABI_VERSION: "1.0.0",
  };
}

export class ContractAbiFromArtifactsSeeder implements Seeder {
  name = "contract-abi-from-artifacts";
  dependencies: string[] = ["users", "networks", "api-versions"];
  parallel = false;

  private ipfsService: IPFSStorageService;

  constructor() {
    this.ipfsService = new IPFSStorageService();
  }

  async execute(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let created = 0;
    let skipped = 0;
    let updated = 0;

    try {
      context.logger?.section("Contract ABI From Artifacts Seeder");

      const config = getContractsConfig();

      // Validate prerequisites
      await this.validatePrerequisites(context, config);

      // Extract ALL ABIs from out/ directory
      context.logger?.info("Extracting ALL ABIs from out/ directory...");
      const contractsData = await this.extractAllArtifacts(context, config);

      if (contractsData.length === 0) {
        context.logger?.warn("No contracts found in out/ directory");
        return this.createResult(
          this.name,
          0,
          0,
          0,
          Date.now() - startTime,
          true
        );
      }

      context.logger?.info(
        `Found ${contractsData.length} total contracts (deployed + compiled)`
      );

      // Get network ID for Anvil (for deployed contracts only)
      const anvilNetwork = await context.db
        .select({ id: networks.id })
        .from(networks)
        .where(eq(networks.chainId, 31337))
        .limit(1);

      if (anvilNetwork.length === 0) {
        throw new Error(
          "Anvil network not found. Please run network seeder first."
        );
      }

      const networkId = anvilNetwork[0].id;
      const adminUserId = context.shared.adminUserId;

      if (!adminUserId) {
        throw new Error("Admin user ID not found in shared context");
      }

      // Process contracts in batches with retry logic
      const batches = this.chunkArray(contractsData, config.BATCH_SIZE);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        context.logger?.progress(
          i * config.BATCH_SIZE + batch.length,
          contractsData.length,
          `Processing contract batch ${i + 1}/${batches.length}`
        );

        const batchResult = await this.processBatchWithRetry(
          context,
          batch,
          networkId,
          adminUserId,
          config
        );

        created += batchResult.created;
        skipped += batchResult.skipped;
        updated += batchResult.updated;
      }

      const duration = Date.now() - startTime;

      context.logger?.success(
        `Contract ABI seeding completed: ${created} created, ${skipped} skipped, ${updated} updated`,
        { duration, total: contractsData.length }
      );

      return this.createResult(
        this.name,
        created,
        skipped,
        updated,
        duration,
        true
      );
    } catch (error: any) {
      const duration = Date.now() - startTime;

      context.logger?.error(`Contract ABI seeding failed: ${error.message}`, {
        error: error.message,
        stack: error.stack,
      });

      return this.createResult(
        this.name,
        created,
        skipped,
        updated,
        duration,
        false,
        error.message
      );
    }
  }

  /**
   * Validate prerequisites before seeding
   */
  private async validatePrerequisites(
    context: SeedContext,
    config: ReturnType<typeof getContractsConfig>
  ): Promise<void> {
    // Check if contracts directory exists
    if (!fs.existsSync(config.CONTRACTS_DIR)) {
      throw new Error(
        `Contracts directory not found: ${config.CONTRACTS_DIR}\n` +
          "Please ensure zuno-marketplace-contracts is compiled."
      );
    }

    // Check if deployment file exists (optional - for deployed contract info)
    if (!fs.existsSync(config.DEPLOYMENT_FILE)) {
      context.logger?.warn(
        `Deployment file not found: ${config.DEPLOYMENT_FILE}\n` +
          "Will extract only compiled contracts (no deployment info).\n" +
          "To include deployment info, run: forge script script/deploy/DeployAll.s.sol --broadcast"
      );
    } else {
      context.logger?.info(
        "Deployment file found, will include deployment info for deployed contracts"
      );
    }

    // Check IPFS service health
    const ipfsHealthy = await this.ipfsService.health();
    if (!ipfsHealthy) {
      context.logger?.warn(
        "IPFS service is not healthy. ABIs will still be saved to database."
      );
    }
  }

  /**
   * Extract ALL ABIs from out/ directory (deployed + compiled contracts)
   */
  private async extractAllArtifacts(
    context: SeedContext,
    config: ReturnType<typeof getContractsConfig>
  ): Promise<ContractData[]> {
    const contractsData: ContractData[] = [];
    const deployedContracts = new Map<
      string,
      { address: string; deploymentTx: string; deployer: string }
    >();

    // First, parse deployment artifacts to get deployed contract info
    if (fs.existsSync(config.DEPLOYMENT_FILE)) {
      try {
        const deploymentData: DeploymentArtifact = JSON.parse(
          fs.readFileSync(config.DEPLOYMENT_FILE, "utf-8")
        );

        for (const tx of deploymentData.transactions) {
          if (tx.transactionType === "CREATE") {
            deployedContracts.set(tx.contractName, {
              address: tx.contractAddress,
              deploymentTx: tx.hash,
              deployer: tx.transaction.from,
            });
          }
        }

        context.logger?.info(
          `Found ${deployedContracts.size} deployed contracts`
        );
      } catch (error: any) {
        context.logger?.warn(
          `Failed to parse deployment file: ${error.message}`
        );
      }
    } else {
      context.logger?.info(
        "Deployment file not found, will extract only compiled contracts"
      );
    }

    // Then, scan all artifacts in out/ directory
    const outDirs = fs.readdirSync(config.CONTRACTS_DIR);
    const contractSolDirs = outDirs.filter((dir) => dir.endsWith(".sol"));

    context.logger?.info(
      `Scanning ${contractSolDirs.length} contract directories...`
    );

    for (const solDir of contractSolDirs) {
      const contractName = solDir.replace(".sol", "");
      const artifactPath = path.join(
        config.CONTRACTS_DIR,
        solDir,
        `${contractName}.json`
      );

      if (!fs.existsSync(artifactPath)) {
        context.logger?.warn(
          `Artifact not found for ${contractName}, skipping...`
        );
        continue;
      }

      try {
        const artifact: ContractArtifact = JSON.parse(
          fs.readFileSync(artifactPath, "utf-8")
        );

        // Skip if no ABI (some artifacts might not have ABIs)
        if (!artifact.abi || artifact.abi.length === 0) {
          context.logger?.info(`Skipping ${contractName} - no ABI found`);
          continue;
        }

        // Parse compiler version from metadata
        let compilerVersion = "unknown";
        try {
          if (typeof artifact.metadata === "string") {
            const metadata = JSON.parse(artifact.metadata);
            compilerVersion = metadata.compiler?.version || "unknown";
          } else if (artifact.metadata?.compiler?.version) {
            compilerVersion = artifact.metadata.compiler.version;
          }
        } catch (error: any) {
          context.logger?.warn(
            `Failed to parse metadata for ${contractName}: ${error.message}`
          );
        }

        // Check if this contract was deployed
        const deployedInfo = deployedContracts.get(contractName);
        const isDeployed = !!deployedInfo;

        contractsData.push({
          name: contractName,
          address: deployedInfo?.address,
          deploymentTx: deployedInfo?.deploymentTx,
          deployer: deployedInfo?.deployer,
          abi: artifact.abi,
          bytecode: artifact.bytecode.object,
          compilerVersion,
          isDeployed,
        });

        context.logger?.info(
          `Extracted ${contractName} (${isDeployed ? "deployed" : "compiled"})`
        );
      } catch (error: any) {
        context.logger?.warn(
          `Failed to parse artifact for ${contractName}: ${error.message}`
        );
      }
    }

    // Sort by deployed first, then by name
    contractsData.sort((a, b) => {
      if (a.isDeployed && !b.isDeployed) return -1;
      if (!a.isDeployed && b.isDeployed) return 1;
      return a.name.localeCompare(b.name);
    });

    const deployedCount = contractsData.filter((c) => c.isDeployed).length;
    const compiledCount = contractsData.filter((c) => !c.isDeployed).length;

    context.logger?.info(
      `Extraction complete: ${deployedCount} deployed + ${compiledCount} compiled = ${contractsData.length} total`
    );

    return contractsData;
  }

  /**
   * Process a batch of contracts with retry logic
   */
  private async processBatchWithRetry(
    context: SeedContext,
    batch: ContractData[],
    networkId: string,
    adminUserId: string,
    config: ReturnType<typeof getContractsConfig>
  ): Promise<{ created: number; skipped: number; updated: number }> {
    let created = 0;
    let skipped = 0;
    let updated = 0;

    // Process contracts in parallel within the batch
    const results = await Promise.allSettled(
      batch.map(async (contractData) => {
        return this.processContractWithRetry(
          context,
          contractData,
          networkId,
          adminUserId,
          config.MAX_RETRIES,
          config
        );
      })
    );

    // Aggregate results
    for (const result of results) {
      if (result.status === "fulfilled") {
        const { created: c, skipped: s, updated: u } = result.value;
        created += c;
        skipped += s;
        updated += u;
      } else {
        context.logger?.error(
          `Batch processing error: ${result.reason.message}`
        );
        skipped++;
      }
    }

    return { created, skipped, updated };
  }

  /**
   * Process a single contract with retry logic
   */
  private async processContractWithRetry(
    context: SeedContext,
    contractData: ContractData,
    networkId: string,
    adminUserId: string,
    retriesLeft: number,
    config: ReturnType<typeof getContractsConfig>
  ): Promise<{ created: number; skipped: number; updated: number }> {
    try {
      return await this.processContract(
        context,
        contractData,
        networkId,
        adminUserId,
        config
      );
    } catch (error: any) {
      if (retriesLeft > 0) {
        context.logger?.warn(
          `Failed to process ${contractData.name}, retrying... (${retriesLeft} retries left)`
        );

        // Wait before retry
        await this.sleep(config.RETRY_DELAY);

        return this.processContractWithRetry(
          context,
          contractData,
          networkId,
          adminUserId,
          retriesLeft - 1,
          config
        );
      } else {
        context.logger?.error(
          `Failed to process ${contractData.name} after all retries: ${error.message}`
        );
        throw error;
      }
    }
  }

  /**
   * Process a single contract
   */
  private async processContract(
    context: SeedContext,
    contractData: ContractData,
    networkId: string,
    adminUserId: string,
    config: ReturnType<typeof getContractsConfig>
  ): Promise<{ created: number; skipped: number; updated: number }> {
    const {
      name,
      address,
      deploymentTx,
      deployer,
      abi,
      compilerVersion,
      isDeployed,
    } = contractData;

    // Generate IDs
    const abiHash = AbiHasher.generateHash(abi);
    const abiId = IdGenerator.generate({
      prefix: EntityPrefix.ABI,
      apiVersion: "v1",
    });

    // Check if ABI already exists
    const existingAbi = await context.db
      .select({ id: abis.id })
      .from(abis)
      .where(eq(abis.abiHash, abiHash))
      .limit(1);

    if (existingAbi.length > 0) {
      context.logger?.info(`ABI for ${name} already exists, skipping...`);
      return { created: 0, skipped: 1, updated: 0 };
    }

    // Upload to IPFS with File Group organization (with graceful fallback)
    let ipfsHash: string | null = null;
    let ipfsUrl: string | null = null;
    try {
      const ipfsResult = await this.ipfsService.storeAbi(abi, {
        name,
        contractName: name,
        version: config.ABI_VERSION,
        abiVersion: config.ABI_VERSION,
        apiVersion: "v1",
        standard: this.detectStandard(abi) || undefined,
        userId: adminUserId,
        groupName: "marketplace-abis", // Organize all ABIs in one group
      });

      if (ipfsResult) {
        ipfsHash = ipfsResult.hash;
        ipfsUrl = ipfsResult.url;
        const groupInfo = ipfsResult.groupId
          ? ` (group: ${ipfsResult.groupId})`
          : "";
        context.logger?.info(
          `Uploaded ${name} ABI to IPFS: ${ipfsHash}${groupInfo}`
        );
      }
    } catch (error: any) {
      context.logger?.warn(`IPFS upload failed for ${name}: ${error.message}`);
      // Continue without IPFS hash
    }

    // Insert ABI
    await context.db.insert(abis).values({
      id: abiId,
      userId: adminUserId,
      name,
      description: `ABI for ${name} contract ${
        isDeployed ? "from Foundry deployment" : "from compilation artifacts"
      }`,
      contractName: name,
      abi,
      abiHash,
      version: config.ABI_VERSION,
      ipfsHash: ipfsHash || undefined,
      ipfsUrl: ipfsUrl || undefined,
      standard: this.detectStandard(abi),
      tags: this.generateTags(name, isDeployed),
      metadata: {
        compiler: "solc",
        compilerVersion,
        isDeployed,
        source: isDeployed ? "deployment" : "compilation",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    context.logger?.info(
      `Created ABI: ${name} (${abiId}) ${
        isDeployed ? "[DEPLOYED]" : "[COMPILED]"
      }`
    );

    // Create ABI Version
    const abiVersionId = IdGenerator.generate({
      prefix: EntityPrefix.ABI_VERSION,
      apiVersion: "v1",
    });

    await context.db.insert(abiVersions).values({
      id: abiVersionId,
      abiId,
      version: config.ABI_VERSION,
      versionNumber: 1, // First version
      abi,
      abiHash,
      changeLog: isDeployed
        ? "Initial deployment from Foundry artifacts"
        : "Initial compilation from Foundry artifacts",
      ipfsHash: ipfsHash || undefined,
      ipfsUrl: ipfsUrl || undefined,
      createdAt: new Date(),
    });

    context.logger?.info(`Created ABI version: ${name} v${config.ABI_VERSION}`);

    // Create Contract record ONLY for deployed contracts
    if (isDeployed && address && deployer) {
      const contractId = IdGenerator.generate({
        prefix: EntityPrefix.CONTRACT,
        apiVersion: "v1",
      });

      await context.db.insert(contracts).values({
        id: contractId,
        abiId, // Schema uses abiId, not abiVersionId
        networkId,
        address,
        name, // Contract name
        isVerified: true, // Deployed contracts are verified
        verifiedAt: new Date(),
        verificationSource: "foundry", // Verified via Foundry deployment
        deployedAt: new Date(),
        deployer, // Schema uses deployer, not deployerAddress
        metadata: {
          deploymentTx, // Store deployment tx in metadata
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      context.logger?.info(`Created contract: ${name} on Anvil at ${address}`);
    } else {
      context.logger?.info(
        `Skipped contract record for ${name} (not deployed)`
      );
    }

    return { created: 1, skipped: 0, updated: 0 };
  }

  /**
   * Detect contract standard from ABI
   */
  private detectStandard(abi: any[]): string | null {
    const functionNames = abi
      .filter((item) => item.type === "function")
      .map((item) => item.name);

    const eventNames = abi
      .filter((item) => item.type === "event")
      .map((item) => item.name);

    // ERC20
    if (
      functionNames.includes("transfer") &&
      functionNames.includes("approve") &&
      functionNames.includes("totalSupply") &&
      functionNames.includes("balanceOf")
    ) {
      return "ERC20";
    }

    // ERC721
    if (
      functionNames.includes("ownerOf") &&
      functionNames.includes("safeTransferFrom") &&
      functionNames.includes("tokenURI") &&
      eventNames.includes("Transfer")
    ) {
      return "ERC721";
    }

    // ERC1155
    if (
      functionNames.includes("balanceOf") &&
      functionNames.includes("safeTransferFrom") &&
      functionNames.includes("uri") &&
      eventNames.includes("TransferSingle")
    ) {
      return "ERC1155";
    }

    // ERC2981 (Royalty Standard)
    if (
      functionNames.includes("royaltyInfo") &&
      functionNames.includes("supportsInterface")
    ) {
      return "ERC2981";
    }

    // ERC165 (Interface Detection)
    if (functionNames.includes("supportsInterface") && abi.length === 1) {
      return "ERC165";
    }

    // AccessControl
    if (
      functionNames.includes("hasRole") &&
      functionNames.includes("grantRole") &&
      functionNames.includes("revokeRole")
    ) {
      return "AccessControl";
    }

    // Ownable
    if (
      functionNames.includes("owner") &&
      functionNames.includes("transferOwnership") &&
      functionNames.includes("renounceOwnership")
    ) {
      return "Ownable";
    }

    // Pausable
    if (
      functionNames.includes("paused") &&
      functionNames.includes("pause") &&
      functionNames.includes("unpause")
    ) {
      return "Pausable";
    }

    // ReentrancyGuard
    if (
      functionNames.includes("_nonReentrantBefore") &&
      functionNames.includes("_nonReentrantAfter")
    ) {
      return "ReentrancyGuard";
    }

    return null;
  }

  /**
   * Generate tags from contract name
   */
  private generateTags(contractName: string, isDeployed: boolean): string[] {
    const tags: string[] = ["foundry", "marketplace"];

    // Add deployment-specific tags
    if (isDeployed) {
      tags.push("deployed", "anvil");
    } else {
      tags.push("compiled", "library");
    }

    const lowerName = contractName.toLowerCase();

    // Add specific tags based on contract name
    if (lowerName.includes("erc721")) tags.push("erc721", "nft");
    if (lowerName.includes("erc1155")) tags.push("erc1155", "nft");
    if (lowerName.includes("erc20")) tags.push("erc20", "token");
    if (lowerName.includes("exchange")) tags.push("exchange", "trading");
    if (lowerName.includes("auction")) tags.push("auction");
    if (lowerName.includes("factory")) tags.push("factory");
    if (lowerName.includes("registry")) tags.push("registry");
    if (lowerName.includes("hub")) tags.push("hub", "core");
    if (lowerName.includes("manager")) tags.push("manager");
    if (lowerName.includes("validator")) tags.push("validator", "security");
    if (lowerName.includes("verifier")) tags.push("verifier", "security");
    if (lowerName.includes("collection")) tags.push("collection", "nft");
    if (lowerName.includes("access")) tags.push("access", "security");
    if (lowerName.includes("emergency")) tags.push("emergency", "security");
    if (lowerName.includes("timelock")) tags.push("timelock", "security");
    if (lowerName.includes("fee")) tags.push("fee", "payment");
    if (lowerName.includes("royalty")) tags.push("royalty", "payment");
    if (lowerName.includes("listing")) tags.push("listing", "marketplace");
    if (lowerName.includes("offer")) tags.push("offer", "marketplace");
    if (lowerName.includes("bundle")) tags.push("bundle", "marketplace");

    // Add OpenZeppelin tags
    if (
      lowerName.includes("accesscontrol") ||
      lowerName.includes("ownable") ||
      lowerName.includes("pausable") ||
      lowerName.includes("reentrancyguard")
    ) {
      tags.push("openzeppelin", "security");
    }

    // Add interface tags
    if (lowerName.startsWith("i")) {
      tags.push("interface");
    }

    // Add library tags
    if (lowerName.includes("lib") || lowerName.includes("utils")) {
      tags.push("library", "utility");
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Utility: Sleep for delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Utility: Chunk array into batches
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Create standardized seed result
   */
  private createResult(
    seeder: string,
    created: number,
    skipped: number,
    updated: number,
    duration: number,
    success: boolean,
    error?: string
  ): SeedResult {
    return {
      seeder,
      created,
      skipped,
      updated,
      duration,
      success,
      error,
    };
  }
}
