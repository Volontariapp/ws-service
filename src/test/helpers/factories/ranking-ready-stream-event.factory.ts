import type {
  IFeedbackEventPayload,
  IRankingComputePayload,
  StreamEvent,
} from '@volontariapp/messaging';
import { EventEventMessagingType } from '@volontariapp/messaging';
import type { BatchEventItem } from '@volontariapp/post-processors';
import { SOURCE_TRACEPARENT } from './trace.factory.js';

export const createRankingReadyEventMock = (
  originalPayloadOverrides: Partial<IRankingComputePayload> = {},
): StreamEvent<IFeedbackEventPayload<IRankingComputePayload>> => ({
  id: 'ranking-ready-event-id',
  type: EventEventMessagingType.RANKING_READY,
  payload: {
    after: {
      status: 'SUCCESS',
      originalPayload: {
        userId: 'test-user-id',
        reason: 'ON_DEMAND',
        requestedAt: '2026-10-19T00:00:00.000Z',
        ...originalPayloadOverrides,
      },
    },
  },
  emitter: 'worker-ranking',
  emitterId: 'test-user-id',
  correlationId: 'corr-ranking',
  traceId: 'trace-ranking',
  traceparent: SOURCE_TRACEPARENT,
  version: 1,
  createdAt: new Date().toISOString(),
});

export const createBatchRankingReadyItemMock = (
  originalPayloadOverrides: Partial<IRankingComputePayload> = {},
  messageId = 'msg-ranking-ready',
): BatchEventItem<EventEventMessagingType.RANKING_READY> => ({
  messageId,
  event: createRankingReadyEventMock(originalPayloadOverrides),
});
