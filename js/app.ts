import {
  APP_VERSION,
  DEFAULT_MAP_TYPE_ID,
  defaultCenter,
  defaultZoom,
  OFFSET_INCREMENT_KM,
  userLocationZoom,
  GENERAL_SETTINGS_STORAGE_KEY,
  BRAND_PREFS_STORAGE_KEY,
  IGNORED_STATIONS_STORAGE_KEY,
  DEFAULT_DISTANCE_THRESHOLD,
  defaultFilters,
  STATIONS_JSON_PATH,
} from './config.js';

import { createLogger } from './logger.js';

const logger = createLogger('app');

import {
  applyTranslations,
  handleDocumentClickForDropdown,
  initLanguageUI,
  loadLanguage,
  setupLanguageDropdown,
  translate,
} from './i18n.js';

import { LocationService } from './location-service.js';

import {
  createMarkerForStation,
  fetchPoiDetails,
  resetSelectedMarkerZIndex,
  setupMarkerCallbacks,
  updateInfoWindowIfVisible,
  updateMarker,
  updateMarkerDetourText,
  initializeStationInfoPanel,
  closeStationInfoPanel,
} from './markers.js';

import {
  setupWaypointCallbacks,
  setStartWaypoint,
  setDestinationWaypoint,
  removeWaypoint,
  handleAddStationToRoute,
  handleWaypointAction,
  clearAllWaypoints,
  getStartWaypoint,
  getDestinationWaypoint,
} from './waypoints.js';

import {
  MapComponent,
  RouteComponent,
  FilterComponent,
  PreferencesComponent,
  MarkerComponent,
  DetourComponent,
  StationDataComponent,
} from './components/index.js';

import { StationData, ExtendedMarker } from './state.js';
import { BrandAction, LocationType } from './types.js';
import { showTemporaryMessage, isPlaceInTurkey } from './utils.js';
import { computeDistanceToPath, toLatLng, kmToMeters } from './geo-utils.js';
import { getStorageItem, setStorageItem } from './storage-utils.js';

import {
  brandFilterModeButton,
  brandListViewControls,
  clearEndBtn,
  clearStartBtn,
  clearWaypointsBtn,
  closeFilterButton,
  closeRouteBuilderBtn,
  distanceSlider,
  endInput,
  filterBrandListView,
  filterInputs,
  filterPanel,
  filterToggleButton,
  getUIElements,
  hamburgerButton,
  handleBrandListViewChange,
  handleDistanceChange,
  handleInputChange,
  handleMapTypeChange,
  handleResize,
  ignoredStationsListContainer,
  mapTypeButtons,
  offsetDestDecBtn,
  offsetDestIncBtn,
  offsetStartDecBtn,
  offsetStartIncBtn,
  openRouteInGmapsBtn,
  optimizeRouteBtn,
  pasteEndBtn,
  pasteStartBtn,
  populateBrandFilterList,
  populateIgnoredStationsList,
  resetFiltersButton,
  routeBuilderPanel,
  routeBuilderToggleButton,
  setupUICallbacks,
  startInput,
  showLoadingOverlay,
  hideLoadingOverlay,
  setUseLocationButtonsEnabled,
  setOptimizeRouteButtonEnabled,
  setInputDisabled,
  setInputPlaceholder,
  setInputValue,
  updateRouteSummary,
  clearRouteSummary,
  addVersionDisplay,
  toggleInputContainerVisibility,
  getLanguageUIElements,
  closeLanguageDropdown,
  toggleFilterPanel,
  togglePoiVisibility,
  togglePoiVisibilityBtn,
  toggleRouteBuilderPanel,
  updateBrandFilterModeButton,
  updateControlVisibility,
  updateDistanceSliderUI,
  updateFilterControlsUI,
  updateFilterIndicator,
  updateGmapsButtonState,
  updateLoadingProgress,
  updateMapTypeButtons,
  updateOffsetButtonStates,
  updateOffsetControlsVisibility,
  updateOffsetDisplay,
  updatePoiVisibilityButtonUI,
  updateRouteBuilderUI,
  useLocationEndBtn,
  useLocationStartBtn,
  validateUIElements,
  waypointsListContainer,
  hideAllPois,
} from './ui.js';

// Legacy state import - will be phased out as components take over
import state from './state.js';

/**
 * Main application class that orchestrates all components
 */
export class App {
  // Components
  public mapComponent: MapComponent;
  public routeComponent: RouteComponent;
  public filterComponent!: FilterComponent;
  public preferencesComponent: PreferencesComponent;
  public markerComponent!: MarkerComponent;
  public detourComponent!: DetourComponent;
  public stationDataComponent: StationDataComponent;

  // Services
  public locationService: LocationService | null = null;

  // Visibility state
  public arePoisVisible: boolean = true;

  constructor() {
    this.mapComponent = new MapComponent({
      onInfoWindowClose: () => this.onInfoWindowClose(),
    });

    this.routeComponent = new RouteComponent({
      onRouteChanged: () => this.onRouteChanged(),
      onEffectivePathChanged: () => this.onEffectivePathChanged(),
    });

    this.preferencesComponent = new PreferencesComponent();
    this.stationDataComponent = new StationDataComponent();
  }

  /**
   * Initializes the application
   */
  async initialize(): Promise<void> {
    logger.info('App.initialize called');

    this.initializeLanguage();

    if (!this.initializeUI()) {
      return;
    }

    this.setupCallbacks();

    if (!this.validateGoogleMaps()) {
      return;
    }

    this.prepareForMapLoad();
    this.loadSettings();
    this.initializeGeolocation();

    setupLanguageDropdown();
  }

  /**
   * Initializes language support
   */
  private initializeLanguage(): void {
    loadLanguage();

    const languageUI = getLanguageUIElements();
    initLanguageUI(
      languageUI.control,
      languageUI.selectorButton,
      languageUI.dropdown,
      languageUI.flagDisplay
    );
  }

  /**
   * Initializes UI elements and validates them
   * @returns true if initialization successful, false otherwise
   */
  private initializeUI(): boolean {
    getUIElements();

    if (!validateUIElements()) {
      logger.error('Required UI elements not found!');
      alert('Initialization Error: Missing UI elements.');
      return false;
    }

    return true;
  }

  /**
   * Validates Google Maps API availability
   * @returns true if Google Maps is available, false otherwise
   */
  private validateGoogleMaps(): boolean {
    if (
      typeof google === 'undefined' ||
      typeof google.maps === 'undefined' ||
      !google.maps.marker
    ) {
      logger.error('Google Maps API or Advanced Marker library not loaded!');
      showTemporaryMessage(translate('messageErrorGmapsLoad'), true);
      return false;
    }
    return true;
  }

  /**
   * Prepares UI for map loading
   */
  private prepareForMapLoad(): void {
    applyTranslations();
    showLoadingOverlay();
    updateLoadingProgress(0, 0);
  }

  /**
   * Initializes geolocation-based map centering
   */
  private initializeGeolocation(): void {
    if (navigator.geolocation) {
      console.log('Attempting geolocation...');
      navigator.geolocation.getCurrentPosition(
        pos => this.onGeolocationSuccess(pos),
        err => this.onGeolocationError(err),
        { timeout: 5000 }
      );
      setUseLocationButtonsEnabled(true);
    } else {
      console.log('Geolocation is not supported by this browser.');
      showTemporaryMessage(translate('messageGeoNotSupported'), false);
      setUseLocationButtonsEnabled(false);
      this.initializeMapAndServices(defaultCenter, defaultZoom);
    }
  }

  // ==================== State Synchronization ====================

  /**
   * Syncs component state to legacy global state
   * This is a temporary solution during the migration to component-based architecture
   */
  private syncLegacyState(): void {
    // Route state
    state.isRouteActive = this.routeComponent.isRouteActive;
    state.originalRouteDistance = this.routeComponent.originalRouteDistance;
    state.originalRouteDuration = this.routeComponent.originalRouteDuration;
    state.currentRoutePolylinePath = this.routeComponent.currentRoutePolylinePath;
    state.effectiveRoutePath = this.routeComponent.effectiveRoutePath;
    state.startOffsetKm = this.routeComponent.startOffsetKm;
    state.endOffsetKm = this.routeComponent.endOffsetKm;
    state.startLocation = this.routeComponent.startLocation;
    state.endLocation = this.routeComponent.endLocation;

    // Filter state
    if (this.filterComponent) {
      state.currentFilters = { ...this.filterComponent.currentFilters };
      state.distanceThresholdKm = this.filterComponent.distanceThresholdKm;
    }

    // Preferences state
    state.favoriteBrands = this.preferencesComponent.favoriteBrands;
    state.blacklistedBrands = this.preferencesComponent.blacklistedBrands;
    state.ignoredStationIds = this.preferencesComponent.ignoredStationIds;
    state.brandFilterMode = this.preferencesComponent.brandFilterMode;

    // Marker state
    if (this.markerComponent) {
      state.visiblePoiMarkers = this.markerComponent.visiblePoiMarkers;
    }

    // Station data
    state.allStationData = this.stationDataComponent.allStationData;
    state.allUniqueBrands = this.stationDataComponent.allUniqueBrands;
  }

  // ==================== Setup & Callbacks ====================

  /**
   * Sets up all callbacks between components
   */
  private setupCallbacks(): void {
    // UI callbacks
    setupUICallbacks({
      handleBrandPreferenceChange: (brand, action) =>
        this.handleBrandPreferenceChange(brand, action),
      saveSettings: () => this.saveSettings(),
    });

    // Marker callbacks
    setupMarkerCallbacks({
      calculateAndDisplayDetourOnClick: (marker, poiLoc, startLoc, endLoc, origDist, origDur) =>
        this.calculateAndDisplayDetourOnClick(marker, poiLoc, startLoc, endLoc, origDist, origDur),
    });

    // Waypoint callbacks
    setupWaypointCallbacks({
      updateRouteBuilderUI: updateRouteBuilderUI,
      calculateRoute: () => this.calculateRoute(),
      updateGmapsButtonState: updateGmapsButtonState,
      updateMarker: updateMarker,
      updateInfoWindowIfVisible: updateInfoWindowIfVisible,
      showTemporaryMessage: showTemporaryMessage,
      translate: translate,
      resetOffsets: () => this.resetOffsets(),
      clearRouteDisplay: () => this.clearRouteDisplay(),
      updateOffsetControlsVisibility: updateOffsetControlsVisibility,
      updatePoiVisibilityButtonUI: updatePoiVisibilityButtonUI,
    });
  }

  /**
   * Geolocation success callback
   */
  private onGeolocationSuccess(position: GeolocationPosition): void {
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;
    console.log(`Geolocation successful: [${userLat}, ${userLng}]`);

    // Check if user is in Turkey using geometry.location format
    const userLocation = { geometry: { location: { lat: userLat, lng: userLng } } };
    if (isPlaceInTurkey(userLocation)) {
      console.log('User is in Turkey. Centering map on user location.');
      this.initializeMapAndServices({ lat: userLat, lng: userLng }, userLocationZoom);
    } else {
      console.log('User is not in Turkey. Using default center.');
      showTemporaryMessage(translate('messageOutsideTurkey'), false);
      this.initializeMapAndServices(defaultCenter, defaultZoom);
    }
  }

  /**
   * Geolocation error callback
   */
  private onGeolocationError(error: GeolocationPositionError): void {
    console.warn(`Geolocation error (${error.code}): ${error.message}`);
    showTemporaryMessage(translate('messageGeoError'), false);
    this.initializeMapAndServices(defaultCenter, defaultZoom);
  }

  /**
   * Initializes map and all services
   */
  private async initializeMapAndServices(
    center: { lat: number; lng: number },
    zoom: number
  ): Promise<void> {
    console.log(`Initializing map at [${center.lat}, ${center.lng}] with zoom ${zoom}`);

    try {
      // Initialize map component
      this.mapComponent.initialize(center, zoom);

      // Sync with legacy state (temporary)
      state.map = this.mapComponent.map;
      state.directionsService = this.mapComponent.directionsService;
      state.directionsRenderer = this.mapComponent.directionsRenderer;
      state.infoWindow = this.mapComponent.infoWindow;
      state.geocoder = this.mapComponent.geocoder;

      // Initialize marker component
      this.markerComponent = new MarkerComponent(this.mapComponent.map);

      // Initialize filter component
      this.filterComponent = new FilterComponent({
        preferencesComponent: this.preferencesComponent,
        routeWaypoints: state.routeWaypoints,
      });

      // Apply loaded settings to filter component (settings were loaded before components were created)
      this.filterComponent.currentFilters = { ...state.currentFilters };
      this.filterComponent.distanceThresholdKm = state.distanceThresholdKm;

      // Initialize detour component
      this.detourComponent = new DetourComponent({
        directionsService: this.mapComponent.directionsService,
        routeComponent: this.routeComponent,
        markerComponent: this.markerComponent,
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      showTemporaryMessage(translate('messageErrorMapCreate'), true);
      hideLoadingOverlay();
      return;
    }

    // Update UI
    updateFilterControlsUI();
    updateDistanceSliderUI();
    const mapTypeId = this.mapComponent.getMapType();
    if (mapTypeId) {
      updateMapTypeButtons(mapTypeId);
    }
    updateBrandFilterModeButton();
    updateFilterIndicator();
    applyTranslations();

    // Initialize LocationService
    this.initializeLocationService();

    // Initialize Autocomplete
    this.initializeAutocomplete();

    // Initialize Station Info Panel
    initializeStationInfoPanel();

    // Load station data
    await this.loadStationData();

    // Add version display
    if (typeof APP_VERSION !== 'undefined') {
      addVersionDisplay(APP_VERSION);
    }

    // Setup event listeners
    this.setupEventListeners();

    console.log('Map services and listeners setup finished.');
  }

  /**
   * Initializes the location service
   */
  private initializeLocationService(): void {
    if (!this.mapComponent.geocoder || !startInput || !endInput) {
      console.error('Required dependencies for LocationService not available');
      return;
    }

    const onLocationSet = ({
      type,
      location,
      displayName,
      markerTitle,
    }: {
      type: 'start' | 'end';
      location: google.maps.LatLng;
      displayName: string;
      markerTitle: string;
    }) => {
      const inputElement = type === 'start' ? startInput : endInput;
      const clearButton = type === 'start' ? clearStartBtn : clearEndBtn;

      if (!inputElement || !clearButton) {
        console.error('Input element or clear button not found');
        return;
      }

      if (type === 'start') {
        setStartWaypoint(location, displayName);
      } else {
        setDestinationWaypoint(location, displayName);
      }

      setInputValue(type, displayName);
      handleInputChange(inputElement, clearButton);
      updateMarker(type, location, markerTitle);
      updateRouteBuilderUI();
      this.calculateRoute();
      updateGmapsButtonState();
    };

    this.locationService = new LocationService({
      geocoder: this.mapComponent.geocoder,
      map: this.mapComponent.map!,
      translate,
      showTemporaryMessage,
      onLocationSet,
      ui: { startInput: startInput!, endInput: endInput! },
      services: {
        autocompleteStart: this.mapComponent.autocompleteStart,
        autocompleteEnd: this.mapComponent.autocompleteEnd,
      },
    });

    // Sync with legacy state
    state.locationService = this.locationService;
  }

  /**
   * Initializes autocomplete
   */
  private initializeAutocomplete(): void {
    try {
      if (!google.maps.places?.Autocomplete) {
        throw new Error('google.maps.places.Autocomplete not found!');
      }

      if (startInput && endInput && this.locationService) {
        this.mapComponent.initializeAutocomplete(startInput, endInput, type =>
          this.locationService!.onPlaceChanged(type)
        );

        this.locationService.updateAutocompleteRefs(
          this.mapComponent.autocompleteStart,
          this.mapComponent.autocompleteEnd
        );

        // Sync with legacy state
        state.autocompleteStart = this.mapComponent.autocompleteStart;
        state.autocompleteEnd = this.mapComponent.autocompleteEnd;
      }

      console.log('Autocomplete setup complete.');
    } catch (error) {
      console.error('Error setting up Autocomplete:', error);
      showTemporaryMessage(translate('messageAutocomplete'), true);
      const unavailableMessage = translate('messageAutocompleteUnavailable');
      setInputDisabled('start', true);
      setInputPlaceholder('start', unavailableMessage);
      setInputDisabled('end', true);
      setInputPlaceholder('end', unavailableMessage);
    }
  }

  /**
   * Loads station data
   */
  private async loadStationData(): Promise<void> {
    console.log('Loading station data...');

    try {
      const response = await fetch(STATIONS_JSON_PATH);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const stations: StationData[] = await response.json();

      this.stationDataComponent.setStationData(stations);

      // Sync with legacy state
      state.allStationData = this.stationDataComponent.allStationData;
      state.allUniqueBrands = this.stationDataComponent.allUniqueBrands;

      // Sync preferences with unique brands
      this.preferencesComponent.allUniqueBrands = this.stationDataComponent.allUniqueBrands;

      populateBrandFilterList();
      filterBrandListView('all');
      populateIgnoredStationsList();

      setTimeout(() => {
        hideLoadingOverlay();
        console.log('Initial station data load finished.');
        if (this.stationDataComponent.allStationData.length > 0) {
          showTemporaryMessage(
            translate('messageLoadedStations', {
              count: this.stationDataComponent.allStationData.length,
            }),
            false
          );
        }
      }, 100);
    } catch (error) {
      console.error('Error loading stations:', error);
      showTemporaryMessage('Failed to load charging stations.', true);
      hideLoadingOverlay();
    }
  }

  /**
   * Sets up all event listeners
   */
  private setupEventListeners(): void {
    // Directions changed
    this.mapComponent.directionsRenderer?.addListener('directions_changed', () =>
      this.handleDirectionsChanged()
    );

    // Distance slider
    distanceSlider?.addEventListener('input', handleDistanceChange);
    distanceSlider?.addEventListener('change', () => {
      if (distanceSlider) {
        this.filterComponent.distanceThresholdKm = parseInt(distanceSlider.value, 10);
        // Sync with legacy state
        state.distanceThresholdKm = this.filterComponent.distanceThresholdKm;
        this.saveSettings();
        this.triggerDetourPrecalculation();
        const count = this.applyFilters();
        if (this.routeComponent.isRouteActive) {
          showTemporaryMessage(translate('messageStationsFound', { count }), false);
        }
      }
    });

    // Input handlers
    hamburgerButton?.addEventListener('click', toggleInputContainerVisibility);
    startInput?.addEventListener('input', () => {
      if (startInput && clearStartBtn) handleInputChange(startInput, clearStartBtn);
    });
    endInput?.addEventListener('input', () => {
      if (endInput && clearEndBtn) handleInputChange(endInput, clearEndBtn);
    });

    // Clear buttons
    clearStartBtn?.addEventListener('click', () => {
      if (startInput && clearStartBtn) this.handleClearClick(startInput, clearStartBtn, 'start');
    });
    clearEndBtn?.addEventListener('click', () => {
      if (endInput && clearEndBtn) this.handleClearClick(endInput, clearEndBtn, 'end');
    });

    // Paste buttons
    pasteStartBtn?.addEventListener('click', () =>
      this.locationService?.handlePasteButtonClick('start')
    );
    pasteEndBtn?.addEventListener('click', () =>
      this.locationService?.handlePasteButtonClick('end')
    );
    startInput?.addEventListener('paste', e =>
      this.locationService?.handleDirectPaste(e as ClipboardEvent, 'start')
    );
    endInput?.addEventListener('paste', e =>
      this.locationService?.handleDirectPaste(e as ClipboardEvent, 'end')
    );

    // Use location buttons
    useLocationStartBtn?.addEventListener('click', () =>
      this.locationService?.handleUseCurrentLocationClick('start')
    );
    useLocationEndBtn?.addEventListener('click', () =>
      this.locationService?.handleUseCurrentLocationClick('end')
    );

    // Map click
    this.mapComponent.addClickListener(event => this.handleMapClick(event));

    // Map type buttons
    mapTypeButtons.forEach(button => button.addEventListener('click', handleMapTypeChange));

    // Filter panel
    filterToggleButton?.addEventListener('click', toggleFilterPanel);
    brandFilterModeButton?.addEventListener('click', () => this.toggleBrandFilterMode());
    closeFilterButton?.addEventListener('click', toggleFilterPanel);
    resetFiltersButton?.addEventListener('click', () => this.resetAllFilters());

    // Filter inputs
    filterInputs.connectorType.forEach(input =>
      input.addEventListener('change', () => this.handleFilterChange())
    );
    filterInputs.powerLevel.forEach(input =>
      input.addEventListener('change', () => this.handleFilterChange())
    );
    filterInputs.serviceType.forEach(input =>
      input.addEventListener('change', () => this.handleFilterChange())
    );

    // Brand list view
    if (brandListViewControls) {
      brandListViewControls.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', handleBrandListViewChange);
      });
    }

    // Ignored stations
    ignoredStationsListContainer?.addEventListener('click', event => {
      const target = (event.target as HTMLElement).closest('button');
      if (!target) return;
      if (target.classList.contains('unignore-btn')) {
        const stationIdToUnignore = target.getAttribute('data-station-id');
        if (stationIdToUnignore) this.handleUnignoreStationClick(stationIdToUnignore);
      } else if (target.classList.contains('map-btn')) {
        const lat = target.getAttribute('data-lat');
        const lng = target.getAttribute('data-lng');
        if (lat && lng) {
          window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
        }
      }
    });

    // Offset controls
    offsetStartIncBtn?.addEventListener('click', () =>
      this.handleOffsetChange('start', OFFSET_INCREMENT_KM)
    );
    offsetStartDecBtn?.addEventListener('click', () =>
      this.handleOffsetChange('start', -OFFSET_INCREMENT_KM)
    );
    offsetDestIncBtn?.addEventListener('click', () =>
      this.handleOffsetChange('dest', OFFSET_INCREMENT_KM)
    );
    offsetDestDecBtn?.addEventListener('click', () =>
      this.handleOffsetChange('dest', -OFFSET_INCREMENT_KM)
    );

    // Route builder
    routeBuilderToggleButton?.addEventListener('click', toggleRouteBuilderPanel);
    closeRouteBuilderBtn?.addEventListener('click', toggleRouteBuilderPanel);
    clearWaypointsBtn?.addEventListener('click', clearAllWaypoints);
    optimizeRouteBtn?.addEventListener('click', () => this.optimizeRoute());
    togglePoiVisibilityBtn?.addEventListener('click', togglePoiVisibility);
    openRouteInGmapsBtn?.addEventListener('click', () => this.handleOpenRouteInGmaps());
    waypointsListContainer?.addEventListener('click', handleWaypointAction);

    // Keyboard shortcuts
    document.addEventListener('keydown', event => this.handleKeyDown(event));
    document.addEventListener('click', handleDocumentClickForDropdown);

    // Resize
    window.addEventListener('resize', handleResize);
    handleResize();
    updateOffsetControlsVisibility();
    updatePoiVisibilityButtonUI();
    updateGmapsButtonState();
  }

  // ==================== Route Methods ====================

  /**
   * Calculates route based on current waypoints
   */
  calculateRoute(useOptimization: boolean = false): void {
    if (!this.mapComponent.directionsService || state.routeWaypoints.length < 2) {
      console.log('Cannot calculate route: Need at least 2 waypoints.');
      if (this.routeComponent.isRouteActive) {
        this.clearRouteDisplayAndState();
      }
      return;
    }

    const startWp = getStartWaypoint();
    const destWp = getDestinationWaypoint();

    if (!startWp || !destWp) {
      console.log('Cannot calculate route: Missing start or destination.');
      return;
    }

    console.log(
      `Calculating route with ${state.routeWaypoints.length} waypoints. Optimization: ${useOptimization}`
    );
    showTemporaryMessage(translate('messageCalculatingRoute'), false);

    // Update route component
    this.routeComponent.startLocation = startWp.location;
    this.routeComponent.endLocation = destWp.location;

    // Sync with legacy state
    state.startLocation = startWp.location;
    state.endLocation = destWp.location;

    setOptimizeRouteButtonEnabled(false);

    const stationWaypoints = state.routeWaypoints.filter(wp => wp.type === 'station');
    const waypointsForApi = stationWaypoints.map(wp => ({
      location: wp.location,
      stopover: true,
    }));

    const request: google.maps.DirectionsRequest = {
      origin: this.routeComponent.startLocation,
      destination: this.routeComponent.endLocation,
      waypoints: waypointsForApi,
      optimizeWaypoints: useOptimization && stationWaypoints.length >= 2,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    this.mapComponent.directionsService.route(request, (response, status) => {
      if (status === google.maps.DirectionsStatus.OK && response) {
        this.mapComponent.directionsRenderer?.setDirections(response);

        const route = response.routes[0];
        if (route) {
          let totalDistance = 0;
          let totalDuration = 0;
          route.legs.forEach(leg => {
            totalDistance += leg.distance?.value || 0;
            totalDuration += leg.duration?.value || 0;
          });

          // Update route component
          this.routeComponent.setRoute(
            totalDistance,
            totalDuration,
            route.overview_path,
            this.routeComponent.startLocation!,
            this.routeComponent.endLocation!
          );

          // Sync with legacy state
          state.isRouteActive = true;
          state.originalRouteDistance = totalDistance;
          state.originalRouteDuration = totalDuration;
          state.currentRoutePolylinePath = route.overview_path;

          updateRouteSummary(totalDistance, totalDuration);
          updateControlVisibility();
          updateOffsetControlsVisibility();
          this.resetOffsets();

          // Update route builder UI with directions result to show leg info
          updateRouteBuilderUI(response);

          const count = this.applyFilters();
          showTemporaryMessage(translate('messageStationsFound', { count }), false);
          this.triggerDetourPrecalculation();
        }

        if (useOptimization && response.routes[0]?.waypoint_order) {
          // Handle optimization order
        }

        setOptimizeRouteButtonEnabled(stationWaypoints.length >= 2);
      } else {
        console.error('Directions request failed:', status);
        showTemporaryMessage(translate('messageRouteCalcFailed'), true);
        setOptimizeRouteButtonEnabled(stationWaypoints.length >= 2);
      }
    });
  }

  /**
   * Optimizes the current route
   */
  optimizeRoute(): void {
    this.calculateRoute(true);
  }

  /**
   * Handles directions changed event
   */
  handleDirectionsChanged(): void {
    console.log('Directions changed event fired.');
  }

  /**
   * Clears route display
   */
  clearRouteDisplay(): void {
    console.log('Clearing route display.');
    if (this.mapComponent.directionsRenderer) {
      this.mapComponent.directionsRenderer.setDirections({
        routes: [],
        request: {} as google.maps.DirectionsRequest,
      } as google.maps.DirectionsResult);
    }
  }

  /**
   * Clears route display and state
   */
  clearRouteDisplayAndState(): void {
    console.log('Clearing route display and state.');
    this.routeComponent.clearRoute();

    // Sync with legacy state
    state.isRouteActive = false;
    state.currentRoutePolylinePath = null;
    state.effectiveRoutePath = null;
    state.originalRouteDistance = null;
    state.originalRouteDuration = null;

    this.clearRouteDisplay();
    hideAllPois(resetSelectedMarkerZIndex);
    closeStationInfoPanel();
    updateControlVisibility();
    updateOffsetControlsVisibility();
    resetSelectedMarkerZIndex();
    clearRouteSummary();
  }

  /**
   * Resets offsets
   */
  resetOffsets(): void {
    this.routeComponent.resetOffsets();

    // Sync with legacy state
    state.startOffsetKm = 0;
    state.endOffsetKm = 0;

    updateOffsetDisplay();
    updateOffsetButtonStates();
  }

  /**
   * Handles offset change
   */
  handleOffsetChange(type: 'start' | 'dest', changeKm: number): void {
    if (!this.routeComponent.isRouteActive || !this.routeComponent.originalRouteDistance) {
      console.warn('Cannot change offset: Route not active.');
      return;
    }

    const success = this.routeComponent.changeOffset(type, changeKm);
    if (!success) {
      showTemporaryMessage(translate('messageOffsetsOverlap'), true);
      return;
    }

    // Sync with legacy state
    state.startOffsetKm = this.routeComponent.startOffsetKm;
    state.endOffsetKm = this.routeComponent.endOffsetKm;
    state.effectiveRoutePath = this.routeComponent.effectiveRoutePath;

    updateOffsetDisplay();
    updateOffsetButtonStates();

    const count = this.applyFilters();
    showTemporaryMessage(translate('messageStationsFound', { count }), false);
    this.triggerDetourPrecalculation();
  }

  /**
   * Opens route in Google Maps
   */
  handleOpenRouteInGmaps(): void {
    const startWp = getStartWaypoint();
    const destWp = getDestinationWaypoint();

    if (!startWp || !destWp) {
      showTemporaryMessage(translate('messageGmapsNoStartEnd'), true);
      return;
    }

    const stationWps = state.routeWaypoints.filter(wp => wp.type === 'station');
    const allPoints = [startWp, ...stationWps, destWp];

    const locationsString = allPoints
      .map(wp => {
        const lat = typeof wp.location.lat === 'function' ? wp.location.lat() : wp.location.lat;
        const lng = typeof wp.location.lng === 'function' ? wp.location.lng() : wp.location.lng;
        return `${lat},${lng}`;
      })
      .join('/');

    const gmapsUrl = `https://www.google.com/maps/dir/${locationsString}`;
    console.log('Opening route in Google Maps:', gmapsUrl);
    window.open(gmapsUrl, '_blank');
  }

  // ==================== Filter Methods ====================

  /**
   * Applies filters and updates visible markers
   */
  applyFilters(): number {
    if (!google.maps.geometry?.spherical?.computeDistanceBetween) {
      console.warn('Google Maps Geometry library missing.');
      return 0;
    }

    if (!this.filterComponent || !this.markerComponent) {
      console.log('Filter or marker component not initialized yet.');
      return 0;
    }

    this.routeComponent.updateEffectivePath();

    // Sync with legacy state
    state.effectiveRoutePath = this.routeComponent.effectiveRoutePath;

    const distanceThresholdMeters = kmToMeters(this.filterComponent.distanceThresholdKm);
    const stationsThatShouldBeVisible = new Set<string>();

    if (this.routeComponent.isRouteActive) {
      const pathToCheck = this.routeComponent.getFilterPath();
      if (pathToCheck && pathToCheck.length > 1) {
        this.stationDataComponent.allStationData.forEach(station => {
          if (this.filterComponent.poiMatchesFilters(station)) {
            const distanceToRoute = computeDistanceToPath(
              { lat: station.lat, lng: station.lng },
              pathToCheck
            );

            if (distanceToRoute <= distanceThresholdMeters) {
              stationsThatShouldBeVisible.add(String(station.id));
            }
          }
        });
      }
    }

    // Get IDs of stations that are in the route - these should always stay visible
    const stationsInRoute = new Set(
      state.routeWaypoints.filter(wp => wp.type === 'station').map(wp => wp.id)
    );

    // Remove markers that shouldn't be visible
    for (const [stationId, marker] of this.markerComponent.visiblePoiMarkers.entries()) {
      // Don't remove markers that are part of the route
      if (!stationsThatShouldBeVisible.has(stationId) && !stationsInRoute.has(stationId)) {
        marker.map = null;
        this.markerComponent.visiblePoiMarkers.delete(stationId);
      }
    }

    // Sync with legacy state
    state.visiblePoiMarkers = this.markerComponent.visiblePoiMarkers;

    // Create markers for newly visible stations
    stationsThatShouldBeVisible.forEach((stationId: string) => {
      if (!this.markerComponent.visiblePoiMarkers.has(stationId)) {
        const stationData = this.stationDataComponent.getStationById(stationId);
        if (stationData) {
          const newMarker = createMarkerForStation(stationData);
          if (newMarker) {
            // Only hide if pois are not visible AND this station is NOT in the route
            if (!this.arePoisVisible && !stationsInRoute.has(stationId)) {
              newMarker.map = null;
            }
            this.markerComponent.visiblePoiMarkers.set(stationId, newMarker);
          }
        }
      }
    });

    // Update favorite badges
    this.markerComponent.visiblePoiMarkers.forEach(marker => {
      const favBadge = (marker.content as HTMLElement | null)?.querySelector('.marker-fav-badge');
      if (favBadge) {
        const isFav =
          marker.poiData?.brand &&
          this.preferencesComponent.favoriteBrands.has(marker.poiData.brand);
        (favBadge as HTMLElement).style.display = isFav ? 'block' : 'none';
      }
    });

    const visibleCount = this.markerComponent.visiblePoiMarkers.size;
    console.log(`${visibleCount} POIs visible.`);

    return visibleCount;
  }

  /**
   * Handles filter change
   */
  handleFilterChange(): void {
    if (!this.filterComponent) {
      console.warn('Filter component not initialized yet.');
      return;
    }
    this.filterComponent.updateFilterState();

    // Sync with legacy state
    state.currentFilters = { ...this.filterComponent.currentFilters };

    updateFilterIndicator();
    this.saveSettings();

    const count = this.applyFilters();
    if (this.routeComponent.isRouteActive) {
      showTemporaryMessage(translate('messageStationsFound', { count }), false);
    }
    this.triggerDetourPrecalculation();
  }

  /**
   * Resets all filters
   */
  resetAllFilters(): void {
    console.log('Resetting all filters.');
    if (!this.filterComponent) {
      console.warn('Filter component not initialized yet.');
      return;
    }
    this.filterComponent.resetFilters();
    this.preferencesComponent.clearAll();

    // Sync with legacy state
    state.currentFilters = { ...this.filterComponent.currentFilters };
    state.distanceThresholdKm = this.filterComponent.distanceThresholdKm;
    state.favoriteBrands = this.preferencesComponent.favoriteBrands;
    state.blacklistedBrands = this.preferencesComponent.blacklistedBrands;
    state.ignoredStationIds = this.preferencesComponent.ignoredStationIds;
    state.brandFilterMode = this.preferencesComponent.brandFilterMode;

    const defaultMapType =
      (google.maps.MapTypeId as any)[DEFAULT_MAP_TYPE_ID.toUpperCase()] ||
      google.maps.MapTypeId.ROADMAP;
    if (this.mapComponent.map) {
      this.mapComponent.map.setMapTypeId(defaultMapType);
    }

    updateFilterControlsUI();
    updateDistanceSliderUI();
    updateMapTypeButtons(defaultMapType);
    populateBrandFilterList();
    populateIgnoredStationsList();
    filterBrandListView('all');
    updateBrandFilterModeButton();

    this.saveSettings();
    updateFilterIndicator();

    // Apply filters to refresh visible markers
    const count = this.applyFilters();
    if (this.routeComponent.isRouteActive) {
      showTemporaryMessage(translate('messageStationsFound', { count }), false);
      this.triggerDetourPrecalculation();
    } else {
      showTemporaryMessage(translate('messageFiltersReset'), false);
    }
  }

  // ==================== Preference Methods ====================

  /**
   * Handles brand preference change
   */
  handleBrandPreferenceChange(brandName: string, action: BrandAction): void {
    console.log(`Brand preference change: ${brandName}, ${action}`);

    if (action === 'favorite') {
      this.preferencesComponent.toggleFavorite(brandName);
    } else if (action === 'blacklist') {
      this.preferencesComponent.toggleBlacklist(brandName);
    }

    // Sync with legacy state
    state.favoriteBrands = this.preferencesComponent.favoriteBrands;
    state.blacklistedBrands = this.preferencesComponent.blacklistedBrands;

    this.saveSettings();
    updateBrandFilterModeButton();
    updateFilterIndicator();

    // Update the brand filter list to show new state immediately
    // filterBrandListView will also repopulate the list with appropriate buttons
    const brandListViewControls = document.getElementById('brand-list-view-controls');
    const activeButton = brandListViewControls?.querySelector(
      'button.active'
    ) as HTMLElement | null;
    filterBrandListView(activeButton?.dataset.view || 'all');

    const count = this.applyFilters();
    if (this.routeComponent.isRouteActive) {
      showTemporaryMessage(translate('messageStationsFound', { count }), false);
    }
    this.triggerDetourPrecalculation();
  }

  /**
   * Handles InfoWindow brand action
   */
  handleInfoWindowBrandAction(brandName: string, action: BrandAction): void {
    this.handleBrandPreferenceChange(brandName, action);

    // Update the currently visible panel to reflect the change
    if (state.selectedPoiMarker) {
      updateInfoWindowIfVisible(state.selectedPoiMarker);
    }
  }

  /**
   * Handles ignore station click
   */
  handleIgnoreStationClick(stationId: string): void {
    console.log(`Ignoring station: ${stationId}`);
    this.preferencesComponent.ignoreStation(stationId);

    // Sync with legacy state
    state.ignoredStationIds = this.preferencesComponent.ignoredStationIds;

    populateIgnoredStationsList();
    this.saveSettings();
    updateFilterIndicator();

    // Close station info panel if it's for this station
    if (state.selectedPoiMarker?.stationId === stationId) {
      closeStationInfoPanel();
    }

    this.applyFilters();
    showTemporaryMessage(translate('messageStationIgnored', { id: stationId }), false);
    this.triggerDetourPrecalculation();
  }

  /**
   * Handles unignore station click
   */
  handleUnignoreStationClick(stationId: string): void {
    console.log(`Unignoring station: ${stationId}`);
    this.preferencesComponent.unignoreStation(stationId);

    // Sync with legacy state
    state.ignoredStationIds = this.preferencesComponent.ignoredStationIds;

    populateIgnoredStationsList();
    this.saveSettings();
    updateFilterIndicator();
    this.applyFilters();
    showTemporaryMessage(translate('messageStationUnignored', { id: stationId }), false);
    this.triggerDetourPrecalculation();
  }

  /**
   * Toggles brand filter mode
   */
  toggleBrandFilterMode(): void {
    const canSwitch = this.preferencesComponent.toggleBrandFilterMode();
    if (!canSwitch && this.preferencesComponent.brandFilterMode === 'all') {
      showTemporaryMessage(translate('messageNeedFavs'), false);
      return;
    }

    // Sync with legacy state
    state.brandFilterMode = this.preferencesComponent.brandFilterMode;

    const messageKey =
      this.preferencesComponent.brandFilterMode === 'favoritesOnly'
        ? 'messageShowOnlyFavs'
        : 'messageShowAllBrands';
    showTemporaryMessage(translate(messageKey), false);

    updateBrandFilterModeButton();
    this.saveSettings();
    updateFilterIndicator();
    this.applyFilters();
    this.triggerDetourPrecalculation();
  }

  // ==================== Detour Methods ====================

  /**
   * Triggers detour precalculation
   */
  triggerDetourPrecalculation(): void {
    if (!this.detourComponent) {
      console.log('Detour component not initialized yet, skipping precalculation.');
      return;
    }
    this.detourComponent.triggerPrecalculation(updateMarkerDetourText, fetchPoiDetails);
  }

  /**
   * Calculates and displays detour on click
   */
  async calculateAndDisplayDetourOnClick(
    marker: ExtendedMarker,
    poiLocation: google.maps.LatLng,
    startLoc: google.maps.LatLng,
    endLoc: google.maps.LatLng,
    originalDist: number,
    originalDur: number
  ): Promise<void> {
    const result = await this.detourComponent.calculateDetourForPoi(
      marker,
      poiLocation,
      startLoc,
      endLoc,
      originalDist,
      originalDur
    );
    marker.detourData = result;
    updateMarkerDetourText(marker, result);
    updateInfoWindowIfVisible(marker);
  }

  // ==================== Event Handlers ====================

  /**
   * Handles map click
   */
  private handleMapClick(event: google.maps.MapMouseEvent): void {
    // Close station info panel if open
    closeStationInfoPanel();

    event.stop?.();
    event.domEvent?.stopPropagation();

    const hasStart = getStartWaypoint();
    const hasDest = getDestinationWaypoint();

    if (hasStart && hasDest) {
      console.log('Route already set. Map click ignored.');
      return;
    }

    if (!this.locationService) {
      console.error('Location service not initialized for map click.');
      return;
    }
    const hasStartPoint = state.routeWaypoints.some(wp => wp.type === 'start');
    this.locationService.handleMapClick(event, hasStartPoint);
  }

  /**
   * Handles clear button click
   */
  private handleClearClick(
    inputElement: HTMLInputElement,
    clearButtonElement: HTMLElement,
    locationType: LocationType
  ): void {
    if (!inputElement || !clearButtonElement) return;
    inputElement.value = '';
    clearButtonElement.classList.add('hidden');
    console.log(`Clearing ${locationType} location and marker.`);

    removeWaypoint(locationType === 'start' ? 'start' : 'destination');

    if (locationType === 'start') {
      this.routeComponent.startLocation = null;
      state.startLocation = null;
      if (state.startMarker) {
        state.startMarker.map = null;
        state.startMarker = null;
      }
    } else {
      this.routeComponent.endLocation = null;
      state.endLocation = null;
      if (state.endMarker) {
        state.endMarker.map = null;
        state.endMarker = null;
      }
    }

    updateRouteBuilderUI();

    if (state.routeWaypoints.length < 2) {
      this.clearRouteDisplayAndState();
    } else {
      this.calculateRoute();
    }

    updateGmapsButtonState();
    inputElement.focus();
  }

  /**
   * Handles keyboard shortcuts
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const activeEl = document.activeElement;
    const isInputFocused =
      activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    if (event.key === 'Escape') {
      let closedSomething = false;
      if (closeLanguageDropdown()) closedSomething = true;

      // Note: Station info panel closes itself on ESC via its own handler

      if (filterPanel?.classList.contains('open')) {
        console.log('Escape key pressed, closing Filter Panel.');
        toggleFilterPanel();
        closedSomething = true;
      }

      if (routeBuilderPanel?.classList.contains('open')) {
        console.log('Escape key pressed, closing Route Builder Panel.');
        toggleRouteBuilderPanel();
        closedSomething = true;
      }

      if (closedSomething) event.preventDefault();
    }

    if (!isInputFocused && (event.key === 'x' || event.key === 'X')) {
      event.preventDefault();
      this.clearAllInputsAndRoute();
    }
  }

  /**
   * Clears all inputs and route
   */
  private clearAllInputsAndRoute(): void {
    console.log('Clearing all inputs and route via shortcut.');

    // Clear input fields
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
    if (startInput && clearStartBtn) handleInputChange(startInput, clearStartBtn);
    if (endInput && clearEndBtn) handleInputChange(endInput, clearEndBtn);

    // Clear all waypoints (including start and destination)
    state.routeWaypoints = [];

    // Clear markers
    if (state.startMarker) {
      state.startMarker.map = null;
      state.startMarker = null;
    }
    if (state.endMarker) {
      state.endMarker.map = null;
      state.endMarker = null;
    }
    state.routeWaypointMarkers.forEach(marker => (marker.map = null));
    state.routeWaypointMarkers = [];

    // Clear route state
    this.routeComponent.startLocation = null;
    this.routeComponent.endLocation = null;
    state.startLocation = null;
    state.endLocation = null;

    // Clear route display and state
    this.clearRouteDisplayAndState();

    // Update UI
    updateRouteBuilderUI();
    updateGmapsButtonState();
  }

  // ==================== Callbacks ====================

  /**
   * Called when InfoWindow is closed
   */
  private onInfoWindowClose(): void {
    resetSelectedMarkerZIndex();
  }

  /**
   * Called when route changes
   */
  private onRouteChanged(): void {
    this.syncLegacyState();
  }

  /**
   * Called when effective path changes
   */
  private onEffectivePathChanged(): void {
    this.syncLegacyState();
  }

  // ==================== Settings ====================

  /**
   * Saves settings to localStorage
   */
  saveSettings(): void {
    console.log('Saving settings...');

    const generalSettings = {
      filters: this.filterComponent?.currentFilters || state.currentFilters,
      distance: this.filterComponent?.distanceThresholdKm || state.distanceThresholdKm,
      mapTypeId: this.mapComponent.getMapType() || DEFAULT_MAP_TYPE_ID,
    };
    setStorageItem(GENERAL_SETTINGS_STORAGE_KEY, generalSettings);

    const brandPrefs = {
      favorites: Array.from(this.preferencesComponent.favoriteBrands),
      blacklisted: Array.from(this.preferencesComponent.blacklistedBrands),
      filterMode: this.preferencesComponent.brandFilterMode,
    };
    setStorageItem(BRAND_PREFS_STORAGE_KEY, brandPrefs);

    setStorageItem(
      IGNORED_STATIONS_STORAGE_KEY,
      Array.from(this.preferencesComponent.ignoredStationIds)
    );

    console.log('Settings saved.');
  }

  /**
   * Loads settings from localStorage
   */
  loadSettings(): void {
    console.log('Loading settings...');

    // Load general settings into temporary variables first
    let loadedFilters = {
      connectorType: defaultFilters.connectorType,
      powerLevels: [...defaultFilters.powerLevels],
      serviceTypes: [...defaultFilters.serviceTypes],
      mapTypeId: DEFAULT_MAP_TYPE_ID,
    };
    let loadedDistanceThreshold = DEFAULT_DISTANCE_THRESHOLD;

    const generalSettings = getStorageItem<{
      filters?: { connectorType?: string; powerLevels?: string[]; serviceTypes?: string[] };
      distance?: number;
      mapTypeId?: string;
    }>(GENERAL_SETTINGS_STORAGE_KEY);

    if (generalSettings) {
      if (generalSettings.filters) {
        loadedFilters.connectorType =
          (generalSettings.filters.connectorType as typeof defaultFilters.connectorType) ||
          defaultFilters.connectorType;
        loadedFilters.powerLevels = Array.isArray(generalSettings.filters.powerLevels)
          ? (generalSettings.filters.powerLevels as (typeof defaultFilters.powerLevels)[number][])
          : [...defaultFilters.powerLevels];
        loadedFilters.serviceTypes = Array.isArray(generalSettings.filters.serviceTypes)
          ? (generalSettings.filters.serviceTypes as (typeof defaultFilters.serviceTypes)[number][])
          : [...defaultFilters.serviceTypes];
      }
      const dist = generalSettings.distance;
      loadedDistanceThreshold =
        typeof dist === 'number' && dist >= 1 && dist <= 20 ? dist : DEFAULT_DISTANCE_THRESHOLD;
      loadedFilters.mapTypeId =
        (generalSettings.mapTypeId as typeof DEFAULT_MAP_TYPE_ID) || DEFAULT_MAP_TYPE_ID;
    }

    // Update filterComponent if it exists
    if (this.filterComponent) {
      this.filterComponent.currentFilters = loadedFilters;
      this.filterComponent.distanceThresholdKm = loadedDistanceThreshold;
    }

    // Sync with legacy state
    state.currentFilters = { ...loadedFilters };
    state.distanceThresholdKm = loadedDistanceThreshold;

    // Load brand preferences
    const prefs = getStorageItem<{
      favorites?: string[];
      blacklisted?: string[];
      filterMode?: 'all' | 'favoritesOnly';
    }>(BRAND_PREFS_STORAGE_KEY);

    if (prefs) {
      if (Array.isArray(prefs.favorites)) {
        this.preferencesComponent.favoriteBrands = new Set(prefs.favorites);
      }
      if (Array.isArray(prefs.blacklisted)) {
        this.preferencesComponent.blacklistedBrands = new Set(prefs.blacklisted);
      }
      if (prefs.filterMode === 'favoritesOnly' || prefs.filterMode === 'all') {
        this.preferencesComponent.brandFilterMode = prefs.filterMode;
      }
    }

    // Sync with legacy state
    state.favoriteBrands = this.preferencesComponent.favoriteBrands;
    state.blacklistedBrands = this.preferencesComponent.blacklistedBrands;
    state.brandFilterMode = this.preferencesComponent.brandFilterMode;

    // Load ignored stations
    const ignoredArray = getStorageItem<string[]>(IGNORED_STATIONS_STORAGE_KEY);
    if (Array.isArray(ignoredArray)) {
      this.preferencesComponent.ignoredStationIds = new Set(ignoredArray.map(String));
    }

    // Sync with legacy state
    state.ignoredStationIds = this.preferencesComponent.ignoredStationIds;

    console.log('Settings loaded.');
  }
}

// Create and export the app instance
let appInstance: App | null = null;

export function getApp(): App {
  if (!appInstance) {
    appInstance = new App();
  }
  return appInstance;
}

// Global function for Google Maps API callback
declare global {
  interface Window {
    initMap: () => void;
    _initMapReady: boolean;
    _initMapImpl: (() => void) | null;
    handleAddStationToRoute: (stationId: string) => void;
    handleInfoWindowBrandAction: (brandName: string, action: BrandAction) => void;
    handleIgnoreStationClick: (stationId: string) => void;
    retryDetourCalculation: (stationId: string) => void;
  }
}

// Set the actual initMap implementation
// If Google Maps already called initMap (flag is set), run immediately
// Otherwise, store the implementation for when Google Maps calls initMap
const initMapImpl = () => {
  const app = getApp();
  app.initialize();
};

if (window._initMapReady) {
  // Google Maps already called initMap, run now
  initMapImpl();
} else {
  // Store implementation for when Google Maps is ready
  window._initMapImpl = initMapImpl;
}

// Expose state and app for testing
if (typeof window !== 'undefined') {
  (window as any).appState = state;
  (window as any).getApp = getApp;
  // Helper to get visible markers from the marker component
  (window as any).getVisibleMarkers = () => {
    const app = getApp();
    return app.markerComponent ? app.markerComponent.visiblePoiMarkers : new Map();
  };
  (window as any).getAllMarkers = () => {
    const app = getApp();
    return app.markerComponent ? app.markerComponent.allPoiMarkers : [];
  };
  // Test helper to create a route with coordinates
  (window as any).createTestRoute = async (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ) => {
    const app = getApp();
    const startLocation = new google.maps.LatLng(startLat, startLng);
    const endLocation = new google.maps.LatLng(endLat, endLng);

    setStartWaypoint(startLocation, 'Test Start');
    setDestinationWaypoint(endLocation, 'Test End');
    updateRouteBuilderUI();

    // Calculate route and wait for it to complete
    await app.calculateRoute();

    // Wait a bit for markers to be created
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      isRouteActive: app.routeComponent.isRouteActive,
      markerCount: app.markerComponent?.visiblePoiMarkers.size || 0,
    };
  };

  // Test helper to set a single location (for autocomplete tests)
  (window as any).setTestLocation = (
    type: 'start' | 'end',
    lat: number,
    lng: number,
    name: string
  ) => {
    const app = getApp();
    const location = new google.maps.LatLng(lat, lng);
    if (type === 'start') {
      setStartWaypoint(location, name);
      app.routeComponent.startLocation = location;
      state.startLocation = location;
    } else {
      setDestinationWaypoint(location, name);
      app.routeComponent.endLocation = location;
      state.endLocation = location;
    }
    updateRouteBuilderUI();
  };
}

window.handleAddStationToRoute = handleAddStationToRoute;
window.handleInfoWindowBrandAction = (brandName: string, action: BrandAction) => {
  getApp().handleInfoWindowBrandAction(brandName, action);
};
window.handleIgnoreStationClick = (stationId: string) => {
  getApp().handleIgnoreStationClick(stationId);
};
window.retryDetourCalculation = (stationId: string) => {
  // Detour retry - use legacy for now
  const marker = state.visiblePoiMarkers.get(stationId);
  if (
    marker &&
    state.isRouteActive &&
    state.startLocation &&
    state.endLocation &&
    state.originalRouteDistance !== null &&
    state.originalRouteDuration !== null &&
    marker.position
  ) {
    const poiPos = toLatLng(marker.position);
    getApp().calculateAndDisplayDetourOnClick(
      marker,
      poiPos,
      state.startLocation,
      state.endLocation,
      state.originalRouteDistance,
      state.originalRouteDuration
    );
  }
};
