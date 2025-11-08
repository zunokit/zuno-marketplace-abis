import { GET, POST } from '@/app/api/admin/api-keys/route';
import {
  createMockRequest,
  extractJsonFromResponse,
  createMockAdmin,
  createMockUser,
  createMockSession,
} from '../helpers/test-utils';
import { resetAllMocks } from '../helpers/mocks';

// Mock auth helpers
const mockVerifySessionFromHeaders = jest.fn();
const mockIsAdmin = jest.fn();
const mockHasPermission = jest.fn();

// Mock Better Auth
const mockAuth = {
  api: {
    createApiKey: jest.fn(),
    listApiKeys: jest.fn(),
  },
};

// Mock ApiKeyService
const mockApiKeyService = {
  buildListParams: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
};

jest.mock('@/infrastructure/auth/auth-helpers', () => ({
  verifyApiKey: jest.fn(),
  verifySession: jest.fn(),
  verifySessionFromHeaders: mockVerifySessionFromHeaders,
  hasPermission: mockHasPermission,
  isAdmin: mockIsAdmin,
  canAccessResource: jest.fn(() => true),
}));

jest.mock('@/infrastructure/auth/better-auth.config', () => ({
  auth: mockAuth,
}));

jest.mock('@/infrastructure/services/api-key.service', () => ({
  ApiKeyService: mockApiKeyService,
}));

jest.mock('@/infrastructure/di/container', () => ({
  getAuditLogRepository: jest.fn(() => ({
    create: jest.fn(),
    findAll: jest.fn(),
  })),
}));

jest.mock('@/shared/lib/utils/try-catch-wrapper', () => ({
  unwrapOrThrow: jest.fn((result) => {
    if (result.ok) return result.value;
    throw result.error;
  }),
}));

describe('GET /api/admin/api-keys', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    // Default: Admin session authenticated
    const mockAdmin = createMockAdmin();
    const mockSession = createMockSession(mockAdmin);

    mockVerifySessionFromHeaders.mockResolvedValue({
      user: mockAdmin,
      session: mockSession,
    });
    mockIsAdmin.mockReturnValue(true);
    mockHasPermission.mockReturnValue(true);
  });

  it('should return list of API keys for admin users', async () => {
    const mockApiKeys = [
      {
        id: 'apiKey_v1_test1',
        userId: 'user_v1_test',
        name: 'Production Key',
        tier: 'pro',
        enabled: true,
        createdAt: new Date(),
      },
      {
        id: 'apiKey_v1_test2',
        userId: 'user_v1_test2',
        name: 'Development Key',
        tier: 'free',
        enabled: true,
        createdAt: new Date(),
      },
    ];

    mockApiKeyService.buildListParams.mockReturnValue({
      page: 1,
      limit: 20,
    });

    mockApiKeyService.list.mockResolvedValue({
      ok: true,
      value: {
        data: mockApiKeys,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      },
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/admin/api-keys',
      method: 'GET',
      headers: {
        authorization: 'Bearer admin_session_token',
      },
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.data).toHaveLength(2);
    expect(data.data.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: 2,
    });
  });

  it('should reject non-admin users', async () => {
    const mockUser = createMockUser(); // Regular user
    const mockSession = createMockSession(mockUser);

    mockVerifySessionFromHeaders.mockResolvedValue({
      user: mockUser,
      session: mockSession,
    });
    mockIsAdmin.mockReturnValue(false);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/admin/api-keys',
      method: 'GET',
      headers: {
        authorization: 'Bearer user_session_token',
      },
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('should require authentication', async () => {
    mockVerifySessionFromHeaders.mockResolvedValue(null);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/admin/api-keys',
      method: 'GET',
      headers: {}, // No auth
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should support pagination parameters', async () => {
    mockApiKeyService.buildListParams.mockReturnValue({
      page: 2,
      limit: 10,
    });

    mockApiKeyService.list.mockResolvedValue({
      ok: true,
      value: {
        data: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 15,
          totalPages: 2,
          hasNext: false,
          hasPrev: true,
        },
      },
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/admin/api-keys',
      method: 'GET',
      headers: {
        authorization: 'Bearer admin_session_token',
      },
      searchParams: {
        page: '2',
        limit: '10',
      },
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.pagination.page).toBe(2);
    expect(data.data.pagination.hasPrev).toBe(true);
  });

  it('should support filtering by user ID', async () => {
    mockApiKeyService.buildListParams.mockReturnValue({
      page: 1,
      limit: 20,
      userId: 'user_v1_specific',
    });

    mockApiKeyService.list.mockResolvedValue({
      ok: true,
      value: {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      },
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/admin/api-keys',
      method: 'GET',
      headers: {
        authorization: 'Bearer admin_session_token',
      },
      searchParams: {
        userId: 'user_v1_specific',
      },
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe('POST /api/admin/api-keys', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    // Default: Admin session authenticated
    const mockAdmin = createMockAdmin();
    const mockSession = createMockSession(mockAdmin);

    mockVerifySessionFromHeaders.mockResolvedValue({
      user: mockAdmin,
      session: mockSession,
    });
    mockHasPermission.mockReturnValue(true);
  });

  it('should create a new API key successfully', async () => {
    const newApiKey = {
      id: 'apiKey_v1_new',
      userId: 'user_v1_test',
      name: 'New API Key',
      key: 'zuno_new_key_123456',
      tier: 'free',
      enabled: true,
      createdAt: new Date(),
    };

    mockApiKeyService.create.mockResolvedValue({
      ok: true,
      value: {
        apiKey: newApiKey,
        plainKey: 'zuno_new_key_123456',
      },
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/admin/api-keys',
      method: 'POST',
      headers: {
        authorization: 'Bearer admin_session_token',
      },
      body: {
        userId: 'user_v1_test',
        name: 'New API Key',
        tier: 'free',
        scopes: ['abis:read', 'abis:write'],
      },
    });

    const response = await POST(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.apiKey).toBeDefined();
    expect(data.data.plainKey).toBe('zuno_new_key_123456');
  });

  it('should require session authentication (not API key)', async () => {
    mockVerifySessionFromHeaders.mockResolvedValue(null);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/admin/api-keys',
      method: 'POST',
      headers: {
        'x-api-key': 'zuno_api_key', // API keys not allowed for this endpoint
      },
      body: {
        userId: 'user_v1_test',
        name: 'New API Key',
        tier: 'free',
        scopes: ['abis:read'],
      },
    });

    const response = await POST(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('should validate required fields', async () => {
    const request = createMockRequest({
      url: 'http://localhost:3000/api/admin/api-keys',
      method: 'POST',
      headers: {
        authorization: 'Bearer admin_session_token',
      },
      body: {
        // Missing required fields
        name: 'Incomplete Key',
      },
    });

    const response = await POST(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should support optional tier parameter', async () => {
    const newApiKey = {
      id: 'apiKey_v1_new',
      userId: 'user_v1_test',
      name: 'Pro Key',
      key: 'zuno_pro_key_123456',
      tier: 'pro',
      enabled: true,
      createdAt: new Date(),
    };

    mockApiKeyService.create.mockResolvedValue({
      ok: true,
      value: {
        apiKey: newApiKey,
        plainKey: 'zuno_pro_key_123456',
      },
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/admin/api-keys',
      method: 'POST',
      headers: {
        authorization: 'Bearer admin_session_token',
      },
      body: {
        userId: 'user_v1_test',
        name: 'Pro Key',
        tier: 'pro',
        scopes: ['abis:read', 'abis:write', 'contracts:write'],
      },
    });

    const response = await POST(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should support optional metadata', async () => {
    const newApiKey = {
      id: 'apiKey_v1_new',
      userId: 'user_v1_test',
      name: 'Production Key',
      key: 'zuno_prod_key_123456',
      tier: 'enterprise',
      enabled: true,
      metadata: {
        allowedOrigins: ['https://example.com'],
        ipWhitelist: ['192.168.1.1'],
        notes: 'Production use only',
      },
      createdAt: new Date(),
    };

    mockApiKeyService.create.mockResolvedValue({
      ok: true,
      value: {
        apiKey: newApiKey,
        plainKey: 'zuno_prod_key_123456',
      },
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/admin/api-keys',
      method: 'POST',
      headers: {
        authorization: 'Bearer admin_session_token',
      },
      body: {
        userId: 'user_v1_test',
        name: 'Production Key',
        tier: 'enterprise',
        scopes: ['abis:read', 'abis:write'],
        metadata: {
          allowedOrigins: ['https://example.com'],
          ipWhitelist: ['192.168.1.1'],
          notes: 'Production use only',
        },
      },
    });

    const response = await POST(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should require authentication', async () => {
    mockVerifySessionFromHeaders.mockResolvedValue(null);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/admin/api-keys',
      method: 'POST',
      headers: {}, // No auth
      body: {
        userId: 'user_v1_test',
        name: 'New Key',
        tier: 'free',
        scopes: ['abis:read'],
      },
    });

    const response = await POST(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });
});
