/**
 * Validation utility functions for common validation patterns.
 */

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
 * Checks if a number is non-negative (>= 0).
 * @param value - The value to check
 * @returns true if value is non-negative
 */
export function isNonNegativeNumber(value: any): value is number {
  return isValidNumber(value) && value >= 0;
}
