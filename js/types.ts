// Shared type definitions for better type safety

/**
 * Parameters for translation function
 * Supports common translation parameter types
 */
export type TranslationParams = {
    count?: number;
    status?: string;
    type?: string;
    parsedType?: string;
    id?: string | number;
    processed?: number;
    total?: number;
    percent?: number;
    statusText?: string;
    extraDistStr?: string;
    extraDurStr?: string;
    distFromStartStr?: string;
    timeFromStartStr?: string;
    distToEndStr?: string;
    timeToEndStr?: string;
    name?: string;
    [key: string]: string | number | undefined;
};

/**
 * Brand action type
 */
export type BrandAction = 'favorite' | 'blacklist';

/**
 * Location type for waypoints
 */
export type LocationType = 'start' | 'end';

