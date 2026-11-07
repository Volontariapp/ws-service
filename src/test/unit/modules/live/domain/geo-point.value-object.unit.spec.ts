import { describe, expect, it } from '@jest/globals';
import { GeoPoint } from '../../../../../modules/live/domain/geo-point.value-object.js';

const point = (latitude: number, longitude: number): GeoPoint =>
  GeoPoint.create(latitude, longitude);

describe('GeoPoint (Unit)', () => {
  describe('distanceTo', () => {
    it('is zero for identical points', () => {
      expect(point(48.85, 2.35).distanceTo(point(48.85, 2.35))).toBe(0);
    });

    it('matches a known distance: Paris to Lyon is about 392 km', () => {
      const kilometres = point(48.8566, 2.3522).distanceTo(point(45.764, 4.8357)) / 1000;

      expect(kilometres).toBeGreaterThan(390);
      expect(kilometres).toBeLessThan(394);
    });

    it('puts 0.00134 degrees of latitude under 150 m and 0.00135 above', () => {
      const origin = point(0, 0);

      expect(origin.distanceTo(point(0.00134, 0))).toBeLessThan(150);
      expect(origin.distanceTo(point(0.00135, 0))).toBeGreaterThan(150);
    });

    it('is symmetric and handles the antimeridian', () => {
      const west = point(10, 179.9995);
      const east = point(10, -179.9995);

      expect(west.distanceTo(east)).toBeCloseTo(east.distanceTo(west), 6);
      expect(west.distanceTo(east)).toBeLessThan(120);
    });
  });

  describe('rounded', () => {
    it.each([
      [48.85663, 48.857],
      [48.8564, 48.856],
      [2.35224, 2.352],
      [-33.8688, -33.869],
      [10, 10],
    ])('rounds %p to %p', (input, expected) => {
      expect(point(input, 0).rounded().latitude).toBe(expected);
    });

    it('normalises negative zero', () => {
      expect(Object.is(point(0, -0.0002).rounded().longitude, 0)).toBe(true);
    });

    it('does not mutate the original point', () => {
      const original = point(48.85663, 2.35224);

      original.rounded();

      expect(original.latitude).toBe(48.85663);
    });
  });

  describe('bounds', () => {
    it('validates latitudes in [-90, 90]', () => {
      expect(GeoPoint.isValid(90, 0)).toBe(true);
      expect(GeoPoint.isValid(-90, 0)).toBe(true);
      expect(GeoPoint.isValid(90.0001, 0)).toBe(false);
      expect(GeoPoint.isValid(Number.NaN, 0)).toBe(false);
      expect(GeoPoint.isValid('48', 0)).toBe(false);
    });

    it('validates longitudes in [-180, 180]', () => {
      expect(GeoPoint.isValid(0, 180)).toBe(true);
      expect(GeoPoint.isValid(0, -180)).toBe(true);
      expect(GeoPoint.isValid(0, 180.0001)).toBe(false);
      expect(GeoPoint.isValid(0, Number.POSITIVE_INFINITY)).toBe(false);
      expect(GeoPoint.isValid(0, null)).toBe(false);
    });

    it('refuses to create a point out of bounds', () => {
      expect(() => GeoPoint.create(91, 0)).toThrow(RangeError);
      expect(() => GeoPoint.create(0, -181)).toThrow(RangeError);
    });
  });
});
