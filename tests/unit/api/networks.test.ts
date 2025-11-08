import {
  createMockRequest,
  extractJsonFromResponse,
  createMockApiKey,
  createMockUser,
  createMockSession,
} from './helpers/test-utils';
import { mockNetworkRepository, resetAllMocks } from './helpers/mocks';
import * as authHelpers from '@/infrastructure/auth/auth-helpers';

// Mock auth helpers - will be assigned after jest.mock calls

jest.mock('@/infrastructure/auth/auth-helpers', () => ({
  verifyApiKey: jest.fn(),
  verifySession: jest.fn(),
  verifySessionFromHeaders: jest.fn(),
  hasPermission: jest.fn(() => true),
  isAdmin: jest.fn(),
  canAccessResource: jest.fn(),
}));

jest.mock('@/infrastructure/di/container', () => ({
  getNetworkRepository: jest.fn(() => mockNetworkRepository),
  getAuditLogRepository: jest.fn(() => ({
    create: jest.fn(),
    findAll: jest.fn(),
  })),
}));

jest.mock('@/infrastructure/services/rate-limit.service', () => ({
  RateLimitService: {
    checkLimit: jest.fn().mockResolvedValue({
      success: true,
      data: {
        allowed: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 3600000,
        tier: 'free',
      },
      error: null,
    }),
  },
  RateLimitError: class RateLimitError extends Error {},
}));

// Import the route after mocks are set up
import { GET } from '@/app/api/networks/route';

// Assign mocked functions after imports
const mockVerifyApiKey = authHelpers.verifyApiKey as jest.Mock;
const mockVerifySessionFromHeaders = authHelpers.verifySessionFromHeaders as jest.Mock;

describe('GET /api/networks', () => {
  const mockNetworks = [
    {
      id: 'network_v1_ethereum',
      name: 'Ethereum Mainnet',
      chainId: 1,
      rpcUrl: 'https://eth.llamarpc.com',
      explorerUrl: 'https://etherscan.io',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      isActive: true,
      isTestnet: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'network_v1_polygon',
      name: 'Polygon',
      chainId: 137,
      rpcUrl: 'https://polygon-rpc.com',
      explorerUrl: 'https://polygonscan.com',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      isActive: true,
      isTestnet: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    // Default: API key authenticated
    const mockApiKey = createMockApiKey();
    mockVerifyApiKey.mockResolvedValue(mockApiKey);
    mockVerifySessionFromHeaders.mockResolvedValue(null);
  });

  it('should return paginated networks with authentication', async () => {
    mockNetworkRepository.list.mockResolvedValue({
      data: mockNetworks,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/networks',
      method: 'GET',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      searchParams: {
        page: '1',
        limit: '20',
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
      totalPages: 1,
    });
  });

  it('should return all networks when all=true', async () => {
    mockNetworkRepository.getAll.mockResolvedValue(mockNetworks);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/networks',
      method: 'GET',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      searchParams: {
        all: 'true',
      },
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.data).toHaveLength(2);
    expect(data.data.pagination).toMatchObject({
      page: 1,
      limit: 2,
      total: 2,
      totalPages: 1,
    });
    expect(mockNetworkRepository.getAll).toHaveBeenCalled();
  });

  it('should return only active networks when all=true and isActive=true', async () => {
    const activeNetworks = mockNetworks.filter((n) => n.isActive);
    mockNetworkRepository.getAllActive.mockResolvedValue(activeNetworks);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/networks',
      method: 'GET',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      searchParams: {
        all: 'true',
        isActive: 'true',
      },
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockNetworkRepository.getAllActive).toHaveBeenCalled();
  });

  it('should support pagination parameters', async () => {
    mockNetworkRepository.list.mockResolvedValue({
      data: [mockNetworks[0]],
      pagination: {
        page: 2,
        limit: 1,
        total: 2,
        totalPages: 2,
        hasNext: false,
        hasPrev: true,
      },
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/networks',
      method: 'GET',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      searchParams: {
        page: '2',
        limit: '1',
      },
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.data).toHaveLength(1);
    expect(data.data.pagination).toMatchObject({
      page: 2,
      limit: 1,
      hasNext: false,
      hasPrev: true,
    });
  });

  it('should work with session authentication', async () => {
    const mockUser = createMockUser();
    const mockSession = createMockSession(mockUser);

    mockVerifyApiKey.mockResolvedValue(null);
    mockVerifySessionFromHeaders.mockResolvedValue({
      user: mockUser,
      session: mockSession,
    });

    mockNetworkRepository.list.mockResolvedValue({
      data: mockNetworks,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/networks',
      method: 'GET',
      headers: {
        authorization: 'Bearer session_token',
      },
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should reject unauthenticated requests', async () => {
    mockVerifyApiKey.mockResolvedValue(null);
    mockVerifySessionFromHeaders.mockResolvedValue(null);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/networks',
      method: 'GET',
      headers: {}, // No auth
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject invalid API key', async () => {
    mockVerifyApiKey.mockResolvedValue(null);
    mockVerifySessionFromHeaders.mockResolvedValue(null);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/networks',
      method: 'GET',
      headers: {
        'x-api-key': 'invalid_key',
      },
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('should return empty array when no networks exist', async () => {
    mockNetworkRepository.list.mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/networks',
      method: 'GET',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.data).toHaveLength(0);
    expect(data.data.pagination.total).toBe(0);
  });

  it('should include rate limit headers', async () => {
    mockNetworkRepository.list.mockResolvedValue({
      data: mockNetworks,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/networks',
      method: 'GET',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
    });

    const response = await GET(request);

    expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy();
    expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
    expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  it('should include request tracking header', async () => {
    mockNetworkRepository.list.mockResolvedValue({
      data: mockNetworks,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/networks',
      method: 'GET',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
    });

    const response = await GET(request);

    expect(response.headers.get('X-Request-ID')).toBeTruthy();
  });
});
