# API Testing Guide

Hướng dẫn test toàn bộ API của Zuno Marketplace ABIs với REST Client (VS Code extension).

## 📋 Mục lục

- [Setup](#setup)
- [Authentication Flow](#authentication-flow)
- [Test Files](#test-files)
- [Common Scenarios](#common-scenarios)
- [Error Handling](#error-handling)

## 🚀 Setup

### 1. Install REST Client Extension

```bash
# VS Code Extension ID: humao.rest-client
```

### 2. Start Development Server

```bash
pnpm install
pnpm dev
```

### 3. Setup Database & Run Migrations

```bash
# Generate and run migrations
pnpm db:generate
pnpm db:migrate

# Seed initial data (optional)
pnpm db:seed
```

### 4. Create Environment Variables

Đảm bảo file `.env` có đầy đủ:

```env
DATABASE_URL=your_database_url
BETTER_AUTH_SECRET=your_secret_min_32_chars
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
PINATA_JWT=your_pinata_jwt
PINATA_GATEWAY_URL=your_pinata_gateway
```

## 🔐 Authentication Flow

### Option 1: Session-Based Authentication (Web App)

```http
# 1. Sign Up
POST http://localhost:3000/api/auth/sign-up/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "Test User"
}

# 2. Sign In (lấy session cookie từ response)
POST http://localhost:3000/api/auth/sign-in/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

# 3. Use session cookie in subsequent requests
GET http://localhost:3000/api/v1/abis
Cookie: better-auth.session_token=<token_from_signin>
```

### Option 2: API Key Authentication (Programmatic Access)

```http
# 1. Sign in to get session first
POST http://localhost:3000/api/auth/sign-in/email
...

# 2. Create API Key
POST http://localhost:3000/api/v1/admin/api-keys
Content-Type: application/json
Cookie: better-auth.session_token=<session>

{
  "name": "My API Key",
  "permissions": {
    "abis": ["read", "write", "delete"],
    "contracts": ["read", "write"]
  },
  "scopes": ["read:abis", "write:abis", "delete:abis"],
  "rateLimit": {
    "enabled": true,
    "max": 100,
    "timeWindow": 3600000
  }
}

# 3. Use API key in requests
GET http://localhost:3000/api/v1/abis
X-API-Key: zuno_<your_api_key>
```

## 📁 Test Files

### 1. `auth.http` - Authentication & Authorization

Test các chức năng:

- ✅ Sign up / Sign in / Sign out
- ✅ Session management
- ✅ Admin operations (create user, set roles, ban/unban)
- ✅ API key CRUD
- ✅ Permission checks

**Workflow:**

1. Đăng ký tài khoản mới
2. Đăng nhập lấy session
3. Tạo API key với permissions
4. Test các quyền khác nhau

### 2. `abis.http` - ABI Management

Test các chức năng:

- ✅ Public: List, search, filter ABIs
- ✅ Authenticated: Create, update, delete ABIs
- ✅ Ownership checks
- ✅ Admin override
- ✅ Versioning
- ✅ Rate limiting

**Workflow:**

1. List public ABIs (không cần auth)
2. Create ABI (cần API key hoặc session)
3. Update own ABI
4. Delete own ABI
5. Admin operations

### 3. `contracts.http` - Contract Management

Test các chức năng:

- ✅ Register contracts
- ✅ Link contracts to ABIs
- ✅ Filter by network, type, verification status
- ✅ Network information

### 4. `health.http` - Health & System

Test các chức năng:

- ✅ Health check endpoints
- ✅ API versioning
- ✅ Better Auth OpenAPI docs

## 🎯 Common Scenarios

### Scenario 1: Regular User Creating ABIs

```http
# 1. Sign up as regular user
POST {{apiUrl}}/auth/sign-up/email
{
  "email": "user@example.com",
  "password": "Pass123!",
  "name": "Regular User"
}

# 2. Create API key
POST {{apiUrl}}/v1/admin/api-keys
Cookie: better-auth.session_token=<token>
{
  "name": "My Key",
  "scopes": ["read:abis", "write:abis"]
}

# 3. Create ABI
POST {{apiUrl}}/v1/abis
X-API-Key: zuno_<key>
{
  "name": "My Contract",
  "abi": [...]
}

# 4. List my ABIs
GET {{apiUrl}}/v1/abis?userId=<my_user_id>
X-API-Key: zuno_<key>
```

### Scenario 2: Admin Managing Platform

```http
# 1. Sign in as admin
POST {{apiUrl}}/auth/sign-in/email
{
  "email": "admin@example.com",
  "password": "AdminPass123!"
}

# 2. List all users
GET {{apiUrl}}/auth/admin/list-users?limit=50
Cookie: better-auth.session_token=<admin_token>

# 3. Create user programmatically
POST {{apiUrl}}/auth/admin/create-user
Cookie: better-auth.session_token=<admin_token>
{
  "email": "newuser@example.com",
  "password": "Pass123!",
  "name": "New User",
  "role": "user"
}

# 4. View any user's ABIs
GET {{apiUrl}}/v1/abis?userId=<any_user_id>
Cookie: better-auth.session_token=<admin_token>

# 5. Delete any ABI
DELETE {{apiUrl}}/v1/abis/<any_abi_id>
Cookie: better-auth.session_token=<admin_token>
```

### Scenario 3: API Key with Rate Limiting

```http
# 1. Create rate-limited key
POST {{apiUrl}}/v1/admin/api-keys
{
  "name": "Limited Key",
  "rateLimit": {
    "enabled": true,
    "max": 10,
    "timeWindow": 60000  # 10 requests per minute
  }
}

# 2. Make requests and check headers
GET {{apiUrl}}/v1/abis
X-API-Key: zuno_<limited_key>

# Response headers:
# X-RateLimit-Limit: 10
# X-RateLimit-Remaining: 9
# X-RateLimit-Reset: <timestamp>

# 3. Continue until rate limited
# After 10 requests:
# Status: 429 Too Many Requests
# Retry-After: 60
```

### Scenario 4: IP Whitelisting

```http
# 1. Create IP-whitelisted key
POST {{apiUrl}}/v1/admin/api-keys
{
  "name": "IP Restricted",
  "metadata": {
    "ipWhitelist": ["192.168.1.100", "10.0.0.0/24"]
  }
}

# 2. Request from allowed IP - Success
# 3. Request from other IP - 403 Forbidden
```

## 🚨 Error Handling

### Expected Error Responses

#### 400 - Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation error: name: Required",
    "statusCode": 400
  },
  "meta": {
    "timestamp": "2025-01-15T10:00:00.000Z",
    "version": "v1"
  }
}
```

#### 401 - Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required. Provide a valid API key or session.",
    "statusCode": 401
  }
}
```

#### 403 - Forbidden

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions. Required: write:abis",
    "statusCode": 403
  }
}
```

#### 404 - Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "ABI not found: <id>",
    "statusCode": 404
  }
}
```

#### 429 - Rate Limited

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "statusCode": 429,
    "details": {
      "retryAfter": 60
    }
  }
}
```

## 📊 Testing Checklist

### Authentication

- [ ] Sign up new user
- [ ] Sign in with email/password
- [ ] Get session info
- [ ] Sign out
- [ ] Create API key
- [ ] Update API key
- [ ] Revoke API key
- [ ] Test expired API key
- [ ] Test disabled API key

### Authorization

- [ ] Admin can view all resources
- [ ] User can only view own resources
- [ ] Admin can modify any resource
- [ ] User can only modify own resources
- [ ] Permission checks work correctly
- [ ] Role-based access works

### ABIs

- [ ] Public listing works without auth
- [ ] Create requires authentication
- [ ] Update requires ownership
- [ ] Delete requires ownership
- [ ] Admin can manage any ABI
- [ ] Soft delete works correctly
- [ ] Versioning creates new versions
- [ ] Search and filters work

### Rate Limiting

- [ ] Rate limit headers present
- [ ] Rate limit enforced correctly
- [ ] 429 returned when exceeded
- [ ] Retry-After header correct
- [ ] Reset works after window

### Security

- [ ] IP whitelist enforced
- [ ] Origin restrictions work
- [ ] Banned users blocked
- [ ] Session expiry works
- [ ] API key expiry works

## 🔍 Tips

1. **Use Variables**: Update `@apiKey`, `@sessionToken`, `@userId` variables sau khi tạo resources
2. **Check Headers**: Xem response headers để verify rate limiting, caching, etc.
3. **Test Permissions**: Thử access resources của user khác để verify authorization
4. **Monitor Logs**: Check server logs để debug issues
5. **Use Postman/Insomnia**: Import các file `.http` vào Postman nếu muốn

## 📚 Resources

- [Better Auth Docs](https://www.better-auth.com/docs)
- [REST Client Extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
- API Reference: `http://localhost:3000/api/auth/reference`
