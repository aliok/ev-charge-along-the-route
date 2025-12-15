import { ExtendedMarker, DetourData } from '../state.js';
import { MAX_PRECALCULATE_DETOURS, DIRECTIONS_API_RETRY_DELAY } from '../config.js';
import type { RouteComponent } from './route-component.js';
import type { MarkerComponent } from './marker-component.js';
import { toLatLng } from '../geo-utils.js';
import { routePromise, withRetry } from '../async-utils.js';
import { createLogger } from '../logger.js';

const logger = createLogger('route');

/**
 * Manages detour calculations for charging stations
 */
export class DetourComponent {
    private readonly directionsService: google.maps.DirectionsService | null;
    private readonly routeComponent: RouteComponent;
    private readonly markerComponent: MarkerComponent;

    constructor(options: {
        directionsService: google.maps.DirectionsService | null;
        routeComponent: RouteComponent;
        markerComponent: MarkerComponent;
    }) {
        this.directionsService = options.directionsService;
        this.routeComponent = options.routeComponent;
        this.markerComponent = options.markerComponent;
    }

    /**
     * Calculates detour for a POI
     */
    async calculateDetourForPoi(
        _marker: ExtendedMarker,
        poiLocation: google.maps.LatLng | google.maps.LatLngLiteral,
        startLoc: google.maps.LatLng,
        endLoc: google.maps.LatLng,
        originalDist: number,
        originalDur: number
    ): Promise<DetourData> {
        if (!this.directionsService || !poiLocation || !startLoc || !endLoc || 
            !this.routeComponent.originalRouteDistance || !this.routeComponent.originalRouteDuration) {
            return { status: 'Error' };
        }

        const poiLatLng = toLatLng(poiLocation);
        const okStatus = google.maps.DirectionsStatus?.OK || 'OK';

        const requestAtoP: google.maps.DirectionsRequest = {
            origin: startLoc,
            destination: poiLatLng,
            travelMode: google.maps.TravelMode.DRIVING
        };
        const requestPtoB: google.maps.DirectionsRequest = {
            origin: poiLatLng,
            destination: endLoc,
            travelMode: google.maps.TravelMode.DRIVING
        };

        try {
            const result = await withRetry(
                async () => {
                    const [resAtoP, resPtoB] = await Promise.all([
                        routePromise(this.directionsService!, requestAtoP),
                        routePromise(this.directionsService!, requestPtoB)
                    ]);

                    if (resAtoP.status !== okStatus || resPtoB.status !== okStatus ||
                        !resAtoP.result?.routes?.[0]?.legs?.[0] || !resPtoB.result?.routes?.[0]?.legs?.[0]) {
                        throw new Error(`Detour calc failed. Statuses: A->P: ${resAtoP.status}, P->B: ${resPtoB.status}`);
                    }

                    const legAtoP = resAtoP.result.routes[0].legs[0];
                    const legPtoB = resPtoB.result.routes[0].legs[0];
                    const detourDist = (legAtoP.distance?.value || 0) + (legPtoB.distance?.value || 0);
                    const detourDur = (legAtoP.duration?.value || 0) + (legPtoB.duration?.value || 0);

                    return {
                        status: 'OK' as const,
                        extraDist: detourDist - originalDist,
                        extraTime: detourDur - originalDur,
                        distFromStart: legAtoP.distance?.value,
                        timeFromStart: legAtoP.duration?.value,
                        distToEnd: legPtoB.distance?.value,
                        timeToEnd: legPtoB.duration?.value
                    };
                },
                {
                    maxRetries: 2,
                    retryDelay: DIRECTIONS_API_RETRY_DELAY,
                    onRetry: (attempt, error) => {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        console.warn(`Detour calc attempt ${attempt} failed: ${errorMessage}`);
                    }
                }
            );
            return result;
        } catch {
            return { status: 'Error' };
        }
    }

    /**
     * Triggers pre-calculation of detours for visible POIs
     */
    triggerPrecalculation(
        updateMarkerDetourText: (marker: ExtendedMarker, data: DetourData | null) => void,
        fetchPoiDetails: (marker: ExtendedMarker, stationData: any, silent: boolean) => void
    ): void {
        if (!this.routeComponent.isRouteActive || 
            !this.routeComponent.startLocation || 
            !this.routeComponent.endLocation || 
            this.routeComponent.originalRouteDistance == null) {
            logger.debug("Skipping pre-calc: Route not active or missing data.");
            return;
        }

        const visibleCount = this.markerComponent.visiblePoiMarkers.size;
        const markersWithinLimit = visibleCount <= MAX_PRECALCULATE_DETOURS;
        
        logger.debug(`Pre-processing check. Visible POIs: ${visibleCount}. Limit: ${MAX_PRECALCULATE_DETOURS}. Enabled: ${markersWithinLimit}`);

        if (markersWithinLimit) {
            let detoursToCalcCount = 0;
            let socketsToFetchCount = 0;

            this.markerComponent.visiblePoiMarkers.forEach(marker => {
                if (!marker.liveSocketData && !marker.cachedInfoWindowContent && marker.poiData) {
                    socketsToFetchCount++;
                    fetchPoiDetails(marker, marker.poiData, true);
                }

                if (!marker.detourData && marker.position && 
                    this.routeComponent.originalRouteDistance !== null && 
                    this.routeComponent.originalRouteDuration !== null) {
                    detoursToCalcCount++;
                    marker.detourData = { status: 'Pending' };
                    updateMarkerDetourText(marker, null);

                    const poiPos = toLatLng(marker.position);

                    this.calculateDetourForPoi(
                        marker,
                        poiPos,
                        this.routeComponent.startLocation!,
                        this.routeComponent.endLocation!,
                        this.routeComponent.originalRouteDistance,
                        this.routeComponent.originalRouteDuration!
                    ).then(result => {
                        if (marker.map && marker.detourData?.status === 'Pending') {
                            marker.detourData = result;
                            updateMarkerDetourText(marker, result);
                        }
                    }).catch(error => {
                        console.error(`Error in detour pre-calc for POI ${marker.stationId}:`, error);
                        if (marker.map && marker.detourData?.status === 'Pending') {
                            marker.detourData = { status: 'Error' };
                            updateMarkerDetourText(marker, marker.detourData);
                        }
                    });
                } else {
                    if (marker.detourData?.status === 'Pending') {
                        updateMarkerDetourText(marker, null);
                    } else if (marker.detourData) {
                        updateMarkerDetourText(marker, marker.detourData);
                    }
                }
            });

            logger.debug(`Initiated socket pre-fetch for ${socketsToFetchCount}, detour pre-calc for ${detoursToCalcCount} POIs.`);
        } else {
            logger.debug(`More than ${MAX_PRECALCULATE_DETOURS} visible POIs. Skipping pre-calc.`);
            this.markerComponent.visiblePoiMarkers.forEach(marker => {
                if (marker.detourData?.status === 'Pending') {
                    marker.detourData = null;
                    updateMarkerDetourText(marker, null);
                }
            });
        }
    }
}

