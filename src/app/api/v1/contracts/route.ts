import { z } from "zod";
import { ApiWrapper, commonSchemas, withPagination, withSearch, withSort } from "@/shared/lib/api/api-handler";

// Validation schemas
const CreateContractSchema = z.object({
  address: commonSchemas.address,
  networkId: z.string().uuid(),
  abiId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  type: z.enum(["token", "nft", "defi", "dao", "bridge", "other"]).optional(),
  metadata: z.object({
    symbol: z.string().max(20).optional(),
    totalSupply: z.string().optional(),
    decimals: z.number().min(0).max(18).optional(),
    isProxy: z.boolean().optional(),
    implementation: commonSchemas.address.optional(),
  }).optional(),
  deployedAt: z.string().datetime().optional(),
  deployer: commonSchemas.address.optional(),
});

const ListContractsSchema = withSort(withSearch(withPagination(z.object({
  networkId: z.string().uuid().optional(),
  abiId: z.string().uuid().optional(),
  type: z.string().optional(),
  isVerified: z.enum(["true", "false"]).optional(),
  deployer: commonSchemas.address.optional(),
}))));

// GET /api/v1/contracts - List contracts
export const GET = ApiWrapper.create(
  async (input: z.infer<typeof ListContractsSchema>, context) => {
    // TODO: Implement with actual repositories
    // Mock response for now
    return {
      data: [
        {
          id: "mock-contract-id",
          address: "0x1234567890123456789012345678901234567890",
          networkId: "ethereum-mainnet",
          abiId: "mock-abi-id",
          name: "Mock ERC20 Token",
          type: "token",
          isVerified: true,
          metadata: {
            symbol: "MOCK",
            decimals: 18,
            totalSupply: "1000000000000000000000000",
          },
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: {
        page: input.page,
        limit: input.limit,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  },
  {
    validation: {
      query: ListContractsSchema,
    },
    auth: {
      required: false, // Public endpoint
    },
  }
);

// POST /api/v1/contracts - Register contract
export const POST = ApiWrapper.create(
  async (input: { body: z.infer<typeof CreateContractSchema> }, context) => {
    // TODO: Implement with actual use cases
    // const registerContractUseCase = new RegisterContractUseCase(
    //   contractRepository,
    //   abiRepository,
    //   cacheService
    // );

    // const result = await registerContractUseCase.execute(input.body);

    // Mock response for now
    return {
      id: "mock-contract-id",
      ...input.body,
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  {
    validation: {
      body: CreateContractSchema,
    },
    auth: {
      required: true,
      allowApiKey: true,
      allowSession: true,
      requiredPermissions: ["write:contracts"],
    },
  }
);