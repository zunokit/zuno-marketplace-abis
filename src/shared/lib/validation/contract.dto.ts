import { z } from "zod";
import { commonSchemas, withPagination, withSearch, withSort } from "@/shared/lib/api/api-handler";

export const CreateContractSchema = z.object({
  address: commonSchemas.address,
  networkId: z.string().uuid(),
  abiId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  type: z.enum(["token", "nft", "defi", "dao", "bridge", "other"]).optional(),
  metadata: z
    .object({
      symbol: z.string().max(20).optional(),
      totalSupply: z.string().optional(),
      decimals: z.number().min(0).max(18).optional(),
      isProxy: z.boolean().optional(),
      implementation: commonSchemas.address.optional(),
    })
    .optional(),
  deployedAt: z.string().datetime().optional(),
  deployer: commonSchemas.address.optional(),
});

export const ListContractsSchema = withSort(
  withSearch(
    withPagination(
      z.object({
        networkId: z.string().uuid().optional(),
        abiId: z.string().uuid().optional(),
        type: z.string().optional(),
        isVerified: z.enum(["true", "false"]).optional(),
        deployer: commonSchemas.address.optional(),
      })
    )
  )
);

export const ContractAddressParamsSchema = z.object({ address: commonSchemas.address });
export const ContractVersionParamsSchema = z.object({
  address: commonSchemas.address,
  versionId: z.string().uuid(),
});
export const ContractNameParamsSchema = z.object({ name: z.string().min(1) });


