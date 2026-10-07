import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UserBadgeAwardedPostProcessor } from '../../../post-processors/users/user-badge-awarded.post-processor.js';
import { UserEventMessagingType, WebsocketMessagingType } from '@volontariapp/messaging';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';
import {
  createBatchBadgeAwardedItemMock,
  createBadgePayloadMock,
} from '../../helpers/factories/badge-awarded-stream-event.factory.js';
import type { NotificationService } from '../../../gateways/notification.service.js';

describe('UserBadgeAwardedPostProcessor (Unit)', () => {
  let postProcessor: UserBadgeAwardedPostProcessor;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let redisDriverMock: jest.Mocked<Redis>;
  let optionsMock: PostProcessorOptions;

  beforeEach(() => {
    notificationServiceMock = createNotificationServiceMock();
    redisDriverMock = createMock<Redis>();
    optionsMock = {
      streamName: 'stream:user:badge_awarded',
      groupName: 'ws-service',
      consumerName: 'test-consumer',
      batchSize: 10,
      blockMs: 1000,
      idempotencyTtlSeconds: 86400,
    };

    postProcessor = new UserBadgeAwardedPostProcessor(
      redisDriverMock,
      optionsMock,
      notificationServiceMock,
    );

    const mockLogger = {
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    Object.defineProperty(postProcessor, 'logger', { value: mockLogger, writable: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('shouldProcess', () => {
    it('should return true for USER_BADGE_AWARDED event type', () => {
      const result = postProcessor['shouldProcess'](UserEventMessagingType.USER_BADGE_AWARDED);
      expect(result).toBe(true);
    });

    it('should return false for other event types', () => {
      expect(postProcessor['shouldProcess'](UserEventMessagingType.USER_CREATED)).toBe(false);
      expect(postProcessor['shouldProcess'](UserEventMessagingType.USER_DELETED)).toBe(false);
      expect(postProcessor['shouldProcess']('unknown.event')).toBe(false);
    });
  });

  describe('processEvents', () => {
    it('should notify user via notificationService when event has userId and badges', async () => {
      const badge = createBadgePayloadMock();
      const batchItem = createBatchBadgeAwardedItemMock({
        userId: 'user-456',
        badges: [badge],
      });

      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([batchItem]);

      expect(notifyUserSpy).toHaveBeenCalledTimes(1);
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'user-456',
        WebsocketMessagingType.USER_BADGE_AWARDED,
        {
          badges: [badge],
        },
      );
    });

    it('should fallback to event.emitterId if payload.userId is not provided', async () => {
      const badge = createBadgePayloadMock();
      const batchItem = createBatchBadgeAwardedItemMock(
        {
          userId: '',
          badges: [badge],
        },
        'msg-456',
        {
          emitterId: 'emitter-user-789',
        },
      );

      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([batchItem]);

      expect(notifyUserSpy).toHaveBeenCalledTimes(1);
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'emitter-user-789',
        WebsocketMessagingType.USER_BADGE_AWARDED,
        {
          badges: [badge],
        },
      );
    });

    it('should skip notification when both userId and emitterId are absent', async () => {
      const badge = createBadgePayloadMock();
      const batchItem = createBatchBadgeAwardedItemMock(
        {
          userId: '',
          badges: [badge],
        },
        'msg-empty',
        {
          emitterId: '',
        },
      );

      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([batchItem]);

      expect(notifyUserSpy).not.toHaveBeenCalled();
    });

    it('should skip notification when badges array is empty', async () => {
      const batchItem = createBatchBadgeAwardedItemMock({
        userId: 'user-456',
        badges: [],
      });

      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([batchItem]);

      expect(notifyUserSpy).not.toHaveBeenCalled();
    });

    it('should process multiple batch items concurrently', async () => {
      const badge1 = createBadgePayloadMock({ id: 'b-1' });
      const badge2 = createBadgePayloadMock({ id: 'b-2' });

      const batchItem1 = createBatchBadgeAwardedItemMock(
        { userId: 'user-1', badges: [badge1] },
        'msg-1',
      );
      const batchItem2 = createBatchBadgeAwardedItemMock(
        { userId: 'user-2', badges: [badge2] },
        'msg-2',
      );

      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([batchItem1, batchItem2]);

      expect(notifyUserSpy).toHaveBeenCalledTimes(2);
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'user-1',
        WebsocketMessagingType.USER_BADGE_AWARDED,
        {
          badges: [badge1],
        },
      );
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'user-2',
        WebsocketMessagingType.USER_BADGE_AWARDED,
        {
          badges: [badge2],
        },
      );
    });
  });
});
