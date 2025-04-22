// netlify/functions/station-sockets.js
import fetch from 'node-fetch';
import config from '../../utils/config.js'; // Import config
import {
    commonHeaders,
    getFormattedTimestamp,
    getCurrentAvailability,
    corsHeaders
} from '../../utils/helpers.js';

export const handler = async (event, context) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const commonResponseHeaders = corsHeaders();

    // Handle CORS Preflight (OPTIONS request)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
            headers: commonResponseHeaders,
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405, // Method Not Allowed
            headers: commonResponseHeaders,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    // --- Manually Parse stationId from event.path ---
    let stationId = null;
    try {
        // Example event.path: "/api/station/1234567/sockets"
        const pathParts = event.path.split('/');
        // Expected array: ["", "api", "station", "1234567", "sockets"] (length 5)

        // Basic validation of the path structure
        if (pathParts.length === 5 && pathParts[1] === 'api' && pathParts[2] === 'station' && pathParts[4] === 'sockets') {
            // Extract the ID (the 4th element, index 3)
            stationId = pathParts[3];
        } else {
            console.warn(`[PROXY FN WARN] Path "${event.path}" did not match expected format /api/station/:id/sockets`);
        }
    } catch (e) {
        console.error(`[PROXY FN ERROR] Error occurred while trying to parse path "${event.path}":`, e);
        // stationId remains null, will be caught by the check below
    }
    // --- End Manual Parsing ---

    // Check if stationId was successfully parsed
    if (!stationId) {
        console.error(`[PROXY FN ERROR] Could not extract station ID from path: ${event.path}`);
        return {
            statusCode: 400,
            headers: commonResponseHeaders,
            body: JSON.stringify({ error: 'Could not determine station ID from request path' }),
        };
    }

    // --- Calculate Timestamp for API ---
    const now = new Date();
    const previousMinute = new Date(now.getTime() - 60 * 1000);
    previousMinute.setSeconds(0, 0);
    const apiTimestamp = getFormattedTimestamp(previousMinute);
    const encodedTime = encodeURIComponent(apiTimestamp);
    // --- End Timestamp Calculation ---

    // Use config value for Base URL and the parsed stationId
    const url = `${config.baseUrl}/stations/id/${stationId}/${encodedTime}`;

    // --- Timeout Implementation ---
    const controller = new AbortController();
    const effectiveTimeout = Math.min(config.fetchTimeout, 9500); // Ensure slightly less than 10s Netlify limit
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, effectiveTimeout);
    // --- End Timeout Implementation ---

    try {
        console.log(`[PROXY FN] Fetching ${url} (ID: ${stationId}) with ${effectiveTimeout / 1000}s timeout`);
        const response = await fetch(url, {
            headers: commonHeaders,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[PROXY FN ERROR] Origin server response for ID ${stationId}: ${response.status} ${response.statusText}`, errorBody);
            return {
                statusCode: 502, // Bad Gateway
                headers: commonResponseHeaders,
                body: JSON.stringify({ error: `Origin server responded with ${response.status} for station ${stationId}` })
            };
        }

        const fullData = await response.json();

        // --- Data Transformation ---
        let simplifiedSockets = [];
        if (fullData && Array.isArray(fullData.sockets)) {
            simplifiedSockets = fullData.sockets.map(socket => {
                const availabilityStatus = getCurrentAvailability(socket.availability);
                const currentPrice = socket.price !== undefined ? socket.price : null;
                const socketId = socket.id !== undefined ? socket.id : null;
                return { id: socketId, price: currentPrice, availability: availabilityStatus };
            });
        } else {
            console.warn(`[PROXY FN WARN] Unexpected data structure or missing 'sockets' array for station ${stationId}.`);
        }
        // --- End Data Transformation ---

        return {
            statusCode: 200,
            headers: {
                ...commonResponseHeaders, // Include CORS
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(simplifiedSockets),
        };

    } catch (err) {
        clearTimeout(timeoutId);

        if (err.name === 'AbortError') {
            console.error(`[PROXY FN TIMEOUT] Request to ${url} timed out after ${effectiveTimeout / 1000} seconds.`);
            return {
                statusCode: 504, // Gateway Timeout
                headers: commonResponseHeaders,
                body: JSON.stringify({ error: `Request to upstream server timed out for station ID ${stationId}` }),
            };
        } else {
            console.error(`[PROXY FN ERROR] Internal processing error or network issue for station ID ${stationId}:`, err);
            return {
                statusCode: 500, // Internal Server Error
                headers: commonResponseHeaders,
                body: JSON.stringify({ error: `Internal error fetching station detail for ID ${stationId}. ${err.message}` }),
            };
        }
    }
};
