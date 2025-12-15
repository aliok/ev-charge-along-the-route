/**
 * Collection utility functions for working with arrays, sets, and maps.
 */

/**
 * Removes duplicate values from an array.
 * @param arr - The array to deduplicate
 * @returns Array with unique values
 *
 * @example
 * unique([1, 2, 2, 3, 1]) // Returns: [1, 2, 3]
 */
export function unique<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}

/**
 * Chunks an array into smaller arrays of specified size.
 * @param arr - The array to chunk
 * @param size - Size of each chunk
 * @returns Array of chunks
 *
 * @example
 * chunk([1, 2, 3, 4, 5], 2) // Returns: [[1, 2], [3, 4], [5]]
 */
export function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

/**
 * Flattens a nested array one level deep.
 * @param arr - The array to flatten
 * @returns Flattened array
 *
 * @example
 * flatten([[1, 2], [3, 4], [5]]) // Returns: [1, 2, 3, 4, 5]
 */
export function flatten<T>(arr: T[][]): T[] {
    return arr.flat();
}

/**
 * Groups array items by a key function.
 * @param arr - The array to group
 * @param keyFn - Function that returns the group key for each item
 * @returns Map of grouped items
 *
 * @example
 * const items = [{type: 'a', val: 1}, {type: 'b', val: 2}, {type: 'a', val: 3}];
 * groupBy(items, item => item.type)
 * // Returns: Map { 'a' => [{type: 'a', val: 1}, {type: 'a', val: 3}], 'b' => [{type: 'b', val: 2}] }
 */
export function groupBy<T, K>(arr: T[], keyFn: (item: T) => K): Map<K, T[]> {
    const groups = new Map<K, T[]>();
    for (const item of arr) {
        const key = keyFn(item);
        const group = groups.get(key) || [];
        group.push(item);
        groups.set(key, group);
    }
    return groups;
}

/**
 * Counts occurrences of each item in an array.
 * @param arr - The array to count
 * @returns Map of items to their counts
 *
 * @example
 * countBy(['a', 'b', 'a', 'c', 'a']) // Returns: Map { 'a' => 3, 'b' => 1, 'c' => 1 }
 */
export function countBy<T>(arr: T[]): Map<T, number> {
    const counts = new Map<T, number>();
    for (const item of arr) {
        counts.set(item, (counts.get(item) || 0) + 1);
    }
    return counts;
}

/**
 * Finds the first item in an array that matches a predicate.
 * Returns undefined if no match found.
 * @param arr - The array to search
 * @param predicate - Function to test each item
 * @returns First matching item or undefined
 */
export function findFirst<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
    return arr.find(predicate);
}

/**
 * Finds the last item in an array that matches a predicate.
 * @param arr - The array to search
 * @param predicate - Function to test each item
 * @returns Last matching item or undefined
 */
export function findLast<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
    for (let i = arr.length - 1; i >= 0; i--) {
        if (predicate(arr[i])) {
            return arr[i];
        }
    }
    return undefined;
}

/**
 * Partitions an array into two arrays based on a predicate.
 * @param arr - The array to partition
 * @param predicate - Function to test each item
 * @returns Tuple of [matching items, non-matching items]
 *
 * @example
 * partition([1, 2, 3, 4, 5], x => x % 2 === 0)
 * // Returns: [[2, 4], [1, 3, 5]]
 */
export function partition<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
    const pass: T[] = [];
    const fail: T[] = [];
    for (const item of arr) {
        if (predicate(item)) {
            pass.push(item);
        } else {
            fail.push(item);
        }
    }
    return [pass, fail];
}

/**
 * Takes the first N items from an array.
 * @param arr - The array
 * @param n - Number of items to take
 * @returns Array of first N items
 */
export function take<T>(arr: T[], n: number): T[] {
    return arr.slice(0, n);
}

/**
 * Skips the first N items from an array.
 * @param arr - The array
 * @param n - Number of items to skip
 * @returns Array without first N items
 */
export function skip<T>(arr: T[], n: number): T[] {
    return arr.slice(n);
}

/**
 * Checks if two arrays have the same elements (shallow equality).
 * @param arr1 - First array
 * @param arr2 - Second array
 * @returns true if arrays are equal
 */
export function arrayEquals<T>(arr1: T[], arr2: T[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((item, index) => item === arr2[index]);
}

/**
 * Checks if an array contains all items from another array.
 * @param arr - The array to check
 * @param items - Items to look for
 * @returns true if all items are found
 */
export function containsAll<T>(arr: T[], items: T[]): boolean {
    return items.every(item => arr.includes(item));
}

/**
 * Checks if an array contains any item from another array.
 * @param arr - The array to check
 * @param items - Items to look for
 * @returns true if any item is found
 */
export function containsAny<T>(arr: T[], items: T[]): boolean {
    return items.some(item => arr.includes(item));
}

/**
 * Returns the intersection of two arrays (items in both).
 * @param arr1 - First array
 * @param arr2 - Second array
 * @returns Array of common items
 *
 * @example
 * intersection([1, 2, 3], [2, 3, 4]) // Returns: [2, 3]
 */
export function intersection<T>(arr1: T[], arr2: T[]): T[] {
    const set2 = new Set(arr2);
    return arr1.filter(item => set2.has(item));
}

/**
 * Returns the difference of two arrays (items in first but not second).
 * @param arr1 - First array
 * @param arr2 - Second array
 * @returns Array of items only in first array
 *
 * @example
 * difference([1, 2, 3], [2, 3, 4]) // Returns: [1]
 */
export function difference<T>(arr1: T[], arr2: T[]): T[] {
    const set2 = new Set(arr2);
    return arr1.filter(item => !set2.has(item));
}

/**
 * Returns the union of two arrays (all unique items from both).
 * @param arr1 - First array
 * @param arr2 - Second array
 * @returns Array of all unique items
 *
 * @example
 * union([1, 2, 3], [2, 3, 4]) // Returns: [1, 2, 3, 4]
 */
export function union<T>(arr1: T[], arr2: T[]): T[] {
    return unique([...arr1, ...arr2]);
}

/**
 * Sorts an array by a key function.
 * @param arr - The array to sort
 * @param keyFn - Function that returns the sort key
 * @param descending - true for descending order
 * @returns Sorted array (new array, original not modified)
 */
export function sortBy<T>(arr: T[], keyFn: (item: T) => number | string, descending: boolean = false): T[] {
    const sorted = [...arr].sort((a, b) => {
        const aKey = keyFn(a);
        const bKey = keyFn(b);
        if (aKey < bKey) return descending ? 1 : -1;
        if (aKey > bKey) return descending ? -1 : 1;
        return 0;
    });
    return sorted;
}

/**
 * Gets the minimum value from an array by a key function.
 * @param arr - The array
 * @param keyFn - Function that returns the value to compare
 * @returns Item with minimum value, or undefined if array is empty
 */
export function minBy<T>(arr: T[], keyFn: (item: T) => number): T | undefined {
    if (arr.length === 0) return undefined;
    return arr.reduce((min, item) => keyFn(item) < keyFn(min) ? item : min);
}

/**
 * Gets the maximum value from an array by a key function.
 * @param arr - The array
 * @param keyFn - Function that returns the value to compare
 * @returns Item with maximum value, or undefined if array is empty
 */
export function maxBy<T>(arr: T[], keyFn: (item: T) => number): T | undefined {
    if (arr.length === 0) return undefined;
    return arr.reduce((max, item) => keyFn(item) > keyFn(max) ? item : max);
}

/**
 * Sums numeric values in an array.
 * @param arr - Array of numbers
 * @returns Sum of all numbers
 */
export function sum(arr: number[]): number {
    return arr.reduce((total, num) => total + num, 0);
}

/**
 * Calculates the average of numeric values in an array.
 * @param arr - Array of numbers
 * @returns Average value, or 0 if array is empty
 */
export function average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return sum(arr) / arr.length;
}

/**
 * Shuffles an array (Fisher-Yates algorithm).
 * @param arr - The array to shuffle
 * @returns Shuffled array (new array, original not modified)
 */
export function shuffle<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Picks a random item from an array.
 * @param arr - The array
 * @returns Random item, or undefined if array is empty
 */
export function sample<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Compacts an array by removing falsy values (false, null, 0, "", undefined, NaN).
 * @param arr - The array to compact
 * @returns Array without falsy values
 */
export function compact<T>(arr: T[]): NonNullable<T>[] {
    return arr.filter(Boolean) as NonNullable<T>[];
}
