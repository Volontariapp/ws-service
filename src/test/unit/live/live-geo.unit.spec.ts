import { describe, expect, it } from '@jest/globals';
import {
  haversineDistanceM,
  isValidLatitude,
  isValidLongitude,
  roundCoordinate,
} from '../../../live/live-geo.js';

describe('live-geo (Unit)', () => {
  describe('haversineDistanceM', () => {
    it('is zero for identical points', () => {
      expect(
        haversineDistanceM(
          { latitude: 48.85, longitude: 2.35 },
          { latitude: 48.85, longitude: 2.35 },
        ),
      ).toBe(0);
    });

    it('matches a known distance: Paris to Lyon is about 392 km', () => {
      const paris = { latitude: 48.8566, longitude: 2.3522 };
      const lyon = { latitude: 45.764, longitude: 4.8357 };
      const kilometres = haversineDistanceM(paris, lyon) / 1000;

      expect(kilometres).toBeGreaterThan(390);
      expect(kilometres).toBeLessThan(394);
    });

    it('puts 0.00134 degrees of latitude under 150 m and 0.00135 above', () => {
      const origin = { latitude: 0, longitude: 0 };

      expect(haversineDistanceM(origin, { latitude: 0.00134, longitude: 0 })).toBeLessThan(150);
      expect(haversineDistanceM(origin, { latitude: 0.00135, longitude: 0 })).toBeGreaterThan(150);
    });

    it('is symmetric and handles the antimeridian', () => {
      const west = { latitude: 10, longitude: 179.9995 };
      const east = { latitude: 10, longitude: -179.9995 };

      expect(haversineDistanceM(west, east)).toBeCloseTo(haversineDistanceM(east, west), 6);
      expect(haversineDistanceM(west, east)).toBeLessThan(120);
    });
  });

  describe('roundCoordinate', () => {
    it.each([
      [48.85663, 48.857],
      [48.8564, 48.856],
      [2.35224, 2.352],
      [-33.8688, -33.869],
      [10, 10],
    ])('rounds %p to %p', (input, expected) => {
      expect(roundCoordinate(input)).toBe(expected);
    });

    it('normalises negative zero', () => {
      expect(Object.is(roundCoordinate(-0.0002), 0)).toBe(true);
    });
  });

  describe('bounds', () => {
    it('validates latitudes in [-90, 90]', () => {
      expect(isValidLatitude(90)).toBe(true);
      expect(isValidLatitude(-90)).toBe(true);
      expect(isValidLatitude(90.0001)).toBe(false);
      expect(isValidLatitude(Number.NaN)).toBe(false);
      expect(isValidLatitude('48')).toBe(false);
    });

    it('validates longitudes in [-180, 180]', () => {
      expect(isValidLongitude(180)).toBe(true);
      expect(isValidLongitude(-180)).toBe(true);
      expect(isValidLongitude(180.0001)).toBe(false);
      expect(isValidLongitude(Number.POSITIVE_INFINITY)).toBe(false);
      expect(isValidLongitude(null)).toBe(false);
    });
  });
});
