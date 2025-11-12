/**
 * LocalStorage utility functions.
 */

/**
 * Safely retrieves and parses JSON from localStorage.
 * Returns null if key doesn't exist or parsing fails.
 */
export function getStorageItem<T>(key: string): T | null {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return null;
        return JSON.parse(item) as T;
    } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        return null;
    }
}

/**
 * Safely stores a value as JSON in localStorage.
 */
export function setStorageItem<T>(key: string, value: T): boolean {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Error writing localStorage key "${key}":`, error);
        return false;
    }
}

/**
 * Removes an item from localStorage.
 */
export function removeStorageItem(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Error removing localStorage key "${key}":`, error);
    }
}

/**
 * Toggles an item in a Set - adds if not present, removes if present.
 * Returns true if item was added, false if removed.
 */
export function toggleSetItem<T>(set: Set<T>, item: T): boolean {
    if (set.has(item)) {
        set.delete(item);
        return false;
    } else {
        set.add(item);
        return true;
    }
}

/**
 * Converts a Set to an array for JSON serialization.
 */
export function setToArray<T>(set: Set<T>): T[] {
    return Array.from(set);
}

/**
 * Creates a Set from an array (for deserialization).
 */
export function arrayToSet<T>(array: T[] | null | undefined): Set<T> {
    return new Set(array || []);
}

