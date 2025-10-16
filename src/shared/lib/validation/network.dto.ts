import { z } from "zod";
import { withPagination, withSearch, withSort } from "@/shared/lib/api/api-handler";

export const ListNetworksSchema = withSort(
  withSearch(
    withPagination(
      z.object({
        type: z.enum(["mainnet", "testnet", "local"]).optional(),
        isTestnet: z.enum(["true", "false"]).optional(),
        isActive: z.enum(["true", "false"]).optional(),
        all: z.enum(["true", "false"]).optional(), // Get all without pagination
      })
    )
  )
);

export const ChainContractsParamsSchema = z.object({
  chainId: z.coerce.number().int().positive(),
});


