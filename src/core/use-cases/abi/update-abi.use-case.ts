import {
  AbiEntity,
  UpdateAbiParams,
  AbiNotFoundError,
  AbiInvalidError,
  AbiVersionEntity,
  AbiFactory,
} from "@/core/domain/abi/abi.entity";
import type { AbiRepository } from "@/core/domain/abi/abi.repository";
import { PinataStorageAdapter } from "@/infrastructure/storage/ipfs/pinata.adapter";
import { CacheAdapter } from "@/infrastructure/cache/cache.adapter";
import { AbiValidator } from "@/shared/lib/validation/abi-validator";
import { AbiHasher } from "@/shared/lib/abi-utils/abi-hasher";

export interface UpdateAbiUseCaseInput {
  abiId: string;
  userId: string;
  name?: string;
  description?: string;
  contractName?: string;
  abi?: unknown;
  tags?: string[];
  standard?: string;
  metadata?: {
    originNetwork?: string;
    compatibleNetworks?: string[];
    compiler?: string;
    compilerVersion?: string;
    license?: string;
    sourceUrl?: string;
    bytecode?: string;
  };
  changeLog?: string;
}

export interface UpdateAbiUseCaseOutput {
  abi: AbiEntity;
  newVersion?: AbiVersionEntity;
  ipfsHash?: string;
  ipfsUrl?: string;
}

export class UpdateAbiUseCase {
  constructor(
    private abiRepository: AbiRepository,
    private storageService: PinataStorageAdapter,
    private cacheService: CacheAdapter
  ) {}

  async execute(input: UpdateAbiUseCaseInput): Promise<UpdateAbiUseCaseOutput> {
    // 1. Find existing ABI
    const existingAbi = await this.abiRepository.findById(input.abiId);
    if (!existingAbi) {
      throw new AbiNotFoundError(input.abiId);
    }

    // 2. Check ownership
    if (existingAbi.userId !== input.userId) {
      throw new AbiInvalidError("You can only update your own ABIs");
    }

    // 3. Check if ABI is soft deleted
    if (existingAbi.isDeleted) {
      throw new AbiInvalidError("Cannot update deleted ABI");
    }

    let newVersion: AbiVersionEntity | undefined;
    let ipfsHash: string | undefined;
    let ipfsUrl: string | undefined;

    // 4. Handle ABI content update (creates new version)
    if (input.abi) {
      // Validate new ABI structure
      const validation = AbiValidator.validateWithBusinessRules(input.abi);
      if (!validation.isValid) {
        throw new AbiInvalidError(
          `ABI validation failed: ${validation.errors.map(e => e.message).join(", ")}`
        );
      }

      const typedAbi = input.abi as any[];

      // Validate standard if provided
      if (input.standard || existingAbi.standard) {
        const standard = input.standard || existingAbi.standard!;
        const standardValidation = AbiValidator.validateStandard(typedAbi, standard);
        if (!standardValidation.isValid) {
          throw new AbiInvalidError(
            `${standard} standard validation failed: ${standardValidation.errors.map(e => e.message).join(", ")}`
          );
        }
      }

      // Generate new ABI hash
      const newAbiHash = AbiHasher.hashAbi(typedAbi);

      // Check if ABI actually changed
      if (newAbiHash !== existingAbi.abiHash) {
        // Get next version number
        const versions = await this.abiRepository.findVersions(input.abiId);
        const nextVersionNumber = Math.max(...versions.map(v => v.versionNumber), 0) + 1;
        const nextVersion = this.generateNextVersion(existingAbi.version, nextVersionNumber);

        // Store new version in IPFS
        try {
          const ipfsResult = await this.storageService.storeAbiVersion(typedAbi, {
            name: input.name || existingAbi.name,
            version: nextVersion,
            changeLog: input.changeLog,
            previousHash: existingAbi.abiHash,
            userId: input.userId,
          });

          if (ipfsResult) {
            ipfsHash = ipfsResult.hash;
            ipfsUrl = ipfsResult.url;
          }
        } catch (error) {
          console.error("IPFS storage failed:", error);
          // Continue without IPFS - it's a backup storage
        }

        // Create version record
        newVersion = AbiFactory.createAbiVersion(
          {
            abiId: input.abiId,
            abi: typedAbi,
            changeLog: input.changeLog,
          },
          nextVersion,
          nextVersionNumber,
          newAbiHash
        );

        newVersion.ipfsHash = ipfsHash;
        newVersion.ipfsUrl = ipfsUrl;

        // Save version
        newVersion = await this.abiRepository.createVersion(newVersion);
      }
    }

    // 5. Update ABI metadata (excluding the ABI content itself)
    const updateParams: UpdateAbiParams = {
      name: input.name,
      description: input.description,
      contractName: input.contractName,
      tags: input.tags,
      standard: input.standard,
      metadata: input.metadata,
    };

    // If there's a new version, update the main ABI record
    if (newVersion) {
      updateParams.abi = newVersion.abi;
      updateParams.version = newVersion.version;
    }

    // 6. Update in database
    const updatedAbi = await this.abiRepository.update(input.abiId, updateParams);
    if (!updatedAbi) {
      throw new AbiNotFoundError(input.abiId);
    }

    // Update IPFS hash if new version was created
    if (newVersion) {
      updatedAbi.abiHash = newVersion.abiHash;
      updatedAbi.ipfsHash = newVersion.ipfsHash;
      updatedAbi.ipfsUrl = newVersion.ipfsUrl;
    }

    // 7. Invalidate cache
    await this.cacheService.del(`abi:${input.abiId}`);
    await this.cacheService.del(`user:${input.userId}:abis`);

    return {
      abi: updatedAbi,
      newVersion,
      ipfsHash,
      ipfsUrl,
    };
  }

  private generateNextVersion(currentVersion: string, versionNumber: number): string {
    // Simple version increment logic
    // In production, you might want more sophisticated semantic versioning
    const parts = currentVersion.split(".");
    const major = parseInt(parts[0]);
    const minor = parseInt(parts[1]);
    const patch = parseInt(parts[2]);

    // For now, increment patch version
    return `${major}.${minor}.${patch + 1}`;
  }
}