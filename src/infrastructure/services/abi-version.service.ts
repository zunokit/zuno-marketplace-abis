import { db } from "@/infrastructure/database/drizzle/client";
import { abis } from "@/infrastructure/database/drizzle/schema/abis.schema";
import { eq, desc } from "drizzle-orm";
import { logger } from "@/shared/lib/utils/logger";
import {
  tryCatch,
  type TryCatchResult,
} from "@/shared/lib/utils/try-catch-wrapper";
import { ErrorCode } from "@/shared/types";

/**
 * ABI Version Service
 *
 * Manages automatic version incrementing for ABIs.
 * Implements semantic versioning (semver) logic.
 *
 * Version Format: MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes
 * - MINOR: New features (backward compatible)
 * - PATCH: Bug fixes
 *
 * @module AbiVersionService
 */

export enum VersionBump {
  MAJOR = "major",
  MINOR = "minor",
  PATCH = "patch",
}

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

/**
 * ABI Version Management Service
 */
export class AbiVersionService {
  /**
   * Parse semantic version string to components
   *
   * @param version - Version string (e.g., "1.2.3")
   * @returns SemVer object
   * @throws Error if version format is invalid
   */
  static parseSemVer(version: string): SemVer {
    const parts = version.split(".");

    if (parts.length !== 3) {
      throw new Error(
        `Invalid semver format: "${version}". Expected format: MAJOR.MINOR.PATCH`
      );
    }

    const [major, minor, patch] = parts.map((p) => {
      const num = parseInt(p, 10);
      if (isNaN(num) || num < 0) {
        throw new Error(`Invalid version number in "${version}"`);
      }
      return num;
    });

    return { major, minor, patch };
  }

  /**
   * Format SemVer object to string
   *
   * @param semver - SemVer object
   * @returns Version string (e.g., "1.2.3")
   */
  static formatSemVer(semver: SemVer): string {
    return `${semver.major}.${semver.minor}.${semver.patch}`;
  }

  /**
   * Bump version based on change type
   *
   * @param current - Current version string
   * @param bump - Type of bump (major, minor, patch)
   * @returns New version string
   *
   * @example
   * AbiVersionService.bumpVersion('1.2.3', VersionBump.PATCH)
   * // → '1.2.4'
   *
   * AbiVersionService.bumpVersion('1.2.3', VersionBump.MINOR)
   * // → '1.3.0'
   *
   * AbiVersionService.bumpVersion('1.2.3', VersionBump.MAJOR)
   * // → '2.0.0'
   */
  static bumpVersion(current: string, bump: VersionBump): string {
    const semver = this.parseSemVer(current);

    switch (bump) {
      case VersionBump.MAJOR:
        return this.formatSemVer({
          major: semver.major + 1,
          minor: 0,
          patch: 0,
        });

      case VersionBump.MINOR:
        return this.formatSemVer({
          major: semver.major,
          minor: semver.minor + 1,
          patch: 0,
        });

      case VersionBump.PATCH:
        return this.formatSemVer({
          major: semver.major,
          minor: semver.minor,
          patch: semver.patch + 1,
        });

      default:
        throw new Error(`Invalid bump type: ${bump}`);
    }
  }

  /**
   * Get latest version for a specific ABI (by name/contract)
   *
   * @param contractName - Contract name to find latest version
   * @returns TryCatchResult with latest version string or null if not found
   */
  static async getLatestVersion(
    contractName: string
  ): Promise<TryCatchResult<string | null>> {
    return tryCatch(
      async () => {
        const [latest] = await db
          .select({ version: abis.version })
          .from(abis)
          .where(eq(abis.contractName, contractName))
          .orderBy(desc(abis.createdAt))
          .limit(1);

        return latest?.version || null;
      },
      {
        errorMessage: "Failed to get latest ABI version",
        errorCode: ErrorCode.INTERNAL_ERROR,
        context: { contractName },
      }
    );
  }

  /**
   * Get next version for a new ABI or ABI update
   *
   * @param options - Version generation options
   * @returns TryCatchResult with next version string
   *
   * @example
   * // New ABI (no previous version)
   * const version = await AbiVersionService.getNextVersion({
   *   isNew: true
   * });
   * // → '1.0.0'
   *
   * @example
   * // Update existing ABI (patch bump)
   * const version = await AbiVersionService.getNextVersion({
   *   contractName: 'ERC20',
   *   bump: VersionBump.PATCH
   * });
   * // → '1.0.1' (if current is 1.0.0)
   *
   * @example
   * // Custom version override
   * const version = await AbiVersionService.getNextVersion({
   *   customVersion: '2.0.0'
   * });
   * // → '2.0.0'
   */
  static async getNextVersion(options?: {
    contractName?: string;
    bump?: VersionBump;
    customVersion?: string;
    isNew?: boolean;
  }): Promise<TryCatchResult<string>> {
    return tryCatch(
      async () => {
        const {
          contractName,
          bump = VersionBump.PATCH,
          customVersion,
          isNew = false,
        } = options || {};

        // Priority 1: Custom version (user override)
        if (customVersion) {
          // Validate format
          this.parseSemVer(customVersion);
          return customVersion;
        }

        // Priority 2: New ABI - start at 1.0.0
        if (isNew || !contractName) {
          return "1.0.0";
        }

        // Priority 3: Auto-increment based on latest version
        const latestVersionResult = await this.getLatestVersion(contractName);

        if (!latestVersionResult.success) {
          // If we can't get latest version, fallback to 1.0.0
          return "1.0.0";
        }

        const latestVersion = latestVersionResult.data;
        if (!latestVersion) {
          // No previous version found, start at 1.0.0
          return "1.0.0";
        }

        // Bump version
        return this.bumpVersion(latestVersion, bump);
      },
      {
        errorMessage: "Failed to get next ABI version",
        errorCode: ErrorCode.INTERNAL_ERROR,
        context: { options },
      }
    );
  }

  /**
   * Compare two versions
   *
   * @param v1 - First version
   * @param v2 - Second version
   * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
   *
   * @example
   * AbiVersionService.compareVersions('1.0.0', '1.0.1')
   * // → -1
   *
   * AbiVersionService.compareVersions('2.0.0', '1.9.9')
   * // → 1
   */
  static compareVersions(v1: string, v2: string): number {
    const semver1 = this.parseSemVer(v1);
    const semver2 = this.parseSemVer(v2);

    // Compare major
    if (semver1.major !== semver2.major) {
      return semver1.major > semver2.major ? 1 : -1;
    }

    // Compare minor
    if (semver1.minor !== semver2.minor) {
      return semver1.minor > semver2.minor ? 1 : -1;
    }

    // Compare patch
    if (semver1.patch !== semver2.patch) {
      return semver1.patch > semver2.patch ? 1 : -1;
    }

    return 0; // Equal
  }

  /**
   * Check if version is valid semver
   *
   * @param version - Version string to validate
   * @returns true if valid, false otherwise
   */
  static isValidSemVer(version: string): boolean {
    try {
      this.parseSemVer(version);
      return true;
    } catch {
      return false;
    }
  }
}
