import { z } from "zod";
import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { CreateContractSchema, ListContractsSchema } from "@/shared/lib/validation/contract.dto";

// GET /api/contracts - List contracts
export const GET = ApiWrapper.create(
  async (input: z.infer<typeof ListContractsSchema>, context) => {
    // TODO: Implement with actual repositories
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
      query: ListContractsSchema,
    },
    auth: {
      required: false,
    },
  }
);

// POST /api/contracts - Register contract
export const POST = ApiWrapper.create(
  async (input: { body: z.infer<typeof CreateContractSchema> }, context) => {
    // TODO: Implement register use-case
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


