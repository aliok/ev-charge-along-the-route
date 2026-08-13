import { defaultCenter, defaultZoom, DEFAULT_MAP_TYPE_ID } from '../config.js';
import { getMapElement } from '../ui.js';
import { createLogger } from '../logger.js';

const logger = createLogger('map');

/**
 * Manages the Google Maps instance and related services
 */
export class MapComponent {
  public map: google.maps.Map | null = null;
  public directionsService: google.maps.DirectionsService | null = null;
  public directionsRenderer: google.maps.DirectionsRenderer | null = null;
  public geocoder: google.maps.Geocoder | null = null;
  public autocompleteStart: google.maps.places.Autocomplete | null = null;
  public autocompleteEnd: google.maps.places.Autocomplete | null = null;
  public infoWindow: google.maps.InfoWindow | null = null;

  private readonly onInfoWindowClose?: () => void;

  constructor(options?: { onInfoWindowClose?: () => void }) {
    this.onInfoWindowClose = options?.onInfoWindowClose;
  }

  /**
   * Initializes the map with the given center and zoom level
   */
  initialize(
    center: { lat: number; lng: number } = defaultCenter,
    zoom: number = defaultZoom
  ): void {
    const mapElement = getMapElement();
    if (!mapElement) {
      throw new Error('Map element not found');
    }

    try {
      this.map = new google.maps.Map(mapElement, {
        center,
        zoom,
        mapTypeId: DEFAULT_MAP_TYPE_ID,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        gestureHandling: 'greedy',
        mapId: '__GOOGLE_MAPS_MAP_ID__', // Injected from env during build
      });

      this.initializeServices();
    } catch (error) {
      console.error('Error creating map:', error);
      throw error;
    }
  }

  /**
   * Initializes map-related services
   */
  private initializeServices(): void {
    if (!this.map) {
      throw new Error('Map must be initialized before services');
    }

    try {
      this.directionsService = new google.maps.DirectionsService();
      this.directionsRenderer = new google.maps.DirectionsRenderer({
        map: this.map,
        suppressMarkers: true,
      });

      this.infoWindow = new google.maps.InfoWindow({
        maxWidth: 350,
        pixelOffset: new google.maps.Size(0, -90),
      });

      this.infoWindow.addListener('closeclick', () => {
        logger.debug('InfoWindow closeclick triggered.');
        if (this.map) {
          this.map.setOptions({ padding: { top: 0 } } as google.maps.MapOptions);
        }
        if (this.onInfoWindowClose) {
          this.onInfoWindowClose();
        }
      });

      this.geocoder = new google.maps.Geocoder();
      logger.debug('Map services initialized.');
    } catch (error) {
      console.error('Error initializing map services:', error);
      throw error;
    }
  }

  /**
   * Initializes autocomplete services for start and end inputs
   */
  initializeAutocomplete(
    startInput: HTMLInputElement,
    endInput: HTMLInputElement,
    onPlaceChanged: (_type: 'start' | 'end') => () => void
  ): void {
    if (!google.maps.places || !google.maps.places.Autocomplete) {
      console.warn('Places API not available');
      return;
    }

    const autocompleteOptions: google.maps.places.AutocompleteOptions = {
      fields: ['geometry', 'name', 'address_components', 'formatted_address'],
      componentRestrictions: {
        country: 'TR',
      },
      strictBounds: false,
    };

    if (startInput) {
      this.autocompleteStart = new google.maps.places.Autocomplete(startInput, autocompleteOptions);
      this.autocompleteStart.addListener('place_changed', onPlaceChanged('start'));
    }

    if (endInput) {
      this.autocompleteEnd = new google.maps.places.Autocomplete(endInput, autocompleteOptions);
      this.autocompleteEnd.addListener('place_changed', onPlaceChanged('end'));
    }
  }

  /**
   * Sets the map type
   */
  setMapType(mapTypeId: string): void {
    if (!this.map) {
      return;
    }
    const mapType =
      (google.maps.MapTypeId as any)[mapTypeId.toUpperCase()] || google.maps.MapTypeId.ROADMAP;
    this.map.setMapTypeId(mapType);
  }

  /**
   * Gets the current map type
   */
  getMapType(): string | null {
    if (!this.map) {
      return null;
    }
    return this.map.getMapTypeId() ?? null;
  }

  /**
   * Adds a click listener to the map
   */
  addClickListener(handler: (_event: google.maps.MapMouseEvent) => void): void {
    if (!this.map) {
      return;
    }
    this.map.addListener('click', handler);
  }

  /**
   * Cleans up resources
   */
  dispose(): void {
    if (this.infoWindow) {
      google.maps.event.clearInstanceListeners(this.infoWindow);
      this.infoWindow = null;
    }
    if (this.autocompleteStart) {
      google.maps.event.clearInstanceListeners(this.autocompleteStart);
      this.autocompleteStart = null;
    }
    if (this.autocompleteEnd) {
      google.maps.event.clearInstanceListeners(this.autocompleteEnd);
      this.autocompleteEnd = null;
    }
    if (this.map) {
      google.maps.event.clearInstanceListeners(this.map);
      this.map = null;
    }
    this.directionsService = null;
    this.directionsRenderer = null;
    this.geocoder = null;
  }
}
