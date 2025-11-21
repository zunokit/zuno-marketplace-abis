/**
 * OpenAPI 3.1 Schema for Zuno Marketplace ABIs API
 *
 * Complete API documentation for all public and authenticated endpoints.
 * Supports multiple authentication methods: API Key and Session-based.
 *
 * Note: Using 'as const' for better type inference and 'as any' for strict
 * OpenAPI type checking. The schema is valid OpenAPI 3.1, but the
 * openapi-types package has very strict typing that doesn't allow some
 * valid constructs like nullable.
 */

import type { OpenAPIV3_1 } from "openapi-types";

export function getOpenApiSchema(baseUrl: string): OpenAPIV3_1.Document {
  return ({
  openapi: "3.1.0",
  info: {
    title: "Zuno Marketplace ABIs API",
    version: "1.0.0",
    description: `
# Zuno Marketplace ABIs API

Enterprise-grade API for discovering, accessing, and managing Ethereum smart contract ABIs across multiple EVM-compatible networks.

## Features

- **Multi-Network Support**: Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, and more
- **Version Management**: Track multiple ABI versions per contract
- **IPFS Storage**: Decentralized, immutable ABI storage
- **Tiered Access**: Public, Free, Pro, and Enterprise tiers
- **Rate Limiting**: Tier-based rate limiting for fair usage
- **RESTful Design**: Clean, predictable API design

## Authentication

### API Key Authentication (Recommended for Programmatic Access)

Include your API key in the \`X-API-Key\` header:

\`\`\`
X-API-Key: your_api_key_here
\`\`\`

### Session Authentication (For Web UI)

Use cookie-based authentication after logging in through the web interface.

## Rate Limits

- **Public**: 100 requests/hour
- **Free**: 500 requests/hour
- **Pro**: 5,000 requests/hour
- **Enterprise**: Unlimited

## Versioning

API version is specified via headers:

\`\`\`
X-API-Version: v1
Accept-Version: v1
\`\`\`

Default version: v1
    `,
    contact: {
      name: "Zuno Team",
      url: "https://github.com/ZunoKit/zuno-marketplace-abis",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: `${baseUrl}/api`,
      description: "API Server",
    },
  ],
  components: {
    securitySchemes: {
      ApiKey: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "API key for programmatic access",
      },
      SessionAuth: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
        description: "Session-based authentication (for web UI)",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: {
            type: "boolean",
            example: false,
          },
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: {
                type: "string",
                example: "VALIDATION_ERROR",
              },
              message: {
                type: "string",
                example: "Invalid request parameters",
              },
              details: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
          requestId: {
            type: "string",
            format: "uuid",
          },
        },
      },
      Network: {
        type: "object",
        required: ["id", "name", "chainId", "type", "isTestnet"],
        properties: {
          id: {
            type: "string",
            example: "network_v1_ethereum_mainnet",
          },
          name: {
            type: "string",
            example: "Ethereum Mainnet",
          },
          chainId: {
            type: "integer",
            example: 1,
          },
          type: {
            type: "string",
            example: "evm",
          },
          isTestnet: {
            type: "boolean",
            example: false,
          },
          rpcUrl: {
            type: "string",
            nullable: true,
            example: "https://eth.llamarpc.com",
          },
          explorerUrl: {
            type: "string",
            nullable: true,
            example: "https://etherscan.io",
          },
          nativeCurrency: {
            type: "object",
            nullable: true,
            properties: {
              name: { type: "string" },
              symbol: { type: "string" },
              decimals: { type: "integer" },
            },
          },
        },
      },
      ABI: {
        type: "object",
        required: ["id", "version", "abiHash", "ipfsCid", "createdAt"],
        properties: {
          id: {
            type: "string",
            example: "abi_v1_xyz123",
          },
          version: {
            type: "string",
            example: "1.0.0",
          },
          abiHash: {
            type: "string",
            example: "0x1234567890abcdef...",
          },
          ipfsCid: {
            type: "string",
            example: "QmXxxx...",
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
          contractId: {
            type: "string",
            nullable: true,
          },
        },
      },
      Contract: {
        type: "object",
        required: ["id", "address", "name", "chainId", "createdAt"],
        properties: {
          id: {
            type: "string",
            example: "contract_v1_abc123",
          },
          address: {
            type: "string",
            example: "0x1234567890123456789012345678901234567890",
          },
          name: {
            type: "string",
            example: "USDC Token",
          },
          chainId: {
            type: "integer",
            example: 1,
          },
          currentAbiId: {
            type: "string",
            nullable: true,
          },
          verified: {
            type: "boolean",
            example: true,
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      HealthCheck: {
        type: "object",
        required: ["status", "timestamp", "checks", "responseTime"],
        properties: {
          status: {
            type: "string",
            enum: ["healthy", "degraded", "unhealthy"],
          },
          timestamp: {
            type: "string",
            format: "date-time",
          },
          version: {
            type: "string",
          },
          environment: {
            type: "string",
          },
          checks: {
            type: "object",
            properties: {
              database: { type: "string" },
              cache: { type: "string" },
              auth: { type: "string" },
            },
          },
          responseTime: {
            type: "string",
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Health Check",
        description: "Check system health and service availability",
        tags: ["System"],
        operationId: "getHealth",
        responses: {
          "200": {
            description: "Health check successful",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HealthCheck",
                },
              },
            },
          },
        },
      },
    },
    "/version": {
      get: {
        summary: "API Version",
        description: "Get current API version information",
        tags: ["System"],
        operationId: "getVersion",
        responses: {
          "200": {
            description: "Version information",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    version: { type: "string", example: "v1" },
                    apiVersion: { type: "string", example: "1.0.0" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/networks": {
      get: {
        summary: "List Networks",
        description: "Get all supported blockchain networks",
        tags: ["Networks"],
        operationId: "listNetworks",
        responses: {
          "200": {
            description: "List of networks",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Network",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/networks/{chainId}/contracts": {
      get: {
        summary: "List Contracts by Network",
        description: "Get all contracts for a specific network (chain ID)",
        tags: ["Networks", "Contracts"],
        operationId: "listContractsByNetwork",
        parameters: [
          {
            name: "chainId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "Blockchain chain ID (e.g., 1 for Ethereum)",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
            description: "Page number",
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 100 },
            description: "Items per page",
          },
        ],
        responses: {
          "200": {
            description: "List of contracts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Contract",
                      },
                    },
                    pagination: {
                      type: "object",
                      properties: {
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        total: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/abis": {
      get: {
        summary: "List ABIs",
        description: "Get paginated list of ABIs",
        tags: ["ABIs"],
        operationId: "listAbis",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 100 },
          },
        ],
        responses: {
          "200": {
            description: "List of ABIs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/ABI",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create ABI",
        description: "Upload a new ABI to IPFS and database",
        tags: ["ABIs"],
        operationId: "createAbi",
        security: [{ ApiKey: [] }, { SessionAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["abi", "version"],
                properties: {
                  abi: {
                    type: "array",
                    description: "ABI JSON array",
                  },
                  version: {
                    type: "string",
                    example: "1.0.0",
                  },
                  contractId: {
                    type: "string",
                    nullable: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "ABI created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      $ref: "#/components/schemas/ABI",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/abis/{id}": {
      get: {
        summary: "Get ABI by ID",
        description: "Retrieve a specific ABI by its ID",
        tags: ["ABIs"],
        operationId: "getAbiById",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ABI ID (e.g., abi_v1_xyz123)",
          },
        ],
        responses: {
          "200": {
            description: "ABI details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      $ref: "#/components/schemas/ABI",
                    },
                  },
                },
              },
            },
          },
          "404": {
            description: "ABI not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/abis/full": {
      get: {
        summary: "Get Full ABI with Content",
        description: "Retrieve ABI with full JSON content from IPFS",
        tags: ["ABIs"],
        operationId: "getFullAbi",
        parameters: [
          {
            name: "id",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "ABI ID",
          },
        ],
        responses: {
          "200": {
            description: "Full ABI with content",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        version: { type: "string" },
                        abi: {
                          type: "array",
                          description: "Full ABI JSON",
                        },
                        ipfsCid: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/contracts": {
      get: {
        summary: "List Contracts",
        description: "Get paginated list of contracts",
        tags: ["Contracts"],
        operationId: "listContracts",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 100 },
          },
          {
            name: "chainId",
            in: "query",
            schema: { type: "integer" },
            description: "Filter by chain ID",
          },
          {
            name: "verified",
            in: "query",
            schema: { type: "boolean" },
            description: "Filter by verification status",
          },
        ],
        responses: {
          "200": {
            description: "List of contracts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Contract",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create Contract",
        description: "Register a new smart contract",
        tags: ["Contracts"],
        operationId: "createContract",
        security: [{ ApiKey: [] }, { SessionAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["address", "name", "chainId"],
                properties: {
                  address: {
                    type: "string",
                    pattern: "^0x[a-fA-F0-9]{40}$",
                    example: "0x1234567890123456789012345678901234567890",
                  },
                  name: {
                    type: "string",
                    example: "USDC Token",
                  },
                  chainId: {
                    type: "integer",
                    example: 1,
                  },
                  verified: {
                    type: "boolean",
                    default: false,
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Contract created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      $ref: "#/components/schemas/Contract",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/contracts/{address}": {
      get: {
        summary: "Get Contract by Address",
        description: "Retrieve contract details by address",
        tags: ["Contracts"],
        operationId: "getContractByAddress",
        parameters: [
          {
            name: "address",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Contract address (0x...)",
          },
          {
            name: "chainId",
            in: "query",
            schema: { type: "integer" },
            description: "Chain ID to narrow search",
          },
        ],
        responses: {
          "200": {
            description: "Contract details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      $ref: "#/components/schemas/Contract",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/contracts/{address}/abi": {
      get: {
        summary: "Get Contract's Current ABI",
        description: "Get the current active ABI for a contract",
        tags: ["Contracts", "ABIs"],
        operationId: "getContractAbi",
        parameters: [
          {
            name: "address",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "chainId",
            in: "query",
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Contract ABI",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        contract: {
                          $ref: "#/components/schemas/Contract",
                        },
                        abi: {
                          type: "array",
                          description: "Full ABI JSON",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/contracts/by-name/{name}": {
      get: {
        summary: "Search Contract by Name",
        description: "Find contracts by name (partial match)",
        tags: ["Contracts"],
        operationId: "searchContractByName",
        parameters: [
          {
            name: "name",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Contract name to search",
          },
          {
            name: "chainId",
            in: "query",
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Matching contracts",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Contract",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/contracts/{address}/versions": {
      get: {
        summary: "Get Contract ABI Versions",
        description: "Get all ABI versions for a contract. Returns version history tracking contract upgrades.",
        tags: ["Contracts", "ABIs"],
        operationId: "getContractVersions",
        security: [{ ApiKey: [] }, { SessionAuth: [] }],
        parameters: [
          {
            name: "address",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Contract address",
          },
          {
            name: "networkId",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Network UUID",
          },
        ],
        responses: {
          "200": {
            description: "ABI version history",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        contract: { $ref: "#/components/schemas/Contract" },
                        abi: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            currentVersion: { type: "string" },
                          },
                        },
                        versions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              versionNumber: { type: "integer" },
                              version: { type: "string" },
                              abiHash: { type: "string" },
                              ipfsHash: { type: "string" },
                              ipfsUrl: { type: "string" },
                              changeLog: { type: "string", nullable: true },
                              createdAt: { type: "string", format: "date-time" },
                            },
                          },
                        },
                        totalVersions: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/admin/api-keys": {
      get: {
        summary: "List API Keys",
        description: "List all API keys for current admin user (admin only)",
        tags: ["Admin"],
        operationId: "listApiKeys",
        security: [{ SessionAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 100 },
          },
        ],
        responses: {
          "200": {
            description: "List of API keys",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          key: { type: "string", description: "Partially masked key" },
                          permissions: { type: "array", items: { type: "string" } },
                          expiresAt: { type: "string", format: "date-time", nullable: true },
                          createdAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create API Key",
        description: "Create new API key (admin only)",
        tags: ["Admin"],
        operationId: "createApiKey",
        security: [{ SessionAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "permissions"],
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 100 },
                  permissions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of permission scopes",
                  },
                  expiresIn: {
                    type: "number",
                    description: "Expiration time in milliseconds",
                  },
                  metadata: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "API key created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        key: { type: "string", description: "Full API key (shown once)" },
                        permissions: { type: "array", items: { type: "string" } },
                        expiresAt: { type: "string", format: "date-time", nullable: true },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/admin/api-keys/{id}": {
      delete: {
        summary: "Delete API Key",
        description: "Revoke/delete API key by ID (admin only)",
        tags: ["Admin"],
        operationId: "deleteApiKey",
        security: [{ SessionAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "API key ID",
          },
        ],
        responses: {
          "200": {
            description: "API key deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        deletedAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/backup/create": {
      post: {
        summary: "Create Database Backup",
        description: "Create a full database backup (admin only)",
        tags: ["Admin", "Backup"],
        operationId: "createBackup",
        security: [{ SessionAuth: [] }],
        responses: {
          "200": {
            description: "Backup created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    jobId: { type: "string" },
                    backup: { type: "object" },
                    metadata: { type: "object" },
                    completedAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/backup/restore": {
      post: {
        summary: "Restore Database Backup",
        description: "Restore database from backup (admin only)",
        tags: ["Admin", "Backup"],
        operationId: "restoreBackup",
        security: [{ SessionAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["backup"],
                properties: {
                  backup: {
                    type: "object",
                    description: "Backup data to restore",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Backup restored successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    jobId: { type: "string" },
                    completedAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/keys/public": {
      post: {
        summary: "Get Public API Key",
        description: "Issue a public API key for unauthenticated access (read-only)",
        tags: ["System"],
        operationId: "getPublicApiKey",
        responses: {
          "200": {
            description: "Public API key issued",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        key: { type: "string" },
                        permissions: { type: "array", items: { type: "string" } },
                        expiresAt: { type: "string", format: "date-time", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/docs": {
      get: {
        summary: "API Documentation",
        description: "OpenAPI 3.1 schema for API documentation. Compatible with Swagger UI, Postman, and code generators.",
        tags: ["System"],
        operationId: "getApiDocs",
        responses: {
          "200": {
            description: "OpenAPI schema",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "OpenAPI 3.1 Document",
                },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: "System",
      description: "System status and information endpoints",
    },
    {
      name: "Networks",
      description: "Blockchain network management",
    },
    {
      name: "ABIs",
      description: "Smart contract ABI operations",
    },
    {
      name: "Contracts",
      description: "Smart contract registry operations",
    },
    {
      name: "Admin",
      description: "Admin-only endpoints for system management",
    },
    {
      name: "Backup",
      description: "Database backup and restore operations",
    },
  ],
  } as any) as OpenAPIV3_1.Document;
}
