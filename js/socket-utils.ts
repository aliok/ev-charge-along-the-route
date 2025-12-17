/**
 * Socket/charger type and power classification utilities.
 */

import { Socket } from './state.js';

/**
 * Power level categories.
 */
type PowerCategory = 0 | 1 | 2 | 3; // 0=unknown, 1=low, 2=medium, 3=high

/**
 * Power thresholds in kW.
 */
const POWER_THRESHOLDS = {
  LOW_MAX: 60, // < 60kW is low power
  MEDIUM_MAX: 120, // 60-120kW is medium power
  HIGH_MIN: 120, // >= 120kW is high power
} as const;

/**
 * AC socket type identifiers.
 */
const AC_TYPES = ['AC', 'TYPE_2', 'TYPE2', 'TYPE 2', 'SCHUKO', 'J1772'];

/**
 * DC socket type identifiers.
 */
const DC_TYPES = ['DC', 'CCS', 'CCS2', 'CCS1', 'CHADEMO', 'GB/T'];

/**
 * Determines if a socket type string indicates an AC charger.
 */
function isACSocket(typeString: string | null | undefined): boolean {
  if (!typeString) return false;
  const upper = typeString.toUpperCase();
  return AC_TYPES.some(t => upper.includes(t));
}

/**
 * Determines if a socket type string indicates a DC charger.
 */
function isDCSocket(typeString: string | null | undefined): boolean {
  if (!typeString) return false;
  const upper = typeString.toUpperCase();
  return DC_TYPES.some(t => upper.includes(t));
}

/**
 * Gets the charger type from a socket type string.
 */
function getChargerType(typeString: string | null | undefined): 'AC' | 'DC' | 'UNKNOWN' {
  if (isDCSocket(typeString)) return 'DC';
  if (isACSocket(typeString)) return 'AC';
  return 'UNKNOWN';
}

/**
 * Determines the power category (0-3) based on power in kW.
 */
function getPowerCategory(powerKw: number | null | undefined): PowerCategory {
  if (powerKw == null || powerKw <= 0) return 0;
  if (powerKw >= POWER_THRESHOLDS.HIGH_MIN) return 3; // High power (120+ kW)
  if (powerKw >= POWER_THRESHOLDS.LOW_MAX) return 2; // Medium power (60-120 kW)
  return 1; // Low power (< 60 kW)
}

/**
 * Gets the power emoji string based on power category.
 */
export function getPowerEmoji(powerKw: number | null | undefined): string {
  const category = getPowerCategory(powerKw);
  return '⚡'.repeat(category);
}

/**
 * Formats power value for display.
 */
export function formatPower(powerKw: number | null | undefined): string {
  if (powerKw == null || powerKw <= 0) return '';
  const formatted = Number.isInteger(powerKw) ? powerKw.toString() : powerKw.toFixed(1);
  return `${formatted} kW`;
}

/**
 * Analysis result for a station's sockets.
 */
interface SocketAnalysis {
  hasAC: boolean;
  hasDC: boolean;
  maxPower: number;
  powerCategory: PowerCategory;
}

/**
 * Analyzes an array of sockets to determine charger types and power levels.
 */
export function analyzeStationSockets(sockets: Socket[] | null | undefined): SocketAnalysis {
  const result: SocketAnalysis = {
    hasAC: false,
    hasDC: false,
    maxPower: 0,
    powerCategory: 0,
  };

  if (!sockets || sockets.length === 0) {
    return result;
  }

  for (const socket of sockets) {
    const chargerType = getChargerType(socket.type);
    if (chargerType === 'AC') result.hasAC = true;
    if (chargerType === 'DC') result.hasDC = true;

    const power = typeof socket.power === 'number' ? socket.power : 0;
    if (power > result.maxPower) {
      result.maxPower = power;
    }
  }

  result.powerCategory = getPowerCategory(result.maxPower);

  return result;
}

/**
 * Checks if a station has sockets matching the specified connector filter.
 */
export function hasMatchingConnectorType(
  sockets: Socket[] | null | undefined,
  filter: 'ALL' | 'AC' | 'DC'
): boolean {
  if (filter === 'ALL') return true;
  if (!sockets || sockets.length === 0) return false;

  return sockets.some(socket => {
    const type = getChargerType(socket.type);
    return type === filter;
  });
}

/**
 * Checks if a station has sockets matching the specified power levels.
 */
export function hasMatchingPowerLevel(
  sockets: Socket[] | null | undefined,
  powerLevels: string[]
): boolean {
  if (powerLevels.length === 0) return false;
  if (powerLevels.length >= 3) return true; // All levels selected
  if (!sockets || sockets.length === 0) return false;

  return sockets.some(socket => {
    const power = typeof socket.power === 'number' ? socket.power : -1;
    if (power < 0) return false;

    const matchesLow = powerLevels.includes('low') && power < POWER_THRESHOLDS.LOW_MAX;
    const matchesMedium =
      powerLevels.includes('medium') &&
      power >= POWER_THRESHOLDS.LOW_MAX &&
      power < POWER_THRESHOLDS.MEDIUM_MAX;
    const matchesHigh = powerLevels.includes('high') && power >= POWER_THRESHOLDS.HIGH_MIN;

    return matchesLow || matchesMedium || matchesHigh;
  });
}

/**
 * Socket availability status mappings.
 */
const AVAILABILITY_STATUS = {
  FREE: { statusClass: 'status-free', statusKey: 'iwFree' },
  IN_USE: { statusClass: 'status-occupied', statusKey: 'iwInUse' },
  OCCUPIED: { statusClass: 'status-occupied', statusKey: 'iwOccupied' },
  CHARGING: { statusClass: 'status-occupied', statusKey: 'iwCharging' },
  UNKNOWN: { statusClass: 'status-unknown', statusKey: 'iwUnknown' },
} as const;

/**
 * Gets the status class and translation key for a socket availability.
 */
export function getAvailabilityInfo(availability: string | null | undefined): {
  statusClass: string;
  statusKey: string;
} {
  if (!availability) {
    return AVAILABILITY_STATUS.UNKNOWN;
  }

  const upper = availability.toUpperCase();

  if (upper === 'FREE') return AVAILABILITY_STATUS.FREE;
  if (upper === 'IN_USE' || upper === 'INUSE') return AVAILABILITY_STATUS.IN_USE;
  if (upper === 'OCCUPIED') return AVAILABILITY_STATUS.OCCUPIED;
  if (upper === 'CHARGING') return AVAILABILITY_STATUS.CHARGING;

  return AVAILABILITY_STATUS.UNKNOWN;
}
