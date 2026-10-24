import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AttachmentRejectedPostProcessor } from '../../../../post-processors/storage/attachment-rejected.post-processor.js';
import {
  StorageAttachmentRejectionReason,
  StorageEntityType,
  StorageEventMessagingType,
  StorageWebsocketMessagingType,
} from '@volontariapp/messaging';
import type { PostProcessorOptions, BatchEventItem } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import { createNotificationServiceMock } from '../../../helpers/mocks/notification.service.mock.js';
import type { NotificationService } from '../../../../gateways/notification.service.js';

describe('AttachmentRejectedPostProcessor (Unit)', () => {
  let postProcessor: AttachmentRejectedPostProcessor;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let redisDriverMock: jest.Mocked<Redis>;
  let optionsMock: PostProcessorOptions;

  beforeEach(() => {
    notificationServiceMock = createNotificationServiceMock();
    redisDriverMock = createMock<Redis>();
    optionsMock = {
      streamName: 'storage:attachment_rejected',
      groupName: 'WsAttachmentRejectedConsumer',
      consumerName: 'test-consumer',
      batchSize: 10,
      blockMs: 1000,
      idempotencyTtlSeconds: 86400,
    };

    postProcessor = new AttachmentRejectedPostProcessor(
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
    it('should return true for ATTACHMENT_REJECTED event type', () => {
      const result = postProcessor['shouldProcess'](StorageEventMessagingType.ATTACHMENT_REJECTED);
      expect(result).toBe(true);
    });

    it('should return false for other event types', () => {
      expect(postProcessor['shouldProcess'](StorageEventMessagingType.FILE_SCANNED)).toBe(false);
      expect(postProcessor['shouldProcess'](StorageEventMessagingType.FILE_REJECTED)).toBe(false);
      expect(postProcessor['shouldProcess']('unknown.event')).toBe(false);
    });
  });

  describe('processEvents', () => {
    it('should notify user via notificationService when event has emitterId', async () => {
      const batchItem: BatchEventItem<StorageEventMessagingType.ATTACHMENT_REJECTED> = {
        messageId: 'msg-1',
        event: {
          id: 'event-1',
          type: StorageEventMessagingType.ATTACHMENT_REJECTED,
          emitterId: 'user-777',
          createdAt: new Date(),
          payload: {
            before: undefined,
            after: {
              fileId: 'file-300',
              entityType: StorageEntityType.POST,
              entityId: 'post-400',
              reason: StorageAttachmentRejectionReason.CONTENT_REJECTED,
            },
          },
        },
      };

      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([batchItem]);

      expect(notifyUserSpy).toHaveBeenCalledTimes(1);
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'user-777',
        StorageWebsocketMessagingType.ATTACHMENT_REJECTED,
        {
          fileId: 'file-300',
          entityType: StorageEntityType.POST,
          entityId: 'post-400',
          reason: StorageAttachmentRejectionReason.CONTENT_REJECTED,
        },
      );
    });

    it('should skip notification when emitterId is absent', async () => {
      const batchItem: BatchEventItem<StorageEventMessagingType.ATTACHMENT_REJECTED> = {
        messageId: 'msg-2',
        event: {
          id: 'event-2',
          type: StorageEventMessagingType.ATTACHMENT_REJECTED,
          emitterId: '',
          createdAt: new Date(),
          payload: {
            before: undefined,
            after: {
              fileId: 'file-301',
              entityType: StorageEntityType.EVENT_COVER,
              entityId: 'event-500',
              reason: StorageAttachmentRejectionReason.NOT_FOUND,
            },
          },
        },
      };

      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([batchItem]);

      expect(notifyUserSpy).not.toHaveBeenCalled();
    });
  });
});
