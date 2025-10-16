import { z } from "zod";
import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { ListNetworksSchema } from "@/shared/lib/validation/network.dto";
import { NetworkRepositoryImpl } from "@/infrastructure/database/repositories/network.repository.impl";

/**
 * GET /api/networks - List blockchain networks
 *
 * Returns a paginated list of supported blockchain networks.
 *
 * Query parameters:
 * - page, limit: Pagination
 * - query: Search by name, slug, or chain ID
 * - sortBy, sortOrder: Sorting
 * - type: Filter by network type (mainnet, testnet, local)
 * - isTestnet: Filter by testnet flag
 * - isActive: Filter by active status
 */
export const GET = ApiWrapper.create(
  async (input: z.infer<typeof ListNetworksSchema>) => {
    const networkRepository = new NetworkRepositoryImpl();

    // Special case: if "all" is requested (no pagination)
    if (input.all === "true") {
      const allNetworks = input.isActive === "true"
        ? await networkRepository.getAllActive()
        : await networkRepository.getAll();

      return {
        data: allNetworks,
        pagination: {
          page: 1,
          limit: allNetworks.length,
          total: allNetworks.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    // Build filters
    const filters: any = {};

    if (input.type) {
      filters.type = input.type;
    }

    if (input.isTestnet !== undefined) {
      filters.isTestnet = input.isTestnet === "true";
    }

    if (input.isActive !== undefined) {
      filters.isActive = input.isActive === "true";
    }

    // List networks with pagination
    const result = await networkRepository.list({
      page: input.page as number,
      limit: input.limit as number,
      sortBy: input.sortBy as any,
      sortOrder: input.sortOrder as "asc" | "desc",
      query: input.query as string | undefined,
      filters,
    });

    return result;
  },
  {
    validation: {
      query: ListNetworksSchema,
    },
    auth: {
      required: false, // Public endpoint
      allowApiKey: true,
      allowSession: true,
    },
  }
);


