// Generated API client configuration
import { client } from "./generated/client.gen.js";
import { retryFetch, type RetryConfig } from "./utils/retryFetch.js";

// Configure the generated client with API settings
const MONO_API_BASE = process.env.MONO_API_URL || "https://monodo.app/api";
const MONO_API_KEY = process.env.MONO_API_KEY;

if (!MONO_API_KEY) {
  throw new Error("MONO_API_KEY environment variable is required");
}

// Retry configuration from environment variables
const retryConfig: RetryConfig = {
  maxRetries: parseInt(process.env.MONO_MAX_RETRIES || "3"),
  baseDelayMs: parseInt(process.env.MONO_BASE_DELAY_MS || "1000"),
  maxDelayMs: parseInt(process.env.MONO_MAX_DELAY_MS || "4000"),
  timeoutMs: parseInt(process.env.MONO_TIMEOUT_MS || "1500"),
  retryableStatuses: [429, 500, 502, 503, 504],
};

// Configure the global client instance with retry wrapper
client.setConfig({
  baseUrl: MONO_API_BASE,
  headers: {
    Authorization: `Bearer ${MONO_API_KEY}`,
  },
  fetch: (input, init) => retryFetch(input, init, retryConfig),
});

// Re-export all generated API functions and types
export * from "./generated/index.js";

// Export types for easier imports
export type {
  TodoItem,
  ItemStatus,
  ItemPriority,
  TodoList,
  RecurringItemTemplate,
  RecurrencePattern,
} from "./generated/types.gen.js";
