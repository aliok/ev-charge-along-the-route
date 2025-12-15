/**
 * Number utility functions for formatting and manipulating numbers.
 */

/**
 * Formats a number with thousands separators.
 * @param num - The number to format
 * @param separator - Separator character (defaults to comma)
 * @returns Formatted number string
 *
 * @example
 * formatThousands(1234567) // Returns: "1,234,567"
 * formatThousands(1234567, " ") // Returns: "1 234 567"
 */
export function formatThousands(num: number, separator: string = ','): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Formats a number to a fixed number of decimal places.
 * @param num - The number to format
 * @param decimals - Number of decimal places
 * @param trimZeros - Whether to trim trailing zeros (defaults to false)
 * @returns Formatted number string
 *
 * @example
 * formatDecimals(3.14159, 2) // Returns: "3.14"
 * formatDecimals(3.10, 2, true) // Returns: "3.1"
 */
export function formatDecimals(num: number, decimals: number, trimZeros: boolean = false): string {
    const fixed = num.toFixed(decimals);
    return trimZeros ? parseFloat(fixed).toString() : fixed;
}

/**
 * Formats a number as a percentage.
 * @param num - The number (0-1 or 0-100 depending on isDecimal)
 * @param decimals - Number of decimal places (defaults to 0)
 * @param isDecimal - Whether input is decimal (0-1) or percentage (0-100)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(0.75, 1, true) // Returns: "75.0%"
 * formatPercentage(75, 1, false) // Returns: "75.0%"
 */
export function formatPercentage(num: number, decimals: number = 0, isDecimal: boolean = true): string {
    const value = isDecimal ? num * 100 : num;
    return `${formatDecimals(value, decimals)}%`;
}

/**
 * Formats a number in compact notation (e.g., 1K, 2.5M).
 * @param num - The number to format
 * @param decimals - Number of decimal places (defaults to 1)
 * @returns Compact number string
 *
 * @example
 * formatCompact(1500) // Returns: "1.5K"
 * formatCompact(2500000) // Returns: "2.5M"
 * formatCompact(1234567890) // Returns: "1.2B"
 */
export function formatCompact(num: number, decimals: number = 1): string {
    const units = ['', 'K', 'M', 'B', 'T'];
    const threshold = 1000;

    if (Math.abs(num) < threshold) {
        return num.toString();
    }

    let unitIndex = 0;
    let value = num;

    while (Math.abs(value) >= threshold && unitIndex < units.length - 1) {
        value /= threshold;
        unitIndex++;
    }

    return `${formatDecimals(value, decimals, true)}${units[unitIndex]}`;
}

/**
 * Formats a file size in bytes to human-readable format.
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places (defaults to 2)
 * @returns Formatted size string
 *
 * @example
 * formatBytes(1024) // Returns: "1.00 KB"
 * formatBytes(1536) // Returns: "1.50 KB"
 * formatBytes(1048576) // Returns: "1.00 MB"
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${formatDecimals(bytes / Math.pow(k, i), decimals)} ${sizes[i]}`;
}

/**
 * Formats a duration in milliseconds to human-readable format.
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 *
 * @example
 * formatMilliseconds(1500) // Returns: "1.50s"
 * formatMilliseconds(65000) // Returns: "1m 5s"
 * formatMilliseconds(3661000) // Returns: "1h 1m 1s"
 */
export function formatMilliseconds(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${formatDecimals(ms / 1000, 2)}s`;

    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}

/**
 * Rounds a number to the nearest multiple of a value.
 * @param num - The number to round
 * @param multiple - The multiple to round to
 * @returns Rounded number
 *
 * @example
 * roundToMultiple(23, 5) // Returns: 25
 * roundToMultiple(22, 5) // Returns: 20
 */
export function roundToMultiple(num: number, multiple: number): number {
    return Math.round(num / multiple) * multiple;
}

/**
 * Rounds a number up to the nearest multiple of a value.
 * @param num - The number to round
 * @param multiple - The multiple to round to
 * @returns Rounded up number
 */
export function ceilToMultiple(num: number, multiple: number): number {
    return Math.ceil(num / multiple) * multiple;
}

/**
 * Rounds a number down to the nearest multiple of a value.
 * @param num - The number to round
 * @param multiple - The multiple to round to
 * @returns Rounded down number
 */
export function floorToMultiple(num: number, multiple: number): number {
    return Math.floor(num / multiple) * multiple;
}

/**
 * Linearly interpolates between two numbers.
 * @param start - Start value
 * @param end - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 *
 * @example
 * lerp(0, 100, 0.5) // Returns: 50
 * lerp(10, 20, 0.25) // Returns: 12.5
 */
export function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

/**
 * Maps a number from one range to another.
 * @param value - The value to map
 * @param inMin - Input range minimum
 * @param inMax - Input range maximum
 * @param outMin - Output range minimum
 * @param outMax - Output range maximum
 * @returns Mapped value
 *
 * @example
 * mapRange(5, 0, 10, 0, 100) // Returns: 50
 * mapRange(25, 0, 100, 0, 1) // Returns: 0.25
 */
export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Calculates the percentage that a value represents of a total.
 * @param value - The value
 * @param total - The total
 * @param decimals - Number of decimal places (defaults to 2)
 * @returns Percentage value (0-100)
 *
 * @example
 * percentOf(25, 100) // Returns: 25
 * percentOf(1, 3, 2) // Returns: 33.33
 */
export function percentOf(value: number, total: number, decimals: number = 2): number {
    if (total === 0) return 0;
    const percent = (value / total) * 100;
    return parseFloat(percent.toFixed(decimals));
}

/**
 * Generates a random integer between min and max (inclusive).
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random integer
 *
 * @example
 * randomInt(1, 10) // Returns: random number between 1 and 10
 */
export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random float between min and max.
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Random float
 */
export function randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

/**
 * Checks if a number is even.
 * @param num - The number to check
 * @returns true if number is even
 */
export function isEven(num: number): boolean {
    return num % 2 === 0;
}

/**
 * Checks if a number is odd.
 * @param num - The number to check
 * @returns true if number is odd
 */
export function isOdd(num: number): boolean {
    return num % 2 !== 0;
}

/**
 * Safely divides two numbers, returning a default value if divisor is zero.
 * @param dividend - The number to divide
 * @param divisor - The number to divide by
 * @param defaultValue - Value to return if divisor is zero (defaults to 0)
 * @returns Division result or default value
 */
export function safeDivide(dividend: number, divisor: number, defaultValue: number = 0): number {
    return divisor === 0 ? defaultValue : dividend / divisor;
}
