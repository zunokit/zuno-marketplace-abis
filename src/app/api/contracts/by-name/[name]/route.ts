import { ApiWrapper } from "@/shared/lib/api/api-handler";
import { ContractNameParamsSchema as ParamsSchema } from "@/shared/lib/validation/contract.dto";

// GET /api/contracts/by-name/[name]
export const GET = ApiWrapper.create(
  async (_: unknown, context) => {
    const name = context.params?.name!;
    // TODO: find contracts by name
    return { name, data: [] };
  },
  { auth: { required: false }, validation: { params: ParamsSchema } }
);
