export interface RetryConfig {
  /** Maximum number of retry attempts (0 = no retries, 1 = 2 total attempts) */
  maxRetries: number;

  /** Base delay in milliseconds for exponential backoff */
  baseDelayMs: number;

  /** Maximum delay cap in milliseconds */
  maxDelayMs: number;

  /** Timeout per request in milliseconds */
  timeoutMs: number;

  /** HTTP status codes that should trigger a retry */
  retryableStatuses: number[];
}

/**
 * Default retry configuration.
 *
 * Retry timeline (worst case):
 * - Attempt 0: 1.5s timeout
 * - Delay: 0-1s (avg 0.5s)
 * - Attempt 1: 1.5s timeout
 * - Delay: 0-2s (avg 1s)
 * - Attempt 2: 1.5s timeout
 * - Delay: 0-4s (avg 2s)
 * - Attempt 3: 1.5s timeout (final)
 *
 * Total: ~9.5s average, ~13s worst case
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 4000,
  timeoutMs: 1500,
  retryableStatuses: [429, 500, 502, 503, 504],
};

/**
 * Wrapper around native fetch that adds retry logic with exponential backoff and jitter.
 */
export async function retryFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let response: Response;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    // Create timeout signal
    const timeoutSignal = AbortSignal.timeout(config.timeoutMs);

    // Combine with caller's signal (if any)
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeoutSignal])
      : timeoutSignal;

    response = await fetch(input, { ...init, signal });

    // Success or non-retryable error
    if (response.ok || !config.retryableStatuses.includes(response.status)) {
      return response;
    }

    // Last attempt - return failed response
    if (attempt === config.maxRetries) {
      return response;
    }

    // Wait before retry with exponential backoff and jitter
    if (config.baseDelayMs > 0) {
      const delay = calculateBackoff(attempt, config);
      await sleep(delay);
    }
  }

  return response!;
}

/**
 * Calculate exponential backoff delay with full jitter.
 * Full jitter randomizes delays to prevent thundering herd problem.
 *
 * Formula: sleep = random(0, min(cap, base * 2^attempt))
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  // Exponential: base * 2^attempt
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);

  // Full jitter: random from 0 to exponential delay
  const jitter = Math.random(); // 0.0 to 1.0
  const delayWithJitter = exponentialDelay * jitter;

  // Cap at max delay
  return Math.min(config.maxDelayMs, delayWithJitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
