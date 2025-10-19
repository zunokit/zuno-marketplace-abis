import { z } from "zod";
import {
  commonSchemas,
  withId,
  withPagination,
  withSearch,
  withSort,
} from "@/shared/lib/api/api-handler";

// Create ABI DTO
export const CreateAbiSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  contractName: z.string().max(255).optional(),
  abi: commonSchemas.abi,
  tags: z.array(z.string()).max(10).default([]),
  standard: z
    .enum(["ERC20", "ERC721", "ERC1155", "ERC4626", "custom"])
    .optional(),
  metadata: z
    .object({
      originNetwork: z.string().optional(),
      compatibleNetworks: z.array(z.string()).optional(),
      compiler: z.string().optional(),
      compilerVersion: z.string().optional(),
      license: z.string().optional(),
      sourceUrl: z.string().url().optional(),
      bytecode: z.string().optional(),
    })
    .optional(),
});

// Update ABI DTO
export const UpdateAbiSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  contractName: z.string().max(255).optional(),
  abi: commonSchemas.abi.optional(),
  tags: z.array(z.string()).max(10).optional(),
  standard: z
    .enum(["ERC20", "ERC721", "ERC1155", "ERC4626", "custom"])
    .optional(),
  metadata: z
    .object({
      originNetwork: z.string().optional(),
      compatibleNetworks: z.array(z.string()).optional(),
      compiler: z.string().optional(),
      compilerVersion: z.string().optional(),
      license: z.string().optional(),
      sourceUrl: z.string().url().optional(),
      bytecode: z.string().optional(),
    })
    .optional(),
  changeLog: z.string().max(500).optional(),
});

// List ABIs query DTO
export const ListAbisSchema = withSort(
  withSearch(
    withPagination(
      z.object({
        contractName: z.string().optional(),
        standard: z.string().optional(),
        tags: z.string().optional(), // Comma-separated tags
        userId: z.string().optional(),
        compatibleNetworks: z.string().optional(), // Comma-separated networks
      })
    )
  )
);

// Get by ID DTO
export const GetAbiSchema = withId(z.object({}));

export type CreateAbiDto = z.infer<typeof CreateAbiSchema>;
export type UpdateAbiDto = z.infer<typeof UpdateAbiSchema>;
export type ListAbisDto = z.infer<typeof ListAbisSchema>;
export type GetAbiDto = z.infer<typeof GetAbiSchema>;
