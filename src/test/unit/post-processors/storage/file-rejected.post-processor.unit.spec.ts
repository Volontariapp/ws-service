import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FileRejectedPostProcessor } from '../../../../post-processors/storage/file-rejected.post-processor.js';
import {
  StorageEntityType,
  StorageEventMessagingType,
  StorageFileRejectionReason,
  StorageWebsocketMessagingType,
} from '@volontariapp/messaging';
import type { PostProcessorOptions, BatchEventItem } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import { createNotificationServiceMock } from '../../../helpers/mocks/notification.service.mock.js';
import type { NotificationService } from '../../../../gateways/notification.service.js';

describe('FileRejectedPostProcessor (Unit)', () => {
  let postProcessor: FileRejectedPostProcessor;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let redisDriverMock: jest.Mocked<Redis>;
  let optionsMock: PostProcessorOptions;

  beforeEach(() => {
    notificationServiceMock = createNotificationServiceMock();
    redisDriverMock = createMock<Redis>();
    optionsMock = {
      streamName: 'storage:file_rejected',
      groupName: 'WsFileRejectedConsumer',
      consumerName: 'test-consumer',
      batchSize: 10,
      blockMs: 1000,
      idempotencyTtlSeconds: 86400,
    };

    postProcessor = new FileRejectedPostProcessor(
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
    it('should return true for FILE_REJECTED event type', () => {
      const result = postProcessor['shouldProcess'](StorageEventMessagingType.FILE_REJECTED);
      expect(result).toBe(true);
    });

    it('should return false for other event types', () => {
      expect(postProcessor['shouldProcess'](StorageEventMessagingType.FILE_SCANNED)).toBe(false);
      expect(postProcessor['shouldProcess'](StorageEventMessagingType.ATTACHMENT_REJECTED)).toBe(
        false,
      );
      expect(postProcessor['shouldProcess']('unknown.event')).toBe(false);
    });
  });

  describe('processEvents', () => {
    it('should notify user via notificationService when event has ownerId and rejection reason', async () => {
      const batchItem: BatchEventItem<StorageEventMessagingType.FILE_REJECTED> = {
        messageId: 'msg-1',
        event: {
          id: 'event-1',
          type: StorageEventMessagingType.FILE_REJECTED,
          emitterId: 'emitter-1',
          createdAt: new Date(),
          payload: {
            before: undefined,
            after: {
              fileId: 'file-200',
              entityType: StorageEntityType.USER_AVATAR,
              entityId: 'user-300',
              ownerId: 'user-300',
              reason: StorageFileRejectionReason.MALWARE,
            },
          },
        },
      };

      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([batchItem]);

      expect(notifyUserSpy).toHaveBeenCalledTimes(1);
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'user-300',
        StorageWebsocketMessagingType.FILE_REJECTED,
        {
          fileId: 'file-200',
          entityType: StorageEntityType.USER_AVATAR,
          entityId: 'user-300',
          ownerId: 'user-300',
          reason: StorageFileRejectionReason.MALWARE,
        },
      );
    });

    it('should fallback to event.emitterId if payload.ownerId is empty', async () => {
      const batchItem: BatchEventItem<StorageEventMessagingType.FILE_REJECTED> = {
        messageId: 'msg-2',
        event: {
          id: 'event-2',
          type: StorageEventMessagingType.FILE_REJECTED,
          emitterId: 'emitter-400',
          createdAt: new Date(),
          payload: {
            before: undefined,
            after: {
              fileId: 'file-201',
              entityType: StorageEntityType.EVENT_COVER,
              entityId: 'event-500',
              ownerId: '',
              reason: StorageFileRejectionReason.SIZE_MISMATCH,
            },
          },
        },
      };

      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([batchItem]);

      expect(notifyUserSpy).toHaveBeenCalledTimes(1);
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'emitter-400',
        StorageWebsocketMessagingType.FILE_REJECTED,
        {
          fileId: 'file-201',
          entityType: StorageEntityType.EVENT_COVER,
          entityId: 'event-500',
          ownerId: '',
          reason: StorageFileRejectionReason.SIZE_MISMATCH,
        },
      );
    });

    it('should skip notification when both ownerId and emitterId are absent', async () => {
      const batchItem: BatchEventItem<StorageEventMessagingType.FILE_REJECTED> = {
        messageId: 'msg-3',
        event: {
          id: 'event-3',
          type: StorageEventMessagingType.FILE_REJECTED,
          emitterId: '',
          createdAt: new Date(),
          payload: {
            before: undefined,
            after: {
              fileId: 'file-202',
              entityType: StorageEntityType.POST,
              entityId: 'post-600',
              ownerId: '',
              reason: StorageFileRejectionReason.UNDECODABLE,
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
