import { GET } from '@/app/api/version/route';
import { createMockRequest, extractJsonFromResponse } from './helpers/test-utils';
import { resetAllMocks } from './helpers/mocks';
import * as drizzleClient from '@/infrastructure/database/drizzle/client';

// Declare mocks
let mockDb: any;

// Mock external dependencies
jest.mock('@/infrastructure/database/drizzle/client', () => ({
  db: {
    select: jest.fn(),
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

jest.mock('@/infrastructure/di/container', () => ({
  getAuditLogRepository: jest.fn(() => ({
    create: jest.fn(),
    findAll: jest.fn(),
  })),
}));

// Assign mocked functions after imports
mockDb = (drizzleClient as any).db;

describe('GET /api/version', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
  });

  it('should return current version and supported versions', async () => {
    const mockVersions = [
      {
        id: 'v1',
        label: 'Version 1.0',
        isCurrent: true,
        deprecated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'v2',
        label: 'Version 2.0 Beta',
        isCurrent: false,
        deprecated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockDb.select.mockReturnValue({
      from: jest.fn().mockResolvedValue(mockVersions),
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/version',
      method: 'GET',
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toMatchObject({
      current: {
        id: 'v1',
        label: 'Version 1.0',
      },
      supported: [
        { id: 'v1', deprecated: false },
        { id: 'v2', deprecated: false },
      ],
      total: 2,
    });
  });

  it('should mark deprecated versions correctly', async () => {
    const mockVersions = [
      {
        id: 'v1',
        label: 'Version 1.0',
        isCurrent: false,
        deprecated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'v2',
        label: 'Version 2.0',
        isCurrent: true,
        deprecated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockDb.select.mockReturnValue({
      from: jest.fn().mockResolvedValue(mockVersions),
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/version',
      method: 'GET',
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.current).toMatchObject({
      id: 'v2',
      label: 'Version 2.0',
    });
    expect(data.data.supported).toContainEqual({ id: 'v1', deprecated: true });
    expect(data.data.supported).toContainEqual({ id: 'v2', deprecated: false });
  });

  it('should return null current when no version is marked as current', async () => {
    const mockVersions = [
      {
        id: 'v1',
        label: 'Version 1.0',
        isCurrent: false,
        deprecated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockDb.select.mockReturnValue({
      from: jest.fn().mockResolvedValue(mockVersions),
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/version',
      method: 'GET',
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.current).toBeNull();
    expect(data.data.supported).toHaveLength(1);
    expect(data.data.total).toBe(1);
  });

  it('should return empty arrays when no versions exist', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockResolvedValue([]),
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/version',
      method: 'GET',
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toMatchObject({
      current: null,
      supported: [],
      total: 0,
    });
  });

  it('should handle multiple versions with only one current', async () => {
    const mockVersions = [
      {
        id: 'v1',
        label: 'Version 1.0',
        isCurrent: false,
        deprecated: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'v2',
        label: 'Version 2.0',
        isCurrent: true,
        deprecated: false,
        createdAt: new Date('2024-06-01'),
        updatedAt: new Date('2024-06-01'),
      },
      {
        id: 'v3',
        label: 'Version 3.0 Beta',
        isCurrent: false,
        deprecated: false,
        createdAt: new Date('2024-12-01'),
        updatedAt: new Date('2024-12-01'),
      },
    ];

    mockDb.select.mockReturnValue({
      from: jest.fn().mockResolvedValue(mockVersions),
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/version',
      method: 'GET',
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.current).toMatchObject({
      id: 'v2',
      label: 'Version 2.0',
    });
    expect(data.data.supported).toHaveLength(3);
    expect(data.data.total).toBe(3);
  });

  it('should not require authentication', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockResolvedValue([
        {
          id: 'v1',
          label: 'Version 1.0',
          isCurrent: true,
          deprecated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/version',
      method: 'GET',
      headers: {}, // No auth headers
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should include request tracking header', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockResolvedValue([]),
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/version',
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.headers.get('X-Request-ID')).toBeTruthy();
  });

  it('should handle database errors gracefully', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockRejectedValue(new Error('Database connection error')),
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/version',
      method: 'GET',
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });
});
