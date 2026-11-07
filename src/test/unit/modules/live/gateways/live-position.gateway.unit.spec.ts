import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Logger } from '@nestjs/common';
import type { LoggerMock } from '@volontariapp/testing';
import { createMockLogger } from '@volontariapp/testing';
import type { NotificationService } from '../../../../../gateways/notification.service.js';
import { LivePositionGateway } from '../../../../../modules/live/gateways/live-position.gateway.js';
import { LiveNotifierService } from '../../../../../modules/live/services/live-notifier.service.js';
import {
  LivePositionService,
  type LivePositionResult,
} from '../../../../../modules/live/services/live-position.service.js';
import {
  LIVE_EVENT_ID,
  LIVE_NOW_MS,
  LIVE_USER_ID,
  createLiveGrant,
  createLivePositionPayload,
} from '../../../../helpers/factories/live.factory.js';
import { createSocketMock } from '../../../../helpers/factories/socket.factory.js';
import { createLiveCadenceRepositoryMock } from '../../../../helpers/mocks/live-cadence.repository.mock.js';
import { createLiveGrantRepositoryMock } from '../../../../helpers/mocks/live-grant.repository.mock.js';
import { createLivePositionRepositoryMock } from '../../../../helpers/mocks/live-position.repository.mock.js';
import { createLivePositionServiceMock } from '../../../../helpers/mocks/live-position.service.mock.js';
import { setupNestLoggerMock } from '../../../../helpers/mocks/nest-logger.mock.js';
import { createNotificationServiceMock } from '../../../../helpers/mocks/notification.service.mock.js';

const createAuthenticatedSocket = (userId: string = LIVE_USER_ID) => {
  const socket = createSocketMock('socket-1');
  Object.defineProperty(socket, 'data', { value: { userId }, writable: true });
  return socket;
};

const writtenLogs = (loggerMock: LoggerMock<Logger>): string =>
  JSON.stringify([
    loggerMock.log.mock.calls,
    loggerMock.warn.mock.calls,
    loggerMock.error.mock.calls,
    loggerMock.debug.mock.calls,
    loggerMock.verbose.mock.calls,
  ]);

describe('LivePositionGateway live.position (Unit)', () => {
  let positionServiceMock: jest.Mocked<LivePositionService>;
  let loggerMock: LoggerMock<Logger>;
  let gateway: LivePositionGateway;

  beforeEach(() => {
    positionServiceMock = createLivePositionServiceMock();
    loggerMock = createMockLogger<Logger>();
    setupNestLoggerMock(loggerMock);
    gateway = new LivePositionGateway(positionServiceMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('identity and payload', () => {
    it('ignores a message received before handleConnection set client.data.userId', async () => {
      const socket = createSocketMock('socket-1');

      await gateway.handlePosition(socket, createLivePositionPayload());

      expect(positionServiceMock.report).not.toHaveBeenCalled();
    });

    it.each([
      ['null', null],
      ['a string', 'live.position'],
      ['an array', [48.85, 2.35]],
      ['a missing eventId', { latitude: 48.85, longitude: 2.35 }],
      ['an eventId that could forge a key', createLivePositionPayload({ eventId: 'a:b' })],
      ['a string latitude', { ...createLivePositionPayload(), latitude: '48.85' }],
      ['a latitude above 90', createLivePositionPayload({ latitude: 90.5 })],
      ['a longitude below -180', createLivePositionPayload({ longitude: -180.5 })],
    ])('ignores a payload with %s', async (_label, payload) => {
      await gateway.handlePosition(createAuthenticatedSocket(), payload);

      expect(positionServiceMock.report).not.toHaveBeenCalled();
    });

    it('takes the user from the socket, never from the payload', async () => {
      await gateway.handlePosition(createAuthenticatedSocket('user-from-socket'), {
        ...createLivePositionPayload(),
        userId: 'user-from-payload',
      });

      expect(positionServiceMock.report).toHaveBeenCalledTimes(1);
      expect(positionServiceMock.report).toHaveBeenCalledWith(
        'user-from-socket',
        expect.objectContaining({ eventId: LIVE_EVENT_ID }),
      );
    });
  });

  describe('results', () => {
    it.each<[LivePositionResult['kind'], 'log' | 'debug' | null]>([
      ['REVOKED', 'log'],
      ['THROTTLED', 'debug'],
      ['ARRIVED', 'log'],
      ['ALREADY_STOPPED', null],
      ['FORWARDED', null],
    ])('handles %s', async (kind, level) => {
      positionServiceMock.report.mockResolvedValueOnce({ kind });
      loggerMock.log.mockClear();
      loggerMock.debug.mockClear();

      await gateway.handlePosition(createAuthenticatedSocket(), createLivePositionPayload());

      expect(loggerMock.log).toHaveBeenCalledTimes(level === 'log' ? 1 : 0);
      expect(loggerMock.debug).toHaveBeenCalledTimes(level === 'debug' ? 1 : 0);
    });
  });

  describe('failure handling', () => {
    it('swallows an infrastructure error instead of crashing the socket handler', async () => {
      positionServiceMock.report.mockRejectedValueOnce(new Error('redis down'));

      await expect(
        gateway.handlePosition(createAuthenticatedSocket(), createLivePositionPayload()),
      ).resolves.toBeUndefined();
      expect(loggerMock.error).toHaveBeenCalledTimes(1);
    });
  });
});

describe('LivePositionGateway privacy of logs (Unit)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('never writes a latitude or a longitude to the logs, on any branch', async () => {
    const grantsMock = createLiveGrantRepositoryMock();
    const cadenceMock = createLiveCadenceRepositoryMock();
    const notificationMock: jest.Mocked<NotificationService> = createNotificationServiceMock();
    const loggerMock = createMockLogger<Logger>();
    setupNestLoggerMock(loggerMock);
    jest.spyOn(Date, 'now').mockReturnValue(LIVE_NOW_MS);
    const gateway = new LivePositionGateway(
      new LivePositionService(
        grantsMock,
        cadenceMock,
        createLivePositionRepositoryMock(),
        new LiveNotifierService(notificationMock),
      ),
    );
    const payload = createLivePositionPayload({ latitude: 48.85663, longitude: 2.35224 });
    const socket = createAuthenticatedSocket();

    grantsMock.find.mockResolvedValueOnce(null);
    await gateway.handlePosition(socket, payload);

    grantsMock.find.mockResolvedValueOnce(createLiveGrant());
    cadenceMock.tryAcquire.mockResolvedValueOnce(false);
    await gateway.handlePosition(socket, payload);

    grantsMock.find.mockResolvedValueOnce(createLiveGrant());
    await gateway.handlePosition(socket, payload);

    grantsMock.find.mockResolvedValueOnce(createLiveGrant({ eventLatitude: 48.8527 }));
    grantsMock.removeWithAssociatedData.mockResolvedValueOnce(createLiveGrant());
    await gateway.handlePosition(socket, createLivePositionPayload({ latitude: 48.8541 }));

    grantsMock.find.mockRejectedValueOnce(new Error('redis down'));
    await gateway.handlePosition(socket, payload);

    await gateway.handlePosition(socket, {
      eventId: LIVE_EVENT_ID,
      latitude: 999,
      longitude: 2.35224,
    });

    const written = writtenLogs(loggerMock);
    for (const forbidden of [
      '48.85663',
      '2.35224',
      '48.857',
      '2.352',
      '48.8541',
      '48.854',
      '999',
    ]) {
      expect(written).not.toContain(forbidden);
    }
  });
});
