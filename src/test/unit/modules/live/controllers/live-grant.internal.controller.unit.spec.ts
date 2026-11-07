import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { LiveGrantInternalController } from '../../../../../modules/live/controllers/live-grant.internal.controller.js';
import { PutLiveGrantCommandDTO } from '../../../../../modules/live/dto/request/command/put-live-grant.command.dto.js';
import type { LiveGrantService } from '../../../../../modules/live/services/live-grant.service.js';
import {
  LIVE_EVENT_ID,
  LIVE_USER_ID,
  createLiveGrantRequest,
} from '../../../../helpers/factories/live.factory.js';
import { createLiveGrantServiceMock } from '../../../../helpers/mocks/live-grant.service.mock.js';

describe('LiveGrantInternalController (Unit)', () => {
  let grantServiceMock: jest.Mocked<LiveGrantService>;
  let controller: LiveGrantInternalController;

  beforeEach(() => {
    grantServiceMock = createLiveGrantServiceMock();
    controller = new LiveGrantInternalController(grantServiceMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('PUT /internal/live/grants', () => {
    it('delegates to the grant service', async () => {
      const body = plainToInstance(PutLiveGrantCommandDTO, createLiveGrantRequest());

      await expect(controller.putGrant(body)).resolves.toBeUndefined();
      expect(grantServiceMock.grant).toHaveBeenCalledWith(body);
    });

    it('propagates the 400 raised for a bad expiry window', async () => {
      grantServiceMock.grant.mockRejectedValueOnce(new BadRequestException('expiresAt'));

      await expect(
        controller.putGrant(plainToInstance(PutLiveGrantCommandDTO, createLiveGrantRequest())),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('DELETE /internal/live/grants/:eventId/:userId', () => {
    it('delegates a revoke command carrying the reason of the query', async () => {
      await controller.revokeGrant(LIVE_EVENT_ID, LIVE_USER_ID, 'ARRIVED', undefined);

      expect(grantServiceMock.revoke).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: LIVE_EVENT_ID,
          userId: LIVE_USER_ID,
          reason: 'ARRIVED',
        }),
      );
    });

    it('reads the reason from the body when the query has none', async () => {
      await controller.revokeGrant(LIVE_EVENT_ID, LIVE_USER_ID, undefined, { reason: 'LEFT' });

      expect(grantServiceMock.revoke).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'LEFT' }),
      );
    });

    it('defaults the reason to STOPPED', async () => {
      await controller.revokeGrant(LIVE_EVENT_ID, LIVE_USER_ID, undefined, undefined);

      expect(grantServiceMock.revoke).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'STOPPED' }),
      );
    });

    it.each(['REVOKED', 'EXPIRED', 'EVENT_ENDED', 'arrived', ''])(
      'rejects the reason %p with 400 and removes nothing',
      async (reason) => {
        await expect(
          controller.revokeGrant(LIVE_EVENT_ID, LIVE_USER_ID, reason, undefined),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(grantServiceMock.revoke).not.toHaveBeenCalled();
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

    it('answers normally when the service finds no grant to remove', async () => {
      await expect(
        controller.revokeGrant(LIVE_EVENT_ID, LIVE_USER_ID, 'STOPPED', undefined),
      ).resolves.toBeUndefined();
    });
  });
});
