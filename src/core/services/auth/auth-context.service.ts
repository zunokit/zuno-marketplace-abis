/**
 * Auth Context Service
 *
 * Centralized auth-related utilities
 */

import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

// ============ Types ============

export interface AuthContext {
  user?: {
    id: string;
    role: string;
    email?: string;
  };
  apiKey?: {
    id: string;
    userId: string;
    scopes?: string[];
  };
}

// ============ Auth Context Service ============

export class AuthContextService {
  /**
   * Extract user ID từ auth context
   * Throw error nếu không authenticated
   */
  static extractUserId(context: AuthContext): string {
    const userId = context.user?.id || context.apiKey?.userId;

    if (!userId) {
      throw new ApiError(
        "User ID not found in authentication context",
        ErrorCode.UNAUTHORIZED,
        401
      );
    }

    return userId;
  }

  /**
   * Check if user is admin
   */
  static isAdmin(context: AuthContext): boolean {
    return context.user?.role === "admin";
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(context: AuthContext, permission: string): boolean {
    // Check user role-based permissions
    if (this.isAdmin(context)) {
      return true;
    }

    // Check API key scopes
    if (context.apiKey?.scopes) {
      return context.apiKey.scopes.includes(permission);
    }

    return false;
  }

  /**
   * Check if user can access resource owned by targetUserId
   */
  static canAccessUserResource(
    context: AuthContext,
    targetUserId: string
  ): boolean {
    const isAdmin = this.isAdmin(context);
    const isOwnResource =
      context.user?.id === targetUserId ||
      context.apiKey?.userId === targetUserId;

    return isAdmin || isOwnResource;
  }

  /**
   * Validate user can access resource, throw if not
   */
  static requireUserAccess(
    context: AuthContext,
    targetUserId: string,
    resourceName = "resource"
  ): void {
    if (!this.canAccessUserResource(context, targetUserId)) {
      throw new ApiError(
        `You can only access your own ${resourceName} unless you're an admin`,
        ErrorCode.FORBIDDEN,
        403
      );
    }
  }
}
