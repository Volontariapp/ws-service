import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LiveWebsocketMessagingType } from '@volontariapp/messaging';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LiveInternalController } from '../../../live/live-internal.controller.js';
import { PutLiveGrantDto } from '../../../live/dto/put-live-grant.dto.js';
import type { LiveGrantService } from '../../../live/live-grant.service.js';
import type { NotificationService } from '../../../gateways/notification.service.js';
import {
  LIVE_EVENT_ID,
  LIVE_ORGANIZER_ID,
  LIVE_USER_ID,
  createLiveGrant,
  createLiveGrantRequest,
} from '../../helpers/factories/live.factory.js';
import { createLiveGrantServiceMock } from '../../helpers/mocks/live-grant.service.mock.js';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';

const validationErrorsFor = async (input: object): Promise<string[]> => {
  const errors = await validate(plainToInstance(PutLiveGrantDto, input), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors.map((error) => error.property);
};

describe('LiveInternalController (Unit)', () => {
  let grantServiceMock: jest.Mocked<LiveGrantService>;
  let notificationMock: jest.Mocked<NotificationService>;
  let controller: LiveInternalController;

  beforeEach(() => {
    grantServiceMock = createLiveGrantServiceMock();
    notificationMock = createNotificationServiceMock();
    controller = new LiveInternalController(grantServiceMock, notificationMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('PUT /internal/live/grants (body validation)', () => {
    it('accepts a valid body', async () => {
      await expect(validationErrorsFor(createLiveGrantRequest())).resolves.toEqual([]);
    });

    it.each(['eventId', 'userId', 'organizerId'] as const)('rejects an empty %s', async (field) => {
      await expect(validationErrorsFor(createLiveGrantRequest({ [field]: '' }))).resolves.toEqual([
        field,
      ]);
    });

    it('rejects identifiers that could forge a Redis key', async () => {
      await expect(
        validationErrorsFor(createLiveGrantRequest({ eventId: 'event-1:user-9' })),
      ).resolves.toEqual(['eventId']);
    });

    it.each([
      ['latitude above 90', { eventLatitude: 90.1 }, 'eventLatitude'],
      ['latitude below -90', { eventLatitude: -90.1 }, 'eventLatitude'],
      ['longitude above 180', { eventLongitude: 180.1 }, 'eventLongitude'],
      ['longitude below -180', { eventLongitude: -180.1 }, 'eventLongitude'],
      ['non finite latitude', { eventLatitude: Number.NaN }, 'eventLatitude'],
    ])('rejects %s', async (_label, override, property) => {
      await expect(validationErrorsFor(createLiveGrantRequest(override))).resolves.toEqual([
        property,
      ]);
    });

    it('rejects coordinates sent as strings', async () => {
      await expect(
        validationErrorsFor({ ...createLiveGrantRequest(), eventLatitude: '48.85' }),
      ).resolves.toEqual(['eventLatitude']);
    });

    it('accepts the coordinate bounds', async () => {
      await expect(
        validationErrorsFor(
          createLiveGrantRequest({
            eventLatitude: -90,
            eventLongitude: 180,
          }),
        ),
      ).resolves.toEqual([]);
    });

    it('rejects a non ISO 8601 expiresAt', async () => {
      await expect(
        validationErrorsFor(createLiveGrantRequest({ expiresAt: '07/11/2026 14:00' })),
      ).resolves.toEqual(['expiresAt']);
    });

    it('rejects unknown properties', async () => {
      await expect(
        validationErrorsFor({ ...createLiveGrantRequest(), role: 'ADMIN' }),
      ).resolves.toEqual(['role']);
    });
  });

  describe('PUT /internal/live/grants', () => {
    it('delegates to the grant service', async () => {
      const body = plainToInstance(PutLiveGrantDto, createLiveGrantRequest());

      await expect(controller.putGrant(body)).resolves.toBeUndefined();
      expect(grantServiceMock.grant).toHaveBeenCalledWith(body);
    });

    it('propagates the 400 raised for a bad expiry window', async () => {
      grantServiceMock.grant.mockRejectedValueOnce(new BadRequestException('expiresAt'));

      await expect(
        controller.putGrant(plainToInstance(PutLiveGrantDto, createLiveGrantRequest())),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('DELETE /internal/live/grants/:eventId/:userId', () => {
    it('removes the grant and notifies the organizer with the reason from the query', async () => {
      grantServiceMock.revoke.mockResolvedValueOnce(createLiveGrant());

      await controller.revokeGrant(LIVE_EVENT_ID, LIVE_USER_ID, 'ARRIVED', undefined);

      expect(grantServiceMock.revoke).toHaveBeenCalledWith(LIVE_EVENT_ID, LIVE_USER_ID);
      expect(notificationMock.notifyUser).toHaveBeenCalledTimes(1);
      expect(notificationMock.notifyUser).toHaveBeenCalledWith(
        LIVE_ORGANIZER_ID,
        LiveWebsocketMessagingType.LIVE_SHARING_STOPPED,
        { eventId: LIVE_EVENT_ID, userId: LIVE_USER_ID, reason: 'ARRIVED' },
      );
    });

    it('reads the reason from the body when the query has none', async () => {
      grantServiceMock.revoke.mockResolvedValueOnce(createLiveGrant());

      await controller.revokeGrant(LIVE_EVENT_ID, LIVE_USER_ID, undefined, { reason: 'LEFT' });

      expect(notificationMock.notifyUser).toHaveBeenCalledWith(
        LIVE_ORGANIZER_ID,
        LiveWebsocketMessagingType.LIVE_SHARING_STOPPED,
        { eventId: LIVE_EVENT_ID, userId: LIVE_USER_ID, reason: 'LEFT' },
      );
    });

    it('defaults the reason to STOPPED', async () => {
      grantServiceMock.revoke.mockResolvedValueOnce(createLiveGrant());

      await controller.revokeGrant(LIVE_EVENT_ID, LIVE_USER_ID, undefined, undefined);

      expect(notificationMock.notifyUser).toHaveBeenCalledWith(
        LIVE_ORGANIZER_ID,
        LiveWebsocketMessagingType.LIVE_SHARING_STOPPED,
        { eventId: LIVE_EVENT_ID, userId: LIVE_USER_ID, reason: 'STOPPED' },
      );
    });

    it.each(['REVOKED', 'EXPIRED', 'EVENT_ENDED', 'arrived', ''])(
      'rejects the reason %p with 400 and removes nothing',
      async (reason) => {
        await expect(
          controller.revokeGrant(LIVE_EVENT_ID, LIVE_USER_ID, reason, undefined),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(grantServiceMock.revoke).not.toHaveBeenCalled();
        expect(notificationMock.notifyUser).not.toHaveBeenCalled();
      },
    );

    it('rejects malformed path identifiers with 400', async () => {
      await expect(
        controller.revokeGrant('event-1:other', LIVE_USER_ID, undefined, undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        controller.revokeGrant(LIVE_EVENT_ID, 'user 1', undefined, undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(grantServiceMock.revoke).not.toHaveBeenCalled();
    });

    it('answers normally without notification when the grant no longer exists', async () => {
      grantServiceMock.revoke.mockResolvedValueOnce(null);

      await expect(
        controller.revokeGrant(LIVE_EVENT_ID, LIVE_USER_ID, 'STOPPED', undefined),
      ).resolves.toBeUndefined();

      expect(grantServiceMock.revoke).toHaveBeenCalledWith(LIVE_EVENT_ID, LIVE_USER_ID);
      expect(notificationMock.notifyUser).not.toHaveBeenCalled();
    });
  });
});
