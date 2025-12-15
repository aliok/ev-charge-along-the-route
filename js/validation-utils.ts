/**
 * Validation utility functions for common validation patterns.
 */

/**
 * Checks if a value is null or undefined.
 * @param value - The value to check
 * @returns true if value is null or undefined
 */
export function isNullOrUndefined(value: any): value is null | undefined {
    return value === null || value === undefined;
}

/**
 * Checks if a value is not null and not undefined.
 * @param value - The value to check
 * @returns true if value is defined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

/**
 * Checks if a number is valid and finite.
 * @param value - The value to check
 * @returns true if value is a finite number
 *
 * @example
 * isValidNumber(42) // Returns: true
 * isValidNumber(NaN) // Returns: false
 * isValidNumber(Infinity) // Returns: false
 */
export function isValidNumber(value: any): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Checks if a number is positive (> 0).
 * @param value - The value to check
 * @returns true if value is a positive number
 */
export function isPositiveNumber(value: any): value is number {
    return isValidNumber(value) && value > 0;
}

/**
 * Checks if a number is non-negative (>= 0).
 * @param value - The value to check
 * @returns true if value is non-negative
 */
export function isNonNegativeNumber(value: any): value is number {
    return isValidNumber(value) && value >= 0;
}

/**
 * Checks if a number is within a range (inclusive).
 * @param value - The value to check
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns true if value is within range
 *
 * @example
 * isInRange(5, 1, 10) // Returns: true
 * isInRange(15, 1, 10) // Returns: false
 */
export function isInRange(value: number, min: number, max: number): boolean {
    return isValidNumber(value) && value >= min && value <= max;
}

/**
 * Checks if a value is a valid email address.
 * @param email - The email to validate
 * @returns true if email format is valid
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Checks if a value is a valid URL.
 * @param url - The URL to validate
 * @returns true if URL format is valid
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Checks if an array is not empty.
 * @param arr - The array to check
 * @returns true if array exists and has elements
 */
export function isNonEmptyArray<T>(arr: T[] | null | undefined): arr is T[] {
    return Array.isArray(arr) && arr.length > 0;
}

/**
 * Checks if an object is not empty (has at least one own property).
 * @param obj - The object to check
 * @returns true if object has properties
 */
export function isNonEmptyObject(obj: any): boolean {
    return obj !== null && typeof obj === 'object' && Object.keys(obj).length > 0;
}

/**
 * Checks if a value is a valid latitude.
 * @param lat - The latitude to validate
 * @returns true if latitude is valid (-90 to 90)
 */
export function isValidLatitude(lat: any): boolean {
    return isValidNumber(lat) && lat >= -90 && lat <= 90;
}

/**
 * Checks if a value is a valid longitude.
 * @param lng - The longitude to validate
 * @returns true if longitude is valid (-180 to 180)
 */
export function isValidLongitude(lng: any): boolean {
    return isValidNumber(lng) && lng >= -180 && lng <= 180;
}

/**
 * Checks if coordinates are valid (latitude and longitude).
 * @param lat - The latitude
 * @param lng - The longitude
 * @returns true if both coordinates are valid
 */
export function areValidCoordinates(lat: any, lng: any): boolean {
    return isValidLatitude(lat) && isValidLongitude(lng);
}

/**
 * Validates and clamps a number to a range.
 * @param value - The value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @param defaultValue - Default value if input is invalid
 * @returns Clamped value or default
 *
 * @example
 * clamp(15, 0, 10, 5) // Returns: 10
 * clamp(-5, 0, 10, 5) // Returns: 0
 * clamp(NaN, 0, 10, 5) // Returns: 5
 */
export function clamp(value: any, min: number, max: number, defaultValue: number): number {
    if (!isValidNumber(value)) {
        return defaultValue;
    }
    return Math.min(Math.max(value, min), max);
}

/**
 * Safely parses a number from a string.
 * @param str - The string to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed number or default
 *
 * @example
 * parseNumber("42", 0) // Returns: 42
 * parseNumber("invalid", 0) // Returns: 0
 */
export function parseNumber(str: string, defaultValue: number = 0): number {
    const parsed = Number(str);
    return isValidNumber(parsed) ? parsed : defaultValue;
}

/**
 * Safely parses an integer from a string.
 * @param str - The string to parse
 * @param defaultValue - Default value if parsing fails
 * @param radix - The base to use for parsing (defaults to 10)
 * @returns Parsed integer or default
 */
export function parseInt(str: string, defaultValue: number = 0, radix: number = 10): number {
    const parsed = Number.parseInt(str, radix);
    return isValidNumber(parsed) ? parsed : defaultValue;
}

/**
 * Safely parses a float from a string.
 * @param str - The string to parse
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed float or default
 */
export function parseFloat(str: string, defaultValue: number = 0): number {
    const parsed = Number.parseFloat(str);
    return isValidNumber(parsed) ? parsed : defaultValue;
}

/**
 * Validates that a value is one of the allowed values.
 * @param value - The value to check
 * @param allowedValues - Array of allowed values
 * @returns true if value is in allowed values
 *
 * @example
 * isOneOf("red", ["red", "green", "blue"]) // Returns: true
 * isOneOf("yellow", ["red", "green", "blue"]) // Returns: false
 */
export function isOneOf<T>(value: T, allowedValues: T[]): boolean {
    return allowedValues.includes(value);
}

/**
 * Asserts that a value is defined, throws error if not.
 * @param value - The value to check
 * @param message - Error message if assertion fails
 * @throws Error if value is null or undefined
 *
 * @example
 * assertDefined(myValue, "Value must be defined");
 */
export function assertDefined<T>(value: T | null | undefined, message: string = 'Value must be defined'): asserts value is T {
    if (isNullOrUndefined(value)) {
        throw new Error(message);
    }
}

/**
 * Asserts that a condition is true, throws error if not.
 * @param condition - The condition to check
 * @param message - Error message if assertion fails
 * @throws Error if condition is false
 *
 * @example
 * assert(x > 0, "X must be positive");
 */
export function assert(condition: boolean, message: string = 'Assertion failed'): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}
