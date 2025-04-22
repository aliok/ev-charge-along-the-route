// utils/helpers.js
import config from './config.js'; // Import the configuration

// Headers specific to the EPDK API
export const commonHeaders = {
    'User-Agent': 'Dart/3.1 (dart:io)',
    'Accept-Encoding': 'gzip',
    'Host': 'sarjtr.epdk.gov.tr'
};

// Headers suitable for general web requests like resolving redirects
export const genericHeaders = {
    'User-Agent': 'Mozilla/5.0 (NetlifyFunctionProxy)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1'
};

// Helper function to format Date to 'YYYY-MM-DD HH:MM:SS'
export const getFormattedTimestamp = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// Helper function to determine current availability status
export const getCurrentAvailability = (availabilityArray) => {
    if (!Array.isArray(availabilityArray) || availabilityArray.length === 0) {
        return 'UNKNOWN'; // No availability info provided
    }
    const currentTime = new Date();
    const currentStatusEntry = availabilityArray.find(avail => {
        if (avail.active !== 1) {
            return false;
        }
        try {
            const startTime = new Date(avail.startTime);
            const endTime = new Date(avail.endTime.substring(0, 19));
            endTime.setSeconds(endTime.getSeconds() + 1);
            return currentTime >= startTime && currentTime < endTime;
        } catch (e) {
            console.warn(`[WARN] Error parsing availability time: ${avail.startTime} / ${avail.endTime}`, e);
            return false;
        }
    });
    if (currentStatusEntry) {
        return currentStatusEntry.status;
    } else {
        console.warn(`[WARN] No active availability interval found for current time: ${currentTime.toISOString()}. Available intervals:`, JSON.stringify(availabilityArray));
        return 'UNKNOWN';
    }
};

// Common CORS Headers - Reads origin from config
export const corsHeaders = () => {
    // Read the origin directly from the imported config object
    const allowedOrigin = config.allowedCorsOrigin;

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type', // Allow only necessary headers
        'Access-Control-Allow-Methods': 'GET, OPTIONS', // Specify allowed methods
    };
};
