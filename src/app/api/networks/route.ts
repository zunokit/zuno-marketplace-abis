import { z } from "zod";
import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { ListNetworksSchema } from "@/shared/lib/validation/network.dto";
import { getNetworkRepository } from "@/infrastructure/di/container";
import {
  NetworkDtoMapper,
  type PaginatedNetworkResponseDto,
} from "@/shared/dto/network.dto";
import { NetworkQueryService } from "@/core/services/network/network-query.service";

/**
 * GET /api/networks - List blockchain networks
 */
export const GET = ApiWrapper.create<
  z.infer<typeof ListNetworksSchema>,
  PaginatedNetworkResponseDto
>(
  async (input, context) => {
    // Extract query from nested input structure
    const queryParams = (input as any).query || input;

    const networkRepository = getNetworkRepository();

    // Special case: if "all" is requested (no pagination)
    if (queryParams.all === "true") {
      const allNetworks = queryParams.isActive === "true"
        ? await networkRepository.getAllActive()
        : await networkRepository.getAll();

      const dtos = NetworkDtoMapper.toListDtos(allNetworks);

      return {
        data: dtos,
        pagination: {
          page: 1,
          limit: dtos.length,
          total: dtos.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    // 1. Build list params qua service
    const listParams = NetworkQueryService.buildListParams(queryParams);

    // 2. Fetch data qua repository
    const result = await networkRepository.list(listParams);

    // 3. Convert sang DTOs
    return NetworkDtoMapper.toPaginatedResponseDto(result);
  },
  {
    validation: {
      query: ListNetworksSchema,
    },
    auth: {
      required: true, // Require API key
      allowApiKey: true,
      allowSession: true,
    },
  }
);


