import { GET, POST } from '@/app/api/contracts/route';
import {
  createMockRequest,
  extractJsonFromResponse,
  createMockApiKey,
  createMockContractAddress,
} from './helpers/test-utils';
import {
  mockContractRepository,
  mockAbiRepository,
  mockCacheService,
  resetAllMocks,
} from './helpers/mocks';
import * as authHelpers from '@/infrastructure/auth/auth-helpers';

// Mock auth helpers - declare after jest.mock to access them
let mockVerifyApiKey: jest.Mock;
let mockVerifySessionFromHeaders: jest.Mock;
let mockHasPermission: jest.Mock;

jest.mock('@/infrastructure/auth/auth-helpers', () => ({
  verifyApiKey: jest.fn(),
  verifySession: jest.fn(),
  verifySessionFromHeaders: jest.fn(),
  hasPermission: jest.fn(),
  isAdmin: jest.fn(() => false),
  canAccessResource: jest.fn(() => true),
}));

jest.mock('@/infrastructure/di/container', () => ({
  getContractRepository: jest.fn(() => mockContractRepository),
  getAbiRepository: jest.fn(() => mockAbiRepository),
  getCacheService: jest.fn(() => mockCacheService),
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

// Assign mocked functions after imports
mockVerifyApiKey = authHelpers.verifyApiKey as jest.Mock;
mockVerifySessionFromHeaders = authHelpers.verifySessionFromHeaders as jest.Mock;
mockHasPermission = authHelpers.hasPermission as jest.Mock;

describe('GET /api/contracts', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    const mockApiKey = createMockApiKey();
    mockVerifyApiKey.mockResolvedValue(mockApiKey);
    mockVerifySessionFromHeaders.mockResolvedValue(null);
    mockHasPermission.mockReturnValue(true);
  });

  it('should return paginated contracts', async () => {
    const mockContracts = [
      {
        id: 'contract_v1_test1',
        address: createMockContractAddress(),
        networkId: 'network_v1_ethereum',
        abiId: 'abi_v1_test',
        name: 'Test Contract',
        type: 'token',
        userId: 'user_v1_test',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockContractRepository.list.mockResolvedValue({
      data: mockContracts,
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/contracts',
      method: 'GET',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.data).toHaveLength(1);
    expect(data.data.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: 1,
    });
  });

  it('should require authentication', async () => {
    mockVerifyApiKey.mockResolvedValue(null);
    mockVerifySessionFromHeaders.mockResolvedValue(null);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/contracts',
      method: 'GET',
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should support filtering by network', async () => {
    mockContractRepository.list.mockResolvedValue({
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
      url: 'http://localhost:3000/api/contracts',
      method: 'GET',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      searchParams: {
        networkId: 'network_v1_ethereum',
      },
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should support filtering by contract type', async () => {
    mockContractRepository.list.mockResolvedValue({
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
      url: 'http://localhost:3000/api/contracts',
      method: 'GET',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      searchParams: {
        type: 'token',
      },
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should support search by contract name', async () => {
    mockContractRepository.list.mockResolvedValue({
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
      url: 'http://localhost:3000/api/contracts',
      method: 'GET',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      searchParams: {
        query: 'MyToken',
      },
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe('POST /api/contracts', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    const mockApiKey = createMockApiKey({
      scopes: ['contracts:write'],
      permissions: ['write:contracts'],
    });
    mockVerifyApiKey.mockResolvedValue(mockApiKey);
    mockVerifySessionFromHeaders.mockResolvedValue(null);
    mockHasPermission.mockReturnValue(true);
  });

  it('should create a new contract successfully', async () => {
    const mockAbi = {
      id: 'abi_v1_test',
      name: 'ERC20 ABI',
      abi: [],
      userId: 'user_v1_test',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newContract = {
      id: 'contract_v1_new',
      address: createMockContractAddress(),
      networkId: 'network_v1_ethereum',
      abiId: 'abi_v1_test',
      name: 'Test Contract',
      type: 'token',
      userId: 'user_v1_test',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAbiRepository.findById.mockResolvedValue(mockAbi);
    mockContractRepository.create.mockResolvedValue(newContract);
    mockContractRepository.findByAddress.mockResolvedValue(null);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/contracts',
      method: 'POST',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      body: {
        address: createMockContractAddress(),
        networkId: 'network_v1_ethereum',
        abiId: 'abi_v1_test',
        name: 'Test Contract',
        type: 'token', // Valid contract type
      },
    });

    const response = await POST(request);
    const data = await extractJsonFromResponse(response);

    if (response.status !== 200) {
      console.log('Error response:', JSON.stringify(data, null, 2));
    } else {
      console.log('Success response:', JSON.stringify(data, null, 2));
    }

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.name).toBe('Test Contract');
  });

  it('should require write permissions', async () => {
    mockHasPermission.mockReturnValue(false);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/contracts',
      method: 'POST',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      body: {
        address: createMockContractAddress(),
        networkId: 'network_v1_ethereum',
        abiId: 'abi_v1_test',
        name: 'Test Contract',
      },
    });

    const response = await POST(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('should validate required fields', async () => {
    const request = createMockRequest({
      url: 'http://localhost:3000/api/contracts',
      method: 'POST',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      body: {
        // Missing required fields
        name: 'Test Contract',
      },
    });

    const response = await POST(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should validate Ethereum address format', async () => {
    const request = createMockRequest({
      url: 'http://localhost:3000/api/contracts',
      method: 'POST',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      body: {
        address: 'invalid_address',
        networkId: 'network_v1_ethereum',
        abiId: 'abi_v1_test',
        name: 'Test Contract',
      },
    });

    const response = await POST(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should handle optional metadata field', async () => {
    const mockAbi = {
      id: 'abi_v1_test',
      name: 'ERC20 ABI',
      abi: [],
      userId: 'user_v1_test',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newContract = {
      id: 'contract_v1_new',
      address: createMockContractAddress(),
      networkId: 'network_v1_ethereum',
      abiId: 'abi_v1_test',
      name: 'Test Contract',
      type: 'token', // Valid contract type
      userId: 'user_v1_test',
      metadata: {
        verified: true,
        compiler: 'solc',
      },
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAbiRepository.findById.mockResolvedValue(mockAbi);
    mockContractRepository.create.mockResolvedValue(newContract);
    mockContractRepository.findByAddress.mockResolvedValue(null);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/contracts',
      method: 'POST',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      body: {
        address: createMockContractAddress(),
        networkId: 'network_v1_ethereum',
        abiId: 'abi_v1_test',
        name: 'Test Contract',
        type: 'token', // Valid contract type
        metadata: {
          verified: true,
          compiler: 'solc',
        },
      },
    });

    const response = await POST(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should require authentication', async () => {
    mockVerifyApiKey.mockResolvedValue(null);
    mockVerifySessionFromHeaders.mockResolvedValue(null);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/contracts',
      method: 'POST',
      body: {
        address: createMockContractAddress(),
        networkId: 'network_v1_ethereum',
        abiId: 'abi_v1_test',
        name: 'Test Contract',
      },
    });

    const response = await POST(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });
});
