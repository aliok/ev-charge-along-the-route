import { isValidNumber, isNonNegativeNumber } from './validation-utils.js';
import { createLogger } from './logger.js';

const logger = createLogger('ui');

// Turkey bounding box constants
const TURKEY_MIN_LAT = 35.5;
const TURKEY_MAX_LAT = 42.5;
const TURKEY_MIN_LNG = 25.5;
const TURKEY_MAX_LNG = 45.0;

/**
 * Checks if a given latitude and longitude fall within a bounding box for Turkey.
 * @param lat - The latitude.
 * @param lng - The longitude.
 * @returns True if the coordinates are within the box.
 */
function isLatLngInTurkeyBox(lat: number, lng: number): boolean {
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return false;
  }
  return (
    lat >= TURKEY_MIN_LAT && lat <= TURKEY_MAX_LAT && lng >= TURKEY_MIN_LNG && lng <= TURKEY_MAX_LNG
  );
}

/**
 * Checks if a Google Maps Place object is likely in Turkey, using either
 * its address components or a fallback to a bounding box check.
 * @param place - The place to check.
 * @returns True if the place is determined to be in Turkey.
 */
type PlaceLike =
  | google.maps.places.PlaceResult
  | {
      geometry?: { location?: google.maps.LatLng | google.maps.LatLngLiteral };
      address_components?: google.maps.GeocoderAddressComponent[];
    };

/**
 * Extracts latitude and longitude from a location object.
 */
function extractLatLng(
  location: google.maps.LatLng | google.maps.LatLngLiteral
): { lat: number; lng: number } | null {
  if (location instanceof google.maps.LatLng) {
    return { lat: location.lat(), lng: location.lng() };
  }
  if (typeof location.lat === 'number' && typeof location.lng === 'number') {
    return { lat: location.lat, lng: location.lng };
  }
  return null;
}

export function isPlaceInTurkey(place: PlaceLike): boolean {
  // First, try to find the country from address components
  if (place.address_components) {
    const isInTurkey = place.address_components.some(
      component => component.types.includes('country') && component.short_name === 'TR'
    );
    if (isInTurkey) return true;
  }

  // As a fallback, check the geometry against a bounding box
  const location = place.geometry?.location;
  if (location) {
    const coords = extractLatLng(location);
    if (coords) {
      return isLatLngInTurkeyBox(coords.lat, coords.lng);
    }
  }

  logger.warn('Cannot determine country for place, assuming not in Turkey:', place);
  return false;
}

/**
 * Formats a distance in meters into a human-readable string (e.g., "12.3 km" or "500 m").
 * @param meters - The distance in meters.
 * @param translate - The translation function to get units (e.g., 'km').
 * @returns The formatted distance string.
 */
const METERS_PER_KILOMETER = 1000;
const DISTANCE_DECIMAL_PLACES = 1;

export function formatDistance(
  meters: number | null | undefined,
  translate: (key: string) => string
): string {
  if (!isValidNumber(meters)) {
    return translate('iwNA');
  }

  // Validate for negative numbers
  if (!isNonNegativeNumber(meters)) {
    logger.warn(`Negative distance value: ${meters}`);
    return translate('iwNA');
  }

  const unit = translate('unitKm');
  if (meters >= METERS_PER_KILOMETER) {
    return `${(meters / METERS_PER_KILOMETER).toFixed(DISTANCE_DECIMAL_PLACES)} ${unit}`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Formats a duration in seconds into a human-readable string (e.g., "1h 15m" or "25m").
 * @param seconds - The duration in seconds.
 * @param translate - The translation function to get units (e.g., 'h', 'm').
 * @returns The formatted duration string.
 */
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

export function formatDuration(
  seconds: number | null | undefined,
  translate: (key: string) => string
): string {
  if (!isValidNumber(seconds)) {
    return translate('iwNA');
  }

  // Validate for negative numbers
  if (!isNonNegativeNumber(seconds)) {
    logger.warn(`Negative duration value: ${seconds}`);
    return translate('iwNA');
  }

  const totalMinutes = Math.round(seconds / SECONDS_PER_MINUTE);
  const minUnit = translate('unitMinuteShort');
  const hrUnit = translate('unitHourShort');

  if (totalMinutes < 1) {
    return `< 1 ${minUnit}`;
  }

  if (totalMinutes < MINUTES_PER_HOUR) {
    return `${totalMinutes} ${minUnit}`;
  }

  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;

  if (minutes === 0) {
    return `${hours} ${hrUnit}`;
  }

  return `${hours} ${hrUnit} ${minutes} ${minUnit}`;
}

/**
 * Constructs a Google S2 favicon service URL from a given report URL.
 * @param reportUrl - The URL of the station's operator/website.
 * @returns The favicon URL or null if the input is invalid.
 */
const HTTP_PROTOCOL = 'http:';
const HTTPS_PROTOCOL = 'https:';
const URL_PROTOCOL_REGEX = /^https?:\/\//i;
const FAVICON_SERVICE_URL = 'https://www.google.com/s2/favicons';
const FAVICON_SIZE = 256;

export function getFaviconUrlFromReportUrl(reportUrl: string | null | undefined): string | null {
  if (!reportUrl?.trim()) {
    return null;
  }

  try {
    const fullUrl = URL_PROTOCOL_REGEX.test(reportUrl) ? reportUrl : `http://${reportUrl}`;
    const url = new URL(fullUrl);

    if ((url.protocol !== HTTP_PROTOCOL && url.protocol !== HTTPS_PROTOCOL) || !url.hostname) {
      logger.warn(`Invalid reportUrl: ${reportUrl}`);
      return null;
    }

    return `${FAVICON_SERVICE_URL}?sz=${FAVICON_SIZE}&domain_url=${encodeURIComponent(url.hostname)}`;
  } catch (error) {
    logger.warn(`Could not parse reportUrl: ${reportUrl}`, error);
    return null;
  }
}

const MESSAGE_BOX_ID = 'message-box';
const ERROR_COLOR = 'rgba(239, 68, 68, 0.9)';
const INFO_COLOR = 'rgba(59, 130, 246, 0.9)';
const ERROR_DISPLAY_TIME_MS = 5000;
const INFO_DISPLAY_TIME_MS = 3000;

/**
 * Displays a temporary message box on the screen.
 * @param text - The message to display.
 * @param isError - If true, the message will be styled as an error.
 */
export function showTemporaryMessage(text: string, isError: boolean = false): void {
  const messageBox = document.getElementById(MESSAGE_BOX_ID);
  if (!messageBox) return;

  messageBox.style.pointerEvents = 'auto';
  messageBox.textContent = text;
  messageBox.style.backgroundColor = isError ? ERROR_COLOR : INFO_COLOR;
  messageBox.style.display = 'block';

  const displayTime = isError ? ERROR_DISPLAY_TIME_MS : INFO_DISPLAY_TIME_MS;

  setTimeout(() => {
    // Only hide if the content hasn't been replaced by a newer message
    if (messageBox.textContent === text) {
      messageBox.style.display = 'none';
      messageBox.style.pointerEvents = 'none';
    }
  }, displayTime);
}
