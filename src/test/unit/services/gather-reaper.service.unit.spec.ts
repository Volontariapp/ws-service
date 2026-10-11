import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { GatherReaperService } from '../../../core/services/gather-reaper.service.js';
import type { GatherStateRepository } from '../../../core/repositories/gather-state.repository.js';
import type { GatherStateService } from '../../../core/services/gather-state.service.js';
import type { NotificationService } from '../../../gateways/notification.service.js';
import { createMock } from '@volontariapp/testing';
import { EventStatus, GatherStateEntity } from '@volontariapp/database';
import {
  StorageEventMessagingType,
  UserEventMessagingType,
  WebsocketMessagingType,
} from '@volontariapp/messaging';
import { AppDataSource } from '../../../config/data-source.js';

describe('GatherReaperService (Unit)', () => {
  let service: GatherReaperService;
  let gatherStateRepositoryMock: jest.Mocked<GatherStateRepository>;
  let gatherStateServiceMock: jest.Mocked<GatherStateService>;
  let notificationServiceMock: jest.Mocked<NotificationService>;

  beforeEach(() => {
    gatherStateRepositoryMock = createMock<GatherStateRepository>();
    gatherStateServiceMock = createMock<GatherStateService>();
    notificationServiceMock = createMock<NotificationService>();

    service = new GatherReaperService(
      gatherStateRepositoryMock,
      gatherStateServiceMock,
      notificationServiceMock,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('reapExpiredGathers', () => {
    it('should return 0 when there are no gather states', async () => {
      const updateEventStateSpy = jest.spyOn(gatherStateServiceMock, 'updateEventState');
      gatherStateRepositoryMock.find.mockResolvedValue([]);

      const result = await service.reapExpiredGathers(60000);

      expect(result).toBe(0);
      expect(updateEventStateSpy).not.toHaveBeenCalled();
    });

    it('should skip keys that are not PENDING or not expired', async () => {
      const updateEventStateSpy = jest.spyOn(gatherStateServiceMock, 'updateEventState');
      const gatherState = new GatherStateEntity();
      gatherState.id = 'gather-1';
      gatherState.correlationId = 'corr-1';
      gatherState.triggerEvent = UserEventMessagingType.USER_DELETED;
      gatherState.gatherEventsState = {
        USER_SOCIAL_DELETED: {
          eventType: 'USER_SOCIAL_DELETED',
          status: EventStatus.SUCCESS,
          updatedAt: new Date(Date.now() - 100000).toISOString(),
        },
        USER_POST_DELETED: {
          eventType: 'USER_POST_DELETED',
          status: EventStatus.PENDING,
          updatedAt: new Date(Date.now() - 10000).toISOString(), // 10s old, maxAge is 60s
        },
      };

      gatherStateRepositoryMock.find.mockResolvedValue([gatherState]);

      const result = await service.reapExpiredGathers(60000);

      expect(result).toBe(0);
      expect(updateEventStateSpy).not.toHaveBeenCalled();
    });

    it('should fail expired keys and complete gather when all keys resolve', async () => {
      const gatherState = new GatherStateEntity();
      gatherState.id = 'gather-2';
      gatherState.correlationId = 'corr-2';
      gatherState.triggerEvent = UserEventMessagingType.USER_DELETED;
      gatherState.gatherEventsState = {
        [StorageEventMessagingType.USER_STORAGE_DELETED]: {
          eventType: StorageEventMessagingType.USER_STORAGE_DELETED,
          status: EventStatus.PENDING,
          updatedAt: new Date(Date.now() - 120000).toISOString(), // 120s old
        },
      };

      gatherStateRepositoryMock.find.mockResolvedValue([gatherState]);

      gatherStateServiceMock.updateEventState.mockResolvedValue({
        isComplete: true,
        isSuccess: false,
        failedEvents: [StorageEventMessagingType.USER_STORAGE_DELETED],
        gatherStateId: 'gather-2',
        metadata: {
          emitterId: 'user-123',
          traceId: 'trace-123',
          payload: { id: 'user-123' } as never,
        },
      });

      gatherStateServiceMock.getAggregationConfig.mockReturnValue({
        trigger: UserEventMessagingType.USER_DELETED,
        expects: [StorageEventMessagingType.USER_STORAGE_DELETED],
        successEvent: UserEventMessagingType.USER_DELETION_SUCCESSFULL,
        failureEvent: UserEventMessagingType.USER_DELETION_FAILED,
      });

      const mockTransactionalEntityManager = {
        getRepository: jest.fn().mockReturnValue({
          metadata: {
            primaryColumns: [{ propertyName: 'id' }],
            name: 'MockModel',
          },
          create: jest.fn().mockImplementation((dto) => dto),
          delete: jest.fn().mockResolvedValue({ affected: 1 } as never),
          save: jest.fn().mockResolvedValue({} as never),
        }),
      };
      jest.spyOn(AppDataSource, 'transaction').mockImplementation(((
        cb: (em: unknown) => Promise<unknown>,
      ) => {
        return cb(mockTransactionalEntityManager);
      }) as never);

      const updateEventStateSpy = jest.spyOn(gatherStateServiceMock, 'updateEventState');
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');
      const broadcastExceptSpy = jest.spyOn(notificationServiceMock, 'broadcastExcept');

      const result = await service.reapExpiredGathers(60000);

      expect(result).toBe(1);
      expect(updateEventStateSpy).toHaveBeenCalledWith(
        'corr-2',
        StorageEventMessagingType.USER_STORAGE_DELETED,
        EventStatus.FAILED,
        'Gather timeout reached',
      );
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'user-123',
        WebsocketMessagingType.USER_DELETION_FAILED,
        expect.objectContaining({
          id: 'user-123',
          isEmitter: true,
          failedEvents: [StorageEventMessagingType.USER_STORAGE_DELETED],
        }),
      );
      expect(broadcastExceptSpy).not.toHaveBeenCalled();
    });
  });

  describe('lifecycle', () => {
    it('should clear interval on module destroy', () => {
      service.onModuleInit();
      expect(() => {
        service.onModuleDestroy();
      }).not.toThrow();
    });
  });
});
