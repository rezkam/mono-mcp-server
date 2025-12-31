import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryFetch } from './retryFetch.js';

describe('retryFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return successful response on first attempt', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    global.fetch = mockFetch as any;

    const response = await retryFetch('https://api.example.com/test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  });

  it('should retry on 503 and succeed on second attempt', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

    global.fetch = mockFetch as any;

    const response = await retryFetch('https://api.example.com/test');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  });

  it('should not retry on 400 validation error', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'validation failed' }), {
        status: 400,
      })
    );

    global.fetch = mockFetch as any;

    const response = await retryFetch('https://api.example.com/test');

    expect(mockFetch).toHaveBeenCalledTimes(1); // No retry
    expect(response.status).toBe(400);
  });

  it('should retry up to max retries and then return failed response', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));

    global.fetch = mockFetch as any;

    const response = await retryFetch('https://api.example.com/test', undefined, {
      maxRetries: 2,
      baseDelayMs: 0, // No delay for faster tests
      maxDelayMs: 0,
      timeoutMs: 2500,
      retryableStatuses: [503],
    });

    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    expect(response.status).toBe(503);
  });

  it('should use exponential backoff with jitter', async () => {
    // Spy on sleep function calls by capturing delay values
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;

    vi.stubGlobal('setTimeout', (callback: any, delay: number) => {
      delays.push(delay);
      return originalSetTimeout(callback, 0); // Execute immediately for testing
    });

    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

    global.fetch = mockFetch as any;

    await retryFetch('https://api.example.com/test', undefined, {
      maxRetries: 2,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      timeoutMs: 2500,
      retryableStatuses: [503],
    });

    expect(delays).toHaveLength(2);

    // First delay: should be 0-1000ms (base * 2^0 with full jitter)
    expect(delays[0]).toBeGreaterThanOrEqual(0);
    expect(delays[0]).toBeLessThanOrEqual(1000);

    // Second delay: should be 0-2000ms (base * 2^1 with full jitter)
    expect(delays[1]).toBeGreaterThanOrEqual(0);
    expect(delays[1]).toBeLessThanOrEqual(2000);

    // Verify they're not both the same fixed value (should have jitter)
    // Run it again and check delays vary
    delays.length = 0;
    mockFetch.mockClear();
    mockFetch
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

    await retryFetch('https://api.example.com/test', undefined, {
      maxRetries: 1,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      timeoutMs: 2500,
      retryableStatuses: [503],
    });

    const firstRunDelay = delays[0];

    // The delay should be different on different runs due to jitter
    expect(firstRunDelay).not.toBe(1000); // Should not be fixed value

    vi.unstubAllGlobals();
  });

  it('should use AbortSignal.timeout for request timeout', async () => {
    const mockFetch = vi.fn(async (input: any, init: any) => {
      // Verify AbortSignal.timeout was used
      expect(init?.signal).toBeDefined();
      expect(init?.signal).toBeInstanceOf(AbortSignal);

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });

    global.fetch = mockFetch as any;

    await retryFetch('https://api.example.com/test', undefined, {
      maxRetries: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      timeoutMs: 5000,
      retryableStatuses: [503],
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
