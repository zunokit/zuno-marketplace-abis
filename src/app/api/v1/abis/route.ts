import { z } from "zod";
import { ApiWrapper, commonSchemas, withPagination, withSearch, withSort } from "@/shared/lib/api/api-handler";

// Validation schemas
const CreateAbiSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  contractName: z.string().max(255).optional(),
  abi: commonSchemas.abi,
  tags: z.array(z.string()).max(10).default([]),
  standard: z.enum(["ERC20", "ERC721", "ERC1155", "ERC4626", "custom"]).optional(),
  metadata: z.object({
    originNetwork: z.string().optional(),
    compatibleNetworks: z.array(z.string()).optional(),
    compiler: z.string().optional(),
    compilerVersion: z.string().optional(),
    license: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    bytecode: z.string().optional(),
  }).optional(),
});

const ListAbisSchema = withSort(withSearch(withPagination(z.object({
  standard: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
  userId: z.string().optional(),
  compatibleNetworks: z.string().optional(), // Comma-separated networks
}))));

// GET /api/v1/abis - List ABIs
export const GET = ApiWrapper.create(
  async (input: z.infer<typeof ListAbisSchema>, context) => {
    // TODO: Implement with actual repositories
    // const abiRepository = new AbiRepositoryImpl();
    // const listParams = {
    //   page: input.page,
    //   limit: input.limit,
    //   sortBy: input.sortBy,
    //   sortOrder: input.sortOrder,
    //   query: input.query,
    //   filters: {
    //     standard: input.standard,
    //     tags: input.tags?.split(","),
    //     userId: input.userId,
    //     compatibleNetworks: input.compatibleNetworks?.split(","),
    //   },
    // };
    // return await abiRepository.list(listParams);

    // Mock response for now
    return {
      data: [],
      pagination: {
        page: input.page,
        limit: input.limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  },
  {
    validation: {
      query: ListAbisSchema,
    },
    auth: {
      required: false, // Public endpoint
    },
  }
);

// POST /api/v1/abis - Create ABI
export const POST = ApiWrapper.create(
  async (input: { body: z.infer<typeof CreateAbiSchema> }, context) => {
    // TODO: Implement with actual use cases
    // const createAbiUseCase = new CreateAbiUseCase(
    //   abiRepository,
    //   ipfsStorageService,
    //   cacheService
    // );

    // const result = await createAbiUseCase.execute({
    //   userId: context.user?.id || "anonymous",
    //   ...input.body,
    // });

    // return result;

    // Mock response for now
    return {
      id: "mock-abi-id",
      ...input.body,
      abiHash: "mock-hash",
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  {
    validation: {
      body: CreateAbiSchema,
    },
    auth: {
      required: true,
      allowApiKey: true,
      allowSession: true,
      requiredPermissions: ["write:abis"],
    },
  }
);