/**
 * String utility functions for common string operations.
 */

/**
 * Truncates a string to a maximum length and adds ellipsis if needed.
 * @param str - The string to truncate
 * @param maxLength - Maximum length (including ellipsis)
 * @param ellipsis - Optional ellipsis string (defaults to '...')
 * @returns Truncated string
 *
 * @example
 * truncate("Hello World", 8) // Returns: "Hello..."
 * truncate("Hello", 10) // Returns: "Hello"
 */
export function truncate(str: string, maxLength: number, ellipsis: string = '...'): string {
    if (!str || str.length <= maxLength) {
        return str;
    }
    return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Capitalizes the first letter of a string.
 * @param str - The string to capitalize
 * @returns Capitalized string
 *
 * @example
 * capitalize("hello") // Returns: "Hello"
 */
export function capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a string to title case (capitalizes first letter of each word).
 * @param str - The string to convert
 * @returns Title-cased string
 *
 * @example
 * toTitleCase("hello world") // Returns: "Hello World"
 */
export function toTitleCase(str: string): string {
    if (!str) return str;
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Checks if a string is empty or contains only whitespace.
 * @param str - The string to check
 * @returns true if empty or whitespace only
 *
 * @example
 * isEmpty("  ") // Returns: true
 * isEmpty("hello") // Returns: false
 */
export function isEmpty(str: string | null | undefined): boolean {
    return !str || str.trim().length === 0;
}

/**
 * Checks if a string is not empty and not just whitespace.
 * @param str - The string to check
 * @returns true if string has content
 *
 * @example
 * isNotEmpty("hello") // Returns: true
 * isNotEmpty("  ") // Returns: false
 */
export function isNotEmpty(str: string | null | undefined): boolean {
    return !isEmpty(str);
}

/**
 * Removes all whitespace from a string.
 * @param str - The string to process
 * @returns String with all whitespace removed
 *
 * @example
 * removeWhitespace("hello world") // Returns: "helloworld"
 */
export function removeWhitespace(str: string): string {
    return str.replace(/\s+/g, '');
}

/**
 * Normalizes whitespace by replacing multiple spaces with single space.
 * @param str - The string to normalize
 * @returns String with normalized whitespace
 *
 * @example
 * normalizeWhitespace("hello    world") // Returns: "hello world"
 */
export function normalizeWhitespace(str: string): string {
    return str.replace(/\s+/g, ' ').trim();
}

/**
 * Escapes HTML special characters to prevent XSS attacks.
 * @param str - The string to escape
 * @returns HTML-safe string
 *
 * @example
 * escapeHtml("<script>alert('xss')</script>")
 * // Returns: "&lt;script&gt;alert('xss')&lt;/script&gt;"
 */
export function escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Sanitizes a string for use in URLs.
 * @param str - The string to sanitize
 * @returns URL-safe string
 *
 * @example
 * sanitizeForUrl("Hello World!") // Returns: "hello-world"
 */
export function sanitizeForUrl(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Pads a string to a minimum length with a character.
 * @param str - The string to pad
 * @param length - Minimum length
 * @param char - Character to use for padding (defaults to space)
 * @param padStart - true to pad at start, false for end (defaults to true)
 * @returns Padded string
 *
 * @example
 * pad("5", 3, "0") // Returns: "005"
 * pad("5", 3, "0", false) // Returns: "500"
 */
export function pad(str: string, length: number, char: string = ' ', padStart: boolean = true): string {
    if (str.length >= length) return str;
    const padding = char.repeat(length - str.length);
    return padStart ? padding + str : str + padding;
}

/**
 * Checks if a string contains another string (case-insensitive).
 * @param haystack - The string to search in
 * @param needle - The string to search for
 * @returns true if needle is found in haystack
 *
 * @example
 * containsIgnoreCase("Hello World", "world") // Returns: true
 */
export function containsIgnoreCase(haystack: string, needle: string): boolean {
    return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Checks if a string starts with another string (case-insensitive).
 * @param str - The string to check
 * @param prefix - The prefix to check for
 * @returns true if str starts with prefix
 */
export function startsWithIgnoreCase(str: string, prefix: string): boolean {
    return str.toLowerCase().startsWith(prefix.toLowerCase());
}

/**
 * Checks if a string ends with another string (case-insensitive).
 * @param str - The string to check
 * @param suffix - The suffix to check for
 * @returns true if str ends with suffix
 */
export function endsWithIgnoreCase(str: string, suffix: string): boolean {
    return str.toLowerCase().endsWith(suffix.toLowerCase());
}

/**
 * Extracts all numbers from a string.
 * @param str - The string to extract from
 * @returns Array of numbers found in the string
 *
 * @example
 * extractNumbers("I have 5 apples and 3 oranges") // Returns: [5, 3]
 */
export function extractNumbers(str: string): number[] {
    const matches = str.match(/-?\d+\.?\d*/g);
    return matches ? matches.map(Number) : [];
}

/**
 * Pluralizes a word based on count.
 * @param count - The count to check
 * @param singular - Singular form of the word
 * @param plural - Optional plural form (defaults to singular + 's')
 * @returns Plural or singular form based on count
 *
 * @example
 * pluralize(1, "item") // Returns: "item"
 * pluralize(2, "item") // Returns: "items"
 * pluralize(2, "person", "people") // Returns: "people"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
    return count === 1 ? singular : (plural || singular + 's');
}

/**
 * Formats a count with its pluralized label.
 * @param count - The count
 * @param singular - Singular form of the word
 * @param plural - Optional plural form
 * @returns Formatted string with count and label
 *
 * @example
 * formatCount(5, "item") // Returns: "5 items"
 * formatCount(1, "person", "people") // Returns: "1 person"
 */
export function formatCount(count: number, singular: string, plural?: string): string {
    return `${count} ${pluralize(count, singular, plural)}`;
}
