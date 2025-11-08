/**
 * Contract ABI From Artifacts Seeder
 *
 * Senior-level implementation with:
 * - Batch processing with retry logic
 * - IPFS upload for production-grade storage
 * - Clean error handling and logging
 * - Type-safe deployment parsing
 * - Transaction support
 *
 * @author Senior Developer
 */

import { Seeder, SeedContext, SeedResult } from '../types';
import { abis, abiVersions } from '@/infrastructure/database/drizzle/schema/abis.schema';
import { contracts } from '@/infrastructure/database/drizzle/schema/contracts.schema';
import { networks } from '@/infrastructure/database/drizzle/schema/networks.schema';
import { IdGenerator, EntityPrefix } from '@/shared/lib/utils/id-generator';
import { AbiHasher } from '@/shared/lib/abi-utils/abi-hasher';
import { IPFSStorageService } from '@/infrastructure/storage/ipfs/pinata.adapter';
import { env } from '@/shared/config/env';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Type definitions for Foundry deployment artifacts
 */
interface DeploymentTransaction {
  hash: string;
  transactionType: 'CREATE' | 'CALL';
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
  metadata: {
    compiler?: {
      version?: string;
    };
  } | string; // Can be object or string depending on Foundry version
}

interface ContractData {
  name: string;
  address: string;
  deploymentTx: string;
  deployer: string;
  abi: any[];
  bytecode: string;
  compilerVersion: string;
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
    DEPLOYMENT_FILE: path.join(foundryBroadcastDir, 'DeployAll.s.sol/31337/run-latest.json'),
    BATCH_SIZE: 5, // Process 5 contracts per batch
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
    ABI_VERSION: '1.0.0',
  };
}

export class ContractAbiFromArtifactsSeeder implements Seeder {
  name = 'contract-abi-from-artifacts';
  dependencies: string[] = ['users', 'networks', 'api-versions'];
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
      context.logger?.section('Contract ABI From Artifacts Seeder');

      const config = getContractsConfig();

      // Validate prerequisites
      await this.validatePrerequisites(context, config);

      // Parse deployment artifacts
      context.logger?.info('Parsing deployment artifacts...');
      const contractsData = await this.parseDeploymentArtifacts(context, config);

      if (contractsData.length === 0) {
        context.logger?.warn('No contracts found in deployment artifacts');
        return this.createResult(this.name, 0, 0, 0, Date.now() - startTime, true);
      }

      context.logger?.info(`Found ${contractsData.length} deployed contracts`);

      // Get network ID for Anvil
      const anvilNetwork = await context.db
        .select({ id: networks.id })
        .from(networks)
        .where(eq(networks.chainId, 31337))
        .limit(1);

      if (anvilNetwork.length === 0) {
        throw new Error('Anvil network not found. Please run network seeder first.');
      }

      const networkId = anvilNetwork[0].id;
      const adminUserId = context.shared.adminUserId;

      if (!adminUserId) {
        throw new Error('Admin user ID not found in shared context');
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

      return this.createResult(this.name, created, skipped, updated, duration, true);

    } catch (error: any) {
      const duration = Date.now() - startTime;

      context.logger?.error(
        `Contract ABI seeding failed: ${error.message}`,
        { error: error.message, stack: error.stack }
      );

      return this.createResult(this.name, created, skipped, updated, duration, false, error.message);
    }
  }

  /**
   * Validate prerequisites before seeding
   */
  private async validatePrerequisites(context: SeedContext, config: ReturnType<typeof getContractsConfig>): Promise<void> {
    // Check if contracts directory exists
    if (!fs.existsSync(config.CONTRACTS_DIR)) {
      throw new Error(
        `Contracts directory not found: ${config.CONTRACTS_DIR}\n` +
        'Please ensure zuno-marketplace-contracts is compiled.'
      );
    }

    // Check if deployment file exists
    if (!fs.existsSync(config.DEPLOYMENT_FILE)) {
      throw new Error(
        `Deployment file not found: ${config.DEPLOYMENT_FILE}\n` +
        'Please run deployment script first: forge script script/deploy/DeployAll.s.sol'
      );
    }

    // Check IPFS service health
    const ipfsHealthy = await this.ipfsService.health();
    if (!ipfsHealthy) {
      context.logger?.warn('IPFS service is not healthy. ABIs will still be saved to database.');
    }
  }

  /**
   * Parse deployment artifacts from Foundry broadcast
   */
  private async parseDeploymentArtifacts(context: SeedContext, config: ReturnType<typeof getContractsConfig>): Promise<ContractData[]> {
    const deploymentData: DeploymentArtifact = JSON.parse(
      fs.readFileSync(config.DEPLOYMENT_FILE, 'utf-8')
    );

    const contractsData: ContractData[] = [];

    for (const tx of deploymentData.transactions) {
      // Only process CREATE transactions (contract deployments)
      if (tx.transactionType !== 'CREATE') {
        continue;
      }

      try {
        // Read contract artifact
        const artifactPath = path.join(
          config.CONTRACTS_DIR,
          `${tx.contractName}.sol`,
          `${tx.contractName}.json`
        );

        if (!fs.existsSync(artifactPath)) {
          context.logger?.warn(`Artifact not found for ${tx.contractName}, skipping...`);
          continue;
        }

        const artifact: ContractArtifact = JSON.parse(
          fs.readFileSync(artifactPath, 'utf-8')
        );

        // Parse compiler version from metadata (can be object or string)
        let compilerVersion = 'unknown';
        try {
          if (typeof artifact.metadata === 'string') {
            const metadata = JSON.parse(artifact.metadata);
            compilerVersion = metadata.compiler?.version || 'unknown';
          } else if (artifact.metadata?.compiler?.version) {
            compilerVersion = artifact.metadata.compiler.version;
          }
        } catch (error: any) {
          context.logger?.warn(`Failed to parse metadata for ${tx.contractName}: ${error.message}`);
        }

        contractsData.push({
          name: tx.contractName,
          address: tx.contractAddress,
          deploymentTx: tx.hash,
          deployer: tx.transaction.from,
          abi: artifact.abi,
          bytecode: artifact.bytecode.object,
          compilerVersion,
        });

      } catch (error: any) {
        context.logger?.warn(
          `Failed to parse artifact for ${tx.contractName}: ${error.message}`
        );
      }
    }

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
      if (result.status === 'fulfilled') {
        const { created: c, skipped: s, updated: u } = result.value;
        created += c;
        skipped += s;
        updated += u;
      } else {
        context.logger?.error(`Batch processing error: ${result.reason.message}`);
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
      return await this.processContract(context, contractData, networkId, adminUserId, config);
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
        context.logger?.error(`Failed to process ${contractData.name} after all retries: ${error.message}`);
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
    const { name, address, deploymentTx, deployer, abi, compilerVersion } = contractData;

    // Generate IDs
    const abiHash = AbiHasher.generateHash(abi);
    const abiId = IdGenerator.generate({
      prefix: EntityPrefix.ABI,
      apiVersion: 'v1',
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
        apiVersion: 'v1',
        standard: this.detectStandard(abi) || undefined,
        userId: adminUserId,
        groupName: 'marketplace-abis', // Organize all ABIs in one group
      });

      if (ipfsResult) {
        ipfsHash = ipfsResult.hash;
        ipfsUrl = ipfsResult.url;
        const groupInfo = ipfsResult.groupId ? ` (group: ${ipfsResult.groupId})` : '';
        context.logger?.info(`Uploaded ${name} ABI to IPFS: ${ipfsHash}${groupInfo}`);
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
      description: `ABI for ${name} contract from Foundry deployment`,
      contractName: name,
      abi,
      abiHash,
      version: config.ABI_VERSION,
      ipfsHash: ipfsHash || undefined,
      ipfsUrl: ipfsUrl || undefined,
      standard: this.detectStandard(abi),
      tags: this.generateTags(name),
      metadata: {
        compiler: 'solc',
        compilerVersion,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    context.logger?.info(`Created ABI: ${name} (${abiId})`);

    // Create ABI Version
    const abiVersionId = IdGenerator.generate({
      prefix: EntityPrefix.ABI_VERSION,
      apiVersion: 'v1',
    });

    await context.db.insert(abiVersions).values({
      id: abiVersionId,
      abiId,
      version: config.ABI_VERSION,
      versionNumber: 1, // First version
      abi,
      abiHash,
      changeLog: 'Initial deployment from Foundry artifacts',
      ipfsHash: ipfsHash || undefined,
      ipfsUrl: ipfsUrl || undefined,
      createdAt: new Date(),
    });

    context.logger?.info(`Created ABI version: ${name} v${config.ABI_VERSION}`);

    // Create Contract
    const contractId = IdGenerator.generate({
      prefix: EntityPrefix.CONTRACT,
      apiVersion: 'v1',
    });

    await context.db.insert(contracts).values({
      id: contractId,
      abiId, // Schema uses abiId, not abiVersionId
      networkId,
      address,
      name, // Contract name
      isVerified: true, // Deployed contracts are verified
      verifiedAt: new Date(),
      verificationSource: 'foundry', // Verified via Foundry deployment
      deployedAt: new Date(),
      deployer, // Schema uses deployer, not deployerAddress
      metadata: {
        deploymentTx, // Store deployment tx in metadata
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    context.logger?.info(`Created contract: ${name} on Anvil at ${address}`);

    return { created: 1, skipped: 0, updated: 0 };
  }

  /**
   * Detect contract standard from ABI
   */
  private detectStandard(abi: any[]): string | null {
    const functionNames = abi
      .filter((item) => item.type === 'function')
      .map((item) => item.name);

    // ERC20
    if (
      functionNames.includes('transfer') &&
      functionNames.includes('approve') &&
      functionNames.includes('totalSupply')
    ) {
      return 'ERC20';
    }

    // ERC721
    if (
      functionNames.includes('ownerOf') &&
      functionNames.includes('safeTransferFrom') &&
      functionNames.includes('tokenURI')
    ) {
      return 'ERC721';
    }

    // ERC1155
    if (
      functionNames.includes('balanceOf') &&
      functionNames.includes('safeTransferFrom') &&
      functionNames.includes('uri')
    ) {
      return 'ERC1155';
    }

    return null;
  }

  /**
   * Generate tags from contract name
   */
  private generateTags(contractName: string): string[] {
    const tags: string[] = ['foundry', 'marketplace', 'anvil'];

    const lowerName = contractName.toLowerCase();

    // Add specific tags based on contract name
    if (lowerName.includes('erc721')) tags.push('erc721', 'nft');
    if (lowerName.includes('erc1155')) tags.push('erc1155', 'nft');
    if (lowerName.includes('erc20')) tags.push('erc20', 'token');
    if (lowerName.includes('exchange')) tags.push('exchange', 'trading');
    if (lowerName.includes('auction')) tags.push('auction');
    if (lowerName.includes('factory')) tags.push('factory');
    if (lowerName.includes('registry')) tags.push('registry');
    if (lowerName.includes('hub')) tags.push('hub', 'core');
    if (lowerName.includes('manager')) tags.push('manager');
    if (lowerName.includes('validator')) tags.push('validator', 'security');
    if (lowerName.includes('verifier')) tags.push('verifier', 'security');

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
