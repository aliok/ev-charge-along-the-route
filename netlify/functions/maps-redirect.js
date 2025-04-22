// netlify/functions/maps-redirect.js
import { getConfig } from '../../utils/config.js';
import {
    genericHeaders,
    corsHeaders // Will be called after getting config
} from '../../utils/helpers.js';

// Native fetch is used (ensure node-fetch is uninstalled)

export const handler = async (event, context) => {
    // --- Call getConfig() at the start of the handler ---
    const config = getConfig();
    // Optional: Log the config obtained for this specific request
    // console.log("[maps-redirect.js] Config for this request:", JSON.stringify(config, null, 2));

    // --- Generate CORS Headers using the current config's origin ---
    const commonResponseHeaders = corsHeaders(config.allowedCorsOrigin);

    // Handle CORS Preflight (OPTIONS request) first
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: commonResponseHeaders };
    }
    // --- End CORS Handling ---

    // --- Server-Side Origin Check ---
    const requestOrigin = event.headers['origin'];
    const allowedOrigin = config.allowedCorsOrigin; // Use origin from config for this request

    if (allowedOrigin && allowedOrigin !== '*' && requestOrigin) {
        let originMatch = false;
        try {
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
                headers: commonResponseHeaders,
                body: JSON.stringify({ error: 'Forbidden: Invalid Origin' }),
            };
        }
    } else if (allowedOrigin && allowedOrigin !== '*' && !requestOrigin) {
        console.warn(`[REDIRECT FN REJECTED] Missing Origin header when specific origin expected. Allowed Origin: '${allowedOrigin}'`);
        return {
            statusCode: 403, // Forbidden
            headers: commonResponseHeaders,
            body: JSON.stringify({ error: 'Forbidden: Origin header required' }),
        };
    }
    // --- End Server-Side Origin Check ---


    // Only allow GET requests
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
    // Use timeout from the config object obtained for this request
    const effectiveTimeout = Math.min(config.mapsRedirectTimeout, 9500);
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, effectiveTimeout);
    // --- End Timeout Implementation ---

    console.log(`[REDIRECT FN] Origin OK. Resolving ${shortUrl} with ${effectiveTimeout}ms timeout`);

    try {
        // Using native fetch
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
            console.error(`[REDIRECT FN TIMEOUT] Request to ${shortUrl} timed out after ${effectiveTimeout}ms.`);
            return {
                statusCode: 504, // Gateway Timeout
                headers: commonResponseHeaders,
                body: JSON.stringify({ error: `Timeout resolving redirect for URL: ${shortUrl}` }),
            };
        } else {
            console.error(`[REDIRECT FN ERROR] Failed to resolve redirect for ${shortUrl}:`, err);
            const statusCode = (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') ? 502 : 500;
            return {
                statusCode: statusCode,
                headers: commonResponseHeaders,
                body: JSON.stringify({ error: `Failed to resolve redirect for URL: ${shortUrl}. ${err.message}` }),
            };
        }
    }
};
