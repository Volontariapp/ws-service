import type {
  IAttachmentRejectedPayload,
  IFileRejectedPayload,
  IFileScannedPayload,
  StreamEvent,
} from '@volontariapp/messaging';
import {
  StorageAttachmentRejectionReason,
  StorageEntityType,
  StorageEventMessagingType,
  StorageFileRejectionReason,
} from '@volontariapp/messaging';
import type { BatchEventItem } from '@volontariapp/post-processors';
import { SOURCE_TRACEPARENT } from './trace.factory.js';

export const createFileScannedEventMock = (
  payloadOverrides: Partial<IFileScannedPayload> = {},
  eventOverrides: Partial<StreamEvent<IFileScannedPayload>> = {},
): StreamEvent<IFileScannedPayload> => ({
  id: 'test-file-scanned-event-id',
  type: StorageEventMessagingType.FILE_SCANNED,
  payload: {
    after: {
      fileId: 'file-100',
      entityType: StorageEntityType.USER_AVATAR,
      entityId: 'user-200',
      ownerId: 'user-200',
      ...payloadOverrides,
    },
  },
  emitter: 'post-processor-storage',
  emitterId: payloadOverrides.ownerId ?? 'user-200',
  correlationId: 'corr-scanned-123',
  traceId: 'trace-scanned-123',
  traceparent: SOURCE_TRACEPARENT,
  version: 1,
  createdAt: new Date().toISOString(),
  ...eventOverrides,
});

export const createBatchFileScannedItemMock = (
  payloadOverrides: Partial<IFileScannedPayload> = {},
  messageId = 'msg-scanned-123',
  eventOverrides: Partial<StreamEvent<IFileScannedPayload>> = {},
): BatchEventItem<StorageEventMessagingType.FILE_SCANNED> => ({
  messageId,
  event: createFileScannedEventMock(payloadOverrides, eventOverrides),
});

export const createFileRejectedEventMock = (
  payloadOverrides: Partial<IFileRejectedPayload> = {},
  eventOverrides: Partial<StreamEvent<IFileRejectedPayload>> = {},
): StreamEvent<IFileRejectedPayload> => ({
  id: 'test-file-rejected-event-id',
  type: StorageEventMessagingType.FILE_REJECTED,
  payload: {
    after: {
      fileId: 'file-200',
      entityType: StorageEntityType.USER_AVATAR,
      entityId: 'user-300',
      ownerId: 'user-300',
      reason: StorageFileRejectionReason.MALWARE,
      ...payloadOverrides,
    },
  },
  emitter: 'post-processor-storage',
  emitterId: payloadOverrides.ownerId ?? 'user-300',
  correlationId: 'corr-rejected-123',
  traceId: 'trace-rejected-123',
  traceparent: SOURCE_TRACEPARENT,
  version: 1,
  createdAt: new Date().toISOString(),
  ...eventOverrides,
});

export const createBatchFileRejectedItemMock = (
  payloadOverrides: Partial<IFileRejectedPayload> = {},
  messageId = 'msg-rejected-123',
  eventOverrides: Partial<StreamEvent<IFileRejectedPayload>> = {},
): BatchEventItem<StorageEventMessagingType.FILE_REJECTED> => ({
  messageId,
  event: createFileRejectedEventMock(payloadOverrides, eventOverrides),
});

export const createAttachmentRejectedEventMock = (
  payloadOverrides: Partial<IAttachmentRejectedPayload> = {},
  eventOverrides: Partial<StreamEvent<IAttachmentRejectedPayload>> = {},
): StreamEvent<IAttachmentRejectedPayload> => ({
  id: 'test-attachment-rejected-event-id',
  type: StorageEventMessagingType.ATTACHMENT_REJECTED,
  payload: {
    after: {
      fileId: 'file-300',
      entityType: StorageEntityType.POST,
      entityId: 'post-400',
      reason: StorageAttachmentRejectionReason.CONTENT_REJECTED,
      ...payloadOverrides,
    },
  },
  emitter: 'post-processor-storage',
  emitterId: 'user-777',
  correlationId: 'corr-attachment-rejected-123',
  traceId: 'trace-attachment-rejected-123',
  traceparent: SOURCE_TRACEPARENT,
  version: 1,
  createdAt: new Date().toISOString(),
  ...eventOverrides,
});

export const createBatchAttachmentRejectedItemMock = (
  payloadOverrides: Partial<IAttachmentRejectedPayload> = {},
  messageId = 'msg-attachment-rejected-123',
  eventOverrides: Partial<StreamEvent<IAttachmentRejectedPayload>> = {},
): BatchEventItem<StorageEventMessagingType.ATTACHMENT_REJECTED> => ({
  messageId,
  event: createAttachmentRejectedEventMock(payloadOverrides, eventOverrides),
});
