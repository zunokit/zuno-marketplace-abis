/**
 * Audit Log Entity
 * Domain model for system audit trail
 */

export interface AuditLogEntity {
  id: string;

  // Authentication context
  userId: string | null;
  apiKeyId: string | null;

  // Request details
  method: string; // GET, POST, PUT, DELETE
  path: string;
  action: string; // CREATE_ABI, UPDATE_CONTRACT, etc.

  // Client info
  ipAddress: string | null;
  userAgent: string | null;

  // Resource tracking
  resourceType: string | null; // abi, contract, network
  resourceId: string | null;

  // Response details
  statusCode: number;
  duration: number | null; // milliseconds

  // Additional metadata
  metadata: {
    error?: string;
    requestBody?: Record<string, unknown>;
    responseSize?: number;
  } | null;

  createdAt: Date;
}

/**
 * Create Audit Log Input
 */
export interface CreateAuditLogInput {
  userId?: string | null;
  apiKeyId?: string | null;
  method: string;
  path: string;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  statusCode: number;
  duration?: number | null;
  metadata?: {
    error?: string;
    requestBody?: Record<string, unknown>;
    responseSize?: number;
  } | null;
}
