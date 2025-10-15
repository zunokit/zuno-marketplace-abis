import { z } from "zod";
import { ApiWrapper, ApiError } from "@/shared/lib/api/api-handler";
import { ContractAddressParamsSchema } from "@/shared/lib/validation/contract.dto";
import { ErrorCode } from "@/shared/types";

const ParamsSchema = ContractAddressParamsSchema;

// GET /api/contracts/[address]
export const GET = ApiWrapper.create(
  async (_: unknown, context) => {
    const address = context.params?.address;
    if (!address) {
      throw new ApiError(
        "Contract address is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }
    // TODO: Fetch contract by address (and default network if needed)
    return { address, message: "Contract detail placeholder" };
  },
  { auth: { required: false }, validation: { params: ParamsSchema } }
);

// PUT /api/contracts/[address]
export const PUT = ApiWrapper.create(
  async (_: { body: Record<string, unknown> }, context) => {
    const address = context.params?.address;
    if (!address) {
      throw new ApiError(
        "Contract address is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }
    // TODO: Update contract metadata/links
    return { address, updatedAt: new Date().toISOString() };
  },
  {
    auth: {
      required: true,
      allowApiKey: true,
      allowSession: true,
      requiredPermissions: ["contracts:write", "write:contracts"],
    },
    validation: { params: ParamsSchema },
  }
);

// DELETE /api/contracts/[address]
export const DELETE = ApiWrapper.create(
  async (_: unknown, context) => {
    const address = context.params?.address;
    if (!address) {
      throw new ApiError(
        "Contract address is required",
        ErrorCode.VALIDATION_ERROR,
        400
      );
    }
    // TODO: Soft delete contract
    return { success: true, deletedAt: new Date().toISOString() };
  },
  {
    auth: {
      required: true,
      allowApiKey: true,
      allowSession: true,
      requiredPermissions: ["contracts:delete", "delete:contracts"],
    },
    validation: { params: ParamsSchema },
  }
);
