import {
  ContractEntity,
  CreateContractParams,
  ContractFactory,
  ContractDuplicateError,
} from "@/core/domain/contract/contract.entity";
import { ContractRepository } from "@/core/domain/contract/contract.repository";
import type { AbiRepository } from "@/core/domain/abi/abi.repository";
import { AbiNotFoundError } from "@/core/domain/abi/abi.entity";
import type { ICacheService } from "@/infrastructure/di/container";
import { isValidAddress, isValidChainId, ErrorCode } from "@/shared/types";
import { ValidationError } from "@/shared/lib/utils/error-handler";

export interface RegisterContractUseCaseInput {
  address: string;
  networkId: string;
  abiId: string;
  name?: string;
  type?: string;
  metadata?: {
    symbol?: string;
    totalSupply?: string;
    decimals?: number;
    isProxy?: boolean;
    implementation?: string;
  };
  deployedAt?: Date;
  deployer?: string;
}

export interface RegisterContractUseCaseOutput {
  contract: ContractEntity;
}

export class RegisterContractUseCase {
  constructor(
    private contractRepository: ContractRepository,
    private abiRepository: AbiRepository,
    private cacheService: ICacheService
  ) {}

  async execute(input: RegisterContractUseCaseInput): Promise<RegisterContractUseCaseOutput> {
    // 1. Validate contract address format
    if (!isValidAddress(input.address)) {
      throw new ValidationError(`Invalid contract address: ${input.address}`);
    }

    // 2. Validate that ABI exists
    const abi = await this.abiRepository.findById(input.abiId);
    if (!abi) {
      throw new AbiNotFoundError(input.abiId);
    }

    // 3. Check if contract already exists on this network
    const existingContract = await this.contractRepository.findByAddress(
      input.address,
      input.networkId
    );

    if (existingContract) {
      throw new ContractDuplicateError(input.address, input.networkId);
    }

    // 4. Validate deployer address if provided
    if (input.deployer && !isValidAddress(input.deployer)) {
      throw new ValidationError(`Invalid deployer address: ${input.deployer}`);
    }

    // 5. Create contract entity
    const createParams: CreateContractParams = {
      address: input.address,
      networkId: input.networkId,
      abiId: input.abiId,
      name: input.name,
      type: input.type,
      metadata: input.metadata,
      deployedAt: input.deployedAt,
      deployer: input.deployer,
    };

    const contractEntity = ContractFactory.createContract(createParams);

    // 6. Save to database
    const savedContract = await this.contractRepository.create(contractEntity);

    // 7. Cache the result
    await this.cacheService.set(`contract:${savedContract.id}`, savedContract, 3600);

    return {
      contract: savedContract,
    };
  }
}

export interface UpdateContractAbiUseCaseInput {
  contractId: string;
  newAbiId: string;
  changeReason?: string;
}

export interface UpdateContractAbiUseCaseOutput {
  contract: ContractEntity;
  previousAbiId: string;
}

export class UpdateContractAbiUseCase {
  constructor(
    private contractRepository: ContractRepository,
    private abiRepository: AbiRepository,
    private cacheService: ICacheService
  ) {}

  async execute(input: UpdateContractAbiUseCaseInput): Promise<UpdateContractAbiUseCaseOutput> {
    // 1. Find existing contract
    const existingContract = await this.contractRepository.findById(input.contractId);
    if (!existingContract) {
      throw new Error(`Contract with id ${input.contractId} not found`);
    }

    // 2. Validate new ABI exists
    const newAbi = await this.abiRepository.findById(input.newAbiId);
    if (!newAbi) {
      throw new AbiNotFoundError(input.newAbiId);
    }

    // 3. Check if ABI is actually different
    if (existingContract.abiId === input.newAbiId) {
      return {
        contract: existingContract,
        previousAbiId: existingContract.abiId,
      };
    }

    const previousAbiId = existingContract.abiId;

    // 4. Update contract with new ABI
    const updatedContract = await this.contractRepository.update(input.contractId, {
      abiId: input.newAbiId,
    });

    if (!updatedContract) {
      throw new Error(`Failed to update contract ${input.contractId}`);
    }

    // 5. Invalidate caches
    await this.cacheService.del(`contract:${input.contractId}`);

    return {
      contract: updatedContract,
      previousAbiId,
    };
  }
}

export interface VerifyContractUseCaseInput {
  contractId: string;
  verificationSource: string;
  sourceCode?: string;
  compilerVersion?: string;
  optimizationEnabled?: boolean;
  constructorArgs?: string[];
}

export interface VerifyContractUseCaseOutput {
  contract: ContractEntity;
  verified: boolean;
}

export class VerifyContractUseCase {
  constructor(
    private contractRepository: ContractRepository,
    private cacheService: ICacheService
  ) {}

  async execute(input: VerifyContractUseCaseInput): Promise<VerifyContractUseCaseOutput> {
    // 1. Find existing contract
    const existingContract = await this.contractRepository.findById(input.contractId);
    if (!existingContract) {
      throw new Error(`Contract with id ${input.contractId} not found`);
    }

    // 2. Perform verification logic
    // In a real implementation, this would involve:
    // - Compiling the source code
    // - Comparing bytecode
    // - Validating constructor arguments
    const verified = await this.performVerification(existingContract, input);

    // 3. Update contract verification status
    const updatedContract = await this.contractRepository.update(input.contractId, {
      isVerified: verified,
      verificationSource: input.verificationSource,
    });

    if (!updatedContract) {
      throw new Error(`Failed to update contract verification ${input.contractId}`);
    }

    // 4. Invalidate caches
    await this.cacheService.del(`contract:${input.contractId}`);

    return {
      contract: updatedContract,
      verified,
    };
  }

  private async performVerification(
    contract: ContractEntity,
    input: VerifyContractUseCaseInput
  ): Promise<boolean> {
    // Simplified verification logic
    // In production, this would involve actual bytecode comparison

    // For demo purposes, we'll assume verification succeeds if:
    // 1. Source code is provided
    // 2. Verification source is from a trusted provider
    const trustedSources = ["etherscan", "sourcify", "blockscout"];

    return !!(
      input.sourceCode &&
      trustedSources.includes(input.verificationSource.toLowerCase())
    );
  }
}