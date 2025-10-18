import { customAlphabet } from 'nanoid';

/**
 * Production-grade ID Generator with Dynamic Versioning
 *
 * Format: {prefix}_{apiVersion}_{entityVersion}_{random}
 *
 * Examples:
 * - User:     usr_v1_2fK9mP3xQ1wZ
 * - API Key:  key_v1_7nR4sV8cD2pY
 * - ABI:      abi_v1_1.0.0_1a2b3c4d5e6f  (with ABI version)
 * - Network:  net_v1_9hG8fE7dC6bA
 *
 * Features:
 * - API version from request headers (client-controlled)
 * - Entity version from database (for ABIs/Contracts)
 * - No global context - explicit parameters
 * - URL-safe, collision-resistant, human-readable
 *
 * Architecture:
 * 1. Client sends X-API-Version header (or defaults to v1)
 * 2. Middleware validates against DB and forwards
 * 3. Route handlers read version via getCurrentApiVersion()
 * 4. Pass version explicitly to IdGenerator.generate()
 *
 * @module IdGenerator
 */

const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  12 // 12 chars = ~2.8 trillion combinations
);

/**
 * Supported entity prefixes
 */
export enum EntityPrefix {
  USER = 'usr',
  API_KEY = 'key',
  NETWORK = 'net',
  ABI = 'abi',
  ABI_VERSION = 'abv',
  CONTRACT = 'ctr',
  SESSION = 'ses',
  VERIFICATION = 'ver',
  ACCOUNT = 'acc',
  RATE_LIMIT = 'rlm',
}

/**
 * Options for ID generation
 *
 * IMPORTANT: apiVersion is REQUIRED (no defaults)
 * Get it from getCurrentApiVersion() in route handlers
 */
export interface IdGeneratorOptions {
  /** Entity type prefix */
  prefix: EntityPrefix;

  /**
   * API version - REQUIRED
   * Get from: await getCurrentApiVersion()
   * Example: "v1", "v2"
   */
  apiVersion: string;

  /**
   * Entity version (for ABIs, Contracts) - e.g., "1.0.0"
   * Get from: await AbiVersionService.getNextVersion()
   */
  entityVersion?: string;

  /** Include base36 timestamp for sortability (optional) */
  includeTimestamp?: boolean;
}

/**
 * Parsed ID components
 */
export interface ParsedId {
  prefix: EntityPrefix;
  apiVersion: string;
  entityVersion?: string;
  randomPart: string;
  timestamp?: number;
  isValid: boolean;
}

/**
 * ID Generator Service
 *
 * Provides centralized ID generation with dynamic versioning.
 * No global state - all parameters must be passed explicitly.
 */
export class IdGenerator {
  /**
   * Generate a new ID with versioning support
   *
   * @param options - ID generation options (apiVersion is REQUIRED)
   * @returns Generated ID string
   *
   * @throws Error if apiVersion is not provided
   * @throws Error if entityVersion format is invalid
   *
   * @example
   * // In route handler
   * const apiVersion = await getCurrentApiVersion();
   * const userId = IdGenerator.generate({
   *   prefix: EntityPrefix.USER,
   *   apiVersion
   * });
   * // → 'usr_v1_2fK9mP3xQ1wZ'
   *
   * @example
   * // ABI with version
   * const apiVersion = await getCurrentApiVersion();
   * const abiVersion = await AbiVersionService.getNextVersion();
   * const abiId = IdGenerator.generate({
   *   prefix: EntityPrefix.ABI,
   *   apiVersion,
   *   entityVersion: abiVersion
   * });
   * // → 'abi_v1_1.0.0_1a2b3c4d5e6f'
   */
  static generate(options: IdGeneratorOptions): string {
    const {
      prefix,
      apiVersion,
      entityVersion,
      includeTimestamp = false,
    } = options;

    // Validate required apiVersion
    if (!apiVersion) {
      throw new Error('apiVersion is required. Get it from getCurrentApiVersion()');
    }

    const parts: string[] = [prefix, apiVersion];

    // Add entity version if provided (for ABIs, Contracts)
    if (entityVersion) {
      // Sanitize version: remove spaces, ensure valid semver-like format
      const cleanVersion = entityVersion.trim().replace(/\s+/g, '');
      if (!/^\d+(\.\d+)*(-[\w.]+)?$/.test(cleanVersion)) {
        throw new Error(
          `Invalid entity version format: "${entityVersion}". Expected semver-like format (e.g., "1.0.0")`
        );
      }
      parts.push(cleanVersion);
    }

    // Add timestamp if requested (base36 for compactness)
    if (includeTimestamp) {
      const timestamp = Date.now().toString(36);
      parts.push(timestamp);
    }

    // Add random nanoid
    parts.push(nanoid());

    return parts.join('_');
  }

  /**
   * Parse an ID into its components
   *
   * @example
   * IdGenerator.parse('abi_v1_1.0.0_2fK9mP3xQ1wZ')
   * // → { prefix: 'abi', apiVersion: 'v1', entityVersion: '1.0.0', ... }
   */
  static parse(id: string): ParsedId {
    const parts = id.split('_');

    if (parts.length < 3) {
      return {
        prefix: '' as EntityPrefix,
        apiVersion: '',
        randomPart: id,
        isValid: false,
      };
    }

    const [prefix, apiVersion, ...rest] = parts;

    // Check if valid prefix
    const isValidPrefix = Object.values(EntityPrefix).includes(prefix as EntityPrefix);
    // API version validation is relaxed - any string starting with 'v' is accepted
    const isValidApiVersion = /^v\d+$/.test(apiVersion);

    if (!isValidPrefix || !isValidApiVersion) {
      return {
        prefix: prefix as EntityPrefix,
        apiVersion: apiVersion,
        randomPart: rest.join('_'),
        isValid: false,
      };
    }

    // Determine if there's an entity version
    // Entity version format: digits and dots (e.g., "1.0.0")
    let entityVersion: string | undefined;
    let randomPart: string;
    let timestamp: number | undefined;

    if (rest.length === 1) {
      // Format: prefix_apiVersion_random
      randomPart = rest[0];
    } else if (rest.length === 2) {
      // Could be: prefix_apiVersion_entityVersion_random
      // or: prefix_apiVersion_timestamp_random
      const firstPart = rest[0];
      randomPart = rest[1];

      // Check if it looks like a version (has dots or dashes)
      if (/^[\d.]+-?[\w.]*$/.test(firstPart)) {
        entityVersion = firstPart;
      } else if (/^[0-9a-z]+$/.test(firstPart)) {
        // Looks like base36 timestamp
        timestamp = parseInt(firstPart, 36);
      }
    } else {
      // Format: prefix_apiVersion_entityVersion_timestamp_random (or similar)
      // Take the last part as random, second-to-last as potential timestamp
      randomPart = rest[rest.length - 1];
      const potentialTimestamp = rest[rest.length - 2];

      if (/^[0-9a-z]+$/.test(potentialTimestamp)) {
        timestamp = parseInt(potentialTimestamp, 36);
        entityVersion = rest.slice(0, -2).join('_');
      } else {
        entityVersion = rest.slice(0, -1).join('_');
      }
    }

    return {
      prefix: prefix as EntityPrefix,
      apiVersion: apiVersion,
      entityVersion,
      randomPart,
      timestamp,
      isValid: true,
    };
  }

  /**
   * Extract prefix from an ID
   *
   * @example
   * IdGenerator.extractPrefix('usr_v1_2fK9mP3xQ1wZ') // → EntityPrefix.USER
   */
  static extractPrefix(id: string): EntityPrefix | null {
    const match = id.match(/^([a-z]{3})_/);
    return match ? (match[1] as EntityPrefix) : null;
  }

  /**
   * Validate ID format and optionally check prefix match
   *
   * @example
   * IdGenerator.validate('usr_v1_abc123', EntityPrefix.USER) // → true
   * IdGenerator.validate('invalid_id') // → false
   */
  static validate(id: string, expectedPrefix?: EntityPrefix): boolean {
    const parsed = this.parse(id);

    if (!parsed.isValid) {
      return false;
    }

    if (expectedPrefix && parsed.prefix !== expectedPrefix) {
      return false;
    }

    return true;
  }

  /**
   * Check if an ID belongs to a specific entity type
   *
   * @example
   * IdGenerator.isType('usr_v1_abc', EntityPrefix.USER) // → true
   */
  static isType(id: string, prefix: EntityPrefix): boolean {
    return this.extractPrefix(id) === prefix;
  }

  /**
   * Generate UUID for backward compatibility
   * @deprecated Use generate() with proper prefix instead
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Extract API version from ID
   */
  static extractApiVersion(id: string): string | null {
    const parsed = this.parse(id);
    return parsed.isValid ? parsed.apiVersion : null;
  }

  /**
   * Extract entity version from ID (for ABIs, Contracts)
   */
  static extractEntityVersion(id: string): string | null {
    const parsed = this.parse(id);
    return parsed.entityVersion || null;
  }
}

/**
 * DEPRECATED: Convenience functions removed
 *
 * All ID generation now requires explicit apiVersion parameter.
 * Use IdGenerator.generate() directly with getCurrentApiVersion().
 *
 * Migration example:
 * ```typescript
 * // Old (deprecated)
 * const userId = generateUserId();
 *
 * // New (correct)
 * const apiVersion = await getCurrentApiVersion();
 * const userId = IdGenerator.generate({
 *   prefix: EntityPrefix.USER,
 *   apiVersion
 * });
 * ```
 *
 * For ABIs with version:
 * ```typescript
 * const apiVersion = await getCurrentApiVersion();
 * const abiVersion = await AbiVersionService.getNextVersion();
 * const abiId = IdGenerator.generate({
 *   prefix: EntityPrefix.ABI,
 *   apiVersion,
 *   entityVersion: abiVersion
 * });
 * ```
 */
