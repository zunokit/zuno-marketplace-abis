import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { ChainContractsParamsSchema as ParamsSchema } from "@/shared/lib/validation/network.dto";

// GET /api/networks/[chainId]/contracts
export const GET = ApiWrapper.create(
  async (_: unknown, context) => {
    const chainId = Number((context.params as any).chainId);
    // TODO: list contracts for chainId
    return { chainId, data: [] };
  },
  { auth: { required: false }, validation: { params: ParamsSchema } }
);
