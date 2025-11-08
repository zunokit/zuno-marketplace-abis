import { GET, POST } from '@/app/api/abis/route';
import {
  GET as GET_BY_ID,
  PUT as UPDATE_ABI,
  DELETE as DELETE_ABI,
} from '@/app/api/abis/[id]/route';
import {
  createMockRequest,
  extractJsonFromResponse,
  createMockApiKey,
  createMockUser,
  createMockSession,
  createMockAbi,
  createMockERC20Abi,
} from './helpers/test-utils';
import {
  mockAbiRepository,
  mockCacheService,
  mockStorageService,
  resetAllMocks,
} from './helpers/mocks';

// Mock auth helpers
const mockVerifyApiKey = jest.fn();
const mockVerifySessionFromHeaders = jest.fn();
const mockHasPermission = jest.fn();

jest.mock('@/infrastructure/auth/auth-helpers', () => ({
  verifyApiKey: mockVerifyApiKey,
  verifySession: jest.fn(),
  verifySessionFromHeaders: mockVerifySessionFromHeaders,
  hasPermission: mockHasPermission,
  isAdmin: jest.fn(() => false),
  canAccessResource: jest.fn(() => true),
}));

jest.mock('@/infrastructure/di/container', () => ({
  getAbiRepository: jest.fn(() => mockAbiRepository),
  getCacheService: jest.fn(() => mockCacheService),
  getStorageService: jest.fn(() => mockStorageService),
  getAuditLogRepository: jest.fn(() => ({
    create: jest.fn(),
    findAll: jest.fn(),
  })),
}));

jest.mock('@/infrastructure/services/rate-limit.service', () => ({
  RateLimitService: {
    checkLimit: jest.fn().mockResolvedValue({
      ok: true,
      value: {
        allowed: true,
        limit: 100,
        remaining: 99,
        reset: Date.now() + 3600000,
        tier: 'free',
      },
    }),
  },
  RateLimitError: class RateLimitError extends Error {},
}));

describe('GET /api/abis', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    const mockApiKey = createMockApiKey();
    mockVerifyApiKey.mockResolvedValue(mockApiKey);
    mockVerifySessionFromHeaders.mockResolvedValue(null);
    mockHasPermission.mockReturnValue(true);
  });

  it('should return paginated ABIs', async () => {
    const mockAbis = [
      {
        id: 'abi_v1_test1',
        name: 'ERC20 Token',
        description: 'Standard ERC20',
        contractName: 'MyToken',
        abi: createMockERC20Abi(),
        abiHash: 'hash123',
        standard: 'ERC20',
        tags: ['token'],
        userId: 'user_v1_test',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockAbiRepository.list.mockResolvedValue({
      data: mockAbis,
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
      url: 'http://localhost:3000/api/abis',
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
      url: 'http://localhost:3000/api/abis',
      method: 'GET',
    });

    const response = await GET(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });
});

describe('POST /api/abis', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    const mockApiKey = createMockApiKey({
      scopes: ['abis:write'],
      permissions: ['write:abis'],
    });
    mockVerifyApiKey.mockResolvedValue(mockApiKey);
    mockVerifySessionFromHeaders.mockResolvedValue(null);
    mockHasPermission.mockReturnValue(true);
  });

  it('should create a new ABI successfully', async () => {
    const newAbi = {
      id: 'abi_v1_new',
      name: 'Test ABI',
      description: 'Test description',
      contractName: 'TestContract',
      abi: createMockAbi(),
      abiHash: 'hash123',
      standard: 'ERC20',
      tags: ['test'],
      userId: 'user_v1_test',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAbiRepository.create.mockResolvedValue(newAbi);
    mockStorageService.upload.mockResolvedValue({
      hash: 'QmTest123',
      url: 'https://ipfs.io/ipfs/QmTest123',
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/abis',
      method: 'POST',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      body: {
        name: 'Test ABI',
        description: 'Test description',
        contractName: 'TestContract',
        abi: createMockAbi(),
        standard: 'ERC20',
        tags: ['test'],
      },
    });

    const response = await POST(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.abi).toBeDefined();
    expect(data.data.abi.name).toBe('Test ABI');
  });

  it('should require write permissions', async () => {
    mockHasPermission.mockReturnValue(false);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/abis',
      method: 'POST',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      body: {
        name: 'Test ABI',
        abi: createMockAbi(),
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
      url: 'http://localhost:3000/api/abis',
      method: 'POST',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      body: {
        // Missing required fields
        description: 'Test',
      },
    });

    const response = await POST(request);
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/abis/[id]', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    const mockApiKey = createMockApiKey();
    mockVerifyApiKey.mockResolvedValue(mockApiKey);
    mockVerifySessionFromHeaders.mockResolvedValue(null);
  });

  it('should return ABI by ID', async () => {
    const mockAbi = {
      id: 'abi_v1_test1',
      name: 'ERC20 Token',
      description: 'Standard ERC20',
      contractName: 'MyToken',
      abi: createMockERC20Abi(),
      abiHash: 'hash123',
      standard: 'ERC20',
      tags: ['token'],
      userId: 'user_v1_test',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAbiRepository.findById.mockResolvedValue(mockAbi);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/abis/abi_v1_test1',
      method: 'GET',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
    });

    const response = await GET_BY_ID(request, {
      params: Promise.resolve({ id: 'abi_v1_test1' }),
    });
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('abi_v1_test1');
    expect(data.data.name).toBe('ERC20 Token');
  });

  it('should return 404 for non-existent ABI', async () => {
    mockAbiRepository.findById.mockResolvedValue(null);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/abis/abi_v1_nonexistent',
      method: 'GET',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
    });

    const response = await GET_BY_ID(request, {
      params: Promise.resolve({ id: 'abi_v1_nonexistent' }),
    });
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('should hide soft-deleted ABIs from unauthorized users', async () => {
    const mockAbi = {
      id: 'abi_v1_test1',
      name: 'Deleted ABI',
      abi: createMockAbi(),
      userId: 'user_v1_other',
      isDeleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAbiRepository.findById.mockResolvedValue(mockAbi);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/abis/abi_v1_test1',
      method: 'GET',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
    });

    const response = await GET_BY_ID(request, {
      params: Promise.resolve({ id: 'abi_v1_test1' }),
    });
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });
});

describe('PUT /api/abis/[id]', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    const mockApiKey = createMockApiKey({
      userId: 'user_v1_test',
      scopes: ['abis:write'],
      permissions: ['write:abis'],
    });
    mockVerifyApiKey.mockResolvedValue(mockApiKey);
    mockVerifySessionFromHeaders.mockResolvedValue(null);
    mockHasPermission.mockReturnValue(true);
  });

  it('should update ABI successfully', async () => {
    const existingAbi = {
      id: 'abi_v1_test1',
      name: 'Old Name',
      abi: createMockAbi(),
      userId: 'user_v1_test',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedAbi = {
      ...existingAbi,
      name: 'New Name',
      description: 'Updated description',
    };

    mockAbiRepository.findById.mockResolvedValue(existingAbi);
    mockAbiRepository.update.mockResolvedValue(updatedAbi);
    mockStorageService.upload.mockResolvedValue({
      hash: 'QmUpdated123',
      url: 'https://ipfs.io/ipfs/QmUpdated123',
    });

    const request = createMockRequest({
      url: 'http://localhost:3000/api/abis/abi_v1_test1',
      method: 'PUT',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      body: {
        name: 'New Name',
        description: 'Updated description',
      },
    });

    const response = await UPDATE_ABI(request, {
      params: Promise.resolve({ id: 'abi_v1_test1' }),
    });
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should prevent unauthorized users from updating', async () => {
    const existingAbi = {
      id: 'abi_v1_test1',
      name: 'Test ABI',
      abi: createMockAbi(),
      userId: 'user_v1_other', // Different user
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAbiRepository.findById.mockResolvedValue(existingAbi);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/abis/abi_v1_test1',
      method: 'PUT',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
      body: {
        name: 'Hacker Name',
      },
    });

    const response = await UPDATE_ABI(request, {
      params: Promise.resolve({ id: 'abi_v1_test1' }),
    });
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
  });
});

describe('DELETE /api/abis/[id]', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();

    const mockApiKey = createMockApiKey({
      userId: 'user_v1_test',
      scopes: ['abis:delete'],
      permissions: ['delete:abis'],
    });
    mockVerifyApiKey.mockResolvedValue(mockApiKey);
    mockVerifySessionFromHeaders.mockResolvedValue(null);
    mockHasPermission.mockReturnValue(true);
  });

  it('should soft delete ABI successfully', async () => {
    const existingAbi = {
      id: 'abi_v1_test1',
      name: 'Test ABI',
      abi: createMockAbi(),
      userId: 'user_v1_test',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAbiRepository.findById.mockResolvedValue(existingAbi);
    mockAbiRepository.softDelete.mockResolvedValue(true);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/abis/abi_v1_test1',
      method: 'DELETE',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
    });

    const response = await DELETE_ABI(request, {
      params: Promise.resolve({ id: 'abi_v1_test1' }),
    });
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.success).toBe(true);
    expect(data.data.message).toContain('deleted successfully');
  });

  it('should prevent unauthorized users from deleting', async () => {
    const existingAbi = {
      id: 'abi_v1_test1',
      name: 'Test ABI',
      abi: createMockAbi(),
      userId: 'user_v1_other', // Different user
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockAbiRepository.findById.mockResolvedValue(existingAbi);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/abis/abi_v1_test1',
      method: 'DELETE',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
    });

    const response = await DELETE_ABI(request, {
      params: Promise.resolve({ id: 'abi_v1_test1' }),
    });
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it('should return 404 for non-existent ABI', async () => {
    mockAbiRepository.findById.mockResolvedValue(null);

    const request = createMockRequest({
      url: 'http://localhost:3000/api/abis/abi_v1_nonexistent',
      method: 'DELETE',
      headers: {
        'x-api-key': 'zuno_test_key',
      },
    });

    const response = await DELETE_ABI(request, {
      params: Promise.resolve({ id: 'abi_v1_nonexistent' }),
    });
    const data = await extractJsonFromResponse(response);

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });
});
