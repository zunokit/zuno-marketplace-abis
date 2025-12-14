/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  // If lengths differ, still compare all bytes to maintain constant time
  const aLen = Buffer.byteLength(a);
  const bLen = Buffer.byteLength(b);
  const maxLen = Math.max(aLen, bLen);

  const bufferA = Buffer.alloc(maxLen);
  const bufferB = Buffer.alloc(maxLen);

  Buffer.from(a).copy(bufferA);
  Buffer.from(b).copy(bufferB);

  let result = aLen === bLen ? 0 : 1;

  for (let i = 0; i < maxLen; i++) {
    result |= bufferA[i] ^ bufferB[i];
  }

  return result === 0;
}
