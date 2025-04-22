// netlify/functions/station-sockets.js
import { getConfig } from '../../utils/config.js';
import {
    commonHeaders,
    getFormattedTimestamp,
    getCurrentAvailability
} from '../../utils/helpers.js';

// Native fetch is used

export const handler = async (event, context) => {
    const config = getConfig();

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    // --- Manually Parse stationId ---
    let stationId = null;
    try {
        const pathParts = event.path.split('/');
        if (pathParts.length === 5 && pathParts[1] === 'api' && pathParts[2] === 'station' && pathParts[4] === 'sockets') {
            stationId = pathParts[3];
        } else {
            console.warn(`[PROXY FN WARN] Path "${event.path}" did not match expected format /api/station/:id/sockets`);
        }
    } catch (e) {
        console.error(`[PROXY FN ERROR] Error occurred while trying to parse path "${event.path}":`, e);
    }
    // --- End Manual Parsing ---

    if (!stationId) {
        console.error(`[PROXY FN ERROR] Could not extract station ID from path: ${event.path}`);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Could not determine station ID from request path' }),
        };
    }

    // --- Calculate Timestamp ---
    const now = new Date();
    const previousMinute = new Date(now.getTime() - 60 * 1000);
    previousMinute.setSeconds(0, 0);
    const apiTimestamp = getFormattedTimestamp(previousMinute);
    const encodedTime = encodeURIComponent(apiTimestamp);
    // --- End Timestamp Calculation ---

    const url = `${config.baseUrl}/stations/id/${stationId}/${encodedTime}`;

    // --- Timeout ---
    const controller = new AbortController();
    const effectiveTimeout = Math.min(config.fetchTimeout, 9500);
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

    console.log(`[PROXY FN] Fetching ${url} (ID: ${stationId}) with ${effectiveTimeout}ms timeout`);

    try {
        const response = await fetch(url, { headers: commonHeaders, signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[PROXY FN ERROR] Origin server response for ID ${stationId}: ${response.status} ${response.statusText}`, errorBody);
            return {
                statusCode: 502,
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(simplifiedSockets),
        };

    } catch (err) {
        clearTimeout(timeoutId);
        let statusCode = 500;
        let errorBody = { error: `Internal error fetching station detail for ID ${stationId}. ${err.message}` };

        if (err.name === 'AbortError') {
            statusCode = 504;
            errorBody = { error: `Request to upstream server timed out for station ID ${stationId}` };
            console.error(`[PROXY FN TIMEOUT] Request to ${url} timed out after ${effectiveTimeout}ms.`);
        } else {
            console.error(`[PROXY FN ERROR] Internal processing error or network issue for station ID ${stationId}:`, err);
        }
        return {
            statusCode: statusCode,
            body: JSON.stringify(errorBody),
        };
    }
};
