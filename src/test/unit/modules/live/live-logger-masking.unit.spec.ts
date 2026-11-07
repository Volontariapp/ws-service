import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Logger } from '@volontariapp/logger';
import { LIVE_LOG_MASKING } from '../../../../modules/live/live.constants.js';

describe('Logger configured with LIVE_LOG_MASKING (Unit)', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const write = (logger: Logger, meta: object): string => {
    logger.info('live position', meta);
    return String(consoleLogSpy.mock.calls[0]?.[0]);
  };

  it('masks latitude and longitude keys in JSON output while keeping identifiers', () => {
    const logger = new Logger({ format: 'json', masking: LIVE_LOG_MASKING });

    const line = write(logger, {
      eventId: 'event-1',
      userId: 'user-1',
      latitude: 48.85663,
      longitude: 2.35224,
    });

    expect(line).not.toContain('48.85663');
    expect(line).not.toContain('2.35224');
    expect(line).toContain('[REDACTED]');
    expect(line).toContain('event-1');
    expect(line).toContain('user-1');
  });

  it('masks nested coordinates and camel case variants such as eventLatitude', () => {
    const logger = new Logger({ format: 'json', masking: LIVE_LOG_MASKING });

    const line = write(logger, {
      grant: { eventLatitude: 48.8527, eventLongitude: 2.352 },
      positions: [{ userId: 'user-1', latitude: 48.857, longitude: 2.352 }],
    });

    expect(line).not.toContain('48.8527');
    expect(line).not.toContain('48.857');
    expect(line).not.toContain('2.352');
  });

  it('masks in text format too', () => {
    const logger = new Logger({ format: 'text', masking: LIVE_LOG_MASKING });

    const line = write(logger, { latitude: 48.85663, longitude: 2.35224 });

    expect(line).not.toContain('48.85663');
    expect(line).not.toContain('2.35224');
  });

  it('does not mask these keys without the configuration (guards against a silent default change)', () => {
    const logger = new Logger({ format: 'json' });

    const line = write(logger, { latitude: 48.85663 });

    expect(line).toContain('48.85663');
  });

  it('does not mask unrelated keys that merely contain "lat"', () => {
    expect(LIVE_LOG_MASKING.keys).toEqual(['latitude', 'longitude']);
    const logger = new Logger({ format: 'json', masking: LIVE_LOG_MASKING });

    const line = write(logger, { relation: 'friend', template: 'welcome' });

    expect(line).toContain('friend');
    expect(line).toContain('welcome');
  });

  it('known limit: a coordinate interpolated in the message string is NOT masked', () => {
    const logger = new Logger({ format: 'json', masking: LIVE_LOG_MASKING });

    logger.info('position 48.85663');

    expect(String(consoleLogSpy.mock.calls[0]?.[0])).toContain('48.85663');
  });
});
