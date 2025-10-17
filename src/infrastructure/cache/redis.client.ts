import { Redis } from "@upstash/redis";
import { env } from "@/shared/config/env";

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

// Redis utility functions with error handling
export class RedisClient {
  private static instance: RedisClient;
  private client: Redis;

  private constructor() {
    this.client = redis;
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  // Generic set with TTL
  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, JSON.stringify(value));
      } else {
        await this.client.set(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  // Generic get with JSON parsing
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;

      // If value is already an object, return it directly
      // This handles the case where Upstash Redis returns parsed JSON
      if (typeof value === 'object') {
        return value as T;
      }

      // Otherwise, parse the string value
      if (typeof value === 'string') {
        return JSON.parse(value) as T;
      }

      // Unexpected type, return null
      console.warn(`Unexpected Redis value type for key ${key}:`, typeof value);
      return null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  // Delete key
  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  // Get TTL for key
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Redis TTL error for key ${key}:`, error);
      return -1;
    }
  }

  // Flush all keys (use with caution)
  async flushAll(): Promise<boolean> {
    try {
      await this.client.flushall();
      return true;
    } catch (error) {
      console.error("Redis FLUSHALL error:", error);
      return false;
    }
  }

  // Pattern-based deletion
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      await this.client.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`Redis DELETE PATTERN error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      console.error("Redis PING error:", error);
      return false;
    }
  }
}