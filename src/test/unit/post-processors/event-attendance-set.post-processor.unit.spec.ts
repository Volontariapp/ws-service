import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EventAttendanceSetPostProcessor } from '../../../post-processors/events/event-attendance-set.post-processor.js';
import { SocialEventMessagingType, WebsocketMessagingType } from '@volontariapp/messaging';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';
import { createBatchAttendanceSetItemMock } from '../../helpers/factories/attendance-set-stream-event.factory.js';
import type { NotificationService } from '../../../gateways/notification.service.js';

describe('EventAttendanceSetPostProcessor (Unit)', () => {
  let postProcessor: EventAttendanceSetPostProcessor;
  let notificationServiceMock: jest.Mocked<NotificationService>;

  beforeEach(() => {
    notificationServiceMock = createNotificationServiceMock();
    const optionsMock: PostProcessorOptions = {
      streamName: 'stream:event-social-attendance-set',
      groupName: 'ws-service',
      consumerName: 'test-consumer',
      batchSize: 10,
      blockMs: 1000,
      idempotencyTtlSeconds: 86400,
    };

    postProcessor = new EventAttendanceSetPostProcessor(
      createMock<Redis>(),
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
    it('should return true for EVENT_SOCIAL_ATTENDANCE_SET', () => {
      expect(
        postProcessor['shouldProcess'](SocialEventMessagingType.EVENT_SOCIAL_ATTENDANCE_SET),
      ).toBe(true);
    });

    it('should return false for other event types', () => {
      expect(postProcessor['shouldProcess'](SocialEventMessagingType.EVENT_SOCIAL_WISHED)).toBe(
        false,
      );
      expect(postProcessor['shouldProcess']('unknown.event')).toBe(false);
    });
  });

  describe('processEvents', () => {
    it('should notify each checked user with checked true and each unchecked user with false', async () => {
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([createBatchAttendanceSetItemMock()]);

      expect(notifyUserSpy).toHaveBeenCalledTimes(3);
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'user-1',
        WebsocketMessagingType.EVENT_ATTENDANCE_UPDATED,
        { eventId: 'event-123', checked: true },
      );
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'user-2',
        WebsocketMessagingType.EVENT_ATTENDANCE_UPDATED,
        { eventId: 'event-123', checked: true },
      );
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'user-3',
        WebsocketMessagingType.EVENT_ATTENDANCE_UPDATED,
        { eventId: 'event-123', checked: false },
      );
    });

    it('should not notify anyone when both lists are empty', async () => {
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([
        createBatchAttendanceSetItemMock({ checkedUserIds: [], uncheckedUserIds: [] }),
      ]);

      expect(notifyUserSpy).not.toHaveBeenCalled();
    });

    it('should process every event of the batch', async () => {
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([
        createBatchAttendanceSetItemMock(
          { eventId: 'event-a', checkedUserIds: ['u-a'], uncheckedUserIds: [] },
          'msg-a',
        ),
        createBatchAttendanceSetItemMock(
          { eventId: 'event-b', checkedUserIds: [], uncheckedUserIds: ['u-b'] },
          'msg-b',
        ),
      ]);

      expect(notifyUserSpy).toHaveBeenCalledTimes(2);
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'u-b',
        WebsocketMessagingType.EVENT_ATTENDANCE_UPDATED,
        { eventId: 'event-b', checked: false },
      );
    });
  });
});
