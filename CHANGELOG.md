# @rezkam/mono-mcp-server

## 0.2.0

### Minor Changes

- 345dd9d: Add retry logic, timeout protection, and comprehensive documentation

  **New Features:**

  - Retry logic with exponential backoff and jitter for API requests
  - Automatic timeout protection (1.5s per request, ~13s total with retries)
  - Smart retry only for transient errors (429, 5xx) - never retries client errors (4xx)
  - Configurable via environment variables (MONO_MAX_RETRIES, MONO_TIMEOUT_MS, MONO_BASE_DELAY_MS, MONO_MAX_DELAY_MS)

  **Improvements:**

  - Comprehensive JSDoc comments for all public functions and types
  - Better IDE autocomplete and IntelliSense support
  - Extracted reusable utilities for sorting, filtering, and update operations
  - Improved code organization and maintainability

  **Technical Details:**

  - Uses native AbortSignal.timeout() (requires Node.js 22+)
  - Default: 3 retries with exponential backoff (1s → 2s → 4s delays)
  - Prevents thundering herd with full jitter randomization
  - Total worst-case time: ~13 seconds for failed requests
