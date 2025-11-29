/**
 * Resolve Network ID from Chain ID
 *
 * This utility converts user-friendly chainId (integer) to internal networkId (UUID)
 */

import { getNetworkRepository } from "@/infrastructure/di/container";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

/**
 * Resolve networkId from chainId
 *
 * @param chainId - Chain ID (number or string)
 * @returns Network ID (UUID string)
 * @throws ApiError if chainId is invalid or network not found
 */
export async function resolveNetworkId(chainId: string | number): Promise<string> {
  // Convert to number
  const chainIdNum = typeof chainId === 'string'
    ? parseInt(chainId, 10)
    : chainId;

  if (isNaN(chainIdNum)) {
    throw new ApiError(
      `Invalid chainId: must be a number, received '${chainId}'`,
      ErrorCode.VALIDATION_ERROR,
      400
    );
  }

  // Find network by chainId
  const networkRepository = getNetworkRepository();
  const network = await networkRepository.findByChainId(chainIdNum);

  if (!network) {
    throw new ApiError(
      `Network with chainId ${chainIdNum} not found`,
      ErrorCode.NOT_FOUND,
      404
    );
  }

  return network.id;
}
