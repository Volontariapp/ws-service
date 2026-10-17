import type { IUserImpactScoreCreditedPayload, StreamEvent } from '@volontariapp/messaging';
import { UserEventMessagingType } from '@volontariapp/messaging';
import type { BatchEventItem } from '@volontariapp/post-processors';
import { SOURCE_TRACEPARENT } from './trace.factory.js';

export const createUserImpactScoreCreditedEventMock = (
  payloadOverrides: Partial<IUserImpactScoreCreditedPayload> = {},
  eventOverrides: Partial<StreamEvent<IUserImpactScoreCreditedPayload>> = {},
): StreamEvent<IUserImpactScoreCreditedPayload> => ({
  id: 'test-event-id',
  type: UserEventMessagingType.USER_IMPACT_SCORE_CREDITED,
  payload: {
    after: {
      userId: 'test-user-id',
      eventId: 'event-789',
      scoreIncrement: 40,
      ...payloadOverrides,
    },
  },
  emitter: 'post-processor-user',
  emitterId: 'test-user-id',
  correlationId: 'corr-123',
  traceId: 'trace-123',
  traceparent: SOURCE_TRACEPARENT,
  version: 1,
  createdAt: new Date().toISOString(),
  ...eventOverrides,
});

export const createBatchImpactScoreCreditedItemMock = (
  payloadOverrides: Partial<IUserImpactScoreCreditedPayload> = {},
  messageId = 'msg-123',
): BatchEventItem<UserEventMessagingType.USER_IMPACT_SCORE_CREDITED> => ({
  messageId,
  event: createUserImpactScoreCreditedEventMock(payloadOverrides),
});
