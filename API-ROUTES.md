# API Routes Documentation

## Overview

Zuno Marketplace ABIs API cung cấp RESTful API endpoints để quản lý Smart Contract ABIs, Contracts, và Networks trên các blockchain networks.

## Base URL

```
Development: http://localhost:3000/api
Production: [Your production URL]/api
```

## Authentication

API hỗ trợ 3 phương thức authentication:

1. **API Key** - Header: `X-API-Key: your_api_key`
2. **Session** - Cookie-based authentication
3. **Public endpoints** - Không cần authentication

### Lấy Public API Key

```http
POST /api/keys/public
```

Tạo một public API key với quyền read-only.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "key_xxx",
    "key": "pk_live_xxxxxxxxxx",
    "name": "Public API Key"
  }
}
```

---

## API Endpoints

### 1. Health & Version

#### Health Check
```http
GET /api/health
```

Kiểm tra health status của API và các services.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": "healthy",
    "cache": "healthy",
    "auth": "healthy"
  },
  "responseTime": "45ms"
}
```

#### API Version
```http
GET /api/version
```

Lấy thông tin về API versions.

---

### 2. ABIs Management

#### List ABIs
```http
GET /api/abis
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `query` (string) - Search by name
- `sortBy` (string) - Sort field: name, createdAt, updatedAt
- `sortOrder` (string) - asc | desc
- `standard` (string) - Filter by standard (ERC20, ERC721, etc.)
- `userId` (string) - Filter by user ID

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "abi_xxx",
        "name": "ERC20 Token",
        "contractName": "MyToken",
        "abiHash": "0x...",
        "version": "1.0.0",
        "standard": "ERC20",
        "tags": ["token", "standard"],
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Create ABI
```http
POST /api/abis
```

**Authentication:** Required (API Key or Session)

**Permissions:** `abis:write`, `write:abis`

**Request Body:**
```json
{
  "name": "ERC20 Token",
  "abi": [...],  // ABI JSON array
  "contractName": "MyToken",
  "description": "Standard ERC20 token implementation",
  "tags": ["token", "erc20"],
  "standard": "ERC20",
  "metadata": {
    "compiler": "solc 0.8.20",
    "license": "MIT"
  }
}
```

#### Get ABI by ID
```http
GET /api/abis/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abi_xxx",
    "name": "ERC20 Token",
    "abi": [...],
    "abiHash": "0x...",
    "ipfsHash": "Qm...",
    "ipfsUrl": "https://gateway.pinata.cloud/ipfs/Qm...",
    "version": "1.0.0",
    "standard": "ERC20"
  }
}
```

#### Update ABI
```http
PUT /api/abis/:id
```

**Authentication:** Required (Owner or Admin)

**Permissions:** `abis:write`, `write:abis`

**Request Body:**
```json
{
  "name": "Updated Token",
  "abi": [...],  // New ABI (creates new version if changed)
  "description": "Updated description",
  "tags": ["token", "erc20", "upgradeable"]
}
```

#### Delete ABI (Soft Delete)
```http
DELETE /api/abis/:id
```

**Authentication:** Required (Owner or Admin)

**Permissions:** `abis:delete`, `delete:abis`

---

### 3. Contracts Management

#### List Contracts
```http
GET /api/contracts
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `query` - Search by name or address
- `sortBy` - name | createdAt | updatedAt | deployedAt
- `sortOrder` - asc | desc
- `networkId` - Filter by network
- `abiId` - Filter by ABI
- `type` - Filter by contract type
- `isVerified` - Filter by verification status
- `deployer` - Filter by deployer address

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "contract_xxx",
        "address": "0x...",
        "networkId": "network_xxx",
        "abiId": "abi_xxx",
        "name": "USDT Token",
        "type": "ERC20",
        "isVerified": true,
        "deployer": "0x...",
        "deployedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### Create Contract
```http
POST /api/contracts
```

**Authentication:** Required

**Permissions:** `contracts:write`, `write:contracts`

**Request Body:**
```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "networkId": "network_xxx",
  "abiId": "abi_xxx",
  "name": "My Contract",
  "type": "ERC20",
  "metadata": {
    "symbol": "MYT",
    "decimals": 18,
    "totalSupply": "1000000000000000000000000"
  },
  "deployedAt": "2023-01-01T00:00:00.000Z",
  "deployer": "0x..."
}
```

#### Get Contract by Address
```http
GET /api/contracts/:address?networkId=xxx
```

**Query Parameters:**
- `networkId` (required) - Network UUID
- `includeAbi` (optional) - Include full ABI (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "contract": {
      "id": "contract_xxx",
      "address": "0x...",
      "networkId": "network_xxx",
      "abiId": "abi_xxx",
      "name": "USDT Token",
      "isVerified": true
    },
    "abi": {
      "id": "abi_xxx",
      "name": "ERC20",
      "abi": [...]
    }
  }
}
```

#### Get Contract ABI
```http
GET /api/contracts/:address/abi?networkId=xxx
```

Lấy ABI của contract.

#### Find Contracts by Name
```http
GET /api/contracts/by-name/:name
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `networkId` - Filter by network
- `sortBy`, `sortOrder` - Sorting

Tìm tất cả contracts có tên khớp (case-insensitive).

#### Get ABI Versions for Contracts by Name
```http
GET /api/contracts/by-name/:name/versions
```

Lấy tất cả ABI versions được sử dụng bởi contracts với tên này.

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "USDT",
    "totalContracts": 5,
    "uniqueAbis": 3,
    "versions": [
      {
        "abiId": "abi_xxx",
        "versionNumber": 3,
        "version": "3.0.0",
        "contractsCount": 2,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

#### Update Contract
```http
PUT /api/contracts/:address?networkId=xxx
```

**Authentication:** Required

**Permissions:** `contracts:write`, `write:contracts`

#### Delete Contract
```http
DELETE /api/contracts/:address?networkId=xxx
```

**Authentication:** Required

**Permissions:** `contracts:delete`, `delete:contracts`

---

### 4. Networks Management

#### List Networks
```http
GET /api/networks
```

**Query Parameters:**
- `page`, `limit` - Pagination
- `all` - Get all networks without pagination (all=true)
- `query` - Search by name, slug, chain ID
- `sortBy` - name | chainId | createdAt
- `sortOrder` - asc | desc
- `type` - Filter by type (mainnet, testnet, local)
- `isTestnet` - Filter testnets (true/false)
- `isActive` - Filter active networks (true/false)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "network_xxx",
        "chainId": 1,
        "name": "Ethereum Mainnet",
        "slug": "ethereum",
        "type": "mainnet",
        "isTestnet": false,
        "isActive": true,
        "rpcUrls": ["https://..."],
        "nativeCurrency": {
          "name": "Ether",
          "symbol": "ETH",
          "decimals": 18
        }
      }
    ],
    "pagination": {...}
  }
}
```

#### Get Contracts by Network
```http
GET /api/networks/:chainId/contracts
```

Lấy tất cả contracts trên một network.

---

### 5. Admin Routes

#### List API Keys
```http
GET /api/admin/api-keys
```

**Authentication:** Required (Admin)

**Permissions:** `admin:manage`

**Query Parameters:**
- `page`, `limit` - Pagination
- `userId` - Filter by user
- `enabled` - Filter by status

#### Create API Key
```http
POST /api/admin/api-keys
```

**Authentication:** Required (Admin)

**Permissions:** `admin:manage`

**Request Body:**
```json
{
  "userId": "user_xxx",
  "name": "Production API Key",
  "permissions": {
    "abis": ["read", "write"],
    "contracts": ["read", "write"],
    "networks": ["read"]
  },
  "rateLimitEnabled": true,
  "rateLimitMax": 1000,
  "rateLimitTimeWindow": 3600000,
  "expiresAt": "2026-01-01T00:00:00.000Z"
}
```

#### Update API Key
```http
PUT /api/admin/api-keys/:id
```

#### Delete API Key
```http
DELETE /api/admin/api-keys/:id
```

---

### 6. Backup & Restore

#### Create Backup
```http
POST /api/backup/create
```

**Authentication:** Required (Admin)

**Permissions:** `admin:manage`

Tạo full database backup.

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "backup-xxx",
    "backup": {
      "version": "1.0.0",
      "timestamp": "2025-01-01T00:00:00.000Z",
      "data": {...}
    },
    "metadata": {
      "recordCounts": {
        "abis": 150,
        "abiVersions": 320,
        "contracts": 500,
        "networks": 25,
        "apiKeys": 10,
        "auditLogs": 1000
      }
    }
  }
}
```

#### Restore Backup
```http
POST /api/backup/restore
```

**Authentication:** Required (Admin)

**Permissions:** `admin:manage`

**Request Body:**
```json
{
  "backupData": {
    "version": "1.0.0",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "data": {...},
    "metadata": {...}
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "restore-xxx",
    "recordsRestored": {
      "abis": 150,
      "contracts": 500,
      "networks": 25
    },
    "completedAt": "2025-01-01T00:00:05.000Z"
  }
}
```

---

## Error Response Format

Tất cả errors trả về với format nhất quán:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "address",
      "reason": "Must be a valid Ethereum address"
    }
  }
}
```

### Error Codes

- `VALIDATION_ERROR` (400) - Invalid input data
- `UNAUTHORIZED` (401) - Missing or invalid authentication
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource already exists
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `INTERNAL_ERROR` (500) - Server error

---

## Rate Limiting

- **Public API Key:** 100 requests/hour
- **Authenticated User:** 1000 requests/hour
- **Admin:** Unlimited

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## Best Practices

### 1. Caching
- API responses có cache headers
- Cache GET requests khi có thể
- Sử dụng ETags cho conditional requests

### 2. Pagination
- Luôn xử lý pagination cho list endpoints
- Default limit: 20, max: 100
- Sử dụng `hasNext` và `hasPrev` để navigation

### 3. Filtering & Searching
- Combine filters để giảm số requests
- Sử dụng `query` parameter cho full-text search
- Sort kết quả để consistency

### 4. Error Handling
- Check `success` field trong response
- Handle tất cả error codes appropriately
- Retry với exponential backoff cho 5xx errors

### 5. Security
- Không commit API keys vào source code
- Rotate API keys định kỳ
- Sử dụng HTTPS trong production
- Validate input data ở client side

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Create ABI
async function createABI(apiKey: string) {
  const response = await fetch('https://api.example.com/api/abis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({
      name: 'ERC20 Token',
      abi: [...],
      contractName: 'MyToken',
      standard: 'ERC20',
    }),
  });

  const data = await response.json();
  return data.data;
}

// Get Contract by Address
async function getContract(address: string, networkId: string) {
  const url = new URL(`https://api.example.com/api/contracts/${address}`);
  url.searchParams.set('networkId', networkId);
  url.searchParams.set('includeAbi', 'true');

  const response = await fetch(url, {
    headers: {
      'X-API-Key': 'your_api_key',
    },
  });

  return response.json();
}
```

### Python

```python
import requests

# List ABIs with pagination
def list_abis(page=1, limit=20, api_key=None):
    url = 'https://api.example.com/api/abis'
    params = {'page': page, 'limit': limit}
    headers = {'X-API-Key': api_key} if api_key else {}

    response = requests.get(url, params=params, headers=headers)
    return response.json()

# Create Contract
def create_contract(data, api_key):
    url = 'https://api.example.com/api/contracts'
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': api_key,
    }

    response = requests.post(url, json=data, headers=headers)
    return response.json()
```

---

## Support

- Documentation: https://docs.example.com
- GitHub: https://github.com/yourusername/zuno-marketplace-abis
- Email: support@example.com

---

**Version:** 1.0.0
**Last Updated:** 2025-01-16
