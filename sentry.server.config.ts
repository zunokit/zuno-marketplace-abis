import * as Sentry from "@sentry/nextjs";

// Sensitive patterns to redact from error messages
const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,  // Bearer tokens
  /sk_[a-zA-Z0-9]{20,}/g,               // API keys (sk_live_, sk_test_)
  /"[^"]*apiKey[^"]*":\s*"[^"]+"/g,      // JSON apiKey values
  /token[^"]*[:=]\s*[A-Za-z0-9\-._~+/]{10,}/gi,  // Tokens in logs
  /password[^"]*[:=]\s*"[^"]+"/gi,       // Passwords in logs
  /secret[^"]*[:=]\s*"[^"]+"/gi,         // Secrets in logs
];

/**
 * Sanitize error message by redacting sensitive patterns
 */
function sanitizeMessage(message: string): string {
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  return sanitized;
}

// Sensitive query parameters to scrub
const SENSITIVE_PARAMS = ["token", "password", "secret", "apiKey", "api_key"];

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",

  // Set release from git SHA (Vercel provides this)
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || "local",

  // Smart sampling for distributed tracing
  // Development: 100% sampling for debugging
  // Production: Smart sampling to stay within free tier limits
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  // Profiling - Enable for performance analysis (10% in production)
  profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay (Phase 2) - Lower sampling for cost control
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,

  // Integrations (auto-instrumentation)
  integrations: [
    Sentry.httpIntegration(),
    Sentry.postgresIntegration(),
    Sentry.redisIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter sensitive data and operational errors
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["x-api-key"];
      delete event.request.headers["cookie"];
    }

    // Skip operational errors (not bugs)
    const skipCodes = [
      "RATE_LIMITED",      // Expected user behavior
      "VALIDATION_ERROR",  // Bad input
      "UNAUTHORIZED",      // Auth failure
      "FORBIDDEN",         // Permission denied
      "NOT_FOUND",         // Resource missing
    ];

    if (event.tags?.code && skipCodes.includes(event.tags.code as string)) {
      return null; // Don't send
    }

    // Only send production errors to Sentry
    if (process.env.NODE_ENV !== "production") {
      return null; // Keep in local logs only
    }

    // Scrub sensitive query parameters
    if (event.request?.query_string) {
      const qs = event.request.query_string;
      if (typeof qs === "string") {
        let scrubbed = qs;
        for (const param of SENSITIVE_PARAMS) {
          const regex = new RegExp(`(?:^|&)${param}=[^&]*`, "gi");
          scrubbed = scrubbed.replace(regex, `${param}=[REDACTED]`);
        }
        event.request.query_string = scrubbed;
      } else if (Array.isArray(qs)) {
        // Handle tuple array format [key, value][]
        event.request.query_string = qs.map(([key, value]) =>
          SENSITIVE_PARAMS.includes(key) ? [key, "[REDACTED]"] : [key, value]
        ) as typeof qs;
      }
    }

    // Sanitize error messages to remove sensitive data
    if (event.exception?.values) {
      for (const exception of event.exception.values) {
        if (exception.value) {
          exception.value = sanitizeMessage(exception.value);
        }
      }
    }

    // Sanitize breadcrumbs messages
    if (event.breadcrumbs) {
      for (const breadcrumb of event.breadcrumbs) {
        if (breadcrumb.message) {
          breadcrumb.message = sanitizeMessage(breadcrumb.message);
        }
      }
    }

    // Add request context
    if (event.request) {
      event.contexts = {
        ...event.contexts,
        app: {
          request_id: event.request.headers?.["x-request-id"],
        },
      };
    }

    return event;
  },

  // Debug mode (development only)
  debug: process.env.NODE_ENV === "development",

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    // Random plugins/extensions
    /.*\b(cordova|sencha)\b.*/,
  ],

  // Denoising (group similar errors)
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
  ],
});

export default Sentry;
