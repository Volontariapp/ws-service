import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UserSocialDeletedFailedPostProcessor } from '../../../post-processors/users/user-social-deleted-failed.post-processor.js';
import { UserPostDeletedPostProcessor } from '../../../post-processors/users/user-post-deleted.post-processor.js';
import { UserPostDeletedFailedPostProcessor } from '../../../post-processors/users/user-post-deleted-failed.post-processor.js';
import { UserEventDeletedPostProcessor } from '../../../post-processors/users/user-event-deleted.post-processor.js';
import { UserEventDeletedFailedPostProcessor } from '../../../post-processors/users/user-event-deleted-failed.post-processor.js';
import { UserStorageDeletedPostProcessor } from '../../../post-processors/users/user-storage-deleted.post-processor.js';
import { UserStorageDeletedFailedPostProcessor } from '../../../post-processors/users/user-storage-deleted-failed.post-processor.js';
import {
  SocialEventMessagingType,
  PostEventMessagingType,
  EventEventMessagingType,
  StorageEventMessagingType,
  UserEventMessagingType,
  WebsocketMessagingType,
} from '@volontariapp/messaging';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import type { NotificationService } from '../../../gateways/notification.service.js';
import type { GatherStateService } from '../../../core/services/gather-state.service.js';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import { EventStatus } from '@volontariapp/database';
import { AppDataSource } from '../../../config/data-source.js';
import { SOURCE_TRACEPARENT } from '../../helpers/factories/trace.factory.js';

describe('User Deletion Gather Post-Processors (Unit)', () => {
  let redisMock: jest.Mocked<Redis>;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let gatherStateServiceMock: jest.Mocked<GatherStateService>;
  let optionsMock: PostProcessorOptions;

  beforeEach(() => {
    redisMock = createMock<Redis>();
    notificationServiceMock = createMock<NotificationService>();
    gatherStateServiceMock = createMock<GatherStateService>();
    optionsMock = {
      streamName: 'test-stream',
      groupName: 'test-group',
      consumerName: 'test-consumer',
      batchSize: 10,
      blockMs: 1000,
      idempotencyTtlSeconds: 86400,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('UserSocialDeletedFailedPostProcessor', () => {
    let processor: UserSocialDeletedFailedPostProcessor;

    beforeEach(() => {
      processor = new UserSocialDeletedFailedPostProcessor(
        redisMock,
        optionsMock,
        notificationServiceMock,
        gatherStateServiceMock,
      );
    });

    it('should return true for USER_SOCIAL_DELETION_FAILED', () => {
      expect(processor['shouldProcess'](SocialEventMessagingType.USER_SOCIAL_DELETION_FAILED)).toBe(
        true,
      );
      expect(processor['shouldProcess'](SocialEventMessagingType.USER_SOCIAL_DELETED)).toBe(false);
    });

    it('should update event state with FAILED status', async () => {
      gatherStateServiceMock.updateEventState.mockResolvedValue({
        isComplete: false,
      });

      const eventItem = {
        messageId: 'msg-1',
        event: {
          id: 'evt-1',
          version: 1,
          type: SocialEventMessagingType.USER_SOCIAL_DELETION_FAILED,
          emitter: 'ms-social',
          emitterId: 'user-1',
          correlationId: 'corr-1',
          traceId: 'trace-1',
          traceparent: SOURCE_TRACEPARENT,
          createdAt: new Date().toISOString(),
          payload: {
            before: undefined,
            after: { userId: 'user-1', errorReason: 'Neo4j connection error' },
          },
        },
      };

      const updateEventStateSpy = jest.spyOn(gatherStateServiceMock, 'updateEventState');

      await processor['processEvents']([eventItem]);

      expect(updateEventStateSpy).toHaveBeenCalledWith(
        'corr-1',
        'USER_SOCIAL_DELETED',
        EventStatus.FAILED,
        'Neo4j connection error',
      );
    });
  });

  describe('UserPostDeletedPostProcessor', () => {
    let processor: UserPostDeletedPostProcessor;

    beforeEach(() => {
      processor = new UserPostDeletedPostProcessor(
        redisMock,
        optionsMock,
        notificationServiceMock,
        gatherStateServiceMock,
      );
    });

    it('should return true for USER_POST_DELETED', () => {
      expect(processor['shouldProcess'](PostEventMessagingType.USER_POST_DELETED)).toBe(true);
      expect(processor['shouldProcess'](PostEventMessagingType.USER_POST_DELETION_FAILED)).toBe(
        false,
      );
    });

    it('should update event state with SUCCESS and notify only emitter with isEmitter: true on completion', async () => {
      gatherStateServiceMock.updateEventState.mockResolvedValue({
        isComplete: true,
        isSuccess: true,
        gatherStateId: 'gather-post',
        metadata: {
          emitterId: 'user-1',
          traceId: 'trace-1',
          traceparent: SOURCE_TRACEPARENT,
          payload: { id: 'user-1' } as never,
        },
      });

      gatherStateServiceMock.getAggregationConfig.mockReturnValue({
        trigger: UserEventMessagingType.USER_DELETED,
        expects: [
          SocialEventMessagingType.USER_SOCIAL_DELETED,
          PostEventMessagingType.USER_POST_DELETED,
          EventEventMessagingType.USER_EVENT_DELETED,
          StorageEventMessagingType.USER_STORAGE_DELETED,
        ],
        successEvent: UserEventMessagingType.USER_DELETION_SUCCESSFULL,
        failureEvent: UserEventMessagingType.USER_DELETION_FAILED,
      });

      const mockEntityManager = {
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
        return cb(mockEntityManager);
      }) as never);

      const eventItem = {
        messageId: 'msg-2',
        event: {
          id: 'evt-2',
          version: 1,
          type: PostEventMessagingType.USER_POST_DELETED,
          emitter: 'ms-post',
          emitterId: 'user-1',
          correlationId: 'corr-1',
          traceId: 'trace-1',
          traceparent: SOURCE_TRACEPARENT,
          createdAt: new Date().toISOString(),
          payload: {
            before: undefined,
            after: { userId: 'user-1' },
          },
        },
      };

      const updateEventStateSpy = jest.spyOn(gatherStateServiceMock, 'updateEventState');
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');
      const broadcastExceptSpy = jest.spyOn(notificationServiceMock, 'broadcastExcept');
      const broadcastSpy = jest.spyOn(notificationServiceMock, 'broadcast');

      await processor['processEvents']([eventItem]);

      expect(updateEventStateSpy).toHaveBeenCalledWith(
        'corr-1',
        'USER_POST_DELETED',
        EventStatus.SUCCESS,
        undefined,
      );
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'user-1',
        WebsocketMessagingType.USER_DELETED,
        expect.objectContaining({
          id: 'user-1',
          isEmitter: true,
        }),
      );
      expect(broadcastExceptSpy).not.toHaveBeenCalled();
      expect(broadcastSpy).not.toHaveBeenCalled();
    });
  });

  describe('UserPostDeletedFailedPostProcessor', () => {
    let processor: UserPostDeletedFailedPostProcessor;

    beforeEach(() => {
      processor = new UserPostDeletedFailedPostProcessor(
        redisMock,
        optionsMock,
        notificationServiceMock,
        gatherStateServiceMock,
      );
    });

    it('should return true for USER_POST_DELETION_FAILED', () => {
      expect(processor['shouldProcess'](PostEventMessagingType.USER_POST_DELETION_FAILED)).toBe(
        true,
      );
    });
  });

  describe('UserEventDeletedPostProcessor', () => {
    let processor: UserEventDeletedPostProcessor;

    beforeEach(() => {
      processor = new UserEventDeletedPostProcessor(
        redisMock,
        optionsMock,
        notificationServiceMock,
        gatherStateServiceMock,
      );
    });

    it('should return true for USER_EVENT_DELETED', () => {
      expect(processor['shouldProcess'](EventEventMessagingType.USER_EVENT_DELETED)).toBe(true);
    });
  });

  describe('UserEventDeletedFailedPostProcessor', () => {
    let processor: UserEventDeletedFailedPostProcessor;

    beforeEach(() => {
      processor = new UserEventDeletedFailedPostProcessor(
        redisMock,
        optionsMock,
        notificationServiceMock,
        gatherStateServiceMock,
      );
    });

    it('should return true for USER_EVENT_DELETION_FAILED', () => {
      expect(processor['shouldProcess'](EventEventMessagingType.USER_EVENT_DELETION_FAILED)).toBe(
        true,
      );
    });
  });

  describe('UserStorageDeletedPostProcessor', () => {
    let processor: UserStorageDeletedPostProcessor;

    beforeEach(() => {
      processor = new UserStorageDeletedPostProcessor(
        redisMock,
        optionsMock,
        notificationServiceMock,
        gatherStateServiceMock,
      );
    });

    it('should return true for USER_STORAGE_DELETED', () => {
      expect(processor['shouldProcess'](StorageEventMessagingType.USER_STORAGE_DELETED)).toBe(true);
    });
  });

  describe('UserStorageDeletedFailedPostProcessor', () => {
    let processor: UserStorageDeletedFailedPostProcessor;

    beforeEach(() => {
      processor = new UserStorageDeletedFailedPostProcessor(
        redisMock,
        optionsMock,
        notificationServiceMock,
        gatherStateServiceMock,
      );
    });

    it('should return true for USER_STORAGE_DELETION_FAILED', () => {
      expect(
        processor['shouldProcess'](StorageEventMessagingType.USER_STORAGE_DELETION_FAILED),
      ).toBe(true);
    });
  });
});
