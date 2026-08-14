import { ExtendedMarker } from '../state.js';

const MAX_SPIDERFY_COUNT = 20;
const SPIDERFY_ZINDEX = 2000;

interface SpiderfyState {
  clusterMarker: google.maps.marker.AdvancedMarkerElement;
  originalPositions: Map<google.maps.marker.AdvancedMarkerElement, google.maps.LatLng | google.maps.LatLngLiteral | null>;
  markers: google.maps.marker.AdvancedMarkerElement[];
  mapClickListener: google.maps.MapsEventListener | null;
  collapseTimer: ReturnType<typeof setTimeout> | null;
  eventCleanups: (() => void)[];
}

/**
 * Manages all markers on the map
 */
export class MarkerComponent {
  public startMarker: ExtendedMarker | null = null;
  public endMarker: ExtendedMarker | null = null;
  public allPoiMarkers: ExtendedMarker[] = [];
  public visiblePoiMarkers: Map<string, ExtendedMarker> = new Map();
  public selectedPoiMarker: ExtendedMarker | null = null;
  public routeWaypointMarkers: ExtendedMarker[] = [];

  private readonly map: google.maps.Map | null;
  private clusterer: markerClusterer.MarkerClusterer | null = null;
  private spiderfyState: SpiderfyState | null = null;
  private clusterMarkerRegistry: Map<string, { cluster: markerClusterer.Cluster; marker: google.maps.marker.AdvancedMarkerElement }> = new Map();

  constructor(map: google.maps.Map | null) {
    this.map = map;
  }

  initClusterer(
    map: google.maps.Map,
    renderer: markerClusterer.Renderer,
    onClusterClick?: (event: google.maps.MapMouseEvent, cluster: markerClusterer.Cluster, map: google.maps.Map) => void
  ): void {
    this.clusterer = new markerClusterer.MarkerClusterer({
      map,
      markers: [],
      renderer,
      onClusterClick,
    });
  }

  registerClusterMarker(key: string, cluster: markerClusterer.Cluster, marker: google.maps.marker.AdvancedMarkerElement): void {
    this.clusterMarkerRegistry.set(key, { cluster, marker });
  }

  clearClusterRegistry(): void {
    this.clusterMarkerRegistry.clear();
  }

  getClusterMarkerByPosition(lat: number, lng: number): { cluster: markerClusterer.Cluster; marker: google.maps.marker.AdvancedMarkerElement } | undefined {
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    return this.clusterMarkerRegistry.get(key);
  }

  /**
   * Sets the start marker
   */
  setStartMarker(marker: ExtendedMarker | null): void {
    if (this.startMarker) {
      this.startMarker.map = null;
    }
    this.startMarker = marker;
    if (marker && this.map) {
      marker.map = this.map;
    }
  }

  /**
   * Sets the end marker
   */
  setEndMarker(marker: ExtendedMarker | null): void {
    if (this.endMarker) {
      this.endMarker.map = null;
    }
    this.endMarker = marker;
    if (marker && this.map) {
      marker.map = this.map;
    }
  }

  /**
   * Adds a POI marker
   */
  addPoiMarker(stationId: string, marker: ExtendedMarker): void {
    this.visiblePoiMarkers.set(stationId, marker);
    this.allPoiMarkers.push(marker);
    if (this.clusterer) {
      this.clusterer.addMarker(marker, true);
    } else if (this.map) {
      marker.map = this.map;
    }
  }

  /**
   * Removes a POI marker
   */
  removePoiMarker(stationId: string): void {
    const marker = this.visiblePoiMarkers.get(stationId);
    if (marker) {
      if (this.clusterer) {
        this.clusterer.removeMarker(marker, true);
      } else {
        marker.map = null;
      }
      this.visiblePoiMarkers.delete(stationId);
      const index = this.allPoiMarkers.indexOf(marker);
      if (index > -1) {
        this.allPoiMarkers.splice(index, 1);
      }
    }
  }

  /**
   * Sets the selected POI marker
   */
  setSelectedPoiMarker(marker: ExtendedMarker | null): void {
    this.selectedPoiMarker = marker;
  }

  /**
   * Gets a POI marker by station ID
   */
  getPoiMarker(stationId: string): ExtendedMarker | undefined {
    return this.visiblePoiMarkers.get(stationId);
  }

  /**
   * Adds a waypoint marker
   */
  addWaypointMarker(marker: ExtendedMarker): void {
    this.routeWaypointMarkers.push(marker);
    if (this.map) {
      marker.map = this.map;
    }
  }

  /**
   * Clears all waypoint markers
   */
  clearWaypointMarkers(): void {
    this.routeWaypointMarkers.forEach(marker => {
      marker.map = null;
    });
    this.routeWaypointMarkers = [];
  }

  /**
   * Hides all POI markers
   */
  hideAllPois(): void {
    if (this.clusterer) {
      this.clusterer.clearMarkers(true);
    } else {
      this.visiblePoiMarkers.forEach(marker => {
        marker.map = null;
      });
    }
  }

  /**
   * Shows all POI markers
   */
  showAllPois(): void {
    if (!this.map) {
      return;
    }
    if (this.clusterer) {
      this.clusterer.addMarkers(Array.from(this.visiblePoiMarkers.values()), true);
      this.clusterer.render();
    } else {
      this.visiblePoiMarkers.forEach(marker => {
        marker.map = this.map;
      });
    }
  }

  renderClusters(): void {
    if (this.clusterer) {
      this.clusterMarkerRegistry.clear();
      this.clusterer.render();
    }
  }

  // --- Spiderfy ---

  isSpiderfied(): boolean {
    return this.spiderfyState !== null;
  }

  canSpiderfy(cluster: markerClusterer.Cluster): boolean {
    return cluster.count <= MAX_SPIDERFY_COUNT;
  }

  spiderfy(cluster: markerClusterer.Cluster, clusterMarker: google.maps.marker.AdvancedMarkerElement): void {
    if (!this.map) return;
    this.unspiderfy();

    const markers = cluster.markers;
    const center = cluster.position;
    const zoom = this.map.getZoom() ?? 10;

    const radiusDeg = 0.3 / Math.pow(2, zoom - 5);
    const count = markers.length;

    const originalPositions = new Map<google.maps.marker.AdvancedMarkerElement, google.maps.LatLng | google.maps.LatLngLiteral | null>();
    const eventCleanups: (() => void)[] = [];

    // Place all markers at cluster center with scale(0), then animate outward
    markers.forEach((marker, i) => {
      originalPositions.set(marker, marker.position ?? null);
      marker.position = center;
      marker.zIndex = SPIDERFY_ZINDEX + i;
      marker.map = this.map;

      const content = marker.content as HTMLElement | null;
      if (content) {
        content.style.transition = 'none';
        content.style.transform = 'scale(0)';
        content.style.opacity = '0';
        // Force reflow so the browser paints scale(0) before we transition to scale(1)
        void content.offsetHeight;
      }
    });

    // Hide the cluster marker
    clusterMarker.map = null;

    // Animate to circle positions (double-rAF ensures initial styles are painted)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        markers.forEach((marker, i) => {
          const angle = (2 * Math.PI * i) / count;
          const offsetLat = center.lat() + radiusDeg * Math.cos(angle);
          const offsetLng = center.lng() + radiusDeg * Math.sin(angle);
          marker.position = { lat: offsetLat, lng: offsetLng };

          const content = marker.content as HTMLElement | null;
          if (content) {
            content.style.transition = 'transform 0.25s ease-out, opacity 0.2s ease-out';
            content.style.transform = 'scale(1)';
            content.style.opacity = '1';
          }
        });
      });
    });

    // Collapse when clicking the map (both desktop and mobile)
    const mapClickListener = this.map.addListener('click', () => {
      this.unspiderfy();
    });

    this.spiderfyState = {
      clusterMarker,
      originalPositions,
      markers,
      mapClickListener,
      collapseTimer: null,
      eventCleanups,
    };
  }

  unspiderfy(): void {
    if (!this.spiderfyState) return;
    const { clusterMarker, originalPositions, markers, mapClickListener, collapseTimer, eventCleanups } = this.spiderfyState;

    if (collapseTimer) clearTimeout(collapseTimer);
    eventCleanups.forEach(cleanup => cleanup());

    markers.forEach(marker => {
      const content = marker.content as HTMLElement | null;
      if (content) {
        content.style.transition = '';
        content.style.transform = '';
        content.style.opacity = '';
      }
      const origPos = originalPositions.get(marker);
      if (origPos) {
        marker.position = origPos;
      }
      marker.map = null;
    });

    if (mapClickListener) {
      google.maps.event.removeListener(mapClickListener);
    }

    clusterMarker.map = this.map;
    this.spiderfyState = null;
  }

  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Clears all markers
   */
  clearAll(): void {
    this.unspiderfy();
    if (this.startMarker) {
      this.startMarker.map = null;
      this.startMarker = null;
    }
    if (this.endMarker) {
      this.endMarker.map = null;
      this.endMarker = null;
    }
    this.hideAllPois();
    this.clearWaypointMarkers();
    this.selectedPoiMarker = null;
  }
}
