// Shared type definitions for better type safety

/**
 * Base parameters for translation function
 */
interface BaseTranslationParams {
  [key: string]: string | number | undefined;
}

/**
 * Parameters for count-based translations (e.g., "5 stations found")
 */
export interface CountTranslationParams extends BaseTranslationParams {
  count: number;
}

/**
 * Parameters for station-specific translations
 */
export interface StationTranslationParams extends BaseTranslationParams {
  id: string | number;
  name?: string;
}

/**
 * Parameters for distance/duration translations
 */
export interface DistanceTranslationParams extends BaseTranslationParams {
  extraDistStr?: string;
  extraDurStr?: string;
  distFromStartStr?: string;
  timeFromStartStr?: string;
  distToEndStr?: string;
  timeToEndStr?: string;
}

/**
 * Parameters for status translations
 */
export interface StatusTranslationParams extends BaseTranslationParams {
  status?: string;
  statusText?: string;
}

/**
 * Parameters for progress translations
 */
export interface ProgressTranslationParams extends BaseTranslationParams {
  processed: number;
  total: number;
  percent?: number;
}

/**
 * Combined translation parameters type
 * Supports all common translation parameter types
 */
export type TranslationParams =
  | CountTranslationParams
  | StationTranslationParams
  | DistanceTranslationParams
  | StatusTranslationParams
  | ProgressTranslationParams
  | BaseTranslationParams;

/**
 * Brand action type
 */
export type BrandAction = 'favorite' | 'blacklist';

/**
 * Location type for waypoints
 */
export type LocationType = 'start' | 'end';
