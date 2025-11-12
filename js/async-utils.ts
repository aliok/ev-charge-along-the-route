/**
 * Async utility functions for retries, delays, and API calls.
 */

/**
 * Delay for specified milliseconds.
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
 * Executes a function with retry logic.
 * @param fn - The async function to execute
 * @param options - Retry options
 * @returns The result of the function or throws after all retries fail
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
 */
export async function fetchJson<T>(
    url: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(url, options);
    
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return response.json();
}

/**
 * Wraps Google Maps DirectionsService.route in a Promise.
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
