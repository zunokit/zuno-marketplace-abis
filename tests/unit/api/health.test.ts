import { GET } from '@/app/api/health/route';
import { createMockRequest, extractJsonFromResponse } from './helpers/test-utils';
import { resetAllMocks } from './helpers/mocks';
import * as drizzleClient from '@/infrastructure/database/drizzle/client';
import { CacheAdapter } from '@/infrastructure/cache/cache.adapter';
import * as betterAuthConfig from '@/infrastructure/auth/better-auth.config';

// Declare mocks
let mockDb: any;
let mockCacheService: any;
let mockAuth: any;

// Mock external dependencies
jest.mock('@/infrastructure/database/drizzle/client', () => ({
  db: {
    select: jest.fn(),
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
}));

// Mock DI container
jest.mock('@/infrastructure/di/container', () => ({
  getAuditLogRepository: jest.fn(() => ({
    create: jest.fn(),
    findAll: jest.fn(),
  })),
}));

// Assign mocked functions after imports
mockDb = (drizzleClient as any).db;
mockCacheService = {
  health: jest.fn(),
};
mockAuth = (betterAuthConfig as any).auth;

// Set up CacheAdapter.getInstance to return our mock
(CacheAdapter.getInstance as jest.Mock).mockReturnValue(mockCacheService);

describe('GET /api/health', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    // Default mocks for healthy state
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
      environment: 'test',
      checks: {
        database: 'healthy',
        cache: 'healthy',
        auth: 'healthy',
      },
    });
    expect(data.data.timestamp).toBeDefined();
    expect(data.data.responseTime).toMatch(/\d+ms/);
  });

  it('should return degraded status when database is unhealthy', async () => {
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
    expect(data.data.checks.cache).toBe('unhealthy');
    expect(data.data.checks.auth).toBe('healthy');
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
  });

  it('should return degraded status when all systems are unhealthy', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        limit: jest.fn().mockRejectedValue(new Error('DB error')),
      }),
    });
    mockCacheService.health.mockRejectedValue(new Error('Cache error'));
    mockAuth.api.getSession.mockRejectedValue(new Error('Auth error'));

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
    expect(data.data.checks.cache).toBe('unhealthy');
    expect(data.data.checks.auth).toBe('unhealthy');
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
