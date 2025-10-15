import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { ContractAddressParamsSchema as ParamsSchema } from "@/shared/lib/validation/contract.dto";

// GET /api/contracts/[address]/versions
export const GET = ApiWrapper.create(
  async (_: unknown, context) => {
    const address = context.params?.address!;
    // TODO: return versions
    return { address, versions: [] };
  },
  { auth: { required: false }, validation: { params: ParamsSchema } }
);
