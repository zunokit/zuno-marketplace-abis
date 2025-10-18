import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.BETTER_AUTH_SECRET = 'test-secret-at-least-32-characters-long'
process.env.BETTER_AUTH_URL = 'http://localhost:3000'
process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io'
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
process.env.PINATA_JWT = 'test-jwt'
process.env.PINATA_GATEWAY_URL = 'https://test-gateway.pinata.cloud'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.NODE_ENV = 'test'

// Mock fetch globally
global.fetch = jest.fn()

// Mock crypto.randomUUID
Object.defineProperty(global.crypto, 'randomUUID', {
  value: () => '550e8400-e29b-41d4-a716-446655440000',
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Suppress console.error during tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})