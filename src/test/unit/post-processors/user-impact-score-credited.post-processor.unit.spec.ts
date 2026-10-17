import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UserImpactScoreCreditedPostProcessor } from '../../../post-processors/users/user-impact-score-credited.post-processor.js';
import { UserEventMessagingType, WebsocketMessagingType } from '@volontariapp/messaging';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';
import { createBatchImpactScoreCreditedItemMock } from '../../helpers/factories/impact-score-credited-stream-event.factory.js';
import type { NotificationService } from '../../../gateways/notification.service.js';

describe('UserImpactScoreCreditedPostProcessor (Unit)', () => {
  let postProcessor: UserImpactScoreCreditedPostProcessor;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let redisDriverMock: jest.Mocked<Redis>;
  let optionsMock: PostProcessorOptions;

  beforeEach(() => {
    notificationServiceMock = createNotificationServiceMock();
    redisDriverMock = createMock<Redis>();
    optionsMock = {
      streamName: 'stream:user:impact_score_credited',
      groupName: 'ws-service',
      consumerName: 'test-consumer',
      batchSize: 10,
      blockMs: 1000,
      idempotencyTtlSeconds: 86400,
    };

    postProcessor = new UserImpactScoreCreditedPostProcessor(
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
    it('should accept USER_IMPACT_SCORE_CREDITED only', () => {
      expect(
        postProcessor['shouldProcess'](UserEventMessagingType.USER_IMPACT_SCORE_CREDITED),
      ).toBe(true);
      expect(postProcessor['shouldProcess'](UserEventMessagingType.USER_BADGE_AWARDED)).toBe(false);
      expect(postProcessor['shouldProcess']('unknown.event')).toBe(false);
    });
  });

  describe('processEvents', () => {
    it('should push the credited score to the user without gathering', async () => {
      const batchItem = createBatchImpactScoreCreditedItemMock({
        userId: 'user-456',
        eventId: 'event-789',
        scoreIncrement: 40,
      });
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([batchItem]);

      expect(notifyUserSpy).toHaveBeenCalledTimes(1);
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'user-456',
        WebsocketMessagingType.USER_IMPACT_SCORE_CREDITED,
        { eventId: 'event-789', scoreIncrement: 40 },
      );
    });

    it('should notify each user of the batch', async () => {
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([
        createBatchImpactScoreCreditedItemMock({ userId: 'user-1', scoreIncrement: 10 }, 'msg-1'),
        createBatchImpactScoreCreditedItemMock({ userId: 'user-2', scoreIncrement: 25 }, 'msg-2'),
      ]);

      expect(notifyUserSpy).toHaveBeenCalledTimes(2);
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'user-1',
        WebsocketMessagingType.USER_IMPACT_SCORE_CREDITED,
        expect.objectContaining({ scoreIncrement: 10 }),
      );
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'user-2',
        WebsocketMessagingType.USER_IMPACT_SCORE_CREDITED,
        expect.objectContaining({ scoreIncrement: 25 }),
      );
    });

    it('should skip a message without user id', async () => {
      const batchItem = createBatchImpactScoreCreditedItemMock({ userId: '' });
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([batchItem]);

      expect(notifyUserSpy).not.toHaveBeenCalled();
    });
  });
});
