import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { ContractNameParamsSchema as ParamsSchema } from "@/shared/lib/validation/contract.dto";

// GET /api/contracts/by-name/[name]/versions
export const GET = ApiWrapper.create(
  async (_: unknown, context) => {
    const name = context.params?.name!;
    // TODO: list versions for contracts with this name
    return { name, versions: [] };
  },
  { auth: { required: false }, validation: { params: ParamsSchema } }
);
