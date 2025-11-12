import {
    SHORT_URL_RESOLVER_PROXY_TEMPLATE
} from './config.js';
import {
    isPlaceInTurkey
} from './utils.js';
import { getParsedTypeTranslationKey } from './i18n.js';
import { TranslationParams, LocationType } from './types.js';

// Constants for parsed location types
const PARSED_TYPE_COORDINATES = 'Coordinates';
const PARSED_TYPE_PLACE_ID = 'Place ID';
const PARSED_TYPE_MAP_CLICK = 'Map Click';
const PARSED_TYPE_FEATURE_CLICK = 'Feature Click';
const PARSED_TYPE_CURRENT_LOCATION = 'Current Location';
const PARSED_TYPE_SEARCH_TERM = 'Search Term';
const PARSED_TYPE_ADDRESS_NAME = 'Address/Name';
const PARSED_TYPE_PLUS_CODE = 'Plus Code';
const PARSED_TYPE_UNKNOWN = 'Unknown';

// Regex patterns for parsing location input
const COORD_REGEX = /^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/;
const GOOGL_REGEX = /https?:\/\/goo\.gl\/maps\//i;
const MAPS_APP_REGEX = /https?:\/\/maps\.app\.goo\.gl\//i;
const PLACE_ID_REGEX = /^(ChIJ|GhIJ)[A-Za-z0-9_-]+$/;
const PLUS_CODE_REGEX = /^[A-Z0-9]{2,}\+[A-Z0-9]+(?:[,\s]+.*)?$/i;
const PLACE_PATH_REGEX = /^\/maps\/place\/([^/@]+)/;
const SEARCH_PATH_REGEX = /^\/maps\/search\/([^/]+)/;
const DATA_COORDS_REGEX = /\/data=(?:[^!]*!)?3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/;
const COORDS_PATH_REGEX = /@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/;

// Coordinate validation constants
const MIN_LAT = -90;
const MAX_LAT = 90;
const MIN_LNG = -180;
const MAX_LNG = 180;

// Geolocation options
const GEOLOCATION_OPTIONS: PositionOptions = {
    timeout: 10000,
    enableHighAccuracy: true
};

// Google Maps URL prefix for validation
const GOOGLE_MAPS_URL_PREFIX = 'https://www.google.com/maps/';

// Place ID prefixes
const PLACE_ID_PREFIXES = ['ChIJ', 'GhIJ'] as const;

// Invalid characters for address parsing
const INVALID_ADDRESS_CHARS = ["'", '"', '°'] as const;

// Type helpers
type ExactLocation = { lat: number; lng: number };

interface ShortUrlResponse {
    redirectedUrl?: string;
}

interface ExtendedMapMouseEvent extends google.maps.MapMouseEvent {
    placeId?: string;
}

interface ExtendedWindow extends Window {
    clipboardData?: DataTransfer;
}

interface LocationServiceDependencies {
    geocoder: google.maps.Geocoder;
    translate: (key: string, params?: TranslationParams) => string;
    showTemporaryMessage: (text: string, isError?: boolean) => void;
    onLocationSet: (data: { type: LocationType; location: google.maps.LatLng; displayName: string; markerTitle: string }) => void;
    ui: {
        startInput: HTMLInputElement;
        endInput: HTMLInputElement;
    };
    services: {
        autocompleteStart: google.maps.places.Autocomplete | null;
        autocompleteEnd: google.maps.places.Autocomplete | null;
    };
}

/**
 * Handles all location-related logic, including user input, pasting,
 * geocoding, and map clicks.
 */
export class LocationService {
    private readonly geocoder: google.maps.Geocoder;
    private readonly translate: (key: string, params?: TranslationParams) => string;
    private readonly showTemporaryMessage: (text: string, isError?: boolean) => void;
    private readonly onLocationSet: (data: { type: LocationType; location: google.maps.LatLng; displayName: string; markerTitle: string }) => void;
    private readonly ui: {
        startInput: HTMLInputElement;
        endInput: HTMLInputElement;
    };
    private readonly services: {
        autocompleteStart: google.maps.places.Autocomplete | null;
        autocompleteEnd: google.maps.places.Autocomplete | null;
    };

    constructor(deps: LocationServiceDependencies) {
        this.geocoder = deps.geocoder;
        this.translate = deps.translate;
        this.showTemporaryMessage = deps.showTemporaryMessage;
        this.onLocationSet = deps.onLocationSet;
        this.ui = deps.ui;
        this.services = deps.services;
    }

    /**
     * Converts a PlaceResult to a GeocoderResult format.
     */
    private _placeResultToGeocoderResult(place: google.maps.places.PlaceResult): google.maps.GeocoderResult {
        return {
            address_components: place.address_components ?? [],
            formatted_address: place.formatted_address ?? '',
            geometry: {
                ...place.geometry,
                location_type: google.maps.GeocoderLocationType.ROOFTOP
            } as google.maps.GeocoderGeometry,
            place_id: place.place_id ?? '',
            types: place.types ?? []
        };
    }

    /**
     * Handles the 'place_changed' event from a Google Maps Autocomplete instance.
     * @param type - 'start' or 'end'.
     * @returns The event handler function.
     */
    onPlaceChanged(type: LocationType): () => void {
        return () => {
            const autocomplete = type === 'start' ? this.services.autocompleteStart : this.services.autocompleteEnd;
            if (!autocomplete) return;
            
            const place = autocomplete.getPlace();
            if (!place.geometry?.location) {
                this.showTemporaryMessage(this.translate('messageInvalidLocation'), true);
                return;
            }
            
            // Treat autocomplete result as a feature click for translation purposes
            const geocoderResult = this._placeResultToGeocoderResult(place);
            this._handleParsedLocationResult(type, [geocoderResult], google.maps.GeocoderStatus.OK, PARSED_TYPE_FEATURE_CLICK);
        };
    }

    /**
     * Handles a click on a paste button, reading from the clipboard.
     * @param type - 'start' or 'end'.
     */
    async handlePasteButtonClick(type: LocationType): Promise<void> {
        const inputElement = this._getInputElement(type);
        if (!navigator.clipboard?.readText) {
            this.showTemporaryMessage(this.translate('messageClipboardUnsupported'), true);
            inputElement.focus();
            return;
        }
        try {
            const text = await navigator.clipboard.readText();
            if (text.trim()) {
                console.log(`Pasted via button (${type}):`, text.slice(0, 100));
                this._processPastedLocation(text, type);
            } else {
                this.showTemporaryMessage(this.translate('messageClipboardEmpty'), false);
            }
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            this.showTemporaryMessage(this.translate('messageClipboardError'), true);
            inputElement.focus();
        }
    }

    /**
     * Handles a direct paste event into an input field.
     * @param event - The paste event.
     * @param type - 'start' or 'end'.
     */
    handleDirectPaste(event: ClipboardEvent, type: LocationType): void {
        event.preventDefault();
        const pastedText = event.clipboardData?.getData('text') || 
            (window as ExtendedWindow).clipboardData?.getData('text');
        if (pastedText?.trim()) {
            console.log(`Pasted directly (${type}):`, pastedText.slice(0, 100));
            this._processPastedLocation(pastedText, type);
        } else {
            console.log("Paste event detected, but no text data found.");
        }
    }

    /**
     * Handles a click on the "Use Current Location" button.
     * @param type - 'start' or 'end'.
     */
    handleUseCurrentLocationClick(type: LocationType): void {
        console.log(`Use current location clicked for: ${type}`);
        if (!navigator.geolocation) {
            this.showTemporaryMessage(this.translate('messageGeoNotSupported'), true);
            return;
        }

        this.showTemporaryMessage(this.translate('messageGettingLocation'), false);
        const inputElement = this._getInputElement(type);
        inputElement.classList.add('input-loading');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                inputElement.classList.remove('input-loading');
                const exactCoords: ExactLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log("Geolocation success:", exactCoords);
                this._geocodeAndSetLocation(type, {
                    location: exactCoords
                }, PARSED_TYPE_CURRENT_LOCATION, exactCoords);
            },
            (error) => {
                inputElement.classList.remove('input-loading');
                console.error("Geolocation error:", error);
                const messageKey = this._getGeolocationErrorKey(error);
                this.showTemporaryMessage(this.translate(messageKey), true);
            },
            GEOLOCATION_OPTIONS
        );
    }

    /**
     * Handles a click on the map to set a start or end point.
     * @param event - The map click event
     * @param hasStartPoint - Whether a start point is already set.
     */
    handleMapClick(event: google.maps.MapMouseEvent, hasStartPoint: boolean): void {
        const clickedLatLng = event.latLng;
        const placeId = (event as ExtendedMapMouseEvent).placeId;
        const targetType: LocationType = hasStartPoint ? 'end' : 'start';

        if (placeId) {
            console.log("Clicked on Google feature:", placeId);
            this._geocodeAndSetLocation(targetType, {
                placeId: placeId
            }, PARSED_TYPE_FEATURE_CLICK);
        } else if (clickedLatLng) {
            console.log("Clicked on base map:", clickedLatLng.toString());
            this._geocodeAndSetLocation(targetType, {
                location: clickedLatLng
            }, PARSED_TYPE_MAP_CLICK, {
                lat: clickedLatLng.lat(),
                lng: clickedLatLng.lng()
            });
        }
    }


    /**
     * Helper to get the input element for a given location type.
     */
    private _getInputElement(type: LocationType): HTMLInputElement {
        return type === 'start' ? this.ui.startInput : this.ui.endInput;
    }

    /**
     * Gets the appropriate error message key for geolocation errors.
     */
    private _getGeolocationErrorKey(error: GeolocationPositionError): string {
        switch (error.code) {
            case GeolocationPositionError.PERMISSION_DENIED:
                return 'messageGeoPermissionDenied';
            case GeolocationPositionError.POSITION_UNAVAILABLE:
                return 'messageGeoUnavailable';
            case GeolocationPositionError.TIMEOUT:
                return 'messageGeoTimeout';
            default:
                return 'messageCurrentLocationError';
        }
    }

    /**
     * Validates if coordinates are within valid ranges.
     */
    private _isValidCoordinate(lat: number, lng: number): boolean {
        return lat >= MIN_LAT && lat <= MAX_LAT && lng >= MIN_LNG && lng <= MAX_LNG;
    }

    /**
     * Checks if a string is a valid Google Place ID.
     */
    private _isValidPlaceId(placeId: string): boolean {
        return PLACE_ID_PREFIXES.some(prefix => placeId.startsWith(prefix));
    }

    /**
     * Converts a geocoded location to a LatLng object.
     */
    private _toLatLng(location: google.maps.LatLng | google.maps.LatLngLiteral): google.maps.LatLng {
        if (location instanceof google.maps.LatLng) {
            return location;
        }
        const literal = location as google.maps.LatLngLiteral;
        return new google.maps.LatLng(literal.lat, literal.lng);
    }

    private _geocodeAndSetLocation(
        type: LocationType,
        request: google.maps.GeocoderRequest,
        parsedType: string,
        exactLocation: ExactLocation | null = null
    ): void {
        console.log(`Geocoding request (${type}, parsed as ${parsedType}, exact: ${!!exactLocation}):`, request);
        this.showTemporaryMessage(this.translate('messageProcessingLocation', {
            parsedType
        }), false);

        this.geocoder.geocode(request, (results, status) => {
            this._handleParsedLocationResult(type, results ?? [], status, parsedType, exactLocation);
        });
    }

    /**
     * Determines display name and marker title based on location type and exact coordinates.
     */
    private _getDisplayNameAndTitle(
        parsedType: string,
        exactLocation: ExactLocation | null,
        _finalLocationLatLng: google.maps.LatLng,
        formattedAddress: string
    ): { displayName: string; markerTitle: string } {
        if (exactLocation && parsedType !== PARSED_TYPE_CURRENT_LOCATION) {
            return {
                displayName: `Lat: ${exactLocation.lat.toFixed(5)}, Lng: ${exactLocation.lng.toFixed(5)}`,
                markerTitle: formattedAddress || this.translate(getParsedTypeTranslationKey(parsedType))
            };
        }
        
        if (parsedType === PARSED_TYPE_CURRENT_LOCATION) {
            const currentLocationText = this.translate('locationTypeCurrentLocation');
            return {
                displayName: currentLocationText,
                markerTitle: formattedAddress || currentLocationText
            };
        }
        
        const displayName = formattedAddress || this.translate(getParsedTypeTranslationKey(parsedType));
        return {
            displayName,
            markerTitle: displayName
        };
    }

    private _handleParsedLocationResult(
        type: LocationType,
        results: google.maps.GeocoderResult[],
        status: google.maps.GeocoderStatus,
        parsedType: string = PARSED_TYPE_UNKNOWN,
        exactLocation: ExactLocation | null = null
    ): void {
        if (status !== google.maps.GeocoderStatus.OK || !results?.[0]) {
            console.error(`Geocoding failed for ${type} (${parsedType}). Status: ${status}`);
            const errorMsgKey = status === google.maps.GeocoderStatus.ZERO_RESULTS
                ? 'messagePastedNoResults'
                : 'messagePastedError';
            this.showTemporaryMessage(this.translate(errorMsgKey, {
                parsedType
            }), true);
            return;
        }

        const place = results[0];
        const geocodedLocation = place.geometry?.location;
        if (!geocodedLocation) {
            this.showTemporaryMessage(this.translate('messagePastedError'), true);
            return;
        }

        const finalLocationLatLng = exactLocation
            ? new google.maps.LatLng(exactLocation.lat, exactLocation.lng)
            : this._toLatLng(geocodedLocation);

        const placeForTurkeyCheck = {
            geometry: {
                location: finalLocationLatLng
            },
            address_components: place.address_components
        };

        if (!isPlaceInTurkey(placeForTurkeyCheck)) {
            this.showTemporaryMessage(this.translate('messageNotInTurkey', {
                parsedType
            }), true);
            return;
        }

        const { displayName, markerTitle } = this._getDisplayNameAndTitle(
            parsedType,
            exactLocation,
            finalLocationLatLng,
            place.formatted_address || ''
        );

        this.showTemporaryMessage(this.translate('messageSetLocation', {
            type,
            parsedType
        }), false);

        this.onLocationSet({
            type,
            location: finalLocationLatLng,
            displayName,
            markerTitle
        });
    }


    /**
     * Extracts HTTP status code from error message if present.
     */
    private _extractStatusCode(message: string): string | undefined {
        const match = message.match(/status\s+(\d+)/i);
        return match?.[1];
    }

    /**
     * Gets the appropriate error message key for short URL resolution errors.
     */
    private _getShortUrlErrorKey(error: unknown): { key: string; params: Record<string, string> } {
        const params: Record<string, string> = {};
        
        if (error instanceof SyntaxError) {
            return { key: 'messageResolveProxyFormatError', params };
        }
        
        if (error instanceof Error) {
            const statusCode = this._extractStatusCode(error.message);
            if (statusCode === '404') {
                return { key: 'messageResolveProxyNotFoundError', params };
            }
            if (statusCode) {
                params.status = statusCode;
                return { key: 'messageResolveProxyStatusError', params };
            }
            if (error.message.includes('invalid or empty response')) {
                return { key: 'messageResolveProxyResponseError', params };
            }
        }
        
        return { key: 'messageResolveShortUrlError', params };
    }

    private async _resolveShortUrl(shortUrl: string, type: LocationType): Promise<void> {
        const proxyUrl = SHORT_URL_RESOLVER_PROXY_TEMPLATE.replace('{encoded_url}', encodeURIComponent(shortUrl));
        const inputElement = this._getInputElement(type);
        console.log(`Calling proxy to resolve short URL: ${proxyUrl}`);
        
        inputElement.classList.add('input-loading');
        inputElement.disabled = true;
        
        try {
            const response = await fetch(proxyUrl, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Proxy request failed with status ${response.status}`);
            }
            
            const responseData = await response.json() as ShortUrlResponse;
            const resolvedUrl = responseData?.redirectedUrl;
            
            if (resolvedUrl?.trim() && resolvedUrl.startsWith(GOOGLE_MAPS_URL_PREFIX)) {
                this._processPastedLocation(resolvedUrl, type, true);
            } else {
                throw new Error(`Proxy returned invalid or empty response: ${JSON.stringify(responseData)}`);
            }
        } catch (error) {
            console.error("Error resolving short URL via proxy:", error);
            const { key, params } = this._getShortUrlErrorKey(error);
            this.showTemporaryMessage(this.translate(key, params), true);
        } finally {
            inputElement.classList.remove('input-loading');
            inputElement.disabled = false;
        }
    }


    /**
     * Parses coordinates from a string and returns a geocode request if valid.
     */
    private _parseCoordinates(text: string): { request: google.maps.GeocoderRequest; exactLocation: ExactLocation } | null {
        const coordMatch = text.match(COORD_REGEX);
        if (!coordMatch) return null;

        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        
        if (!this._isValidCoordinate(lat, lng)) return null;

        const exactLocation: ExactLocation = { lat, lng };
        return {
            request: { location: exactLocation },
            exactLocation
        };
    }

    /**
     * Parses a place ID from text.
     */
    private _parsePlaceId(text: string): google.maps.GeocoderRequest | null {
        if (!PLACE_ID_REGEX.test(text)) return null;
        return { placeId: text };
    }

    /**
     * Parses a plus code from text.
     */
    private _parsePlusCode(text: string): google.maps.GeocoderRequest | null {
        if (!text.includes('+') || !PLUS_CODE_REGEX.test(text)) return null;
        return {
            address: text,
            componentRestrictions: { country: 'TR' }
        };
    }

    /**
     * Parses URL query parameters for location data.
     */
    private _parseUrlQueryParams(searchParams: URLSearchParams): {
        request: google.maps.GeocoderRequest;
        parsedType: string;
        exactLocation?: ExactLocation;
    } | null {
        const queryParam = searchParams.get('q') || searchParams.get('query');
        if (!queryParam) return null;

        // Check for place_id in query
        if (queryParam.startsWith('place_id:')) {
            const placeId = queryParam.slice(9);
            if (this._isValidPlaceId(placeId)) {
                return {
                    request: { placeId },
                    parsedType: PARSED_TYPE_PLACE_ID
                };
            }
        }

        // Check for coordinates in query
        const coordResult = this._parseCoordinates(queryParam);
        if (coordResult) {
            return {
                request: coordResult.request,
                parsedType: PARSED_TYPE_COORDINATES,
                exactLocation: coordResult.exactLocation
            };
        }

        // Treat as search term
        return {
            request: {
                address: queryParam,
                componentRestrictions: { country: 'TR' }
            },
            parsedType: PARSED_TYPE_SEARCH_TERM
        };
    }

    /**
     * Parses URL pathname for location data.
     */
    private _parseUrlPathname(pathname: string, text: string): {
        request: google.maps.GeocoderRequest;
        parsedType: string;
        exactLocation?: ExactLocation;
    } | null {
        // Try place path
        const placeMatch = pathname.match(PLACE_PATH_REGEX);
        if (placeMatch?.[1]) {
            const placeIdentifier = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
            
            if (this._isValidPlaceId(placeIdentifier)) {
                return {
                    request: { placeId: placeIdentifier },
                    parsedType: PARSED_TYPE_PLACE_ID
                };
            }
            
            // Check if it's a valid address (not containing special characters)
            if (!INVALID_ADDRESS_CHARS.some(char => placeIdentifier.includes(char))) {
                return {
                    request: {
                        address: placeIdentifier,
                        componentRestrictions: { country: 'TR' }
                    },
                    parsedType: PARSED_TYPE_ADDRESS_NAME
                };
            }
        }

        // Try search path
        const searchMatch = pathname.match(SEARCH_PATH_REGEX);
        if (searchMatch?.[1]) {
            const searchTerm = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
            return {
                request: {
                    address: searchTerm,
                    componentRestrictions: { country: 'TR' }
                },
                parsedType: PARSED_TYPE_SEARCH_TERM
            };
        }

        // Try data parameter for coordinates
        const dataMatch = text.match(DATA_COORDS_REGEX);
        if (dataMatch && dataMatch.length >= 3) {
            const lat = parseFloat(dataMatch[1]);
            const lng = parseFloat(dataMatch[2]);
            if (this._isValidCoordinate(lat, lng)) {
                const exactLocation: ExactLocation = { lat, lng };
                return {
                    request: { location: exactLocation },
                    parsedType: PARSED_TYPE_COORDINATES,
                    exactLocation
                };
            }
        }

        // Try coordinates in pathname (@lat,lng)
        const coordsMatch = pathname.match(COORDS_PATH_REGEX);
        if (coordsMatch && coordsMatch.length >= 3) {
            const lat = parseFloat(coordsMatch[1]);
            const lng = parseFloat(coordsMatch[2]);
            if (this._isValidCoordinate(lat, lng)) {
                const exactLocation: ExactLocation = { lat, lng };
                return {
                    request: { location: exactLocation },
                    parsedType: PARSED_TYPE_COORDINATES,
                    exactLocation
                };
            }
        }

        return null;
    }

    /**
     * Processes pasted location text and attempts to geocode it.
     */
    private _processPastedLocation(text: string, type: LocationType, isResolved: boolean = false): void {
        text = text.trim();
        console.log(`Processing pasted text (isResolved=${isResolved}):`, text);

        // Handle short URLs if not already resolved
        if (!isResolved) {
            if (GOOGL_REGEX.test(text)) {
                this.showTemporaryMessage(this.translate('messageUseFullUrl'), true);
                return;
            }
            if (MAPS_APP_REGEX.test(text)) {
                this.showTemporaryMessage(this.translate('messageResolvingShortUrl'), false);
                this._resolveShortUrl(text, type);
                return;
            }
        }

        // Try parsing as coordinates first
        const coordResult = this._parseCoordinates(text);
        if (coordResult) {
            this._geocodeAndSetLocation(type, coordResult.request, PARSED_TYPE_COORDINATES, coordResult.exactLocation);
            return;
        }

        // Try parsing as URL
        try {
            if (text.includes('http:') || text.includes('https:')) {
                const url = new URL(text);
                
                // Try query parameters first
                const queryResult = this._parseUrlQueryParams(url.searchParams);
                if (queryResult) {
                    this._geocodeAndSetLocation(
                        type,
                        queryResult.request,
                        queryResult.parsedType,
                        queryResult.exactLocation || null
                    );
                    return;
                }

                // Try pathname
                const pathResult = this._parseUrlPathname(url.pathname, text);
                if (pathResult) {
                    this._geocodeAndSetLocation(
                        type,
                        pathResult.request,
                        pathResult.parsedType,
                        pathResult.exactLocation || null
                    );
                    return;
                }
            }
        } catch (e) {
            const error = e as Error;
            console.log("Could not parse as URL or error during URL processing, continuing checks:", error.message);
        }

        // Try parsing as place ID
        const placeIdRequest = this._parsePlaceId(text);
        if (placeIdRequest) {
            this._geocodeAndSetLocation(type, placeIdRequest, PARSED_TYPE_PLACE_ID);
            return;
        }

        // Try parsing as plus code
        const plusCodeRequest = this._parsePlusCode(text);
        if (plusCodeRequest) {
            this._geocodeAndSetLocation(type, plusCodeRequest, PARSED_TYPE_PLUS_CODE);
            return;
        }

        // Default to address/name search
        this._geocodeAndSetLocation(type, {
            address: text,
            componentRestrictions: { country: 'TR' }
        }, PARSED_TYPE_ADDRESS_NAME);
    }
}

