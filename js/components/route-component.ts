import { Waypoint } from '../state.js';

/**
 * Manages route state, waypoints, and offsets
 */
export class RouteComponent {
  // Route state
  public isRouteActive: boolean = false;
  public originalRouteDistance: number | null = null; // meters
  public originalRouteDuration: number | null = null; // seconds
  public startOffsetKm: number = 0;
  public endOffsetKm: number = 0;

  // Route paths
  public currentRoutePolylinePath: google.maps.LatLng[] | null = null;
  public effectiveRoutePath: google.maps.LatLng[] | null = null;

  // Legacy location tracking (for compatibility)
  public startLocation: google.maps.LatLng | null = null;
  public endLocation: google.maps.LatLng | null = null;

  // Waypoints
  public routeWaypoints: Waypoint[] = [];
  public routeWaypointMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

  private readonly onRouteChanged?: () => void;
  private readonly onEffectivePathChanged?: () => void;

  constructor(options?: { onRouteChanged?: () => void; onEffectivePathChanged?: () => void }) {
    this.onRouteChanged = options?.onRouteChanged;
    this.onEffectivePathChanged = options?.onEffectivePathChanged;
  }

  /**
   * Sets route data
   */
  setRoute(
    distance: number,
    duration: number,
    path: google.maps.LatLng[],
    startLocation: google.maps.LatLng,
    endLocation: google.maps.LatLng
  ): void {
    this.originalRouteDistance = distance;
    this.originalRouteDuration = duration;
    this.currentRoutePolylinePath = path;
    this.startLocation = startLocation;
    this.endLocation = endLocation;
    this.isRouteActive = true;

    if (this.onRouteChanged) {
      this.onRouteChanged();
    }
  }

  /**
   * Clears route data
   */
  clearRoute(): void {
    this.isRouteActive = false;
    this.originalRouteDistance = null;
    this.originalRouteDuration = null;
    this.currentRoutePolylinePath = null;
    this.effectiveRoutePath = null;
    this.startLocation = null;
    this.endLocation = null;
    this.resetOffsets();

    if (this.onRouteChanged) {
      this.onRouteChanged();
    }
  }

  /**
   * Resets offsets to zero
   */
  resetOffsets(): void {
    this.startOffsetKm = 0;
    this.endOffsetKm = 0;
    this.updateEffectivePath();
  }

  /**
   * Changes offset by the given amount
   */
  changeOffset(type: 'start' | 'dest', changeKm: number): boolean {
    if (!this.isRouteActive || !this.originalRouteDistance) {
      return false;
    }

    const originalRouteKm = this.originalRouteDistance / 1000;
    let newStartOffset = this.startOffsetKm;
    let newEndOffset = this.endOffsetKm;

    if (type === 'start') {
      newStartOffset = Math.max(0, this.startOffsetKm + changeKm);
    } else {
      newEndOffset = Math.max(0, this.endOffsetKm + changeKm);
    }

    if (newStartOffset + newEndOffset >= originalRouteKm) {
      return false; // Offsets would overlap
    }

    this.startOffsetKm = newStartOffset;
    this.endOffsetKm = newEndOffset;
    this.updateEffectivePath();
    return true;
  }

  /**
   * Updates the effective route path based on offsets
   */
  updateEffectivePath(): void {
    if (
      !this.isRouteActive ||
      !this.currentRoutePolylinePath ||
      this.currentRoutePolylinePath.length < 2 ||
      !this.originalRouteDistance ||
      !google.maps.geometry?.spherical
    ) {
      this.effectiveRoutePath = null;
      return;
    }

    const startOffsetMeters = this.startOffsetKm * 1000;
    const endOffsetMeters = this.endOffsetKm * 1000;

    if (startOffsetMeters === 0 && endOffsetMeters === 0) {
      this.effectiveRoutePath = this.currentRoutePolylinePath;
      if (this.onEffectivePathChanged) {
        this.onEffectivePathChanged();
      }
      return;
    }

    if (startOffsetMeters + endOffsetMeters >= this.originalRouteDistance) {
      this.effectiveRoutePath = [];
      if (this.onEffectivePathChanged) {
        this.onEffectivePathChanged();
      }
      return;
    }

    let accumulatedDistance = 0;
    let startIndex = 0;
    let endIndex = this.currentRoutePolylinePath.length - 1;

    // Find start index
    for (let i = 1; i < this.currentRoutePolylinePath.length; i++) {
      const segmentDistance = google.maps.geometry.spherical.computeDistanceBetween(
        this.currentRoutePolylinePath[i - 1],
        this.currentRoutePolylinePath[i]
      );
      if (accumulatedDistance + segmentDistance >= startOffsetMeters) {
        startIndex = i;
        break;
      }
      accumulatedDistance += segmentDistance;
    }

    // Find end index
    const targetEndDistance = this.originalRouteDistance - endOffsetMeters;
    accumulatedDistance = 0;
    endIndex = this.currentRoutePolylinePath.length - 1;
    for (let i = 1; i < this.currentRoutePolylinePath.length; i++) {
      const segmentDistance = google.maps.geometry.spherical.computeDistanceBetween(
        this.currentRoutePolylinePath[i - 1],
        this.currentRoutePolylinePath[i]
      );
      if (accumulatedDistance + segmentDistance >= targetEndDistance) {
        endIndex = i - 1;
        break;
      }
      accumulatedDistance += segmentDistance;
    }

    if (startIndex > endIndex) {
      this.effectiveRoutePath = [];
    } else {
      this.effectiveRoutePath = this.currentRoutePolylinePath.slice(startIndex, endIndex + 1);
    }

    if (this.onEffectivePathChanged) {
      this.onEffectivePathChanged();
    }
  }

  /**
   * Gets the path to use for filtering (effective path if offsets exist, otherwise current path)
   */
  getFilterPath(): google.maps.LatLng[] | null {
    if (this.startOffsetKm > 0 || this.endOffsetKm > 0) {
      return this.effectiveRoutePath;
    }
    return this.currentRoutePolylinePath;
  }
}
