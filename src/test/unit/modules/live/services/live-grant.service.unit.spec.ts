import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { LIVE_GRANT_MAX_DURATION_MS } from '../../../../../modules/live/live.constants.js';
import { RevokeLiveGrantCommandDTO } from '../../../../../modules/live/dto/request/command/revoke-live-grant.command.dto.js';
import type { ILiveGrantRepository } from '../../../../../modules/live/repositories/interfaces/live-grant.repository.js';
import { LiveGrantService } from '../../../../../modules/live/services/live-grant.service.js';
import type { LiveNotifierService } from '../../../../../modules/live/services/live-notifier.service.js';
import {
  LIVE_EVENT_ID,
  LIVE_NOW_MS,
  LIVE_ORGANIZER_ID,
  LIVE_USER_ID,
  createLiveGrant,
  createLiveGrantRequest,
  isoAfter,
} from '../../../../helpers/factories/live.factory.js';
import { createLiveGrantRepositoryMock } from '../../../../helpers/mocks/live-grant.repository.mock.js';
import { createLiveNotifierServiceMock } from '../../../../helpers/mocks/live-notifier.service.mock.js';

const revokeCommand = (reason?: string): RevokeLiveGrantCommandDTO =>
  RevokeLiveGrantCommandDTO.fromRequest(LIVE_EVENT_ID, LIVE_USER_ID, reason, undefined);

describe('LiveGrantService (Unit)', () => {
  let repositoryMock: jest.Mocked<ILiveGrantRepository>;
  let notifierMock: jest.Mocked<LiveNotifierService>;
  let service: LiveGrantService;

  beforeEach(() => {
    repositoryMock = createLiveGrantRepositoryMock();
    notifierMock = createLiveNotifierServiceMock();
    service = new LiveGrantService(repositoryMock, notifierMock);
    jest.spyOn(Date, 'now').mockReturnValue(LIVE_NOW_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('grant', () => {
    it('saves the grant for the pair with a TTL up to expiresAt', async () => {
      const request = createLiveGrantRequest({ expiresAt: isoAfter(2 * 60 * 60 * 1000) });

      await service.grant(request);

      expect(repositoryMock.save).toHaveBeenCalledTimes(1);
      expect(repositoryMock.save).toHaveBeenCalledWith(
        LIVE_EVENT_ID,
        LIVE_USER_ID,
        createLiveGrant({ expiresAt: request.expiresAt }),
        7200,
      );
    });

    it('rounds the TTL up to the next second and never goes below one second', async () => {
      await service.grant(createLiveGrantRequest({ expiresAt: isoAfter(1500) }));
      await service.grant(createLiveGrantRequest({ expiresAt: isoAfter(1) }));

      expect(repositoryMock.save.mock.calls.map((call) => call[3])).toEqual([2, 1]);
    });

    it('accepts exactly the 8 hour ceiling', async () => {
      await service.grant(
        createLiveGrantRequest({ expiresAt: isoAfter(LIVE_GRANT_MAX_DURATION_MS) }),
      );

      expect(repositoryMock.save.mock.calls.map((call) => call[3])).toEqual([28_800]);
    });

    it('rejects an expiresAt already in the past', async () => {
      await expect(
        service.grant(createLiveGrantRequest({ expiresAt: isoAfter(-1000) })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repositoryMock.save).not.toHaveBeenCalled();
    });

    it('rejects an expiresAt equal to now', async () => {
      await expect(
        service.grant(createLiveGrantRequest({ expiresAt: isoAfter(0) })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an expiresAt beyond now plus 8 hours', async () => {
      await expect(
        service.grant(
          createLiveGrantRequest({ expiresAt: isoAfter(LIVE_GRANT_MAX_DURATION_MS + 1000) }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repositoryMock.save).not.toHaveBeenCalled();
    });

    it('rejects an expiresAt that is not a date', async () => {
      await expect(
        service.grant(createLiveGrantRequest({ expiresAt: 'tomorrow' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('revoke', () => {
    it('removes the grant and tells the organizer why, with the reason of the command', async () => {
      repositoryMock.removeWithAssociatedData.mockResolvedValueOnce(createLiveGrant());

      await service.revoke(revokeCommand('ARRIVED'));

      expect(repositoryMock.removeWithAssociatedData).toHaveBeenCalledWith(
        LIVE_EVENT_ID,
        LIVE_USER_ID,
      );
      expect(notifierMock.notifySharingStopped).toHaveBeenCalledTimes(1);
      expect(notifierMock.notifySharingStopped).toHaveBeenCalledWith(
        LIVE_ORGANIZER_ID,
        LIVE_EVENT_ID,
        LIVE_USER_ID,
        'ARRIVED',
      );
    });

    it('defaults the reason to STOPPED', async () => {
      repositoryMock.removeWithAssociatedData.mockResolvedValueOnce(createLiveGrant());

      await service.revoke(revokeCommand());

      expect(notifierMock.notifySharingStopped).toHaveBeenCalledWith(
        LIVE_ORGANIZER_ID,
        LIVE_EVENT_ID,
        LIVE_USER_ID,
        'STOPPED',
      );
    });

    it('answers normally without notification when the grant no longer exists', async () => {
      repositoryMock.removeWithAssociatedData.mockResolvedValueOnce(null);

      await expect(service.revoke(revokeCommand('STOPPED'))).resolves.toBeUndefined();

      expect(notifierMock.notifySharingStopped).not.toHaveBeenCalled();
    });
  });
});
