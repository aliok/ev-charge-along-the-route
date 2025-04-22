// utils/config.js

// --- Logging for initial module load ---
// console.log("[config.js module] Evaluating module...");

// --- Handle process-wide settings ONCE at module load time ---
const tlsShouldBeDisabled = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';
if (tlsShouldBeDisabled) {
    // Apply the setting globally *once*.
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.warn('[SECURITY WARNING] NODE_TLS_REJECT_UNAUTHORIZED is set to 0 during module load. TLS verification is disabled.');
}
// --- End process-wide settings ---


/**
 * Reads environment variables and provides default values ON DEMAND.
 * Call this function within your handler to get the current config.
 */
const getConfig = () => {
    // --- Add logging INSIDE the function call for debugging ---
    // console.log("[getConfig function] Reading environment variables...");
    // console.log(`[getConfig function] Raw process.env.BASE_URL: ${process.env.BASE_URL}`);
    // console.log(`[getConfig function] Raw process.env.FETCH_TIMEOUT: ${process.env.FETCH_TIMEOUT}`);
    // ---

    const config = {
        /**
         * Base URL for the EPDK SARJ API.
         */
        baseUrl: process.env.BASE_URL || 'https://sarjtr.epdk.gov.tr:443/sarjet/api',

        /**
         * Timeout in milliseconds for fetching station data from EPDK API.
         */
        fetchTimeout: parseInt(process.env.FETCH_TIMEOUT || '5000', 10),

        /**
         * Timeout in milliseconds for resolving Google Maps redirects.
         */
        mapsRedirectTimeout: parseInt(process.env.MAPS_REDIRECT_TIMEOUT || '10000', 10),

        /**
         * Origin allowed for CORS requests.
         */
        allowedCorsOrigin: process.env.ALLOWED_CORS_ORIGIN || 'http://localhost:63342',

        /**
         * Returns true if TLS verification should be disabled (based on initial check).
         * This value itself doesn't change, but reflects the initial setting.
         */
        isTlsRejectUnauthorizedDisabled: tlsShouldBeDisabled, // Reflects initial setting
    };

    // --- Log the generated config object INSIDE the function call ---
    // console.log("[getConfig function] Generated config object:", JSON.stringify(config, null, 2));
    // ---

    // Validate parsed numbers - if parseInt resulted in NaN, use default again
    if (isNaN(config.fetchTimeout)) {
        console.warn(`[getConfig function] Invalid FETCH_TIMEOUT value "${process.env.FETCH_TIMEOUT}". Defaulting to 5000.`);
        config.fetchTimeout = 5000;
    }
    if (isNaN(config.mapsRedirectTimeout)) {
        console.warn(`[getConfig function] Invalid MAPS_REDIRECT_TIMEOUT value "${process.env.MAPS_REDIRECT_TIMEOUT}". Defaulting to 10000.`);
        config.mapsRedirectTimeout = 10000;
    }

    return config;
};

// Export the function as the default export
export { getConfig };

