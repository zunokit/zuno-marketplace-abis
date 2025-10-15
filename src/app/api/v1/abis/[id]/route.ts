import { z } from "zod";
import { ApiWrapper, commonSchemas, withId } from "@/shared/lib/api/api-handler";

// Validation schemas
const GetAbiSchema = withId(z.object({}));

const UpdateAbiSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  contractName: z.string().max(255).optional(),
  abi: commonSchemas.abi.optional(),
  tags: z.array(z.string()).max(10).optional(),
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
  changeLog: z.string().max(500).optional(),
});

// GET /api/v1/abis/[id] - Get ABI by ID
export const GET = ApiWrapper.create(
  async (input: z.infer<typeof GetAbiSchema>, context) => {
    const abiId = context.params?.id;

    if (!abiId) {
      throw new Error("ABI ID is required");
    }

    // TODO: Implement with actual repositories
    // const abiRepository = new AbiRepositoryImpl();
    // const cacheService = new CacheService();

    // Try cache first
    // let abi = await cacheService.getAbi(abiId);

    // if (!abi) {
    //   abi = await abiRepository.findById(abiId);
    //   if (abi) {
    //     await cacheService.cacheAbi(abiId, abi);
    //   }
    // }

    // if (!abi) {
    //   throw new AbiNotFoundError(abiId);
    // }

    // Check if user has permission to view (for private ABIs)
    // if (abi.isDeleted && abi.userId !== context.user?.id) {
    //   throw new AbiNotFoundError(abiId);
    // }

    // return abi;

    // Mock response for now
    return {
      id: abiId,
      name: "Mock ABI",
      description: "This is a mock ABI for testing",
      abi: [
        {
          type: "function",
          name: "transfer",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" }
          ],
          outputs: [{ name: "", type: "bool" }],
          stateMutability: "nonpayable"
        }
      ],
      abiHash: "mock-hash",
      version: "1.0.0",
      tags: ["ERC20"],
      standard: "ERC20",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  {
    validation: {
      params: GetAbiSchema,
    },
    auth: {
      required: false, // Public endpoint for non-deleted ABIs
    },
  }
);

// PUT /api/v1/abis/[id] - Update ABI
export const PUT = ApiWrapper.create(
  async (input: { body: z.infer<typeof UpdateAbiSchema> }, context) => {
    const abiId = context.params?.id;

    if (!abiId) {
      throw new Error("ABI ID is required");
    }

    // TODO: Implement with actual use cases
    // const updateAbiUseCase = new UpdateAbiUseCase(
    //   abiRepository,
    //   ipfsStorageService,
    //   cacheService
    // );

    // const result = await updateAbiUseCase.execute({
    //   abiId,
    //   userId: context.user?.id!,
    //   ...input.body,
    // });

    // return result;

    // Mock response for now
    return {
      id: abiId,
      ...input.body,
      updatedAt: new Date().toISOString(),
    };
  },
  {
    validation: {
      body: UpdateAbiSchema,
    },
    auth: {
      required: true,
      allowApiKey: true,
      allowSession: true,
      requiredPermissions: ["write:abis"],
    },
  }
);

// DELETE /api/v1/abis/[id] - Delete ABI (soft delete)
export const DELETE = ApiWrapper.create(
  async (input: unknown, context) => {
    const abiId = context.params?.id;

    if (!abiId) {
      throw new Error("ABI ID is required");
    }

    // TODO: Implement with actual repositories
    // const abiRepository = new AbiRepositoryImpl();
    // const cacheService = new CacheService();

    // Find the ABI
    // const abi = await abiRepository.findById(abiId);
    // if (!abi) {
    //   throw new AbiNotFoundError(abiId);
    // }

    // Check ownership
    // if (abi.userId !== context.user?.id) {
    //   throw new Error("You can only delete your own ABIs");
    // }

    // Soft delete
    // await abiRepository.softDelete(abiId);

    // Invalidate cache
    // await cacheService.invalidateAbi(abiId);
    // await cacheService.invalidateUser(context.user.id);

    // Mock response for now
    return {
      success: true,
      message: "ABI deleted successfully",
    };
  },
  {
    auth: {
      required: true,
      allowApiKey: true,
      allowSession: true,
      requiredPermissions: ["delete:abis"],
    },
  }
);