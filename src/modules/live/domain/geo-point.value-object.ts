import {
  LIVE_COORDINATE_DECIMALS,
  LIVE_MAX_LATITUDE,
  LIVE_MAX_LONGITUDE,
} from '../live.constants.js';

const EARTH_RADIUS_M = 6_371_000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const isWithin = (value: unknown, bound: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= -bound && value <= bound;

const roundCoordinate = (value: number): number => {
  const factor = 10 ** LIVE_COORDINATE_DECIMALS;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
};

export class GeoPoint {
  private constructor(
    readonly latitude: number,
    readonly longitude: number,
  ) {}

  static isValid(latitude: unknown, longitude: unknown): boolean {
    return isWithin(latitude, LIVE_MAX_LATITUDE) && isWithin(longitude, LIVE_MAX_LONGITUDE);
  }

  static create(latitude: unknown, longitude: unknown): GeoPoint {
    if (!isWithin(latitude, LIVE_MAX_LATITUDE) || !isWithin(longitude, LIVE_MAX_LONGITUDE)) {
      throw new RangeError('Coordinates out of bounds');
    }
    return new GeoPoint(latitude, longitude);
  }

  /** Point reduit a la precision conservee par le serveur (3 decimales). */
  rounded(): GeoPoint {
    return new GeoPoint(roundCoordinate(this.latitude), roundCoordinate(this.longitude));
  }

  /** Distance orthodromique en metres (formule de haversine). */
  distanceTo(other: GeoPoint): number {
    const deltaLat = toRadians(other.latitude - this.latitude);
    const deltaLon = toRadians(other.longitude - this.longitude);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(toRadians(this.latitude)) *
        Math.cos(toRadians(other.latitude)) *
        Math.sin(deltaLon / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
  }
}
