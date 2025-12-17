import { Filters, StationData, Waypoint } from '../state.js';
import { defaultFilters, DEFAULT_DISTANCE_THRESHOLD } from '../config.js';
import type { PreferencesComponent } from './preferences-component.js';
import { hasMatchingConnectorType, hasMatchingPowerLevel } from '../socket-utils.js';
import { getSelectedRadioValue, getCheckedValues } from '../dom-utils.js';
import { createLogger } from '../logger.js';

const logger = createLogger('filter');

/**
 * Manages filter state and station filtering logic
 */
export class FilterComponent {
  public currentFilters: Filters = {
    connectorType: defaultFilters.connectorType,
    powerLevels: [...defaultFilters.powerLevels],
    serviceTypes: [...defaultFilters.serviceTypes],
  };

  public distanceThresholdKm: number = DEFAULT_DISTANCE_THRESHOLD;

  private readonly preferencesComponent: PreferencesComponent;
  private readonly routeWaypoints: Waypoint[];

  constructor(options: { preferencesComponent: PreferencesComponent; routeWaypoints: Waypoint[] }) {
    this.preferencesComponent = options.preferencesComponent;
    this.routeWaypoints = options.routeWaypoints;
  }

  /**
   * Updates filter state from UI inputs
   */
  updateFilterState(): void {
    this.currentFilters.connectorType = getSelectedRadioValue(
      '#filter-connector-type input[name="connectorType"]',
      defaultFilters.connectorType
    );
    this.currentFilters.powerLevels = getCheckedValues(
      '#filter-power input[name="powerLevel"]:checked'
    );
    this.currentFilters.serviceTypes = getCheckedValues(
      '#filter-service-type input[name="serviceType"]:checked'
    );
    logger.debug('Updated Basic Filters:', JSON.parse(JSON.stringify(this.currentFilters)));
  }

  /**
   * Checks if a station matches all current filters
   */
  poiMatchesFilters(stationData: StationData): boolean {
    if (!stationData || !stationData.id) {
      return false;
    }

    // Check if station is already a waypoint
    if (this.routeWaypoints.some(wp => wp.type === 'station' && wp.id === stationData.id)) {
      return false;
    }

    // Check preferences (ignored, blacklisted, favorites)
    if (!this.preferencesComponent.stationMatchesPreferences(stationData)) {
      return false;
    }

    // Check service type
    if (this.currentFilters.serviceTypes.length === 0) {
      return false; // No service types selected means nothing is visible
    }
    const serviceTypeUpper = stationData.serviceType?.toUpperCase();
    if (!serviceTypeUpper || !this.currentFilters.serviceTypes.includes(serviceTypeUpper)) {
      return false;
    }

    // Check connector type using socket-utils
    const connectorFilter = this.currentFilters.connectorType as 'ALL' | 'AC' | 'DC';
    if (!hasMatchingConnectorType(stationData.sockets, connectorFilter)) {
      return false;
    }

    // Check power levels using socket-utils
    if (!hasMatchingPowerLevel(stationData.sockets, this.currentFilters.powerLevels)) {
      return false;
    }

    return true; // Passed all filters
  }

  /**
   * Resets all filters to defaults
   */
  resetFilters(): void {
    this.currentFilters = {
      connectorType: defaultFilters.connectorType,
      powerLevels: [...defaultFilters.powerLevels],
      serviceTypes: [...defaultFilters.serviceTypes],
    };
    this.distanceThresholdKm = DEFAULT_DISTANCE_THRESHOLD;
  }
}
