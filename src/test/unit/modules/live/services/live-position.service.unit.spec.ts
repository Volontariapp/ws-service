import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { LivePositionCommandDTO } from '../../../../../modules/live/dto/request/command/live-position.command.dto.js';
import type { ILiveCadenceRepository } from '../../../../../modules/live/repositories/interfaces/live-cadence.repository.js';
import type { ILiveGrantRepository } from '../../../../../modules/live/repositories/interfaces/live-grant.repository.js';
import type { ILivePositionRepository } from '../../../../../modules/live/repositories/interfaces/live-position.repository.js';
import type { LiveNotifierService } from '../../../../../modules/live/services/live-notifier.service.js';
import { LivePositionService } from '../../../../../modules/live/services/live-position.service.js';
import {
  LIVE_EVENT_ID,
  LIVE_NOW_MS,
  LIVE_ORGANIZER_ID,
  LIVE_USER_ID,
  createLiveGrant,
  createLivePositionPayload,
} from '../../../../helpers/factories/live.factory.js';
import { createLiveCadenceRepositoryMock } from '../../../../helpers/mocks/live-cadence.repository.mock.js';
import { createLiveGrantRepositoryMock } from '../../../../helpers/mocks/live-grant.repository.mock.js';
import { createLiveNotifierServiceMock } from '../../../../helpers/mocks/live-notifier.service.mock.js';
import { createLivePositionRepositoryMock } from '../../../../helpers/mocks/live-position.repository.mock.js';

const UPDATED_AT = '2026-11-07T12:00:00.000Z';

const commandOf = (
  overrides: Partial<{ latitude: number; longitude: number }> = {},
): LivePositionCommandDTO =>
  plainToInstance(LivePositionCommandDTO, createLivePositionPayload(overrides));

describe('LivePositionService (Unit)', () => {
  let grantsMock: jest.Mocked<ILiveGrantRepository>;
  let cadenceMock: jest.Mocked<ILiveCadenceRepository>;
  let positionsMock: jest.Mocked<ILivePositionRepository>;
  let notifierMock: jest.Mocked<LiveNotifierService>;
  let service: LivePositionService;

  beforeEach(() => {
    grantsMock = createLiveGrantRepositoryMock();
    cadenceMock = createLiveCadenceRepositoryMock();
    positionsMock = createLivePositionRepositoryMock();
    notifierMock = createLiveNotifierServiceMock();
    jest.spyOn(Date, 'now').mockReturnValue(LIVE_NOW_MS);
    service = new LivePositionService(grantsMock, cadenceMock, positionsMock, notifierMock);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('step 1: authorization', () => {
    it('tells the sender the sharing is REVOKED when no grant exists, and stores nothing', async () => {
      grantsMock.find.mockResolvedValueOnce(null);

      await expect(service.report(LIVE_USER_ID, commandOf())).resolves.toEqual({ kind: 'REVOKED' });

      expect(grantsMock.find).toHaveBeenCalledWith(LIVE_EVENT_ID, LIVE_USER_ID);
      expect(notifierMock.notifySharingStopped).toHaveBeenCalledTimes(1);
      expect(notifierMock.notifySharingStopped).toHaveBeenCalledWith(
        LIVE_USER_ID,
        LIVE_EVENT_ID,
        LIVE_USER_ID,
        'REVOKED',
      );
      expect(cadenceMock.tryAcquire).not.toHaveBeenCalled();
      expect(positionsMock.save).not.toHaveBeenCalled();
    });
  });

  describe('step 2: cadence', () => {
    it('ignores the message when the last update is less than 10 s old', async () => {
      grantsMock.find.mockResolvedValueOnce(createLiveGrant());
      cadenceMock.tryAcquire.mockResolvedValueOnce(false);

      await expect(service.report(LIVE_USER_ID, commandOf())).resolves.toEqual({
        kind: 'THROTTLED',
      });

      expect(cadenceMock.tryAcquire).toHaveBeenCalledWith(LIVE_EVENT_ID, LIVE_USER_ID);
      expect(positionsMock.save).not.toHaveBeenCalled();
      expect(notifierMock.notifySharingStopped).not.toHaveBeenCalled();
      expect(notifierMock.notifyPositionUpdated).not.toHaveBeenCalled();
    });
  });

  describe('steps 3 and 4: rounding and storage', () => {
    it('rounds to exactly 3 decimals and stores the rounded value with the current time', async () => {
      grantsMock.find.mockResolvedValueOnce(createLiveGrant());

      await service.report(LIVE_USER_ID, commandOf({ latitude: 48.85663, longitude: 2.35224 }));

      expect(positionsMock.save).toHaveBeenCalledWith(LIVE_EVENT_ID, LIVE_USER_ID, {
        latitude: 48.857,
        longitude: 2.352,
        updatedAt: UPDATED_AT,
      });
    });

    it('rounds negative coordinates and never stores a negative zero', async () => {
      grantsMock.find.mockResolvedValueOnce(createLiveGrant());

      await service.report(LIVE_USER_ID, commandOf({ latitude: -33.8688, longitude: -0.0002 }));

      const stored = positionsMock.save.mock.calls[0]?.[2];
      expect(stored?.latitude).toBe(-33.869);
      expect(Object.is(stored?.longitude, 0)).toBe(true);
    });
  });

  describe('step 5: arrival fallback and organizer update', () => {
    it('sends the rounded position, and only that, to the organizer when far from the event', async () => {
      grantsMock.find.mockResolvedValueOnce(createLiveGrant());

      await expect(
        service.report(LIVE_USER_ID, commandOf({ latitude: 48.85663, longitude: 2.35224 })),
      ).resolves.toEqual({ kind: 'FORWARDED' });

      expect(notifierMock.notifyPositionUpdated).toHaveBeenCalledTimes(1);
      expect(notifierMock.notifyPositionUpdated).toHaveBeenCalledWith(
        LIVE_ORGANIZER_ID,
        LIVE_EVENT_ID,
        LIVE_USER_ID,
        { latitude: 48.857, longitude: 2.352, updatedAt: UPDATED_AT },
      );
      expect(notifierMock.notifySharingStopped).not.toHaveBeenCalled();
      expect(grantsMock.removeWithAssociatedData).not.toHaveBeenCalled();
    });

    it('stops the sharing as ARRIVED for both parties when the rounded position is within 150 m', async () => {
      // Evenement a 48.8527 : la position arrondie 48.854 est a environ 145 m.
      grantsMock.find.mockResolvedValueOnce(createLiveGrant({ eventLatitude: 48.8527 }));
      grantsMock.removeWithAssociatedData.mockResolvedValueOnce(
        createLiveGrant({ eventLatitude: 48.8527 }),
      );

      await expect(
        service.report(LIVE_USER_ID, commandOf({ latitude: 48.8541, longitude: 2.352 })),
      ).resolves.toEqual({ kind: 'ARRIVED' });

      expect(grantsMock.removeWithAssociatedData).toHaveBeenCalledWith(LIVE_EVENT_ID, LIVE_USER_ID);
      expect(notifierMock.notifySharingStopped).toHaveBeenCalledTimes(2);
      expect(notifierMock.notifySharingStopped).toHaveBeenCalledWith(
        LIVE_USER_ID,
        LIVE_EVENT_ID,
        LIVE_USER_ID,
        'ARRIVED',
      );
      expect(notifierMock.notifySharingStopped).toHaveBeenCalledWith(
        LIVE_ORGANIZER_ID,
        LIVE_EVENT_ID,
        LIVE_USER_ID,
        'ARRIVED',
      );
      expect(notifierMock.notifyPositionUpdated).not.toHaveBeenCalled();
    });

    it('measures the distance on the ROUNDED position, not on the raw one', async () => {
      // Evenement a 48.8524. Brute 48.8537 : environ 145 m (dedans). Arrondie 48.854 : environ
      // 178 m (dehors). Seule la position arrondie compte.
      grantsMock.find.mockResolvedValueOnce(createLiveGrant({ eventLatitude: 48.8524 }));

      await expect(
        service.report(LIVE_USER_ID, commandOf({ latitude: 48.8537, longitude: 2.352 })),
      ).resolves.toEqual({ kind: 'FORWARDED' });

      expect(grantsMock.removeWithAssociatedData).not.toHaveBeenCalled();
      expect(notifierMock.notifyPositionUpdated).toHaveBeenCalledTimes(1);
    });

    it('keeps sharing just outside the 150 m radius', async () => {
      // Evenement a 48.8525 : la position arrondie 48.854 est a environ 167 m.
      grantsMock.find.mockResolvedValueOnce(createLiveGrant({ eventLatitude: 48.8525 }));

      await expect(
        service.report(LIVE_USER_ID, commandOf({ latitude: 48.854, longitude: 2.352 })),
      ).resolves.toEqual({ kind: 'FORWARDED' });

      expect(grantsMock.removeWithAssociatedData).not.toHaveBeenCalled();
    });

    it('does not notify twice when a concurrent DELETE already removed the grant', async () => {
      grantsMock.find.mockResolvedValueOnce(createLiveGrant({ eventLatitude: 48.8527 }));
      grantsMock.removeWithAssociatedData.mockResolvedValueOnce(null);

      await expect(
        service.report(LIVE_USER_ID, commandOf({ latitude: 48.854, longitude: 2.352 })),
      ).resolves.toEqual({ kind: 'ALREADY_STOPPED' });

      expect(notifierMock.notifySharingStopped).not.toHaveBeenCalled();
      expect(notifierMock.notifyPositionUpdated).not.toHaveBeenCalled();
    });
  });

  describe('failure handling', () => {
    it('lets an infrastructure error reach the caller', async () => {
      grantsMock.find.mockRejectedValueOnce(new Error('redis down'));

      await expect(service.report(LIVE_USER_ID, commandOf())).rejects.toThrow('redis down');
      expect(notifierMock.notifySharingStopped).not.toHaveBeenCalled();
    });
  });
});
