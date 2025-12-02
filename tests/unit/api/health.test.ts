import { GET } from '@/app/api/health/route';
import { createMockRequest, extractJsonFromResponse } from './helpers/test-utils';
import { resetAllMocks } from './helpers/mocks';
import * as drizzleClient from '@/infrastructure/database/drizzle/client';
import { CacheAdapter } from '@/infrastructure/cache/cache.adapter';
import * as betterAuthConfig from '@/infrastructure/auth/better-auth.config';

// Mocks will be assigned after jest.mock calls

// Mock external dependencies
jest.mock('@/infrastructure/database/drizzle/client', () => ({
  db: {
    select: jest.fn(),
    execute: jest.fn(),
  },
}));

jest.mock('@/infrastructure/cache/cache.adapter', () => ({
  CacheAdapter: {
    getInstance: jest.fn(),
  },
}));

jest.mock('@/infrastructure/auth/better-auth.config', () => ({
  auth: {
    api: jest.fn(),
  },
}));

jest.mock('@/infrastructure/auth/auth-helpers', () => ({
  verifyApiKey: jest.fn(),
  verifySession: jest.fn(),
  verifySessionFromHeaders: jest.fn(),
  hasPermission: jest.fn(),
  isAdmin: jest.fn(),
  canAccessResource: jest.fn(),
  isApiKeyOwnerAdmin: jest.fn().mockResolvedValue(false),
}));

// Mock DI container
jest.mock('@/infrastructure/di/container', () => ({
  getAuditLogRepository: jest.fn(() => ({
    create: jest.fn(),
    findAll: jest.fn(),
  })),
}));

// Assign mocked functions after imports
const mockDb = (drizzleClient as any).db;
const mockCacheService = {
  health: jest.fn(),
};
const mockAuth = (betterAuthConfig as any).auth;

// Set up CacheAdapter.getInstance to return our mock
(CacheAdapter.getInstance as jest.Mock).mockReturnValue(mockCacheService);

describe('GET /api/health', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    // Default mocks for healthy state
    mockDb.execute.mockResolvedValue(undefined);
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([{ id: 'network_1' }]),
      }),
    });

    mockCacheService.health.mockResolvedValue(true);

    mockAuth.api = {
      getSession: jest.fn().mockResolvedValue({
        session: null,
        user: null,
      }),
    };

    // Mock fetch for IPFS health check
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
    });
  });

  it('should return healthy status when all systems are operational', async () => {
    const request = createMockRequest({
      url: 'http://localhost:3000/api/health',
      method: 'GET',
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toMatchObject({
      status: 'healthy',
      version: '1.0.0',
      checks: {
        database: 'healthy',
        cache: 'healthy',
        auth: 'healthy',
        ipfs: 'healthy',
      },
    });
    // Environment can be 'test' or 'development' depending on how tests are run
    expect(['test', 'development']).toContain(data.data.environment);
    expect(data.data.timestamp).toBeDefined();
    expect(data.data.responseTime).toMatch(/\d+ms/);
  });

  it('should return degraded status when database is unhealthy', async () => {
    mockDb.execute.mockRejectedValue(new Error('Database connection failed'));
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        limit: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      }),
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/health',
      method: 'GET',
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('degraded');
    expect(data.data.checks.database).toBe('unhealthy');
    expect(data.data.checks.cache).toBe('healthy');
    expect(data.data.checks.auth).toBe('healthy');
    expect(data.data.checks.ipfs).toBe('healthy');
  });

  it('should return degraded status when cache is unhealthy', async () => {
    mockCacheService.health.mockResolvedValue(false);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/health',
      method: 'GET',
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('degraded');
    expect(data.data.checks.database).toBe('healthy');
    expect(data.data.checks.cache).toBe('degraded');
    expect(data.data.checks.auth).toBe('healthy');
    expect(data.data.checks.ipfs).toBe('healthy');
  });

  it('should return degraded status when auth is unhealthy', async () => {
    mockAuth.api.getSession.mockRejectedValue(new Error('Auth service unavailable'));

    const request = createMockRequest({
      url: 'http://localhost:3000/api/health',
      method: 'GET',
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('degraded');
    expect(data.data.checks.database).toBe('healthy');
    expect(data.data.checks.cache).toBe('healthy');
    expect(data.data.checks.auth).toBe('unhealthy');
    expect(data.data.checks.ipfs).toBe('healthy');
  });

  it('should return unhealthy status when all systems are unhealthy', async () => {
    mockDb.execute.mockRejectedValue(new Error('DB error'));
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        limit: jest.fn().mockRejectedValue(new Error('DB error')),
      }),
    });
    mockCacheService.health.mockRejectedValue(new Error('Cache error'));
    mockAuth.api.getSession.mockRejectedValue(new Error('Auth error'));
    // Mock fetch to fail for IPFS health check
    (global.fetch as jest.Mock).mockRejectedValue(new Error('IPFS error'));

    const request = createMockRequest({
      url: 'http://localhost:3000/api/health',
      method: 'GET',
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('unhealthy');
    expect(data.data.checks.database).toBe('unhealthy');
    expect(data.data.checks.cache).toBe('unhealthy');
    expect(data.data.checks.auth).toBe('unhealthy');
    expect(data.data.checks.ipfs).toBe('unhealthy');
  });

  it('should include request tracking header', async () => {
    const request = createMockRequest({
      url: 'http://localhost:3000/api/health',
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.headers.get('X-Request-ID')).toBeTruthy();
  });

  it('should complete health check within reasonable time', async () => {
    const request = createMockRequest({
      url: 'http://localhost:3000/api/health',
      method: 'GET',
    });

    const startTime = Date.now();
    const response = await GET(request);
    const endTime = Date.now();
    const data = await extractJsonFromResponse(response);

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(1000); // Should complete within 1 second
    expect(data.data.responseTime).toMatch(/\d+ms/);

    const reportedTime = parseInt(data.data.responseTime.replace('ms', ''));
    expect(reportedTime).toBeLessThanOrEqual(duration);
  });

  it('should not require authentication', async () => {
    const request = createMockRequest({
      url: 'http://localhost:3000/api/health',
      method: 'GET',
      headers: {}, // No auth headers
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
