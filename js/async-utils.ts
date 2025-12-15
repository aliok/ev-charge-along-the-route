/**
 * Async utility functions for retries, delays, and API calls.
 */

/**
 * Custom error class for fetch operations
 */
export class FetchError extends Error {
    constructor(
        public readonly status: number,
        public readonly statusText: string,
        message?: string
    ) {
        super(message || `HTTP error! Status: ${status} ${statusText}`);
        this.name = 'FetchError';
    }
}

/**
 * Creates a promise that resolves after the specified delay.
 * @param ms - Delay in milliseconds
 * @returns A promise that resolves after the delay
 * @example
 * await delay(1000); // Wait for 1 second
 * @private
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Options for retry logic.
 */
export interface RetryOptions {
    maxRetries: number;
    retryDelay: number;
    onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Executes an async function with automatic retry logic.
 * Retries the function on failure with exponential backoff or fixed delay.
 *
 * @template T - The return type of the function
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function execution
 * @throws The last error encountered after all retries are exhausted
 *
 * @example
 * const result = await withRetry(
 *   async () => fetchJson('https://api.example.com/data'),
 *   {
 *     maxRetries: 3,
 *     retryDelay: 1000,
 *     onRetry: (attempt, error) => console.log(`Retry attempt ${attempt}`, error)
 *   }
 * );
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions
): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt < options.maxRetries) {
                options.onRetry?.(attempt + 1, error);
                await delay(options.retryDelay);
            }
        }
    }
    
    throw lastError;
}

/**
 * Fetches JSON data with error handling.
 * @throws {FetchError} When the HTTP request fails
 * @throws {Error} When the response is not JSON
 */
export async function fetchJson<T>(
    url: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new FetchError(response.status, response.statusText);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
        throw new Error(`Expected JSON but got ${contentType}`);
    }

    return response.json();
}

/**
 * Wraps Google Maps DirectionsService.route in a Promise-based interface.
 * Converts the callback-based API to a more modern async/await compatible format.
 *
 * @param directionsService - The Google Maps DirectionsService instance
 * @param request - The directions request parameters
 * @returns A promise that resolves with the route result and status
 *
 * @example
 * const { result, status } = await routePromise(directionsService, {
 *   origin: { lat: 41.0, lng: 29.0 },
 *   destination: { lat: 41.1, lng: 29.1 },
 *   travelMode: google.maps.TravelMode.DRIVING
 * });
 *
 * if (status === google.maps.DirectionsStatus.OK && result) {
 *   // Handle successful route
 * }
 */
export function routePromise(
    directionsService: google.maps.DirectionsService,
    request: google.maps.DirectionsRequest
): Promise<{ result: google.maps.DirectionsResult | null; status: google.maps.DirectionsStatus }> {
    return new Promise((resolve) => {
        directionsService.route(request, (result, status) => {
            resolve({ result, status });
        });
    });
}
