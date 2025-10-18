/**
 * GET /api/abis/full - List ABIs with full ABI JSON
 *
 * Purpose: Web3 integration endpoint
 * Returns full ABI data including JSON for contract interaction
 *
 * Use case:
 * - DApp needs to list ABIs and use them immediately
 * - Avoids N+1 query problem (list + detail for each)
 * - Single request to get all data needed
 *
 * Performance note:
 * - Heavier payload than /api/abis
 * - Should use with pagination (limit 10-20)
 * - Consider caching in CDN
 */

import { z } from "zod";
import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { ListAbisSchema } from "@/shared/lib/validation/abi.dto";
import { getAbiRepository } from "@/infrastructure/di/container";
import { AbiDtoMapper } from "@/shared/dto/abi.dto";
import { AbiQueryService } from "@/core/services/abi/abi-query.service";

export const GET = ApiWrapper.create<
  z.infer<typeof ListAbisSchema>,
  ReturnType<typeof AbiDtoMapper.toFullPaginatedResponseDto>
>(
  async (input, context) => {
    // Extract query from nested input structure
    const queryParams = (input as any).query || input;

    // 1. Build list params via service (business logic)
    const listParams = AbiQueryService.buildListParams(queryParams, context);

    // 2. Fetch data via repository (includes ABI field)
    const abiRepository = getAbiRepository();
    const result = await abiRepository.list(listParams);

    // 3. Convert to FULL DTOs (with ABI JSON)
    return AbiDtoMapper.toFullPaginatedResponseDto(result);
  },
  {
    validation: {
      query: ListAbisSchema,
    },
    auth: {
      required: true,
      allowApiKey: true,
      allowSession: true,
    },
  }
);
