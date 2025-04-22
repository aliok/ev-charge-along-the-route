// netlify/functions/maps-redirect.js
import config from '../../utils/config.js'; // Import config
import {
    genericHeaders,
    corsHeaders
} from '../../utils/helpers.js';

export const handler = async (event, context) => {
    // Use config value for CORS headers (via helper)
    const commonResponseHeaders = corsHeaders();

    // Handle CORS Preflight (OPTIONS request) first
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
            headers: commonResponseHeaders,
        };
    }

    // --- Server-Side Origin Check ---
    const requestOrigin = event.headers['origin']; // Header names are lowercase in Netlify event obj
    const allowedOrigin = config.allowedCorsOrigin;

    // Only perform the check if the allowed origin is specific (not '*')
    // and if the request actually includes an Origin header (browser CORS requests should)
    if (allowedOrigin && allowedOrigin !== '*' && requestOrigin) {
        let originMatch = false;
        try {
            // Robust comparison using URL objects handles ports, trailing slashes etc.
            const requestOriginUrl = new URL(requestOrigin);
            const allowedOriginUrl = new URL(allowedOrigin);
            if (requestOriginUrl.origin === allowedOriginUrl.origin) {
                originMatch = true;
            }
        } catch (e) {
            console.warn(`[REDIRECT FN WARN] Error parsing Origin headers for comparison: Req='${requestOrigin}', Allowed='${allowedOrigin}'`, e);
        }

        if (!originMatch) {
            console.warn(`[REDIRECT FN REJECTED] Origin mismatch. Request Origin: '${requestOrigin}'. Allowed Origin: '${allowedOrigin}'`);
            return {
                statusCode: 403, // Forbidden
                headers: commonResponseHeaders, // Still send CORS headers for the error response
                body: JSON.stringify({ error: 'Forbidden: Invalid Origin' }),
            };
        }
    } else if (allowedOrigin && allowedOrigin !== '*' && !requestOrigin) {
        // If we expect a specific origin, but no Origin header was sent, reject it.
        console.warn(`[REDIRECT FN REJECTED] Missing Origin header when specific origin expected. Allowed Origin: '${allowedOrigin}'`);
        return {
            statusCode: 403, // Forbidden
            headers: commonResponseHeaders,
            body: JSON.stringify({ error: 'Forbidden: Origin header required' }),
        };
    }
    // --- End Server-Side Origin Check ---


    // Only allow GET requests (now checked after Origin)
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405, // Method Not Allowed
            headers: commonResponseHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    // Get URL from query parameter
    const shortUrl = event.queryStringParameters?.url;

    // --- Input Validation for shortUrl ---
    if (!shortUrl) {
        return { statusCode: 400, headers: commonResponseHeaders, body: JSON.stringify({ error: 'Missing "url" query parameter.' }) };
    }
    try {
        const parsedUrl = new URL(shortUrl);
        if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname.toLowerCase() !== 'maps.app.goo.gl') {
            console.warn(`[REDIRECT FN REJECTED] URL is not a valid Google Maps short link: ${shortUrl}`);
            return { statusCode: 400, headers: commonResponseHeaders, body: JSON.stringify({ error: 'Invalid URL. Only Google Maps short links (starting with https://maps.app.goo.gl/) are supported.' }) };
        }
    } catch (e) {
        console.error(`[REDIRECT FN ERROR] Invalid URL format provided: ${shortUrl}`, e);
        return { statusCode: 400, headers: commonResponseHeaders, body: JSON.stringify({ error: `Invalid URL format: ${shortUrl}` }) };
    }
    // --- End Input Validation ---


    // --- Timeout Implementation ---
    const controller = new AbortController();
    // Use config value for timeout, ensuring it's less than Netlify's limit
    const effectiveTimeout = Math.min(config.mapsRedirectTimeout, 9500);
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, effectiveTimeout);
    // --- End Timeout Implementation ---

    try {
        console.log(`[REDIRECT FN] Origin OK. Resolving ${shortUrl} with ${effectiveTimeout / 1000}s timeout`);
        // Pass genericHeaders
        const response = await fetch(shortUrl, {
            method: 'GET',
            headers: genericHeaders,
            signal: controller.signal,
            redirect: 'follow'
        });
        clearTimeout(timeoutId);

        const finalUrl = response.url;
        console.log(`[REDIRECT FN] Resolved ${shortUrl} to ${finalUrl} (Status: ${response.status})`);

        return {
            statusCode: 200,
            headers: {
                ...commonResponseHeaders, // Include CORS
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ redirectedUrl: finalUrl }),
        };

    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            console.error(`[REDIRECT FN TIMEOUT] Request to ${shortUrl} timed out after ${effectiveTimeout / 1000} seconds.`);
            return {
                statusCode: 504, // Gateway Timeout
                headers: commonResponseHeaders,
                body: JSON.stringify({ error: `Timeout resolving redirect for URL: ${shortUrl}` }),
            };
        } else {
            console.error(`[REDIRECT FN ERROR] Failed to resolve redirect for ${shortUrl}:`, err);
            // Use 502 if it seems like a network/upstream issue, 500 otherwise
            const statusCode = (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') ? 502 : 500;
            return {
                statusCode: statusCode,
                headers: commonResponseHeaders,
                body: JSON.stringify({ error: `Failed to resolve redirect for URL: ${shortUrl}. ${err.message}` }),
            };
        }
    }
};
