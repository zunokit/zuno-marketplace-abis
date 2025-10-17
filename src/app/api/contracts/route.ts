import { z } from "zod";
import { ApiWrapper } from "@/shared/lib/api/api-handler";
import {
  CreateContractSchema,
  ListContractsSchema,
} from "@/shared/lib/validation/contract.dto";
import {
  getContractRepository,
  getAbiRepository,
  getCacheService,
} from "@/infrastructure/di/container";
import { CreateContractUseCase } from "@/core/use-cases/contract/create-contract.use-case";
import {
  ContractDtoMapper,
  type PaginatedContractResponseDto,
  type CreatedContractResponseDto,
} from "@/shared/dto/contract.dto";
import { ContractQueryService } from "@/core/services/contract/contract-query.service";
import { AuthContextService } from "@/core/services/auth/auth-context.service";

/**
 * GET /api/contracts - List contracts with filtering, pagination, and search
 */
export const GET = ApiWrapper.create<
  z.infer<typeof ListContractsSchema>,
  PaginatedContractResponseDto
>(
  async (input, context) => {
    // Extract query from nested input structure
    const queryParams = (input as any).query || input;

    // 1. Build list params qua service
    const listParams = ContractQueryService.buildListParams(queryParams);

    // 2. Fetch data qua repository
    const contractRepository = getContractRepository();
    const result = await contractRepository.list(listParams);

    // 3. Convert sang DTOs
    return ContractDtoMapper.toPaginatedResponseDto(result);
  },
  {
    validation: {
      query: ListContractsSchema,
    },
    auth: {
      required: true, // Require API key
      allowApiKey: true,
      allowSession: true,
    },
  }
);

/**
 * POST /api/contracts - Register a new smart contract
 */
export const POST = ApiWrapper.create<
  { body: z.infer<typeof CreateContractSchema> },
  CreatedContractResponseDto
>(
  async (input, context) => {
    // 1. Extract user ID qua service
    const userId = AuthContextService.extractUserId(context);

    // 2. Create use case với DI
    const createContractUseCase = new CreateContractUseCase(
      getContractRepository(),
      getAbiRepository(),
      getCacheService()
    );

    // 3. Parse deployedAt if provided
    const deployedAt = input.body.deployedAt
      ? new Date(input.body.deployedAt)
      : undefined;

    // 4. Execute use case
    const result = await createContractUseCase.execute({
      userId,
      address: input.body.address,
      networkId: input.body.networkId,
      abiId: input.body.abiId,
      name: input.body.name,
      type: input.body.type,
      metadata: input.body.metadata,
      deployedAt,
      deployer: input.body.deployer,
    });

    // 5. Convert sang response DTO
    return ContractDtoMapper.toCreatedResponseDto(result.contract);
  },
  {
    validation: {
      body: CreateContractSchema,
    },
    auth: {
      required: true,
      allowApiKey: true,
      allowSession: true,
      requiredPermissions: ["contracts:write", "write:contracts"],
    },
  }
);


