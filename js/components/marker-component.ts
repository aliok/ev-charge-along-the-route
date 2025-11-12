import { ExtendedMarker } from '../state.js';

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

    constructor(map: google.maps.Map | null) {
        this.map = map;
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
        if (this.map) {
            marker.map = this.map;
        }
    }

    /**
     * Removes a POI marker
     */
    removePoiMarker(stationId: string): void {
        const marker = this.visiblePoiMarkers.get(stationId);
        if (marker) {
            marker.map = null;
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
        this.visiblePoiMarkers.forEach(marker => {
            marker.map = null;
        });
    }

    /**
     * Shows all POI markers
     */
    showAllPois(): void {
        if (!this.map) return;
        this.visiblePoiMarkers.forEach(marker => {
            marker.map = this.map;
        });
    }

    /**
     * Clears all markers
     */
    clearAll(): void {
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

