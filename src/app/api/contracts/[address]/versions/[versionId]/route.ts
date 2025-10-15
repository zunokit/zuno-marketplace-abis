import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { ContractVersionParamsSchema as ParamsSchema } from "@/shared/lib/validation/contract.dto";

// GET /api/contracts/[address]/versions/[versionId]
export const GET = ApiWrapper.create(
  async (_: unknown, context) => {
    const { address, versionId } = context.params as any;
    // TODO: return specific version detail
    return { address, versionId };
  },
  { auth: { required: false }, validation: { params: ParamsSchema } }
);
