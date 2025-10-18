import { z } from "zod";
import { commonSchemas, withPagination, withSearch, withSort } from "@/shared/lib/api/api-handler";

export const CreateContractSchema = z.object({
  address: commonSchemas.address,
  networkId: z.string().min(1), // Support custom ID format (net_v1_...)
  abiId: z.string().min(1), // Support custom ID format (abi_v1_...)
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
        networkId: z.string().min(1).optional(), // Support custom ID format
        abiId: z.string().min(1).optional(), // Support custom ID format
        type: z.string().optional(),
        isVerified: z.enum(["true", "false"]).optional(),
        deployer: commonSchemas.address.optional(),
      })
    )
  )
);

export const UpdateContractSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(["token", "nft", "defi", "dao", "bridge", "other"]).optional(),
  abiId: z.string().min(1).optional(), // Support custom ID format
  isVerified: z.boolean().optional(),
  verificationSource: z.enum(["etherscan", "sourcify", "manual"]).optional(),
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

export const ContractAddressParamsSchema = z.object({ address: commonSchemas.address });
export const ContractVersionParamsSchema = z.object({
  address: commonSchemas.address,
  versionId: z.string().min(1), // Support custom ID format (abv_v1_...)
});
export const ContractNameParamsSchema = z.object({ name: z.string().min(1) });


