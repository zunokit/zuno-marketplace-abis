/**
 * Security Headers Middleware
 *
 * Adds security-related HTTP headers to protect against common web vulnerabilities.
 * Implements OWASP recommended security headers.
 */

import { NextResponse } from "next/server";
import { env } from "@/shared/config/env";

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  /** Content Security Policy */
  csp?: string | null;
  /** Strict Transport Security max age (seconds) */
  hstsMaxAge?: number;
  /** Include subdomains in HSTS */
  hstsIncludeSubdomains?: boolean;
  /** Enable HSTS preload */
  hstsPreload?: boolean;
}

/**
 * Default security headers configuration
 */
const defaultConfig: Required<SecurityHeadersConfig> = {
  csp:
    env.NODE_ENV === "production"
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.pinata.cloud;"
      : null,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubdomains: true,
  hstsPreload: true,
};

/**
 * Add security headers to response
 */
export function addSecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = {}
): void {
  const cfg = { ...defaultConfig, ...config };

  // X-Content-Type-Options: Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // X-Frame-Options: Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // X-XSS-Protection: Enable browser XSS protection
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer-Policy: Control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy: Control browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // Content-Security-Policy: Restrict resource loading
  if (cfg.csp) {
    response.headers.set("Content-Security-Policy", cfg.csp);
  }

  // Strict-Transport-Security: Enforce HTTPS (production only)
  if (env.NODE_ENV === "production") {
    const hstsValue = [
      `max-age=${cfg.hstsMaxAge}`,
      cfg.hstsIncludeSubdomains && "includeSubDomains",
      cfg.hstsPreload && "preload",
    ]
      .filter(Boolean)
      .join("; ");

    response.headers.set("Strict-Transport-Security", hstsValue);
  }
}
