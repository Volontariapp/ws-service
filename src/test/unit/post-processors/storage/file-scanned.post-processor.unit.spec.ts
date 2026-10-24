import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FileScannedPostProcessor } from '../../../../post-processors/storage/file-scanned.post-processor.js';
import {
  StorageEntityType,
  StorageEventMessagingType,
  StorageWebsocketMessagingType,
} from '@volontariapp/messaging';
import type { PostProcessorOptions, BatchEventItem } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import { createNotificationServiceMock } from '../../../helpers/mocks/notification.service.mock.js';
import type { NotificationService } from '../../../../gateways/notification.service.js';

describe('FileScannedPostProcessor (Unit)', () => {
  let postProcessor: FileScannedPostProcessor;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let redisDriverMock: jest.Mocked<Redis>;
  let optionsMock: PostProcessorOptions;

  beforeEach(() => {
    notificationServiceMock = createNotificationServiceMock();
    redisDriverMock = createMock<Redis>();
    optionsMock = {
      streamName: 'storage:file_scanned',
      groupName: 'WsFileScannedConsumer',
      consumerName: 'test-consumer',
      batchSize: 10,
      blockMs: 1000,
      idempotencyTtlSeconds: 86400,
    };

    postProcessor = new FileScannedPostProcessor(
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
    it('should return true for FILE_SCANNED event type', () => {
      const result = postProcessor['shouldProcess'](StorageEventMessagingType.FILE_SCANNED);
      expect(result).toBe(true);
    });

    it('should return false for other event types', () => {
      expect(postProcessor['shouldProcess'](StorageEventMessagingType.FILE_REJECTED)).toBe(false);
      expect(postProcessor['shouldProcess'](StorageEventMessagingType.ATTACHMENT_REJECTED)).toBe(
        false,
      );
      expect(postProcessor['shouldProcess']('unknown.event')).toBe(false);
    });
  });

  describe('processEvents', () => {
    it('should notify user via notificationService when event has ownerId', async () => {
      const batchItem: BatchEventItem<StorageEventMessagingType.FILE_SCANNED> = {
        messageId: 'msg-1',
        event: {
          id: 'event-1',
          type: StorageEventMessagingType.FILE_SCANNED,
          emitterId: 'emitter-1',
          createdAt: new Date(),
          payload: {
            before: undefined,
            after: {
              fileId: 'file-100',
              entityType: StorageEntityType.USER_AVATAR,
              entityId: 'user-200',
              ownerId: 'user-200',
            },
          },
        },
      };

      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([batchItem]);

      expect(notifyUserSpy).toHaveBeenCalledTimes(1);
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'user-200',
        StorageWebsocketMessagingType.FILE_SCANNED,
        {
          fileId: 'file-100',
          entityType: StorageEntityType.USER_AVATAR,
          entityId: 'user-200',
          ownerId: 'user-200',
        },
      );
    });

    it('should fallback to event.emitterId if payload.ownerId is not provided', async () => {
      const batchItem: BatchEventItem<StorageEventMessagingType.FILE_SCANNED> = {
        messageId: 'msg-2',
        event: {
          id: 'event-2',
          type: StorageEventMessagingType.FILE_SCANNED,
          emitterId: 'fallback-user-300',
          createdAt: new Date(),
          payload: {
            before: undefined,
            after: {
              fileId: 'file-101',
              entityType: StorageEntityType.EVENT_COVER,
              entityId: 'event-500',
              ownerId: '',
            },
          },
        },
      };

      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([batchItem]);

      expect(notifyUserSpy).toHaveBeenCalledTimes(1);
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'fallback-user-300',
        StorageWebsocketMessagingType.FILE_SCANNED,
        {
          fileId: 'file-101',
          entityType: StorageEntityType.EVENT_COVER,
          entityId: 'event-500',
          ownerId: '',
        },
      );
    });

    it('should skip notification when both ownerId and emitterId are absent', async () => {
      const batchItem: BatchEventItem<StorageEventMessagingType.FILE_SCANNED> = {
        messageId: 'msg-3',
        event: {
          id: 'event-3',
          type: StorageEventMessagingType.FILE_SCANNED,
          emitterId: '',
          createdAt: new Date(),
          payload: {
            before: undefined,
            after: {
              fileId: 'file-102',
              entityType: StorageEntityType.POST,
              entityId: 'post-600',
              ownerId: '',
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
