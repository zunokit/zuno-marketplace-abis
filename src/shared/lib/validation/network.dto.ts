import { z } from "zod";
import { withPagination } from "@/shared/lib/api/api-handler";

export const ListNetworksSchema = withPagination(
  z.object({
    type: z.enum(["mainnet", "testnet", "local"]).optional(),
    isActive: z.enum(["true", "false"]).optional(),
  })
);

export const ChainContractsParamsSchema = z.object({
  chainId: z.coerce.number().int().positive(),
});


