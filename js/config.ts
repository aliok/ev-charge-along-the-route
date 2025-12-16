// --- API Configuration ---
export const APP_VERSION = '__APP_VERSION__';
export const STATIONS_JSON_PATH = '/data/stations.json?v=__APP_VERSION__';
export const STATION_SOCKETS_API_URL_TEMPLATE = '/api/station/{id}/sockets';
export const SHORT_URL_RESOLVER_PROXY_TEMPLATE = '/api/maps/redirect?url={encoded_url}';
export const API_HEADERS: Readonly<Record<string, string>> = {
    'User-Agent': 'RoutePlannerApp/1.0',
    'Accept': 'application/json',
} as const;
export const MAX_API_RETRIES = 3; // Max retries for API calls
export const SOCKET_API_RETRY_DELAY = 1000; // ms delay for socket API retry
export const DIRECTIONS_API_RETRY_DELAY = 750; // ms delay for Directions API retry

// --- Internationalization (i18n) ---
export const LANGUAGE_STORAGE_KEY = 'evRouteLangPref';
// The translations object is injected by the build script
// @ts-ignore - Build-time placeholder
export const translations: Readonly<Record<string, Readonly<Record<string, string>>>> = __TRANSLATIONS_JSON__;

// --- Map & Route Configuration ---
export const DEFAULT_POI_ZINDEX = 1;
export const HOVER_POI_ZINDEX = 9; // zIndex for hover (below selected)
export const SELECTED_POI_ZINDEX = 10; // Higher zIndex for the selected marker
export const OFFSET_INCREMENT_KM = 5; // How much to change offset per click
export const MAX_PRECALCULATE_DETOURS = 10;
export const DETOUR_ERROR_KEY = 'iwDetourFailed';
export const DETOUR_LOADING_KEY = 'iwDetourCalculating';
export const defaultCenter: Readonly<{ lat: number; lng: number }> = { lat: 39.0, lng: 35.0 } as const; // Turkey center
export const defaultZoom = 6;
export const userLocationZoom = 12;

// --- Preferences & Settings Keys ---
export const GENERAL_SETTINGS_STORAGE_KEY = 'evRouteGeneralSettings_v1';
export const BRAND_PREFS_STORAGE_KEY = 'evRouteBrandPrefs_v2';
export const IGNORED_STATIONS_STORAGE_KEY = 'evRouteIgnoredStations';
export const DEFAULT_DISTANCE_THRESHOLD = 5;
export const DEFAULT_MAP_TYPE_ID = 'roadmap' as const;

// --- Default Filter States ---
export const defaultFilters = {
    connectorType: 'ALL',
    powerLevels: ['low', 'medium', 'high'],
    serviceTypes: ['PUBLIC']
} as const;

// --- SVG Icons & HTML ---
export const DEFAULT_EV_SVG_ICON: string = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#059669"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 11.5L13 17v-4h-2v4L7.5 13.5H11V9h2v4.5h3.5z"/></svg>`;
export const DEFAULT_EV_SVG_DATA_URI: string = `data:image/svg+xml;base64,${btoa(DEFAULT_EV_SVG_ICON)}`;
export const IGNORE_ICON_SVG: string = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd" /></svg>`;
export const EYE_ICON_SVG_ROUTE_PANEL: string = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clip-rule="evenodd" /></svg>`;
export const EYE_SLASH_ICON_SVG_ROUTE_PANEL: string = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.46-1.46-.002-.001a13.643 13.643 0 0 1-1.764-2.22A6.986 6.986 0 0 1 10 3c-1.06 0-2.06.236-2.958.66L5.94 2.56a.75.75 0 0 0-1.06 0l-.6.6Zm7.415 10.832a2.25 2.25 0 0 1-3.147-3.147l3.147 3.147ZM10 17c1.805 0 3.366-.88 4.645-2.416.314-.377.608-.778.876-1.193l-1.49-1.49a3.75 3.75 0 0 1-5.032-5.032L7.51 5.381A5.492 5.492 0 0 0 10 3a5.5 5.5 0 0 1 0 11c-.925 0-1.806-.226-2.58-.628l1.395 1.395c.382.114.779.182 1.185.233Z" clip-rule="evenodd" /></svg>`;

