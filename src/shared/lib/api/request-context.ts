/**
 * Request Context với Correlation ID
 *
 * Giải quyết:
 * - Trace requests qua multiple services
 * - Structured logging với context
 * - Performance monitoring
 * - Debug và troubleshooting dễ dàng hơn
 */

import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/infrastructure/auth/auth-helpers";

// ============ Request Context Types ============

export interface RequestMetadata {
  /** Unique ID để trace request qua hệ thống */
  correlationId: string;

  /** Request timestamp */
  timestamp: Date;

  /** Request method */
  method: string;

  /** Request path */
  path: string;

  /** Client IP address */
  clientIp: string;

  /** User agent */
  userAgent: string | null;

  /** Origin header */
  origin: string | null;

  /** Referer header */
  referer: string | null;
}

export interface PerformanceMetrics {
  /** Request start time */
  startTime: number;

  /** Duration in milliseconds */
  duration?: number;
}

export interface RequestContext extends AuthContext {
  /** Request metadata */
  metadata: RequestMetadata;

  /** Performance tracking */
  performance: PerformanceMetrics;

  /** Original NextRequest object */
  request: NextRequest;

  /** Route params (nếu có) */
  params?: Record<string, string>;

  /** Rate limit info (nếu có) */
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

// ============ Context Factory ============

export class RequestContextFactory {
  /**
   * Tạo RequestContext từ NextRequest
   * Extract tất cả metadata cần thiết cho logging và tracing
   */
  static create(
    request: NextRequest,
    params?: Record<string, string>
  ): RequestContext {
    const url = new URL(request.url);
    const correlationId = this.extractCorrelationId(request);

    const metadata: RequestMetadata = {
      correlationId,
      timestamp: new Date(),
      method: request.method,
      path: url.pathname,
      clientIp: this.extractClientIp(request),
      userAgent: request.headers.get("user-agent"),
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
    };

    const performance: PerformanceMetrics = {
      startTime: Date.now(),
    };

    return {
      metadata,
      performance,
      request,
      params,
    };
  }

  /**
   * Extract correlation ID từ headers hoặc tạo mới
   * Client có thể gửi X-Correlation-ID để trace request từ client-side
   */
  private static extractCorrelationId(request: NextRequest): string {
    return (
      request.headers.get("x-correlation-id") ||
      request.headers.get("x-request-id") ||
      randomUUID()
    );
  }

  /**
   * Extract client IP từ headers
   * Support các proxy headers phổ biến
   */
  private static extractClientIp(request: NextRequest): string {
    return (
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      request.headers.get("cf-connecting-ip") || // Cloudflare
      request.headers.get("x-client-ip") ||
      "unknown"
    );
  }

  /**
   * Complete performance metrics khi request kết thúc
   */
  static completePerformance(context: RequestContext): void {
    context.performance.duration = Date.now() - context.performance.startTime;
  }
}

// ============ Context Logger ============

/**
 * Structured logger với request context
 * Tự động include correlation ID và metadata vào logs
 */
export class ContextLogger {
  constructor(private context: RequestContext) {}

  /**
   * Get log metadata từ context
   */
  private getLogMeta() {
    return {
      correlationId: this.context.metadata.correlationId,
      method: this.context.metadata.method,
      path: this.context.metadata.path,
      userId: this.context.user?.id || this.context.apiKey?.userId,
      clientIp: this.context.metadata.clientIp,
      duration: this.context.performance.duration,
    };
  }

  info(message: string, data?: Record<string, unknown>) {
    console.log(
      JSON.stringify({
        level: "info",
        message,
        ...this.getLogMeta(),
        ...data,
        timestamp: new Date().toISOString(),
      })
    );
  }

  warn(message: string, data?: Record<string, unknown>) {
    console.warn(
      JSON.stringify({
        level: "warn",
        message,
        ...this.getLogMeta(),
        ...data,
        timestamp: new Date().toISOString(),
      })
    );
  }

  error(message: string, error?: unknown, data?: Record<string, unknown>) {
    console.error(
      JSON.stringify({
        level: "error",
        message,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
        ...this.getLogMeta(),
        ...data,
        timestamp: new Date().toISOString(),
      })
    );
  }

  debug(message: string, data?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      console.debug(
        JSON.stringify({
          level: "debug",
          message,
          ...this.getLogMeta(),
          ...data,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }
}

// ============ Helper Functions ============

/**
 * Tạo logger từ context
 */
export function createContextLogger(context: RequestContext): ContextLogger {
  return new ContextLogger(context);
}

/**
 * Format performance metrics cho response headers
 */
export function formatPerformanceHeaders(context: RequestContext): Record<string, string> {
  return {
    "X-Correlation-ID": context.metadata.correlationId,
    "X-Response-Time": context.performance.duration
      ? `${context.performance.duration}ms`
      : "N/A",
  };
}

/**
 * Sanitize context cho logging (remove sensitive data)
 */
export function sanitizeContextForLogging(context: RequestContext) {
  return {
    correlationId: context.metadata.correlationId,
    method: context.metadata.method,
    path: context.metadata.path,
    clientIp: context.metadata.clientIp,
    userId: context.user?.id || context.apiKey?.userId,
    userRole: context.user?.role,
    duration: context.performance.duration,
    timestamp: context.metadata.timestamp.toISOString(),
  };
}
