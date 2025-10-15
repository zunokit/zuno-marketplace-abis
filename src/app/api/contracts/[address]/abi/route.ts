import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { ContractAddressParamsSchema as ParamsSchema } from "@/shared/lib/validation/contract.dto";

// GET /api/contracts/[address]/abi
export const GET = ApiWrapper.create(
  async (_: unknown, context) => {
    const address = context.params?.address!;
    // TODO: return latest ABI linked to contract
    return { address, abi: [] };
  },
  { auth: { required: false }, validation: { params: ParamsSchema } }
);
