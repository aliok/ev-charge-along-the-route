import type { LocationService } from './location-service.js';
import { defaultFilters } from './config.js';

// Types for station data
export interface Socket {
  id?: string;
  type?: string;
  power?: number;
}

export interface StationData {
  id: string;
  brand?: string | null;
  title?: string;
  lat: number;
  lng: number;
  sockets?: Socket[];
  serviceType?: string;
  operatorTitle?: string;
  address?: string;
  phone?: string;
  reportUrl?: string;
}

// Extended marker type with custom properties
export interface ExtendedMarker extends google.maps.marker.AdvancedMarkerElement {
  poiData?: StationData;
  stationId?: string;
  detourData?: DetourData | null;
  liveSocketData?: LiveSocketDataState;
  cachedInfoWindowContent?: string | null;
}

type DetourStatus = 'OK' | 'Error' | 'Pending';

export interface DetourData {
  status: DetourStatus;
  extraDist?: number;
  extraTime?: number;
  distFromStart?: number;
  timeFromStart?: number;
  distToEnd?: number;
  timeToEnd?: number;
}

export interface LiveSocketData {
  id: string;
  availability?: string;
  price?: number;
}

// Type for live socket data - can be array, false (error), or null (loading)
export type LiveSocketDataState = LiveSocketData[] | false | null;

type WaypointType = 'start' | 'destination' | 'station' | 'place';

export interface Waypoint {
  type: WaypointType;
  id: string;
  name: string;
  location: google.maps.LatLng;
}

export interface Filters {
  connectorType: string;
  powerLevels: string[];
  serviceTypes: string[];
  mapTypeId?: string;
}

export type AppMode = 'explore' | 'directions';

// --- Global State Object ---
// All application state is stored in this object for easy access and mutation
const state = {
  // App Mode
  appMode: 'explore' as AppMode,

  // Map & Services
  map: null as google.maps.Map | null,
  directionsService: null as google.maps.DirectionsService | null,
  directionsRenderer: null as google.maps.DirectionsRenderer | null,
  geocoder: null as google.maps.Geocoder | null,
  locationService: null as LocationService | null,
  autocompleteStart: null as google.maps.places.Autocomplete | null,
  autocompleteEnd: null as google.maps.places.Autocomplete | null,

  // Locations & Markers
  startLocation: null as google.maps.LatLng | null,
  endLocation: null as google.maps.LatLng | null,
  startMarker: null as ExtendedMarker | null,
  endMarker: null as ExtendedMarker | null,
  allPoiMarkers: [] as ExtendedMarker[],
  allStationData: [] as StationData[],
  visiblePoiMarkers: new Map<string, ExtendedMarker>(),
  selectedPoiMarker: null as ExtendedMarker | null,
  currentRoutePolylinePath: null as google.maps.LatLng[] | null,
  effectiveRoutePath: null as google.maps.LatLng[] | null,
  infoWindow: null as google.maps.InfoWindow | null,

  // Route State
  distanceThresholdKm: 5, // Default value, may be overridden by loaded settings
  isRouteActive: false,
  originalRouteDistance: null as number | null, // meters
  originalRouteDuration: null as number | null, // seconds
  startOffsetKm: 0, // Start offset in KM
  endOffsetKm: 0, // Destination offset in KM (from the end)

  // Route Builder State
  routeWaypoints: [] as Waypoint[],
  routeWaypointMarkers: [] as ExtendedMarker[],
  arePoisVisible: true,

  // Preferences & Settings
  allUniqueBrands: [] as string[],
  favoriteBrands: new Set<string>(),
  blacklistedBrands: new Set<string>(),
  ignoredStationIds: new Set<string>(), // Set to store IDs of ignored stations (ALWAYS as strings)
  brandFilterMode: 'all' as 'all' | 'favoritesOnly',

  // Filter State
  currentFilters: {
    connectorType: defaultFilters.connectorType,
    powerLevels: [...defaultFilters.powerLevels],
    serviceTypes: [...defaultFilters.serviceTypes],
  } as Filters,
};

// Export the state object
export default state;
