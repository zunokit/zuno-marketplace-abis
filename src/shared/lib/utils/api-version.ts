import { headers } from 'next/headers';
import { db } from '@/infrastructure/database/drizzle/client';
import { apiVersions } from '@/infrastructure/database/drizzle/schema/versions.schema';
import { eq } from 'drizzle-orm';

/**
 * API Version Utilities
 *
 * Provides utilities for managing API versioning throughout the application.
 * Uses Next.js headers() to access version set by middleware.
 *
 * @module ApiVersion
 */

/**
 * Get current API version from request headers
 *
 * This reads the X-Internal-API-Version header set by middleware.
 * Falls back to 'v1' if header is not present.
 *
 * @returns Promise<string> - API version (e.g., "v1", "v2")
 *
 * @example
 * const version = await getCurrentApiVersion();
 * // → "v1"
 */
export async function getCurrentApiVersion(): Promise<string> {
  try {
    const headersList = await headers();
    return headersList.get('X-Internal-API-Version') || 'v1';
  } catch {
    // Headers not available (e.g., in build time)
    return 'v1';
  }
}

/**
 * Validate if an API version is supported
 *
 * Checks against the api_versions table to ensure the version
 * is valid and not deprecated.
 *
 * @param version - Version string to validate (e.g., "v1")
 * @returns Promise<boolean> - True if valid and supported
 *
 * @example
 * const isValid = await validateApiVersion("v1");
 * // → true
 */
export async function validateApiVersion(version: string): Promise<boolean> {
  try {
    const [versionRecord] = await db
      .select()
      .from(apiVersions)
      .where(eq(apiVersions.id, version))
      .limit(1);

    if (!versionRecord) {
      return false;
    }

    // Check if deprecated
    if (versionRecord.deprecated) {
      return false;
    }

    return true;
  } catch {
    // On error, allow v1 as fallback
    return version === 'v1';
  }
}

/**
 * Get current/latest API version from database
 *
 * Retrieves the current active API version from the database.
 * Used for generating IDs with the correct version.
 *
 * @returns Promise<string> - Current API version
 *
 * @example
 * const current = await getCurrentApiVersionFromDb();
 * // → "v1"
 */
export async function getCurrentApiVersionFromDb(): Promise<string> {
  try {
    const [current] = await db
      .select()
      .from(apiVersions)
      .where(eq(apiVersions.isCurrent, true))
      .limit(1);

    return current?.id || 'v1';
  } catch {
    return 'v1';
  }
}

/**
 * Get all supported API versions
 *
 * Returns list of all non-deprecated API versions.
 * Useful for validation and documentation.
 *
 * @returns Promise<string[]> - Array of version strings
 *
 * @example
 * const versions = await getSupportedApiVersions();
 * // → ["v1", "1.0", "1"]
 */
export async function getSupportedApiVersions(): Promise<string[]> {
  try {
    const versions = await db
      .select({ id: apiVersions.id })
      .from(apiVersions)
      .where(eq(apiVersions.deprecated, false));

    return versions.map((v) => v.id);
  } catch {
    return ['v1'];
  }
}

/**
 * Extract API version from ID
 *
 * Parses an ID and extracts the API version component.
 *
 * @param id - ID string (e.g., "usr_v1_abc123")
 * @returns string | null - API version or null if invalid
 *
 * @example
 * const version = extractApiVersionFromId("usr_v1_abc123");
 * // → "v1"
 */
export function extractApiVersionFromId(id: string): string | null {
  const parts = id.split('_');
  if (parts.length >= 2) {
    return parts[1]; // Second part is API version
  }
  return null;
}
