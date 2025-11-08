/**
 * Mock implementations for external dependencies in API tests
 */

/**
 * Mock Database (Drizzle)
 */
export const mockDb = {
  query: {
    networks: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    abis: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    contracts: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    apiKeys: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    users: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  execute: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
};

/**
 * Mock Cache Service (Redis)
 */
export const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  health: jest.fn().mockResolvedValue(true),
  invalidate: jest.fn(),
  invalidatePattern: jest.fn(),
};

/**
 * Mock Storage Service (IPFS/Pinata)
 */
export const mockStorageService = {
  upload: jest.fn().mockResolvedValue({
    hash: 'QmTest123',
    url: 'https://test-gateway.pinata.cloud/ipfs/QmTest123',
  }),
  get: jest.fn(),
  delete: jest.fn(),
  pin: jest.fn(),
  unpin: jest.fn(),
};

/**
 * Mock Better Auth
 */
export const mockAuth = {
  api: {
    getSession: jest.fn().mockResolvedValue({
      session: null,
      user: null,
    }),
    signIn: {
      email: jest.fn(),
    },
    signOut: jest.fn(),
  },
};

/**
 * Mock Rate Limit Service
 */
export const mockRateLimitService = {
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
  resetLimit: jest.fn(),
  getRateLimitInfo: jest.fn(),
};

/**
 * Mock Repository Factory
 */
export function createMockRepository<T>() {
  return {
    findById: jest.fn(),
    findAll: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    exists: jest.fn(),
  };
}

/**
 * Mock ABI Repository
 */
export const mockAbiRepository = {
  ...createMockRepository(),
  findByHash: jest.fn(),
  findByContractAddress: jest.fn(),
  findByStandard: jest.fn(),
  findByTags: jest.fn(),
  softDelete: jest.fn(),
};

/**
 * Mock Contract Repository
 */
export const mockContractRepository = {
  ...createMockRepository(),
  findByAddress: jest.fn(),
  findByName: jest.fn(),
  findByNetwork: jest.fn(),
  findByChainId: jest.fn(),
};

/**
 * Mock Network Repository
 */
export const mockNetworkRepository = {
  ...createMockRepository(),
  findByChainId: jest.fn(),
  findByName: jest.fn(),
  findEnabled: jest.fn(),
  getAll: jest.fn(),
  getAllActive: jest.fn(),
};

/**
 * Mock API Key Repository
 */
export const mockApiKeyRepository = {
  ...createMockRepository(),
  findByKey: jest.fn(),
  findByUserId: jest.fn(),
  revokeKey: jest.fn(),
  updateLastUsed: jest.fn(),
};

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  jest.clearAllMocks();

  // Reset DB mocks
  Object.values(mockDb.query).forEach((queryMock) => {
    if (typeof queryMock === 'object') {
      Object.values(queryMock).forEach((fn) => {
        if (jest.isMockFunction(fn)) {
          fn.mockReset();
        }
      });
    }
  });

  // Reset other mocks
  [
    mockDb,
    mockCacheService,
    mockStorageService,
    mockAuth,
    mockRateLimitService,
    mockAbiRepository,
    mockContractRepository,
    mockNetworkRepository,
    mockApiKeyRepository,
  ].forEach((mock) => {
    Object.values(mock).forEach((fn) => {
      if (jest.isMockFunction(fn)) {
        fn.mockReset();
      } else if (typeof fn === 'object' && fn !== null) {
        Object.values(fn).forEach((nestedFn) => {
          if (jest.isMockFunction(nestedFn)) {
            nestedFn.mockReset();
          }
        });
      }
    });
  });
}

/**
 * Setup module mocks for all tests
 */
export function setupModuleMocks() {
  // Mock database client
  jest.mock('@/infrastructure/database/drizzle/client', () => ({
    db: mockDb,
  }));

  // Mock DI container
  jest.mock('@/infrastructure/di/container', () => ({
    getAbiRepository: jest.fn(() => mockAbiRepository),
    getContractRepository: jest.fn(() => mockContractRepository),
    getNetworkRepository: jest.fn(() => mockNetworkRepository),
    getApiKeyRepository: jest.fn(() => mockApiKeyRepository),
    getCacheService: jest.fn(() => mockCacheService),
    getStorageService: jest.fn(() => mockStorageService),
    getAuditLogRepository: jest.fn(() => createMockRepository()),
  }));

  // Mock Better Auth
  jest.mock('@/infrastructure/auth/better-auth.config', () => ({
    auth: mockAuth,
  }));

  // Mock Rate Limit Service
  jest.mock('@/infrastructure/services/rate-limit.service', () => ({
    RateLimitService: mockRateLimitService,
    RateLimitError: class RateLimitError extends Error {
      constructor(message: string, public result: any) {
        super(message);
        this.name = 'RateLimitError';
      }
    },
  }));

  // Mock Cache Adapter
  jest.mock('@/infrastructure/cache/cache.adapter', () => ({
    CacheAdapter: {
      getInstance: jest.fn(() => mockCacheService),
    },
  }));
}
