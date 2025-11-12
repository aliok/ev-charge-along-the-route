/**
 * Geometry and location utility functions.
 */

/**
 * Converts any LatLng-like object to a google.maps.LatLng instance.
 * Handles both LatLng objects and LatLngLiteral objects.
 */
export function toLatLng(
    location: google.maps.LatLng | google.maps.LatLngLiteral | { lat: number; lng: number }
): google.maps.LatLng {
    if (location instanceof google.maps.LatLng) {
        return location;
    }
    
    // Handle LatLngLiteral or plain object
    const literal = location as { lat: number; lng: number };
    return new google.maps.LatLng(literal.lat, literal.lng);
}

/**
 * Gets lat value from LatLng or LatLngLiteral.
 */
function getLat(location: google.maps.LatLng | google.maps.LatLngLiteral): number {
    if (typeof (location as any).lat === 'function') {
        return (location as google.maps.LatLng).lat();
    }
    return (location as google.maps.LatLngLiteral).lat;
}

/**
 * Gets lng value from LatLng or LatLngLiteral.
 */
function getLng(location: google.maps.LatLng | google.maps.LatLngLiteral): number {
    if (typeof (location as any).lng === 'function') {
        return (location as google.maps.LatLng).lng();
    }
    return (location as google.maps.LatLngLiteral).lng;
}

/**
 * Creates a Google Maps link for given coordinates.
 */
export function createGoogleMapsLink(location: google.maps.LatLng | google.maps.LatLngLiteral): string {
    const lat = getLat(location);
    const lng = getLng(location);
    return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Calculates the minimum distance from a point to a route path.
 * Returns distance in meters.
 */
export function computeDistanceToPath(
    point: google.maps.LatLng | google.maps.LatLngLiteral,
    path: google.maps.LatLng[]
): number {
    if (!path || path.length < 2 || !google.maps.geometry?.spherical) {
        return Infinity;
    }
    
    const pointLatLng = toLatLng(point);
    let minDistance = Infinity;
    
    for (let i = 0; i < path.length - 1; i++) {
        const segmentStart = path[i];
        const segmentEnd = path[i + 1];
        
        const heading = google.maps.geometry.spherical.computeHeading(segmentStart, segmentEnd);
        const distanceToStart = google.maps.geometry.spherical.computeDistanceBetween(segmentStart, pointLatLng);
        const headingToPoint = google.maps.geometry.spherical.computeHeading(segmentStart, pointLatLng);
        const angle = Math.abs(heading - headingToPoint);
        
        let distanceToSegment: number;
        if (angle > 90 && angle < 270) {
            distanceToSegment = distanceToStart;
        } else {
            const crossTrackDistance = Math.abs(
                Math.asin(Math.sin(distanceToStart / 6371000) * Math.sin(angle * Math.PI / 180)) * 6371000
            );
            const distanceToEnd = google.maps.geometry.spherical.computeDistanceBetween(segmentEnd, pointLatLng);
            const segmentLength = google.maps.geometry.spherical.computeDistanceBetween(segmentStart, segmentEnd);
            
            if (Math.pow(distanceToEnd, 2) > Math.pow(segmentLength, 2) + Math.pow(crossTrackDistance, 2)) {
                distanceToSegment = distanceToEnd;
            } else {
                distanceToSegment = crossTrackDistance;
            }
        }
        
        minDistance = Math.min(minDistance, distanceToSegment);
    }
    
    return minDistance;
}

/**
 * Converts kilometers to meters.
 */
export function kmToMeters(km: number): number {
    return km * 1000;
}
