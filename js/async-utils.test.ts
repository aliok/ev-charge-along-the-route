import { describe, it, expect, vi } from 'vitest';
import { withRetry, fetchJson } from './async-utils.js';

describe('async-utils', () => {
  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn, { maxRetries: 3, retryDelay: 100 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 3, retryDelay: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exhausted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

      await expect(withRetry(fn, { maxRetries: 2, retryDelay: 10 })).rejects.toThrow(
        'persistent failure'
      );

      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should call onRetry callback', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();

      await withRetry(fn, { maxRetries: 2, retryDelay: 10, onRetry });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('should respect retry delay', async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('ok');

      const start = Date.now();
      await withRetry(fn, { maxRetries: 1, retryDelay: 50 });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small timing variance
    });
  });

  describe('fetchJson', () => {
    it('should fetch and parse JSON successfully', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'test' }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await fetchJson('https://api.example.com/data');

      expect(result).toEqual({ data: 'test' });
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/data', undefined);
    });

    it('should throw FetchError on HTTP error', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(fetchJson('https://api.example.com/missing')).rejects.toThrow(
        'HTTP error! Status: 404 Not Found'
      );
    });

    it('should throw error for non-JSON content type', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(fetchJson('https://api.example.com/html')).rejects.toThrow(
        'Expected JSON but got text/html'
      );
    });

    it('should accept request options', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const options = { method: 'POST', headers: { Authorization: 'Bearer token' } };
      await fetchJson('https://api.example.com/endpoint', options);

      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/endpoint', options);
    });
  });
});
