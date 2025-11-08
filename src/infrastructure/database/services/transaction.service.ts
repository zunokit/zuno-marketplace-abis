/**
 * Transaction Service
 *
 * Provides transaction support for repository operations using Drizzle ORM.
 *
 * Key Principles:
 * - Transactions ensure atomicity for multi-step database operations
 * - Cache operations should NOT be inside transactions (cache failure != DB failure)
 * - Transaction scope should be minimal and focused
 * - Always handle errors gracefully with proper logging
 *
 * Usage Example:
 * ```typescript
 * const result = await TransactionService.execute(async (tx) => {
 *   const abi = await tx.insert(abis).values(...).returning();
 *   await tx.insert(abiVersions).values(...);
 *   return abi;
 * });
 * ```
 */

import { db } from "@/infrastructure/database/drizzle/client";
import { logger } from "@/shared/lib/utils/logger";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NeonHttpQueryResultHKT } from "drizzle-orm/neon-http";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import * as schema from "@/infrastructure/database/drizzle/schema";

/**
 * Transaction type - represents a Drizzle transaction context
 *
 * This type matches the transaction object passed to callbacks in db.transaction()
 */
export type Transaction = PgTransaction<
  NeonHttpQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/**
 * Transaction callback function type
 * @template T - The return type of the transaction
 */
export type TransactionCallback<T> = (tx: Transaction) => Promise<T>;

/**
 * Transaction options
 */
export interface TransactionOptions {
  /**
   * Maximum number of retry attempts on transient errors
   * @default 0 (no retries)
   */
  maxRetries?: number;

  /**
   * Isolation level for the transaction
   * @default undefined (uses database default)
   */
  isolationLevel?: 'read uncommitted' | 'read committed' | 'repeatable read' | 'serializable';
}

/**
 * Transaction Service
 *
 * Provides a centralized way to execute database transactions with:
 * - Automatic rollback on errors
 * - Optional retry logic for transient errors
 * - Structured logging
 * - Type safety
 */
export class TransactionService {
  /**
   * Execute a database transaction
   *
   * @template T - The return type
   * @param callback - The transaction callback
   * @param options - Transaction options
   * @returns The result of the transaction
   * @throws Error if transaction fails after all retries
   *
   * @example
   * ```typescript
   * const createdAbi = await TransactionService.execute(async (tx) => {
   *   // Step 1: Create ABI
   *   const [abi] = await tx.insert(abis).values(abiData).returning();
   *
   *   // Step 2: Create ABI version record
   *   await tx.insert(abiVersions).values({
   *     abiId: abi.id,
   *     version: '1.0.0',
   *   });
   *
   *   return abi;
   * });
   * ```
   */
  static async execute<T>(
    callback: TransactionCallback<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const { maxRetries = 0 } = options;
    let lastError: Error | null = null;

    // Retry loop for transient errors
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await db.transaction(async (tx) => {
          return await callback(tx as Transaction);
        });

        if (attempt > 0) {
          logger.info("Transaction succeeded after retry", {
            attempt,
            maxRetries,
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable (e.g., deadlock, timeout)
        const isRetryable = this.isRetryableError(error);
        const hasRetriesLeft = attempt < maxRetries;

        if (isRetryable && hasRetriesLeft) {
          logger.warn("Transaction failed, retrying", {
            attempt: attempt + 1,
            maxRetries,
            error: lastError.message,
          });

          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          await this.sleep(100 * Math.pow(2, attempt));
          continue;
        }

        // Not retryable or no retries left
        logger.error("Transaction failed", {
          attempt: attempt + 1,
          maxRetries,
          error: lastError.message,
        });

        throw lastError;
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error("Transaction failed");
  }

  /**
   * Execute multiple operations in a single transaction
   *
   * This is a convenience method for common patterns where you need
   * to execute multiple related operations atomically.
   *
   * @example
   * ```typescript
   * const [abi, version] = await TransactionService.executeAll([
   *   (tx) => tx.insert(abis).values(abiData).returning(),
   *   (tx) => tx.insert(abiVersions).values(versionData).returning(),
   * ]);
   * ```
   */
  static async executeAll<T extends any[]>(
    callbacks: { [K in keyof T]: TransactionCallback<T[K]> }
  ): Promise<T> {
    return this.execute(async (tx) => {
      const results: any[] = [];

      for (const callback of callbacks) {
        const result = await callback(tx);
        results.push(result);
      }

      return results as T;
    });
  }

  /**
   * Check if an error is retryable
   *
   * Retryable errors include:
   * - Deadlocks
   * - Lock timeouts
   * - Serialization failures
   *
   * @param error - The error to check
   * @returns true if error is retryable
   */
  private static isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message.toLowerCase();

    // PostgreSQL error codes for retryable errors
    const retryablePatterns = [
      'deadlock',
      'lock timeout',
      'serialization failure',
      'could not serialize',
      '40001', // serialization_failure
      '40P01', // deadlock_detected
    ];

    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Sleep for a specified duration
   *
   * @param ms - Milliseconds to sleep
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
