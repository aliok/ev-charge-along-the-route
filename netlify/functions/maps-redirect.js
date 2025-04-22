// netlify/functions/maps-redirect.js
import { getConfig } from '../../utils/config.js';
import { genericHeaders } from '../../utils/helpers.js';

// Native fetch is used

export const handler = async (event, context) => {
    const config = getConfig();

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    // Get URL from query parameter
    const shortUrl = event.queryStringParameters?.url;

    // --- Input Validation ---
    if (!shortUrl) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing "url" query parameter.' }) };
    }
    try {
        const parsedUrl = new URL(shortUrl);
        if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname.toLowerCase() !== 'maps.app.goo.gl') {
            console.warn(`[REDIRECT FN REJECTED] URL is not a valid Google Maps short link: ${shortUrl}`);
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid URL. Only Google Maps short links (starting with https://maps.app.goo.gl/) are supported.' }) };
        }
    } catch (e) {
        console.error(`[REDIRECT FN ERROR] Invalid URL format provided: ${shortUrl}`, e);
        return { statusCode: 400, body: JSON.stringify({ error: `Invalid URL format: ${shortUrl}` }) };
    }
    // --- End Input Validation ---

    // --- Timeout ---
    const controller = new AbortController();
    const effectiveTimeout = Math.min(config.mapsRedirectTimeout, 9500);
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

    console.log(`[REDIRECT FN] Resolving ${shortUrl} with ${effectiveTimeout}ms timeout`);

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ redirectedUrl: finalUrl }),
        };

    } catch (err) {
        clearTimeout(timeoutId);
        let statusCode = 500;
        let errorBody = { error: `Failed to resolve redirect for URL: ${shortUrl}. ${err.message}` };

        if (err.name === 'AbortError') {
            statusCode = 504;
            errorBody = { error: `Timeout resolving redirect for URL: ${shortUrl}` };
            console.error(`[REDIRECT FN TIMEOUT] Request to ${shortUrl} timed out after ${effectiveTimeout}ms.`);
        } else {
            if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
                statusCode = 502;
            }
            console.error(`[REDIRECT FN ERROR] Failed to resolve redirect for ${shortUrl}:`, err);
        }
        return {
            statusCode: statusCode,
            body: JSON.stringify(errorBody),
        };
    }
};
