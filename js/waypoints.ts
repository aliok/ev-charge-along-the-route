import state, { type Waypoint, type ExtendedMarker } from './state.js';
import type { TranslationParams } from './types.js';

// Callbacks for waypoint functions to call back to main.js
interface WaypointCallbacks {
  updateRouteBuilderUI?: (directionsResult?: google.maps.DirectionsResult | null) => void;
  calculateRoute?: (useOptimization?: boolean) => void;
  updateGmapsButtonState?: () => void;
  updateMarker?: (type: 'start' | 'end', location: google.maps.LatLng, title: string) => void;
  updateInfoWindowIfVisible?: (marker: ExtendedMarker) => void;
  showTemporaryMessage?: (text: string, isError?: boolean) => void;
  translate?: (key: string, params?: TranslationParams) => string;
  resetOffsets?: () => void;
  clearRouteDisplay?: () => void;
  updateOffsetControlsVisibility?: () => void;
  updatePoiVisibilityButtonUI?: () => void;
}

const MIN_WAYPOINTS_FOR_ROUTE = 2;

let callbacks: WaypointCallbacks = {};

export function setupWaypointCallbacks(cb: WaypointCallbacks): void {
  callbacks = cb;
}

// --- Waypoint Management Functions ---

/**
 * Sets the start waypoint
 */
export function setStartWaypoint(
  location: google.maps.LatLng,
  displayName: string,
  id: string | null = null
): void {
  const newWaypoint: Waypoint = {
    type: 'start',
    name: displayName,
    location,
    id: id ?? `wp-${Date.now()}`,
  };

  const existingIndex = state.routeWaypoints.findIndex(wp => wp.type === 'start');
  if (existingIndex !== -1) {
    state.routeWaypoints[existingIndex] = newWaypoint;
  } else {
    state.routeWaypoints.unshift(newWaypoint);
  }
}

/**
 * Sets the destination waypoint
 */
export function setDestinationWaypoint(
  location: google.maps.LatLng,
  displayName: string,
  id: string | null = null
): void {
  const newWaypoint: Waypoint = {
    type: 'destination',
    name: displayName,
    location,
    id: id ?? `wp-${Date.now()}`,
  };

  const existingIndex = state.routeWaypoints.findIndex(wp => wp.type === 'destination');
  if (existingIndex !== -1) {
    state.routeWaypoints[existingIndex] = newWaypoint;
  } else {
    state.routeWaypoints.push(newWaypoint);
  }
}

/**
 * Removes a waypoint by type (start or destination)
 */
export function removeWaypoint(type: 'start' | 'destination'): void {
  const indexToRemove = state.routeWaypoints.findIndex(wp => wp.type === type);
  if (indexToRemove !== -1) {
    state.routeWaypoints.splice(indexToRemove, 1);
  }
}

/**
 * Adds a station to the route as a waypoint
 */
export function handleAddStationToRoute(stationId: string | number): void {
  const station = state.allStationData.find(s => String(s.id) === String(stationId));
  if (!station) {
    console.error(`Station with ID ${stationId} not found.`);
    return;
  }

  // Check if station is already in the route
  if (state.routeWaypoints.some(wp => wp.type === 'station' && wp.id === String(stationId))) {
    callbacks.showTemporaryMessage?.(
      callbacks.translate?.('messageStationAlreadyInRoute') ?? 'messageStationAlreadyInRoute',
      false
    );
    return;
  }

  const waypoint: Waypoint = {
    type: 'station',
    id: String(stationId),
    name: station.brand || station.title || '',
    location: new google.maps.LatLng(station.lat, station.lng),
  };

  // Insert station before the destination
  const destinationIndex = state.routeWaypoints.findIndex(wp => wp.type === 'destination');
  if (destinationIndex !== -1) {
    state.routeWaypoints.splice(destinationIndex, 0, waypoint);
  } else {
    state.routeWaypoints.push(waypoint);
  }

  callbacks.showTemporaryMessage?.(
    callbacks.translate?.('messageStationAddedToRoute', { name: waypoint.name }) ??
      'messageStationAddedToRoute',
    false
  );
  callbacks.updateRouteBuilderUI?.();
  callbacks.calculateRoute?.(true);
  callbacks.updateGmapsButtonState?.();
  callbacks.updatePoiVisibilityButtonUI?.();

  // Update the currently open infowindow to disable the 'Add' button
  const infoWindowWithMethods = state.infoWindow as
    | (google.maps.InfoWindow & {
        getMap?: () => google.maps.Map | null;
        getAnchor?: () => ExtendedMarker | null;
      })
    | null;
  if (state.infoWindow && infoWindowWithMethods?.getMap?.()) {
    const anchor = infoWindowWithMethods.getAnchor?.();
    if (anchor?.stationId === String(stationId)) {
      callbacks.updateInfoWindowIfVisible?.(anchor);
    }
  }
}

/**
 * Adds a place to the route as a waypoint
 */
export function handleAddPlaceToRoute(placeId: string, name: string, lat: number, lng: number): void {
  if (state.routeWaypoints.some(wp => wp.type === 'place' && wp.id === placeId)) {
    callbacks.showTemporaryMessage?.(
      callbacks.translate?.('messagePlaceAlreadyInRoute') ?? 'Place already in route',
      false
    );
    return;
  }

  const waypoint: Waypoint = {
    type: 'place',
    id: placeId,
    name,
    location: new google.maps.LatLng(lat, lng),
  };

  const destinationIndex = state.routeWaypoints.findIndex(wp => wp.type === 'destination');
  if (destinationIndex !== -1) {
    state.routeWaypoints.splice(destinationIndex, 0, waypoint);
  } else {
    state.routeWaypoints.push(waypoint);
  }

  callbacks.showTemporaryMessage?.(
    callbacks.translate?.('messagePlaceAddedToRoute', { name }) ?? `${name} added to route`,
    false
  );
  callbacks.updateRouteBuilderUI?.();
  callbacks.calculateRoute?.(true);
  callbacks.updateGmapsButtonState?.();
  callbacks.updatePoiVisibilityButtonUI?.();
}

/**
 * Handles waypoint actions (remove, move up, move down)
 */
export function handleWaypointAction(event: MouseEvent): void {
  const button = (event.target as HTMLElement).closest('button');
  if (!button) return;

  const controlsDiv = button.closest('.waypoint-controls') as HTMLElement | null;
  if (!controlsDiv) return;

  const index = parseInt(controlsDiv.dataset.index || '0', 10);

  if (button.classList.contains('remove-waypoint-btn')) {
    state.routeWaypoints.splice(index, 1);
  } else if (button.classList.contains('move-waypoint-up-btn') && index > 0) {
    [state.routeWaypoints[index], state.routeWaypoints[index - 1]] = [
      state.routeWaypoints[index - 1],
      state.routeWaypoints[index],
    ];
  } else if (
    button.classList.contains('move-waypoint-down-btn') &&
    index < state.routeWaypoints.length - 1
  ) {
    [state.routeWaypoints[index], state.routeWaypoints[index + 1]] = [
      state.routeWaypoints[index + 1],
      state.routeWaypoints[index],
    ];
  }

  // After removing a point, check if we need to clear the whole route state
  if (state.routeWaypoints.length < MIN_WAYPOINTS_FOR_ROUTE) {
    clearAllWaypoints();
  } else {
    callbacks.updateRouteBuilderUI?.();
    callbacks.calculateRoute?.(false); // do NOT optimize on manual up/down/remove
    callbacks.updateGmapsButtonState?.();
    callbacks.updatePoiVisibilityButtonUI?.();
  }
}

/**
 * Clears all waypoints except start and destination
 */
export function clearAllWaypoints(): void {
  // Only clear station waypoints, keep start and destination
  const startWp = state.routeWaypoints.find(wp => wp.type === 'start');
  const destWp = state.routeWaypoints.find(wp => wp.type === 'destination');

  // Clear only station waypoints
  state.routeWaypoints = [];
  if (startWp) state.routeWaypoints.push(startWp);
  if (destWp) state.routeWaypoints.push(destWp);

  // Clear waypoint markers (station markers in route)
  state.routeWaypointMarkers.forEach(marker => (marker.map = null));
  state.routeWaypointMarkers = [];

  // Clear route display
  if (state.directionsRenderer) {
    state.directionsRenderer.setDirections({
      routes: [],
      request: {} as google.maps.DirectionsRequest,
    } as google.maps.DirectionsResult);
  }
  state.isRouteActive = false;
  state.currentRoutePolylinePath = null;
  state.effectiveRoutePath = null;
  state.originalRouteDistance = null;
  state.originalRouteDuration = null;

  callbacks.resetOffsets?.();
  callbacks.clearRouteDisplay?.();

  // Reset POI visibility
  state.arePoisVisible = true;

  // Update UI
  callbacks.updateRouteBuilderUI?.();
  callbacks.updateOffsetControlsVisibility?.();
  callbacks.updatePoiVisibilityButtonUI?.();
  callbacks.updateGmapsButtonState?.();

  // Recalculate route if we have both start and destination
  if (startWp && destWp) {
    callbacks.calculateRoute?.(false);
  }

  callbacks.showTemporaryMessage?.(
    callbacks.translate?.('messageRoutePlanCleared') ?? 'messageRoutePlanCleared',
    false
  );
}

/**
 * Gets start waypoint
 */
export function getStartWaypoint(): Waypoint | undefined {
  return state.routeWaypoints.find(wp => wp.type === 'start');
}

/**
 * Gets destination waypoint
 */
export function getDestinationWaypoint(): Waypoint | undefined {
  return state.routeWaypoints.find(wp => wp.type === 'destination');
}
