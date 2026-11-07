import type { IEventSocialAttendanceSetPayload, StreamEvent } from '@volontariapp/messaging';
import { SocialEventMessagingType } from '@volontariapp/messaging';
import type { BatchEventItem } from '@volontariapp/post-processors';
import { SOURCE_TRACEPARENT } from './trace.factory.js';

export const createAttendanceSetEventMock = (
  payloadOverrides: Partial<IEventSocialAttendanceSetPayload> = {},
  eventOverrides: Partial<StreamEvent<IEventSocialAttendanceSetPayload>> = {},
): StreamEvent<IEventSocialAttendanceSetPayload> => ({
  id: 'test-event-id',
  type: SocialEventMessagingType.EVENT_SOCIAL_ATTENDANCE_SET,
  payload: {
    after: {
      eventId: 'event-123',
      checkedUserIds: ['user-1', 'user-2'],
      uncheckedUserIds: ['user-3'],
      ...payloadOverrides,
    },
  },
  emitter: 'ms-social',
  emitterId: 'organizer-1',
  correlationId: 'corr-123',
  traceId: 'trace-123',
  traceparent: SOURCE_TRACEPARENT,
  version: 1,
  createdAt: new Date().toISOString(),
  ...eventOverrides,
});

export const createBatchAttendanceSetItemMock = (
  payloadOverrides: Partial<IEventSocialAttendanceSetPayload> = {},
  messageId = 'msg-123',
): BatchEventItem<SocialEventMessagingType.EVENT_SOCIAL_ATTENDANCE_SET> => ({
  messageId,
  event: createAttendanceSetEventMock(payloadOverrides),
});
