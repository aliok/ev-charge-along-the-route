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
export const IGNORE_ICON_SVG: string = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.18l-.877-.584a1.651 1.651 0 0 0-1.8-.001l-.933.621a1.651 1.651 0 0 0-1.8 0l-.933-.621a1.651 1.651 0 0 0-1.8 0l-.933.621a1.651 1.651 0 0 0-1.8 0l-.933-.621a1.651 1.651 0 0 0-1.8 0l-.552.368a10.029 10.029 0 0 0-2.53-1.884l-1.745-1.745ZM10 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM6.604 9.166a.75.75 0 0 0-1.06 1.06l1.43 1.43a2.5 2.5 0 0 1 3.086-3.086l-1.43-1.43a.75.75 0 0 0-1.06-1.06l-1.956 1.956Z" clip-rule="evenodd" /></svg>`;
export const EYE_ICON_SVG_ROUTE_PANEL: string = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.18l.877-.584a1.651 1.651 0 0 1 1.804 0l.932.621a1.651 1.651 0 0 1 1.804 0l.932-.621a1.651 1.651 0 0 1 1.804 0l.932.621a1.651 1.651 0 0 1 1.804 0l.932-.621a1.651 1.651 0 0 1 1.804 0l.932.621a1.651 1.651 0 0 1 1.804 0l.877.584a1.651 1.651 0 0 1 0 1.18l-.877.584a1.651 1.651 0 0 1-1.804 0l-.932-.621a1.651 1.651 0 0 1-1.804 0l-.932.621a1.651 1.651 0 0 1-1.804 0l-.932-.621a1.651 1.651 0 0 1-1.804 0l-.932.621a1.651 1.651 0 0 1-1.804 0l-.877-.584ZM10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" clip-rule="evenodd" /></svg>`;
export const EYE_SLASH_ICON_SVG_ROUTE_PANEL: string = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.18l-.877-.584a1.651 1.651 0 0 0-1.8-.001l-.933.621a1.651 1.651 0 0 0-1.8 0l-.933-.621a1.651 1.651 0 0 0-1.8 0l-.933.621a1.651 1.651 0 0 0-1.8 0l-.933-.621a1.651 1.651 0 0 0-1.8 0l-.552.368a10.029 10.029 0 0 0-2.53-1.884l-1.745-1.745ZM10 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM6.604 9.166a.75.75 0 0 0-1.06 1.06l1.43 1.43a2.5 2.5 0 0 1 3.086-3.086l-1.43-1.43a.75.75 0 0 0-1.06-1.06l-1.956 1.956Z" clip-rule="evenodd" /></svg>`;

