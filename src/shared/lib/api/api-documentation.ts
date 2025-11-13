import type { ApiDocumentation } from "@/shared/types/api-docs.types";

export const API_DOCUMENTATION: ApiDocumentation = {
  version: "v1",
  title: "Zuno Marketplace ABIs API",
  description:
    "Enterprise-grade API for accessing verified smart contract ABIs across multiple EVM-compatible networks. This API provides developers with a centralized repository of contract interfaces, enabling seamless integration with blockchain applications.",
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || "https://api.zunomarketplace.com",
  authentication: {
    methods: [
      {
        name: "API Key",
        type: "apiKey",
        description:
          "Authenticate using an API key for programmatic access. API keys support different tiers with varying rate limits.",
        how: "Include your API key in the request header as `X-API-Key` or as a Bearer token in the `Authorization` header.",
        example: 'curl -H "X-API-Key: your_api_key_here" https://api.zunomarketplace.com/api/abis',
      },
      {
        name: "Session Token",
        type: "session",
        description:
          "Authenticate using a session token obtained through login. Suitable for web applications and admin interfaces.",
        how: "Include session token as a cookie or Bearer token in the `Authorization` header.",
        example: 'curl -H "Authorization: Bearer your_session_token" https://api.zunomarketplace.com/api/abis',
      },
    ],
  },
  rateLimiting: {
    description:
      "Rate limits are enforced per API key tier to ensure fair usage and system stability. Limits are calculated per hour.",
    tiers: [
      {
        name: "Public",
        limit: "100 requests/hour",
        description: "Free tier with basic read-only access to public endpoints",
      },
      {
        name: "Free",
        limit: "500 requests/hour",
        description: "Free registered tier with increased limits and write access",
      },
      {
        name: "Pro",
        limit: "5,000 requests/hour",
        description: "Professional tier with high limits and priority support",
      },
      {
        name: "Enterprise",
        limit: "Unlimited",
        description: "Custom limits, dedicated support, and SLA guarantees",
      },
    ],
  },
  errorCodes: [
    {
      code: "VALIDATION_ERROR",
      httpStatus: 400,
      description: "Request validation failed. Check your input parameters.",
      example: {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed. Please check your input.",
          requestId: "req_abc123",
          details: {
            issues: [
              {
                path: ["address"],
                message: "Invalid Ethereum address",
              },
            ],
          },
        },
      },
    },
    {
      code: "UNAUTHORIZED",
      httpStatus: 401,
      description: "Authentication required. Provide a valid API key or session token.",
      example: {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required. Provide a valid API key or session.",
          requestId: "req_abc123",
        },
      },
    },
    {
      code: "FORBIDDEN",
      httpStatus: 403,
      description: "Insufficient permissions to access this resource.",
      example: {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions. Required: abis:write",
          requestId: "req_abc123",
        },
      },
    },
    {
      code: "NOT_FOUND",
      httpStatus: 404,
      description: "The requested resource was not found.",
      example: {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "ABI not found with ID: abi_v1_xyz123",
          requestId: "req_abc123",
        },
      },
    },
    {
      code: "RATE_LIMITED",
      httpStatus: 429,
      description: "Rate limit exceeded. Please wait before making more requests.",
      example: {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Rate limit exceeded. Try again in 3600 seconds.",
          requestId: "req_abc123",
          details: {
            retryAfter: 3600,
            limit: 100,
            reset: 1704067200,
          },
        },
      },
    },
    {
      code: "INTERNAL_ERROR",
      httpStatus: 500,
      description: "An internal server error occurred. Please try again later.",
      example: {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          requestId: "req_abc123",
        },
      },
    },
  ],
  endpointGroups: [
    {
      name: "Health & Version",
      description: "System health and version information endpoints",
      endpoints: [
        {
          method: "GET",
          path: "/api/health",
          summary: "Health check",
          description: "Check the health and availability of the API service.",
          authentication: {
            required: false,
            methods: [],
          },
          responses: [
            {
              statusCode: 200,
              description: "Service is healthy",
              example: {
                success: true,
                data: {
                  status: "ok",
                  timestamp: "2025-01-19T10:30:00Z",
                  version: "v1",
                },
              },
            },
          ],
          examples: [
            {
              language: "curl",
              code: 'curl https://api.zunomarketplace.com/api/health',
            },
            {
              language: "javascript",
              code: `fetch('https://api.zunomarketplace.com/api/health')
  .then(res => res.json())
  .then(data => console.log(data));`,
            },
            {
              language: "python",
              code: `import requests

response = requests.get('https://api.zunomarketplace.com/api/health')
print(response.json())`,
            },
          ],
        },
        {
          method: "GET",
          path: "/api/version",
          summary: "Get API version",
          description: "Retrieve current API version information and supported versions.",
          authentication: {
            required: false,
            methods: [],
          },
          responses: [
            {
              statusCode: 200,
              description: "API version information",
              example: {
                success: true,
                data: {
                  currentVersion: "v1",
                  supportedVersions: ["v1"],
                },
              },
            },
          ],
          examples: [
            {
              language: "curl",
              code: 'curl https://api.zunomarketplace.com/api/version',
            },
          ],
        },
      ],
    },
    {
      name: "Networks",
      description: "Blockchain network information and management",
      endpoints: [
        {
          method: "GET",
          path: "/api/networks",
          summary: "List blockchain networks",
          description: "Retrieve a list of supported blockchain networks with pagination and filtering options.",
          authentication: {
            required: true,
            methods: ["API Key", "Session"],
          },
          parameters: [
            {
              name: "page",
              type: "number",
              location: "query",
              required: false,
              description: "Page number for pagination (default: 1)",
              example: 1,
            },
            {
              name: "limit",
              type: "number",
              location: "query",
              required: false,
              description: "Number of items per page (default: 20, max: 100)",
              example: 20,
            },
            {
              name: "all",
              type: "boolean",
              location: "query",
              required: false,
              description: "Retrieve all networks without pagination",
              example: "true",
            },
            {
              name: "isActive",
              type: "boolean",
              location: "query",
              required: false,
              description: "Filter by active status",
              example: "true",
            },
            {
              name: "query",
              type: "string",
              location: "query",
              required: false,
              description: "Search networks by name",
              example: "ethereum",
            },
          ],
          responses: [
            {
              statusCode: 200,
              description: "List of networks retrieved successfully",
              example: {
                success: true,
                data: [
                  {
                    id: "net_v1_ethereum",
                    chainId: 1,
                    name: "Ethereum Mainnet",
                    shortName: "eth",
                    nativeCurrency: {
                      name: "Ether",
                      symbol: "ETH",
                      decimals: 18,
                    },
                    rpcUrls: ["https://eth.llamarpc.com"],
                    blockExplorerUrls: ["https://etherscan.io"],
                    isTestnet: false,
                    isActive: true,
                  },
                ],
                pagination: {
                  page: 1,
                  limit: 20,
                  total: 10,
                  totalPages: 1,
                  hasNext: false,
                  hasPrev: false,
                },
              },
            },
          ],
          examples: [
            {
              language: "curl",
              code: `curl -H "X-API-Key: your_api_key" \\
  "https://api.zunomarketplace.com/api/networks?page=1&limit=20"`,
            },
            {
              language: "javascript",
              code: `const response = await fetch('https://api.zunomarketplace.com/api/networks?page=1&limit=20', {
  headers: {
    'X-API-Key': 'your_api_key'
  }
});
const data = await response.json();
console.log(data);`,
            },
            {
              language: "python",
              code: `import requests

headers = {'X-API-Key': 'your_api_key'}
response = requests.get(
    'https://api.zunomarketplace.com/api/networks',
    params={'page': 1, 'limit': 20},
    headers=headers
)
print(response.json())`,
            },
          ],
        },
        {
          method: "GET",
          path: "/api/networks/{chainId}/contracts",
          summary: "List contracts by network",
          description: "Retrieve all contracts deployed on a specific blockchain network.",
          authentication: {
            required: true,
            methods: ["API Key", "Session"],
          },
          parameters: [
            {
              name: "chainId",
              type: "number",
              location: "path",
              required: true,
              description: "Chain ID of the network",
              example: 1,
            },
            {
              name: "page",
              type: "number",
              location: "query",
              required: false,
              description: "Page number for pagination",
              example: 1,
            },
            {
              name: "limit",
              type: "number",
              location: "query",
              required: false,
              description: "Number of items per page",
              example: 20,
            },
          ],
          responses: [
            {
              statusCode: 200,
              description: "List of contracts retrieved successfully",
              example: {
                success: true,
                data: [
                  {
                    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                    networkId: "net_v1_ethereum",
                    name: "Uniswap Token",
                    type: "token",
                    isVerified: true,
                  },
                ],
                pagination: {
                  page: 1,
                  limit: 20,
                  total: 50,
                  totalPages: 3,
                  hasNext: true,
                  hasPrev: false,
                },
              },
            },
          ],
          examples: [
            {
              language: "curl",
              code: `curl -H "X-API-Key: your_api_key" \\
  "https://api.zunomarketplace.com/api/networks/1/contracts"`,
            },
          ],
        },
      ],
    },
    {
      name: "ABIs",
      description: "Contract ABI management and retrieval",
      endpoints: [
        {
          method: "GET",
          path: "/api/abis",
          summary: "List ABIs",
          description: "Retrieve a paginated list of contract ABIs with optional filtering and search.",
          authentication: {
            required: true,
            methods: ["API Key", "Session"],
          },
          parameters: [
            {
              name: "page",
              type: "number",
              location: "query",
              required: false,
              description: "Page number for pagination",
              example: 1,
            },
            {
              name: "limit",
              type: "number",
              location: "query",
              required: false,
              description: "Number of items per page",
              example: 20,
            },
            {
              name: "query",
              type: "string",
              location: "query",
              required: false,
              description: "Search ABIs by name or description",
              example: "ERC20",
            },
            {
              name: "contractName",
              type: "string",
              location: "query",
              required: false,
              description: "Filter by contract name",
              example: "UniswapV2",
            },
            {
              name: "standard",
              type: "string",
              location: "query",
              required: false,
              description: "Filter by standard (ERC20, ERC721, ERC1155, ERC4626, custom)",
              example: "ERC20",
            },
            {
              name: "tags",
              type: "string",
              location: "query",
              required: false,
              description: "Filter by tags (comma-separated)",
              example: "defi,token",
            },
          ],
          responses: [
            {
              statusCode: 200,
              description: "List of ABIs retrieved successfully",
              example: {
                success: true,
                data: [
                  {
                    id: "abi_v1_xyz123",
                    name: "ERC20 Standard",
                    contractName: "ERC20Token",
                    description: "Standard ERC20 token interface",
                    standard: "ERC20",
                    version: 1,
                    tags: ["token", "erc20"],
                    createdAt: "2025-01-19T10:00:00Z",
                  },
                ],
                pagination: {
                  page: 1,
                  limit: 20,
                  total: 100,
                  totalPages: 5,
                  hasNext: true,
                  hasPrev: false,
                },
              },
            },
          ],
          examples: [
            {
              language: "curl",
              code: `curl -H "X-API-Key: your_api_key" \\
  "https://api.zunomarketplace.com/api/abis?page=1&standard=ERC20"`,
            },
            {
              language: "javascript",
              code: `const response = await fetch('https://api.zunomarketplace.com/api/abis?standard=ERC20', {
  headers: { 'X-API-Key': 'your_api_key' }
});
const { data } = await response.json();
console.log(data);`,
            },
          ],
        },
        {
          method: "GET",
          path: "/api/abis/{id}",
          summary: "Get ABI by ID",
          description: "Retrieve detailed information about a specific ABI including the full ABI JSON.",
          authentication: {
            required: true,
            methods: ["API Key", "Session"],
          },
          parameters: [
            {
              name: "id",
              type: "string",
              location: "path",
              required: true,
              description: "ABI ID",
              example: "abi_v1_xyz123",
            },
          ],
          responses: [
            {
              statusCode: 200,
              description: "ABI details retrieved successfully",
              example: {
                success: true,
                data: {
                  id: "abi_v1_xyz123",
                  name: "ERC20 Standard",
                  contractName: "ERC20Token",
                  description: "Standard ERC20 token interface",
                  abi: [
                    {
                      inputs: [],
                      name: "totalSupply",
                      outputs: [{ type: "uint256" }],
                      stateMutability: "view",
                      type: "function",
                    },
                  ],
                  standard: "ERC20",
                  version: 1,
                  ipfsHash: "QmX...",
                  ipfsUrl: "https://gateway.pinata.cloud/ipfs/QmX...",
                  createdAt: "2025-01-19T10:00:00Z",
                },
              },
            },
          ],
          examples: [
            {
              language: "curl",
              code: `curl -H "X-API-Key: your_api_key" \\
  "https://api.zunomarketplace.com/api/abis/abi_v1_xyz123"`,
            },
          ],
        },
        {
          method: "GET",
          path: "/api/abis/full",
          summary: "Get full ABI with metadata",
          description: "Retrieve complete ABI information including IPFS storage details and metadata.",
          authentication: {
            required: true,
            methods: ["API Key", "Session"],
          },
          parameters: [
            {
              name: "id",
              type: "string",
              location: "query",
              required: true,
              description: "ABI ID",
              example: "abi_v1_xyz123",
            },
          ],
          responses: [
            {
              statusCode: 200,
              description: "Full ABI details retrieved successfully",
              example: {
                success: true,
                data: {
                  id: "abi_v1_xyz123",
                  name: "ERC20 Standard",
                  abi: [],
                  ipfs: {
                    hash: "QmX...",
                    url: "https://gateway.pinata.cloud/ipfs/QmX...",
                  },
                  metadata: {
                    compiler: "solc",
                    compilerVersion: "0.8.20",
                  },
                },
              },
            },
          ],
          examples: [
            {
              language: "curl",
              code: `curl -H "X-API-Key: your_api_key" \\
  "https://api.zunomarketplace.com/api/abis/full?id=abi_v1_xyz123"`,
            },
          ],
        },
        {
          method: "POST",
          path: "/api/abis",
          summary: "Create new ABI",
          description: "Upload and store a new contract ABI. The ABI will be stored on IPFS for immutability.",
          authentication: {
            required: true,
            methods: ["API Key", "Session"],
            permissions: ["abis:write", "write:abis"],
          },
          requestBody: {
            contentType: "application/json",
            schema: {
              name: "string (required, max 255 chars)",
              contractName: "string (optional, max 255 chars)",
              description: "string (optional, max 1000 chars)",
              abi: "array or string (required, ABI JSON)",
              standard: "enum (optional: ERC20, ERC721, ERC1155, ERC4626, custom)",
              tags: "array of strings (optional, max 10 tags)",
              metadata: {
                originNetwork: "string (optional)",
                compatibleNetworks: "array of strings (optional)",
                compiler: "string (optional)",
                compilerVersion: "string (optional)",
                license: "string (optional)",
                sourceUrl: "string (optional, URL)",
                bytecode: "string (optional)",
              },
            },
            example: {
              name: "My ERC20 Token",
              contractName: "MyToken",
              description: "Custom ERC20 token contract",
              abi: [
                {
                  inputs: [],
                  name: "totalSupply",
                  outputs: [{ name: "", type: "uint256" }],
                  stateMutability: "view",
                  type: "function",
                },
              ],
              standard: "ERC20",
              tags: ["token", "erc20"],
              metadata: {
                compiler: "solc",
                compilerVersion: "0.8.20",
                license: "MIT",
              },
            },
          },
          responses: [
            {
              statusCode: 200,
              description: "ABI created successfully",
              example: {
                success: true,
                data: {
                  id: "abi_v1_xyz123",
                  name: "My ERC20 Token",
                  ipfsHash: "QmX...",
                  ipfsUrl: "https://gateway.pinata.cloud/ipfs/QmX...",
                  createdAt: "2025-01-19T10:00:00Z",
                },
              },
            },
          ],
          examples: [
            {
              language: "curl",
              code: `curl -X POST \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My ERC20 Token",
    "contractName": "MyToken",
    "abi": [...],
    "standard": "ERC20"
  }' \\
  "https://api.zunomarketplace.com/api/abis"`,
            },
            {
              language: "javascript",
              code: `const response = await fetch('https://api.zunomarketplace.com/api/abis', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My ERC20 Token',
    contractName: 'MyToken',
    abi: [...],
    standard: 'ERC20'
  })
});
const data = await response.json();`,
            },
            {
              language: "python",
              code: `import requests

headers = {
    'X-API-Key': 'your_api_key',
    'Content-Type': 'application/json'
}
data = {
    'name': 'My ERC20 Token',
    'contractName': 'MyToken',
    'abi': [...],
    'standard': 'ERC20'
}
response = requests.post(
    'https://api.zunomarketplace.com/api/abis',
    json=data,
    headers=headers
)
print(response.json())`,
            },
          ],
        },
      ],
    },
    {
      name: "Contracts",
      description: "Smart contract registration and information",
      endpoints: [
        {
          method: "GET",
          path: "/api/contracts",
          summary: "List contracts",
          description: "Retrieve a paginated list of registered smart contracts with filtering options.",
          authentication: {
            required: true,
            methods: ["API Key", "Session"],
          },
          parameters: [
            {
              name: "page",
              type: "number",
              location: "query",
              required: false,
              description: "Page number for pagination",
              example: 1,
            },
            {
              name: "limit",
              type: "number",
              location: "query",
              required: false,
              description: "Number of items per page",
              example: 20,
            },
            {
              name: "query",
              type: "string",
              location: "query",
              required: false,
              description: "Search contracts by name or address",
              example: "Uniswap",
            },
            {
              name: "networkId",
              type: "string",
              location: "query",
              required: false,
              description: "Filter by network ID",
              example: "net_v1_ethereum",
            },
            {
              name: "type",
              type: "string",
              location: "query",
              required: false,
              description: "Filter by contract type (token, nft, defi, dao, bridge, other)",
              example: "token",
            },
            {
              name: "isVerified",
              type: "boolean",
              location: "query",
              required: false,
              description: "Filter by verification status",
              example: "true",
            },
          ],
          responses: [
            {
              statusCode: 200,
              description: "List of contracts retrieved successfully",
              example: {
                success: true,
                data: [
                  {
                    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                    networkId: "net_v1_ethereum",
                    name: "Uniswap Token",
                    type: "token",
                    isVerified: true,
                    deployedAt: "2020-09-17T00:00:00Z",
                  },
                ],
                pagination: {
                  page: 1,
                  limit: 20,
                  total: 50,
                  totalPages: 3,
                  hasNext: true,
                  hasPrev: false,
                },
              },
            },
          ],
          examples: [
            {
              language: "curl",
              code: `curl -H "X-API-Key: your_api_key" \\
  "https://api.zunomarketplace.com/api/contracts?type=token&isVerified=true"`,
            },
          ],
        },
        {
          method: "GET",
          path: "/api/contracts/{address}",
          summary: "Get contract by address",
          description: "Retrieve detailed information about a specific smart contract by its address.",
          authentication: {
            required: true,
            methods: ["API Key", "Session"],
          },
          parameters: [
            {
              name: "address",
              type: "string",
              location: "path",
              required: true,
              description: "Contract address (0x...)",
              example: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
            },
          ],
          responses: [
            {
              statusCode: 200,
              description: "Contract details retrieved successfully",
              example: {
                success: true,
                data: {
                  address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                  networkId: "net_v1_ethereum",
                  name: "Uniswap Token",
                  type: "token",
                  isVerified: true,
                  metadata: {
                    symbol: "UNI",
                    decimals: 18,
                  },
                  deployedAt: "2020-09-17T00:00:00Z",
                },
              },
            },
          ],
          examples: [
            {
              language: "curl",
              code: `curl -H "X-API-Key: your_api_key" \\
  "https://api.zunomarketplace.com/api/contracts/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"`,
            },
          ],
        },
        {
          method: "GET",
          path: "/api/contracts/{address}/abi",
          summary: "Get contract ABI",
          description: "Retrieve the current ABI for a specific contract address.",
          authentication: {
            required: true,
            methods: ["API Key", "Session"],
          },
          parameters: [
            {
              name: "address",
              type: "string",
              location: "path",
              required: true,
              description: "Contract address",
              example: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
            },
          ],
          responses: [
            {
              statusCode: 200,
              description: "Contract ABI retrieved successfully",
              example: {
                success: true,
                data: {
                  contractAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                  abiId: "abi_v1_xyz123",
                  abi: [],
                },
              },
            },
          ],
          examples: [
            {
              language: "curl",
              code: `curl -H "X-API-Key: your_api_key" \\
  "https://api.zunomarketplace.com/api/contracts/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/abi"`,
            },
          ],
        },
        {
          method: "GET",
          path: "/api/contracts/{address}/versions",
          summary: "Get ABI version history",
          description: "Retrieve all historical ABI versions for a contract address.",
          authentication: {
            required: true,
            methods: ["API Key", "Session"],
          },
          parameters: [
            {
              name: "address",
              type: "string",
              location: "path",
              required: true,
              description: "Contract address",
              example: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
            },
          ],
          responses: [
            {
              statusCode: 200,
              description: "ABI version history retrieved successfully",
              example: {
                success: true,
                data: [
                  {
                    id: "abv_v1_xyz123",
                    abiId: "abi_v1_xyz123",
                    version: 1,
                    isCurrent: true,
                    createdAt: "2025-01-19T10:00:00Z",
                  },
                ],
              },
            },
          ],
          examples: [
            {
              language: "curl",
              code: `curl -H "X-API-Key: your_api_key" \\
  "https://api.zunomarketplace.com/api/contracts/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/versions"`,
            },
          ],
        },
        {
          method: "GET",
          path: "/api/contracts/by-name/{name}",
          summary: "Search contracts by name",
          description: "Find contracts by name with fuzzy matching.",
          authentication: {
            required: true,
            methods: ["API Key", "Session"],
          },
          parameters: [
            {
              name: "name",
              type: "string",
              location: "path",
              required: true,
              description: "Contract name to search",
              example: "Uniswap",
            },
          ],
          responses: [
            {
              statusCode: 200,
              description: "Matching contracts retrieved successfully",
              example: {
                success: true,
                data: [
                  {
                    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                    name: "Uniswap Token",
                    networkId: "net_v1_ethereum",
                  },
                ],
              },
            },
          ],
          examples: [
            {
              language: "curl",
              code: `curl -H "X-API-Key: your_api_key" \\
  "https://api.zunomarketplace.com/api/contracts/by-name/Uniswap"`,
            },
          ],
        },
        {
          method: "POST",
          path: "/api/contracts",
          summary: "Register new contract",
          description: "Register a new smart contract with its ABI and metadata.",
          authentication: {
            required: true,
            methods: ["API Key", "Session"],
            permissions: ["contracts:write", "write:contracts"],
          },
          requestBody: {
            contentType: "application/json",
            schema: {
              address: "string (required, Ethereum address)",
              networkId: "string (required)",
              abiId: "string (required)",
              name: "string (optional, max 255 chars)",
              type: "enum (optional: token, nft, defi, dao, bridge, other)",
              metadata: {
                symbol: "string (optional, max 20 chars)",
                decimals: "number (optional, 0-18)",
                totalSupply: "string (optional)",
                isProxy: "boolean (optional)",
                implementation: "string (optional, address)",
              },
              deployedAt: "string (optional, ISO datetime)",
              deployer: "string (optional, Ethereum address)",
            },
            example: {
              address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
              networkId: "net_v1_ethereum",
              abiId: "abi_v1_xyz123",
              name: "Uniswap Token",
              type: "token",
              metadata: {
                symbol: "UNI",
                decimals: 18,
              },
              deployedAt: "2020-09-17T00:00:00Z",
            },
          },
          responses: [
            {
              statusCode: 200,
              description: "Contract registered successfully",
              example: {
                success: true,
                data: {
                  address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                  name: "Uniswap Token",
                  createdAt: "2025-01-19T10:00:00Z",
                },
              },
            },
          ],
          examples: [
            {
              language: "curl",
              code: `curl -X POST \\
  -H "X-API-Key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "address": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "networkId": "net_v1_ethereum",
    "abiId": "abi_v1_xyz123",
    "name": "Uniswap Token",
    "type": "token"
  }' \\
  "https://api.zunomarketplace.com/api/contracts"`,
            },
          ],
        },
      ],
    },
  ],
};
