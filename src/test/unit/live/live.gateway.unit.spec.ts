import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LiveWebsocketMessagingType } from '@volontariapp/messaging';
import type { Logger } from '@nestjs/common';
import type { LoggerMock } from '@volontariapp/testing';
import { createMockLogger } from '@volontariapp/testing';
import { LiveGateway } from '../../../live/live.gateway.js';
import type { LiveGrantService } from '../../../live/live-grant.service.js';
import type { NotificationService } from '../../../gateways/notification.service.js';
import {
  LIVE_EVENT_ID,
  LIVE_NOW_MS,
  LIVE_ORGANIZER_ID,
  LIVE_USER_ID,
  createLiveGrant,
  createLivePositionPayload,
} from '../../helpers/factories/live.factory.js';
import { createSocketMock } from '../../helpers/factories/socket.factory.js';
import { createLiveGrantServiceMock } from '../../helpers/mocks/live-grant.service.mock.js';
import { setupNestLoggerMock } from '../../helpers/mocks/nest-logger.mock.js';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';

const createAuthenticatedSocket = (userId: string = LIVE_USER_ID) => {
  const socket = createSocketMock('socket-1');
  Object.defineProperty(socket, 'data', { value: { userId }, writable: true });
  return socket;
};

describe('LiveGateway live.position (Unit)', () => {
  let grantServiceMock: jest.Mocked<LiveGrantService>;
  let notificationMock: jest.Mocked<NotificationService>;
  let loggerMock: LoggerMock<Logger>;
  let gateway: LiveGateway;

  beforeEach(() => {
    grantServiceMock = createLiveGrantServiceMock();
    notificationMock = createNotificationServiceMock();
    loggerMock = createMockLogger<Logger>();
    setupNestLoggerMock(loggerMock);
    jest.spyOn(Date, 'now').mockReturnValue(LIVE_NOW_MS);
    gateway = new LiveGateway(grantServiceMock, notificationMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('step 0: identity and payload', () => {
    it('ignores a message received before handleConnection set client.data.userId', async () => {
      const socket = createSocketMock('socket-1');

      await gateway.handlePosition(socket, createLivePositionPayload());

      expect(grantServiceMock.getGrant).not.toHaveBeenCalled();
      expect(notificationMock.notifyUser).not.toHaveBeenCalled();
    });

    it.each([
      ['null', null],
      ['a string', 'live.position'],
      ['an array', [48.85, 2.35]],
      ['a missing eventId', { latitude: 48.85, longitude: 2.35 }],
      ['an empty eventId', createLivePositionPayload({ eventId: '' })],
      ['an eventId that could forge a key', createLivePositionPayload({ eventId: 'a:b' })],
      ['a numeric eventId', { ...createLivePositionPayload(), eventId: 12 }],
      ['a string latitude', { ...createLivePositionPayload(), latitude: '48.85' }],
      ['a string longitude', { ...createLivePositionPayload(), longitude: '2.35' }],
      ['a NaN latitude', createLivePositionPayload({ latitude: Number.NaN })],
      ['an infinite longitude', createLivePositionPayload({ longitude: Number.POSITIVE_INFINITY })],
      ['a latitude above 90', createLivePositionPayload({ latitude: 90.5 })],
      ['a latitude below -90', createLivePositionPayload({ latitude: -90.5 })],
      ['a longitude above 180', createLivePositionPayload({ longitude: 180.5 })],
      ['a longitude below -180', createLivePositionPayload({ longitude: -180.5 })],
    ])('ignores a payload with %s', async (_label, payload) => {
      await gateway.handlePosition(createAuthenticatedSocket(), payload);

      expect(grantServiceMock.getGrant).not.toHaveBeenCalled();
      expect(notificationMock.notifyUser).not.toHaveBeenCalled();
    });

    it('takes the user from the socket, never from the payload', async () => {
      await gateway.handlePosition(createAuthenticatedSocket('user-from-socket'), {
        ...createLivePositionPayload(),
        userId: 'user-from-payload',
      });

      expect(grantServiceMock.getGrant).toHaveBeenCalledWith(LIVE_EVENT_ID, 'user-from-socket');
    });
  });

  describe('step 1: authorization', () => {
    it('tells the sender the sharing is REVOKED when no grant exists, and stores nothing', async () => {
      grantServiceMock.getGrant.mockResolvedValueOnce(null);

      await gateway.handlePosition(createAuthenticatedSocket(), createLivePositionPayload());

      expect(grantServiceMock.getGrant).toHaveBeenCalledWith(LIVE_EVENT_ID, LIVE_USER_ID);
      expect(notificationMock.notifyUser).toHaveBeenCalledTimes(1);
      expect(notificationMock.notifyUser).toHaveBeenCalledWith(
        LIVE_USER_ID,
        LiveWebsocketMessagingType.LIVE_SHARING_STOPPED,
        { eventId: LIVE_EVENT_ID, userId: LIVE_USER_ID, reason: 'REVOKED' },
      );
      expect(grantServiceMock.acquireCadenceSlot).not.toHaveBeenCalled();
      expect(grantServiceMock.storePosition).not.toHaveBeenCalled();
    });
  });

  describe('step 2: cadence', () => {
    it('ignores the message when the last update is less than 10 s old', async () => {
      grantServiceMock.getGrant.mockResolvedValueOnce(createLiveGrant());
      grantServiceMock.acquireCadenceSlot.mockResolvedValueOnce(false);

      await gateway.handlePosition(createAuthenticatedSocket(), createLivePositionPayload());

      expect(grantServiceMock.acquireCadenceSlot).toHaveBeenCalledWith(LIVE_EVENT_ID, LIVE_USER_ID);
      expect(grantServiceMock.storePosition).not.toHaveBeenCalled();
      expect(notificationMock.notifyUser).not.toHaveBeenCalled();
    });
  });

  describe('steps 3 and 4: rounding and storage', () => {
    it('rounds to exactly 3 decimals and stores the rounded value with the current time', async () => {
      grantServiceMock.getGrant.mockResolvedValueOnce(createLiveGrant());

      await gateway.handlePosition(
        createAuthenticatedSocket(),
        createLivePositionPayload({ latitude: 48.85663, longitude: 2.35224 }),
      );

      expect(grantServiceMock.storePosition).toHaveBeenCalledWith(LIVE_EVENT_ID, LIVE_USER_ID, {
        latitude: 48.857,
        longitude: 2.352,
        updatedAt: '2026-11-07T12:00:00.000Z',
      });
    });

    it('rounds negative coordinates and never stores a negative zero', async () => {
      grantServiceMock.getGrant.mockResolvedValueOnce(createLiveGrant());

      await gateway.handlePosition(
        createAuthenticatedSocket(),
        createLivePositionPayload({ latitude: -33.8688, longitude: -0.0002 }),
      );

      const stored = grantServiceMock.storePosition.mock.calls[0]?.[2];
      expect(stored?.latitude).toBe(-33.869);
      expect(Object.is(stored?.longitude, 0)).toBe(true);
    });
  });

  describe('step 5: arrival fallback and organizer update', () => {
    it('sends the rounded position, and only that, to the organizer when far from the event', async () => {
      grantServiceMock.getGrant.mockResolvedValueOnce(createLiveGrant());

      await gateway.handlePosition(
        createAuthenticatedSocket(),
        createLivePositionPayload({ latitude: 48.85663, longitude: 2.35224 }),
      );

      expect(notificationMock.notifyUser).toHaveBeenCalledTimes(1);
      expect(notificationMock.notifyUser).toHaveBeenCalledWith(
        LIVE_ORGANIZER_ID,
        LiveWebsocketMessagingType.LIVE_POSITIONS_UPDATED,
        {
          eventId: LIVE_EVENT_ID,
          positions: [
            {
              userId: LIVE_USER_ID,
              latitude: 48.857,
              longitude: 2.352,
              updatedAt: '2026-11-07T12:00:00.000Z',
            },
          ],
        },
      );
      expect(grantServiceMock.revoke).not.toHaveBeenCalled();
    });

    it('stops the sharing as ARRIVED for both parties when the rounded position is within 150 m', async () => {
      // Evenement a 48.8527 : la position arrondie 48.854 est a environ 145 m.
      grantServiceMock.getGrant.mockResolvedValueOnce(createLiveGrant({ eventLatitude: 48.8527 }));
      grantServiceMock.revoke.mockResolvedValueOnce(createLiveGrant({ eventLatitude: 48.8527 }));

      await gateway.handlePosition(
        createAuthenticatedSocket(),
        createLivePositionPayload({ latitude: 48.8541, longitude: 2.352 }),
      );

      expect(grantServiceMock.revoke).toHaveBeenCalledWith(LIVE_EVENT_ID, LIVE_USER_ID);
      expect(notificationMock.notifyUser).toHaveBeenCalledTimes(2);
      expect(notificationMock.notifyUser).toHaveBeenCalledWith(
        LIVE_USER_ID,
        LiveWebsocketMessagingType.LIVE_SHARING_STOPPED,
        { eventId: LIVE_EVENT_ID, userId: LIVE_USER_ID, reason: 'ARRIVED' },
      );
      expect(notificationMock.notifyUser).toHaveBeenCalledWith(
        LIVE_ORGANIZER_ID,
        LiveWebsocketMessagingType.LIVE_SHARING_STOPPED,
        { eventId: LIVE_EVENT_ID, userId: LIVE_USER_ID, reason: 'ARRIVED' },
      );
      expect(notificationMock.notifyUser).not.toHaveBeenCalledWith(
        LIVE_ORGANIZER_ID,
        LiveWebsocketMessagingType.LIVE_POSITIONS_UPDATED,
        expect.anything(),
      );
    });

    it('measures the distance on the ROUNDED position, not on the raw one', async () => {
      // Evenement a 48.8524. Brute 48.8537 : environ 145 m (dedans). Arrondie 48.854 : environ
      // 178 m (dehors). Seule la position arrondie compte.
      grantServiceMock.getGrant.mockResolvedValueOnce(createLiveGrant({ eventLatitude: 48.8524 }));

      await gateway.handlePosition(
        createAuthenticatedSocket(),
        createLivePositionPayload({ latitude: 48.8537, longitude: 2.352 }),
      );

      expect(grantServiceMock.revoke).not.toHaveBeenCalled();
      expect(notificationMock.notifyUser).toHaveBeenCalledWith(
        LIVE_ORGANIZER_ID,
        LiveWebsocketMessagingType.LIVE_POSITIONS_UPDATED,
        expect.anything(),
      );
    });

    it('keeps sharing just outside the 150 m radius', async () => {
      // Evenement a 48.8525 : la position arrondie 48.854 est a environ 167 m.
      grantServiceMock.getGrant.mockResolvedValueOnce(createLiveGrant({ eventLatitude: 48.8525 }));

      await gateway.handlePosition(
        createAuthenticatedSocket(),
        createLivePositionPayload({ latitude: 48.854, longitude: 2.352 }),
      );

      expect(grantServiceMock.revoke).not.toHaveBeenCalled();
      expect(notificationMock.notifyUser).toHaveBeenCalledWith(
        LIVE_ORGANIZER_ID,
        LiveWebsocketMessagingType.LIVE_POSITIONS_UPDATED,
        expect.anything(),
      );
    });

    it('does not notify twice when a concurrent DELETE already removed the grant', async () => {
      grantServiceMock.getGrant.mockResolvedValueOnce(createLiveGrant({ eventLatitude: 48.8527 }));
      grantServiceMock.revoke.mockResolvedValueOnce(null);

      await gateway.handlePosition(
        createAuthenticatedSocket(),
        createLivePositionPayload({ latitude: 48.854, longitude: 2.352 }),
      );

      expect(notificationMock.notifyUser).not.toHaveBeenCalled();
    });
  });

  describe('failure handling', () => {
    it('swallows an infrastructure error instead of crashing the socket handler', async () => {
      grantServiceMock.getGrant.mockRejectedValueOnce(new Error('redis down'));

      await expect(
        gateway.handlePosition(createAuthenticatedSocket(), createLivePositionPayload()),
      ).resolves.toBeUndefined();
      expect(notificationMock.notifyUser).not.toHaveBeenCalled();
    });
  });

  describe('privacy of logs', () => {
    it('never writes a latitude or a longitude to the logs, on any branch', async () => {
      const rawLatitude = 48.85663;
      const rawLongitude = 2.35224;
      const payload = createLivePositionPayload({ latitude: rawLatitude, longitude: rawLongitude });
      const socket = createAuthenticatedSocket();

      grantServiceMock.getGrant.mockResolvedValueOnce(null);
      await gateway.handlePosition(socket, payload);

      grantServiceMock.getGrant.mockResolvedValueOnce(createLiveGrant());
      grantServiceMock.acquireCadenceSlot.mockResolvedValueOnce(false);
      await gateway.handlePosition(socket, payload);

      grantServiceMock.getGrant.mockResolvedValueOnce(createLiveGrant());
      await gateway.handlePosition(socket, payload);

      grantServiceMock.getGrant.mockResolvedValueOnce(createLiveGrant({ eventLatitude: 48.8527 }));
      grantServiceMock.revoke.mockResolvedValueOnce(createLiveGrant());
      await gateway.handlePosition(socket, createLivePositionPayload({ latitude: 48.8541 }));

      grantServiceMock.getGrant.mockRejectedValueOnce(new Error('redis down'));
      await gateway.handlePosition(socket, payload);

      await gateway.handlePosition(socket, {
        eventId: LIVE_EVENT_ID,
        latitude: 999,
        longitude: 2.35224,
      });

      const written = JSON.stringify([
        loggerMock.log.mock.calls,
        loggerMock.warn.mock.calls,
        loggerMock.error.mock.calls,
        loggerMock.debug.mock.calls,
        loggerMock.verbose.mock.calls,
      ]);
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
});
