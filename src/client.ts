import { createActionableError } from "./errors.js";
import type { ErrorResponse, RequestContext } from "./types.js";

const MONO_API_BASE = process.env.MONO_API_URL || "https://monodo.app/api";
const MONO_API_KEY = process.env.MONO_API_KEY;

export async function monoFetch<T>(
  path: string,
  options: RequestInit = {},
  context: RequestContext
): Promise<T> {
  if (!MONO_API_KEY) {
    throw createActionableError(
      401,
      {
        error: { code: "UNAUTHORIZED", message: "API key not configured", details: [] },
      },
      context
    );
  }

  const url = `${MONO_API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${MONO_API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Handle 204 No Content (successful delete)
  if (response.status === 204) {
    return null as T;
  }

  const body = (await response.json().catch(() => ({}))) as ErrorResponse | T;

  if (!response.ok) {
    throw createActionableError(response.status, body as ErrorResponse, context);
  }

  return body as T;
}

export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      // Multiple values for same key (status[], priority[], tags[])
      value.forEach((v) => searchParams.append(key, String(v)));
    } else {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}
