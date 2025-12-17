import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStorageItem,
  setStorageItem,
  toggleSetItem,
  setToArray,
  arrayToSet,
} from './storage-utils.js';

describe('storage-utils', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('getStorageItem', () => {
    it('should return null for non-existent key', () => {
      expect(getStorageItem('nonexistent')).toBe(null);
    });

    it('should retrieve and parse stored JSON', () => {
      localStorage.setItem('test', JSON.stringify({ foo: 'bar' }));
      expect(getStorageItem('test')).toEqual({ foo: 'bar' });
    });

    it('should return null for invalid JSON', () => {
      localStorage.setItem('invalid', 'not valid json {');
      expect(getStorageItem('invalid')).toBe(null);
    });

    it('should handle arrays', () => {
      localStorage.setItem('array', JSON.stringify([1, 2, 3]));
      expect(getStorageItem('array')).toEqual([1, 2, 3]);
    });
  });

  describe('setStorageItem', () => {
    it('should store JSON successfully', () => {
      const result = setStorageItem('test', { foo: 'bar' });
      expect(result).toBe(true);
      expect(localStorage.getItem('test')).toBe('{"foo":"bar"}');
    });

    it('should store arrays', () => {
      const result = setStorageItem('array', [1, 2, 3]);
      expect(result).toBe(true);
      expect(localStorage.getItem('array')).toBe('[1,2,3]');
    });

    it('should store primitive values', () => {
      setStorageItem('number', 42);
      expect(getStorageItem('number')).toBe(42);

      setStorageItem('string', 'hello');
      expect(getStorageItem('string')).toBe('hello');

      setStorageItem('boolean', true);
      expect(getStorageItem('boolean')).toBe(true);
    });
  });

  describe('toggleSetItem', () => {
    it('should add item if not present and return true', () => {
      const set = new Set([1, 2, 3]);
      const result = toggleSetItem(set, 4);
      expect(result).toBe(true);
      expect(set.has(4)).toBe(true);
      expect(set.size).toBe(4);
    });

    it('should remove item if present and return false', () => {
      const set = new Set([1, 2, 3]);
      const result = toggleSetItem(set, 2);
      expect(result).toBe(false);
      expect(set.has(2)).toBe(false);
      expect(set.size).toBe(2);
    });

    it('should work with string sets', () => {
      const set = new Set(['a', 'b', 'c']);
      toggleSetItem(set, 'd');
      expect(set.has('d')).toBe(true);

      toggleSetItem(set, 'a');
      expect(set.has('a')).toBe(false);
    });
  });

  describe('setToArray', () => {
    it('should convert Set to Array', () => {
      const set = new Set([1, 2, 3]);
      const array = setToArray(set);
      expect(array).toEqual([1, 2, 3]);
      expect(Array.isArray(array)).toBe(true);
    });

    it('should handle empty Set', () => {
      const set = new Set();
      expect(setToArray(set)).toEqual([]);
    });

    it('should preserve order', () => {
      const set = new Set(['z', 'a', 'm']);
      expect(setToArray(set)).toEqual(['z', 'a', 'm']);
    });
  });

  describe('arrayToSet', () => {
    it('should convert Array to Set', () => {
      const array = [1, 2, 3];
      const set = arrayToSet(array);
      expect(set).toBeInstanceOf(Set);
      expect(set.size).toBe(3);
      expect(set.has(2)).toBe(true);
    });

    it('should handle null and return empty Set', () => {
      expect(arrayToSet(null)).toEqual(new Set());
    });

    it('should handle undefined and return empty Set', () => {
      expect(arrayToSet(undefined)).toEqual(new Set());
    });

    it('should remove duplicates', () => {
      const array = [1, 2, 2, 3, 3, 3];
      const set = arrayToSet(array);
      expect(set.size).toBe(3);
    });
  });
});
