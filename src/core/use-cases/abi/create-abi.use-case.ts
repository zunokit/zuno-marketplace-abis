import {
  AbiEntity,
  CreateAbiParams,
  AbiFactory,
  AbiDuplicateError,
  AbiInvalidError,
} from "@/core/domain/abi/abi.entity";
import type { AbiRepository } from "@/core/domain/abi/abi.repository";
import { AbiValidator } from "@/shared/lib/validation/abi-validator";
import { AbiHasher } from "@/shared/lib/abi-utils/abi-hasher";
import type { IStorageService, ICacheService } from "@/infrastructure/di/container";

export interface CreateAbiUseCaseInput {
  userId: string;
  name: string;
  description?: string;
  contractName?: string;
  abi: unknown;
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
}

export interface CreateAbiUseCaseOutput {
  abi: AbiEntity;
  ipfsHash?: string;
  ipfsUrl?: string;
}

export class CreateAbiUseCase {
  constructor(
    private abiRepository: AbiRepository,
    private storageService: IStorageService,
    private cacheService: ICacheService
  ) {}

  async execute(input: CreateAbiUseCaseInput): Promise<CreateAbiUseCaseOutput> {
    // 1. Validate ABI structure
    const validation = AbiValidator.validateWithBusinessRules(input.abi);
    if (!validation.isValid) {
      throw new AbiInvalidError(
        `ABI validation failed: ${validation.errors.map(e => e.message).join(", ")}`
      );
    }

    const typedAbi = input.abi as any[];

    // 2. Validate standard if provided
    if (input.standard) {
      const standardValidation = AbiValidator.validateStandard(typedAbi, input.standard);
      if (!standardValidation.isValid) {
        throw new AbiInvalidError(
          `${input.standard} standard validation failed: ${standardValidation.errors.map(e => e.message).join(", ")}`
        );
      }
    }

    // 3. Generate ABI hash
    const abiHash = AbiHasher.hashAbi(typedAbi);

    // 4. Check for duplicates
    const existingAbi = await this.abiRepository.findByHash(abiHash);
    if (existingAbi) {
      throw new AbiDuplicateError(abiHash);
    }

    // 5. Store ABI in IPFS
    let ipfsHash: string | undefined;
    let ipfsUrl: string | undefined;

    try {
      const ipfsResult = await this.storageService.storeAbi(typedAbi, {
        name: input.name,
        contractName: input.contractName,
        version: "1.0.0",
        standard: input.standard,
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

    // 6. Create ABI entity
    const createParams: CreateAbiParams = {
      userId: input.userId,
      name: input.name,
      description: input.description,
      contractName: input.contractName,
      abi: typedAbi,
      tags: input.tags,
      standard: input.standard,
      metadata: input.metadata,
    };

    const abiEntity = AbiFactory.createAbi(createParams, abiHash);
    abiEntity.ipfsHash = ipfsHash;
    abiEntity.ipfsUrl = ipfsUrl;

    // 7. Save to database
    const savedAbi = await this.abiRepository.create(abiEntity);

    // 8. Cache the result
    await this.cacheService.set(`abi:${savedAbi.id}`, savedAbi, 3600);

    // 9. Invalidate user's ABI list cache
    await this.cacheService.del(`user:${input.userId}:abis`);

    return {
      abi: savedAbi,
      ipfsHash,
      ipfsUrl,
    };
  }
}