import { z } from "zod";
import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { ListNetworksSchema } from "@/shared/lib/validation/network.dto";

// GET /api/networks - List blockchain networks
export const GET = ApiWrapper.create(
  async (input: z.infer<typeof ListNetworksSchema>, context) => {
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
      query: ListNetworksSchema,
    },
    auth: {
      required: false,
    },
  }
);


