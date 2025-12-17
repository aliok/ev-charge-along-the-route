/**
 * Geometry and location utility functions.
 */

// Constants for geometric calculations
const EARTH_RADIUS_METERS = 6371000;
const DEGREES_TO_RADIANS = Math.PI / 180;
const RIGHT_ANGLE_DEGREES = 90;
const STRAIGHT_ANGLE_DEGREES = 270;

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
 * Gets latitude value from LatLng or LatLngLiteral.
 * @param location - The location object
 * @returns The latitude value
 * @private
 */
function getLat(location: google.maps.LatLng | google.maps.LatLngLiteral): number {
  if (typeof (location as any).lat === 'function') {
    return (location as google.maps.LatLng).lat();
  }
  return (location as google.maps.LatLngLiteral).lat;
}

/**
 * Gets longitude value from LatLng or LatLngLiteral.
 * @param location - The location object
 * @returns The longitude value
 * @private
 */
function getLng(location: google.maps.LatLng | google.maps.LatLngLiteral): number {
  if (typeof (location as any).lng === 'function') {
    return (location as google.maps.LatLng).lng();
  }
  return (location as google.maps.LatLngLiteral).lng;
}

/**
 * Creates a Google Maps URL for given coordinates.
 * @param location - The location to create a link for
 * @returns A Google Maps URL that opens at the specified location
 * @example
 * const link = createGoogleMapsLink({ lat: 41.0082, lng: 28.9784 });
 * // Returns: "https://www.google.com/maps?q=41.0082,28.9784"
 */
export function createGoogleMapsLink(
  location: google.maps.LatLng | google.maps.LatLngLiteral
): string {
  const lat = getLat(location);
  const lng = getLng(location);
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Computes the minimum distance from a point to a polyline path.
 * Uses the cross-track distance formula for accurate great-circle distance calculations.
 *
 * @param point - The point to measure from
 * @param path - Array of points forming the polyline (must have at least 2 points)
 * @returns Distance in meters, or Infinity if path is invalid
 *
 * @example
 * const station = { lat: 41.0, lng: 29.0 };
 * const route = [
 *   new google.maps.LatLng(40.9, 28.9),
 *   new google.maps.LatLng(41.1, 29.1)
 * ];
 * const distance = computeDistanceToPath(station, route);
 * // Returns: distance in meters from station to nearest point on route
 *
 * @see https://en.wikipedia.org/wiki/Cross-track_distance
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
    const distanceToStart = google.maps.geometry.spherical.computeDistanceBetween(
      segmentStart,
      pointLatLng
    );
    const headingToPoint = google.maps.geometry.spherical.computeHeading(segmentStart, pointLatLng);
    const angle = Math.abs(heading - headingToPoint);

    let distanceToSegment: number;
    if (angle > RIGHT_ANGLE_DEGREES && angle < STRAIGHT_ANGLE_DEGREES) {
      distanceToSegment = distanceToStart;
    } else {
      const crossTrackDistance = Math.abs(
        Math.asin(
          Math.sin(distanceToStart / EARTH_RADIUS_METERS) * Math.sin(angle * DEGREES_TO_RADIANS)
        ) * EARTH_RADIUS_METERS
      );
      const distanceToEnd = google.maps.geometry.spherical.computeDistanceBetween(
        segmentEnd,
        pointLatLng
      );
      const segmentLength = google.maps.geometry.spherical.computeDistanceBetween(
        segmentStart,
        segmentEnd
      );

      if (
        Math.pow(distanceToEnd, 2) >
        Math.pow(segmentLength, 2) + Math.pow(crossTrackDistance, 2)
      ) {
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
 * @param km - Distance in kilometers
 * @returns Distance in meters
 * @example
 * kmToMeters(5) // Returns: 5000
 */
export function kmToMeters(km: number): number {
  return km * 1000;
}
