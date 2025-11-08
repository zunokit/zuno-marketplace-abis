# Error Boundary Implementation Guide

## Overview

This application implements comprehensive error handling using React Error Boundaries and Next.js 15 error handling features. This ensures graceful degradation when errors occur and provides better user experience.

## Architecture

### 1. **React Error Boundaries** (Client-Side)

Class-based error boundaries catch JavaScript errors in React components:

- `src/components/error-boundary.tsx` - Reusable ErrorBoundary component
- `src/components/error-fallback.tsx` - Pre-built error UI components

### 2. **Next.js Error Pages** (Route-Level)

Special files that Next.js uses for error handling:

- `src/app/error.tsx` - Root-level error page
- `src/app/global-error.tsx` - Global error page (catches layout errors)
- `src/app/admin/error.tsx` - Admin section error page

## Components

### ErrorBoundary Component

**Location**: `src/components/error-boundary.tsx`

**Features**:
- Class-based React error boundary (React 19 compatible)
- Automatic error logging with stack traces
- User-friendly error UI with recovery options
- Development vs production error messages
- Reset functionality to recover from errors
- Custom fallback UI support

**Basic Usage**:
```tsx
import { ErrorBoundary } from "@/components/error-boundary";

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

**Advanced Usage**:
```tsx
<ErrorBoundary
  fallback={(error, resetError) => (
    <CustomErrorUI error={error} onReset={resetError} />
  )}
  onError={(error, errorInfo) => {
    // Custom error handling
    console.error("Error caught:", error);
  }}
  errorTitle="Custom Error Title"
  fallbackRoute="/safe-page"
  showDetailedError={true}
>
  <YourComponent />
</ErrorBoundary>
```

### Pre-built Error Fallback Components

**Location**: `src/components/error-fallback.tsx`

#### 1. **ErrorFallback** - Generic error UI
```tsx
import { ErrorFallback } from "@/components/error-fallback";

<ErrorBoundary
  fallback={(error, resetError) => (
    <ErrorFallback
      error={error}
      resetError={resetError}
      title="Custom Title"
      description="Custom description"
    />
  )}
>
  <YourComponent />
</ErrorBoundary>
```

#### 2. **InlineErrorFallback** - Compact inline errors
```tsx
import { InlineErrorFallback } from "@/components/error-fallback";

<ErrorBoundary
  fallback={(error, resetError) => (
    <InlineErrorFallback error={error} resetError={resetError} compact />
  )}
>
  <SmallComponent />
</ErrorBoundary>
```

#### 3. **DataErrorFallback** - Data fetching errors
```tsx
import { DataErrorFallback } from "@/components/error-fallback";

<ErrorBoundary
  fallback={(error, resetError) => (
    <DataErrorFallback
      error={error}
      resetError={resetError}
      resourceName="users"
    />
  )}
>
  <UserList />
</ErrorBoundary>
```

#### 4. **ComponentErrorFallback** - Component-specific errors
```tsx
import { ComponentErrorFallback } from "@/components/error-fallback";

<ErrorBoundary
  fallback={(error, resetError) => (
    <ComponentErrorFallback
      error={error}
      resetError={resetError}
      componentName="User Profile"
    />
  )}
>
  <UserProfile />
</ErrorBoundary>
```

#### 5. **NetworkErrorFallback** - Network/API errors
```tsx
import { NetworkErrorFallback } from "@/components/error-fallback";

<ErrorBoundary
  fallback={(error, resetError) => (
    <NetworkErrorFallback error={error} resetError={resetError} />
  )}
>
  <APIComponent />
</ErrorBoundary>
```

#### 6. **FeatureSectionErrorBoundary** - Convenience wrapper
```tsx
import { FeatureSectionErrorBoundary } from "@/components/error-fallback";

<FeatureSectionErrorBoundary
  featureName="User Management"
  fallbackRoute="/admin"
>
  <UserManagement />
</FeatureSectionErrorBoundary>
```

### useErrorHandler Hook

**Purpose**: Manually trigger error boundary for async errors

```tsx
import { useErrorHandler } from "@/components/error-boundary";

function MyComponent() {
  const handleError = useErrorHandler();

  const fetchData = async () => {
    try {
      await api.fetchData();
    } catch (error) {
      // This will trigger the nearest error boundary
      handleError(error as Error);
    }
  };

  return <button onClick={fetchData}>Fetch</button>;
}
```

## Next.js Error Pages

### 1. Root Error Page (`src/app/error.tsx`)

Catches errors in root layout and pages:
- Automatic error logging
- User-friendly UI
- Recovery options (Try Again, Go Home, Reload)
- Error ID for support

### 2. Global Error Page (`src/app/global-error.tsx`)

Catches errors in root layout itself:
- Must include `<html>` and `<body>` tags
- Inline styles (no CSS dependencies)
- Fallback for critical errors
- Last resort error handling

### 3. Admin Error Page (`src/app/admin/error.tsx`)

Admin-specific error handling:
- Authentication error detection
- Admin context logging
- Sign in redirect for auth errors
- Admin-specific recovery options

## Integration Points

### 1. **QueryProvider** (React Query)

Already wrapped with ErrorBoundary:

```tsx
// src/components/query-provider.tsx
<ErrorBoundary errorTitle="Application Error" fallbackRoute="/">
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
</ErrorBoundary>
```

**React Query Error Handling**:
- Automatic retry (up to 3 times) for 5xx errors
- No retry for 4xx errors
- Exponential backoff (1s, 2s, 4s, ...)
- Global mutation error logging

### 2. **Root Layout** (`src/app/layout.tsx`)

Global error boundary via `error.tsx` and `global-error.tsx`

### 3. **Admin Layout** (`src/app/admin/layout.tsx`)

Admin-specific error boundary via `admin/error.tsx`

## Best Practices

### ✅ DO

1. **Wrap critical features with error boundaries**:
```tsx
<ErrorBoundary fallbackRoute="/admin">
  <CriticalFeature />
</ErrorBoundary>
```

2. **Use appropriate fallback components**:
```tsx
// For data fetching
<ErrorBoundary
  fallback={(e, reset) => (
    <DataErrorFallback error={e} resetError={reset} resourceName="contracts" />
  )}
>
  <ContractList />
</ErrorBoundary>

// For inline components
<ErrorBoundary
  fallback={(e, reset) => (
    <InlineErrorFallback error={e} resetError={reset} compact />
  )}
>
  <SmallWidget />
</ErrorBoundary>
```

3. **Log errors with context**:
```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    logger.error("Feature error", {
      feature: "user-management",
      error: error.message,
      componentStack: errorInfo.componentStack,
    });
  }}
>
  <UserManagement />
</ErrorBoundary>
```

4. **Handle async errors**:
```tsx
const handleError = useErrorHandler();

try {
  await riskyOperation();
} catch (error) {
  handleError(error as Error);
}
```

5. **Test error boundaries**:
```tsx
// tests/error-boundary.test.tsx
const ThrowError = () => {
  throw new Error("Test error");
};

test("ErrorBoundary catches errors", () => {
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

### ❌ DON'T

1. **Don't wrap every small component**:
```tsx
// ❌ TOO MUCH
<ErrorBoundary>
  <Button>Click</Button>
</ErrorBoundary>

// ✅ BETTER - Wrap logical sections
<ErrorBoundary>
  <UserProfile />
</ErrorBoundary>
```

2. **Don't ignore errors silently**:
```tsx
// ❌ BAD
try {
  await api.call();
} catch {
  // Silent failure
}

// ✅ GOOD
try {
  await api.call();
} catch (error) {
  handleError(error as Error);
}
```

3. **Don't use error boundaries for flow control**:
```tsx
// ❌ BAD - Error boundaries are not for expected conditions
if (data === undefined) {
  throw new Error("No data");
}

// ✅ GOOD - Handle expected conditions with conditionals
if (data === undefined) {
  return <Empty />;
}
```

4. **Don't forget to provide recovery options**:
```tsx
// ❌ BAD - No way to recover
<ErrorBoundary fallback={<div>Error!</div>}>

// ✅ GOOD - Provides reset button
<ErrorBoundary
  fallback={(error, resetError) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={resetError}>Try Again</button>
    </div>
  )}
>
```

## Error Logging

All errors are automatically logged with:
- Error name, message, and stack trace
- Component stack (which component threw)
- Timestamp
- Current URL
- Error digest (Next.js)

**Logger Integration**:
```typescript
logger.error("Error boundary triggered", {
  error: {
    name: error.name,
    message: error.message,
    stack: error.stack,
  },
  componentStack: errorInfo.componentStack,
  timestamp: new Date().toISOString(),
});
```

## Testing Error Boundaries

### Unit Tests

```tsx
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/error-boundary";

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  it("renders fallback when error occurs", () => {
    // Suppress console.error for this test
    const spy = jest.spyOn(console, "error").mockImplementation();

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it("calls onError callback", () => {
    const onError = jest.fn();
    const spy = jest.spyOn(console, "error").mockImplementation();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    spy.mockRestore();
  });
});
```

### E2E Tests

```typescript
// tests/e2e/error-handling.spec.ts
import { test, expect } from "@playwright/test";

test("displays error boundary on component error", async ({ page }) => {
  await page.goto("/admin/test-error");

  // Trigger error
  await page.click('button:has-text("Trigger Error")');

  // Check error boundary appears
  await expect(page.locator("text=Something went wrong")).toBeVisible();

  // Check Try Again button works
  await page.click('button:has-text("Try Again")');
  await expect(page.locator("text=Something went wrong")).not.toBeVisible();
});
```

## Production Monitoring

Error boundaries integrate with logging system for production monitoring:

1. **Error Tracking**: All errors logged with full context
2. **Error IDs**: Next.js provides error digest for tracking
3. **User Context**: Logged with URL, timestamp, user agent
4. **Component Stack**: Shows which component failed

**Monitoring Integration**:
```typescript
// Example: Send to Sentry
onError={(error, errorInfo) => {
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack,
      },
    },
  });
}
```

## Migration Guide

### Adding Error Boundaries to Existing Features

1. **Identify critical sections**:
   - Data fetching components
   - Complex forms
   - Admin features
   - Third-party integrations

2. **Wrap with appropriate error boundary**:
```tsx
// Before
<UserManagement />

// After
<FeatureSectionErrorBoundary
  featureName="User Management"
  fallbackRoute="/admin"
>
  <UserManagement />
</FeatureSectionErrorBoundary>
```

3. **Test error scenarios**:
   - Network failures
   - Invalid data
   - Authentication errors
   - Permission errors

4. **Add error handling to async operations**:
```tsx
const handleError = useErrorHandler();

const handleSubmit = async (data) => {
  try {
    await api.submit(data);
  } catch (error) {
    handleError(error as Error);
  }
};
```

## References

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [React 19 Error Handling](https://react.dev/blog/2024/12/05/react-19#whats-new-in-react-19)

---

**Last Updated**: 2025-01-19
**React Version**: 19.2.0
**Next.js Version**: 15.5.5
