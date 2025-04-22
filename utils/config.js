// utils/config.js

/**
 * Reads environment variables and provides default values.
 * Centralizes configuration access.
 */
const config = {
    /**
     * Base URL for the EPDK SARJ API.
     * Can be overridden by setting the BASE_URL environment variable.
     */
    baseUrl: process.env.BASE_URL || 'https://sarjtr.epdk.gov.tr:443/sarjet/api',

    /**
     * Timeout in milliseconds for fetching station data from EPDK API.
     * Default: 5000 (5 seconds).
     * Can be overridden by setting the FETCH_TIMEOUT environment variable.
     */
    fetchTimeout: parseInt(process.env.FETCH_TIMEOUT || '5000', 10),

    /**
     * Timeout in milliseconds for resolving Google Maps redirects.
     * Default: 10000 (10 seconds).
     * Can be overridden by setting the MAPS_REDIRECT_TIMEOUT environment variable.
     */
    mapsRedirectTimeout: parseInt(process.env.MAPS_REDIRECT_TIMEOUT || '10000', 10),

    /**
     * Origin allowed for CORS requests. Read from environment variable.
     * IMPORTANT: Set ALLOWED_CORS_ORIGIN in Netlify UI per deploy context.
     * This is crucial for security, especially for the maps-redirect endpoint.
     * Default: 'http://localhost:63342' for local development.
     */
    allowedCorsOrigin: process.env.ALLOWED_CORS_ORIGIN || 'http://localhost:63342',

    /**
     * Controls whether to disable Node.js TLS verification.
     * Read from environment variable NODE_TLS_REJECT_UNAUTHORIZED.
     * Value should be '0' to disable (NOT RECOMMENDED FOR PRODUCTION).
     * Default: '1' (enabled).
     * IMPORTANT: Set NODE_TLS_REJECT_UNAUTHORIZED=0 in Netlify UI if needed.
     */
    disableTlsRejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0',
};

// --- Log Configuration on Startup (Optional but helpful for debugging) ---
// Note: In Netlify Functions, this might log on every invocation if cold start.
console.log("--- Configuration ---");
console.log(`Base URL: ${config.baseUrl}`);
console.log(`Fetch Timeout: ${config.fetchTimeout}ms`);
console.log(`Maps Redirect Timeout: ${config.mapsRedirectTimeout}ms`);
console.log(`Allowed CORS Origin: ${config.allowedCorsOrigin}`);
console.log(`Disable TLS Reject Unauthorized: ${config.disableTlsRejectUnauthorized}`);
console.log("--------------------");

// Apply the TLS setting globally *once* if needed.
// This is a process-wide setting.
if (config.disableTlsRejectUnauthorized) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.warn('[SECURITY WARNING] NODE_TLS_REJECT_UNAUTHORIZED is set to 0. TLS verification is disabled.');
}

export default config; // Export the config object
