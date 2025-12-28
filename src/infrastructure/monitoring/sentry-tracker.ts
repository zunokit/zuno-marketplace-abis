import * as Sentry from "@sentry/nextjs";

/**
 * Sentry User Action Tracker
 *
 * Records user actions as breadcrumbs for error context.
 * Breadcrumbs appear in Sentry event details under "Breadcrumbs" tab.
 *
 * Example breadcrumb trail:
 * 1. user.login (api_key)
 * 2. user.action (abi.list viewed)
 * 3. user.action (abi.create clicked)
 * 4. user.action (abi.form submitted)
 * [ERROR occurs here]
 */
export class SentryTracker {
  /**
   * Add generic breadcrumb
   */
  static addBreadcrumb(
    category: string,
    message: string,
    level: "info" | "warning" | "error" = "info",
    data?: Record<string, unknown>
  ): void {
    Sentry.addBreadcrumb({
      category,
      message,
      level,
      data,
    });
  }

  /**
   * Track authentication events
   */
  static trackLogin(
    userId: string,
    method: "api_key" | "session" | "admin_key"
  ): void {
    Sentry.setUser({ id: userId });

    this.addBreadcrumb("auth", `User logged in via ${method}`, "info", {
      userId,
      method,
    });
  }

  static trackLogout(userId: string): void {
    this.addBreadcrumb("auth", "User logged out", "info", { userId });
    Sentry.setUser(null); // Clear user context
  }

  static trackLoginFailure(reason: string): void {
    this.addBreadcrumb("auth", "Login failed", "warning", { reason });
  }

  /**
   * Track ABI operations
   */
  static trackAbiListed(filters?: Record<string, unknown>): void {
    this.addBreadcrumb("abi", "ABI list viewed", "info", { filters });
  }

  static trackAbiViewed(abiId: string): void {
    this.addBreadcrumb("abi", "ABI details viewed", "info", { abiId });
  }

  static trackAbiCreated(data: {
    contractAddress?: string;
    network?: string;
    abiId: string;
  }): void {
    this.addBreadcrumb("abi", "ABI created", "info", {
      contractAddress: data.contractAddress
        ? `${data.contractAddress.substring(0, 10)}...`
        : undefined,
      network: data.network,
      abiId: data.abiId,
    });
  }

  static trackAbiUpdated(abiId: string, changes: string): void {
    this.addBreadcrumb("abi", "ABI updated", "info", { abiId, changes });
  }

  static trackAbiDeleted(abiId: string): void {
    this.addBreadcrumb("abi", "ABI deleted", "warning", { abiId });
  }

  static trackAbiVersionsViewed(abiId: string): void {
    this.addBreadcrumb("abi", "ABI versions viewed", "info", { abiId });
  }

  /**
   * Track contract operations
   */
  static trackContractViewed(address: string, network: string): void {
    this.addBreadcrumb("contract", "Contract viewed", "info", {
      address: address.substring(0, 10) + "...",
      network,
    });
  }

  static trackContractRegistered(address: string, network: string): void {
    this.addBreadcrumb("contract", "Contract registered", "info", {
      address: address.substring(0, 10) + "...",
      network,
    });
  }

  static trackContractUpdated(address: string): void {
    this.addBreadcrumb("contract", "Contract updated", "info", {
      address: address.substring(0, 10) + "...",
    });
  }

  static trackContractDeleted(address: string): void {
    this.addBreadcrumb("contract", "Contract deleted", "warning", {
      address: address.substring(0, 10) + "...",
    });
  }

  /**
   * Track admin operations
   */
  static trackApiKeysListed(): void {
    this.addBreadcrumb("admin", "API keys list viewed", "info");
  }

  static trackApiKeyCreated(tier: string): void {
    this.addBreadcrumb("admin", "API key created", "info", { tier });
  }

  static trackApiKeyDeleted(keyId: string): void {
    this.addBreadcrumb("admin", "API key deleted", "warning", { keyId });
  }

  static trackNetworksModified(action: "created" | "updated" | "deleted", networkId: string): void {
    this.addBreadcrumb("admin", `Network ${action}`, "info", { networkId });
  }

  /**
   * Track errors with context
   */
  static trackError(category: string, message: string, error?: Error): void {
    this.addBreadcrumb("error", message, "error", {
      category,
      errorMessage: error?.message,
    });
  }

  /**
   * Track rate limit hits (informational, not errors)
   */
  static trackRateLimitHit(endpoint: string, tier: string): void {
    this.addBreadcrumb("ratelimit", `Rate limit hit: ${endpoint}`, "warning", {
      endpoint,
      tier,
    });
  }

  /**
   * Track cache operations
   */
  static trackCacheHit(key: string): void {
    this.addBreadcrumb("cache", "Cache hit", "info", {
      key: key.substring(0, 50),
    });
  }

  static trackCacheMiss(key: string): void {
    this.addBreadcrumb("cache", "Cache miss", "info", {
      key: key.substring(0, 50),
    });
  }
}

/**
 * Initialize Sentry tracker with request context
 *
 * Call this at the start of each API request
 */
export function initRequestContext(requestId: string, path: string): void {
  Sentry.setContext("request", {
    requestId,
    path,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Clear request context
 *
 * Call this at the end of each API request
 */
export function clearRequestContext(): void {
  Sentry.setContext("request", null);
}
