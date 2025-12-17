import { describe, it, expect } from 'vitest';
import { isValidNumber, isNonNegativeNumber } from './validation-utils.js';

describe('validation-utils', () => {
  describe('isValidNumber', () => {
    it('should return true for valid finite numbers', () => {
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(42)).toBe(true);
      expect(isValidNumber(-10)).toBe(true);
      expect(isValidNumber(3.14)).toBe(true);
      expect(isValidNumber(-0.5)).toBe(true);
    });

    it('should return false for NaN', () => {
      expect(isValidNumber(NaN)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(isValidNumber(Infinity)).toBe(false);
      expect(isValidNumber(-Infinity)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isValidNumber('42')).toBe(false);
      expect(isValidNumber(null)).toBe(false);
      expect(isValidNumber(undefined)).toBe(false);
      expect(isValidNumber({})).toBe(false);
      expect(isValidNumber([])).toBe(false);
    });
  });

  describe('isNonNegativeNumber', () => {
    it('should return true for valid non-negative numbers', () => {
      expect(isNonNegativeNumber(0)).toBe(true);
      expect(isNonNegativeNumber(42)).toBe(true);
      expect(isNonNegativeNumber(3.14)).toBe(true);
    });

    it('should return false for negative numbers', () => {
      expect(isNonNegativeNumber(-1)).toBe(false);
      expect(isNonNegativeNumber(-10)).toBe(false);
      expect(isNonNegativeNumber(-0.5)).toBe(false);
    });

    it('should return false for invalid numbers', () => {
      expect(isNonNegativeNumber(NaN)).toBe(false);
      expect(isNonNegativeNumber(Infinity)).toBe(false);
      expect(isNonNegativeNumber('42')).toBe(false);
      expect(isNonNegativeNumber(null)).toBe(false);
    });
  });
});
