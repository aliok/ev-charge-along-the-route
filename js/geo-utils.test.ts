import { describe, it, expect } from 'vitest';
import { kmToMeters, createGoogleMapsLink } from './geo-utils.js';

describe('geo-utils', () => {
  describe('kmToMeters', () => {
    it('should convert kilometers to meters', () => {
      expect(kmToMeters(1)).toBe(1000);
      expect(kmToMeters(5)).toBe(5000);
      expect(kmToMeters(0)).toBe(0);
    });

    it('should handle decimal values', () => {
      expect(kmToMeters(0.5)).toBe(500);
      expect(kmToMeters(2.5)).toBe(2500);
      expect(kmToMeters(1.234)).toBe(1234);
    });

    it('should handle large values', () => {
      expect(kmToMeters(100)).toBe(100000);
      expect(kmToMeters(1000)).toBe(1000000);
    });
  });

  describe('createGoogleMapsLink', () => {
    it('should create valid Google Maps URL from LatLngLiteral', () => {
      const location = { lat: 41.0082, lng: 28.9784 };
      const url = createGoogleMapsLink(location);
      expect(url).toBe('https://www.google.com/maps?q=41.0082,28.9784');
    });

    it('should handle negative coordinates', () => {
      const location = { lat: -33.8688, lng: 151.2093 };
      const url = createGoogleMapsLink(location);
      expect(url).toBe('https://www.google.com/maps?q=-33.8688,151.2093');
    });

    it('should handle zero coordinates', () => {
      const location = { lat: 0, lng: 0 };
      const url = createGoogleMapsLink(location);
      expect(url).toBe('https://www.google.com/maps?q=0,0');
    });

    it('should handle coordinates with many decimal places', () => {
      const location = { lat: 41.00823456, lng: 28.97841234 };
      const url = createGoogleMapsLink(location);
      expect(url).toBe('https://www.google.com/maps?q=41.00823456,28.97841234');
    });
  });
});
