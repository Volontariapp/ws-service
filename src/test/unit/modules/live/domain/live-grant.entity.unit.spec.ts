import { describe, expect, it } from '@jest/globals';
import { LiveGrant } from '../../../../../modules/live/domain/live-grant.entity.js';
import { LIVE_GRANT_MAX_DURATION_MS } from '../../../../../modules/live/live.constants.js';
import {
  LIVE_NOW_MS,
  createLiveGrant,
  isoAfter,
} from '../../../../helpers/factories/live.factory.js';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

describe('LiveGrant (Unit)', () => {
  describe('expiryViolation', () => {
    it('accepts an expiry in the window', () => {
      const grant = createLiveGrant({ expiresAt: isoAfter(1000) });

      expect(grant.expiryViolation(LIVE_NOW_MS)).toBeNull();
    });

    it('accepts exactly the 8 hour ceiling', () => {
      const grant = createLiveGrant({ expiresAt: isoAfter(LIVE_GRANT_MAX_DURATION_MS) });

      expect(grant.expiryViolation(LIVE_NOW_MS)).toBeNull();
    });

    it.each([
      ['in the past', isoAfter(-1000)],
      ['equal to now', isoAfter(0)],
      ['not a date', 'tomorrow'],
    ])('rejects an expiresAt %s', (_label, expiresAt) => {
      expect(createLiveGrant({ expiresAt }).expiryViolation(LIVE_NOW_MS)).toBe(
        'expiresAt must be in the future',
      );
    });

    it('rejects an expiresAt beyond now plus 8 hours', () => {
      const grant = createLiveGrant({ expiresAt: isoAfter(LIVE_GRANT_MAX_DURATION_MS + 1000) });

      expect(grant.expiryViolation(LIVE_NOW_MS)).toBe('expiresAt must be at most 8 hours from now');
    });
  });

  describe('ttlSeconds', () => {
    it('is the exact number of seconds when the delay is round', () => {
      const grant = createLiveGrant({ expiresAt: isoAfter(TWO_HOURS_MS) });

      expect(grant.ttlSeconds(LIVE_NOW_MS)).toBe(7200);
    });

    it('rounds up to the next second and never goes below one second', () => {
      expect(createLiveGrant({ expiresAt: isoAfter(1500) }).ttlSeconds(LIVE_NOW_MS)).toBe(2);
      expect(createLiveGrant({ expiresAt: isoAfter(1) }).ttlSeconds(LIVE_NOW_MS)).toBe(1);
    });

    it('is 28800 at the 8 hour ceiling', () => {
      const grant = createLiveGrant({ expiresAt: isoAfter(LIVE_GRANT_MAX_DURATION_MS) });

      expect(grant.ttlSeconds(LIVE_NOW_MS)).toBe(28_800);
    });
  });

  describe('serialize and parse', () => {
    it('stores exactly the four stored fields', () => {
      const grant = createLiveGrant();

      expect(grant.serialize()).toBe(
        JSON.stringify({
          organizerId: grant.organizerId,
          eventLatitude: 48.8527,
          eventLongitude: 2.352,
          expiresAt: grant.expiresAt,
        }),
      );
    });

    it('reads back what it stored', () => {
      const grant = createLiveGrant();

      expect(LiveGrant.parse(grant.serialize())).toEqual(grant);
    });

    it.each([
      ['not json', '{not json'],
      ['a wrong shape', JSON.stringify({ organizerId: 1 })],
      ['null', 'null'],
      ['a string', '"grant"'],
      [
        'coordinates out of bounds',
        JSON.stringify({ organizerId: 'o', eventLatitude: 91, eventLongitude: 0, expiresAt: 'x' }),
      ],
    ])('returns null (fail closed) for %s', (_label, raw) => {
      expect(LiveGrant.parse(raw)).toBeNull();
    });
  });
});
