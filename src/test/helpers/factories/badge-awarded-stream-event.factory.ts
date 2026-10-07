import type { IBadgePayload, IUserBadgeAwardedPayload, StreamEvent } from '@volontariapp/messaging';
import { UserEventMessagingType } from '@volontariapp/messaging';
import type { BatchEventItem } from '@volontariapp/post-processors';

export const createBadgePayloadMock = (overrides: Partial<IBadgePayload> = {}): IBadgePayload => ({
  id: 'badge-123',
  name: 'Bâtisseur·se',
  slug: 'EVENT_HOST_COUNT_1',
  description: 'Créer 1 événement',
  iconPath: '/icons/batisseur.svg',
  iconFileId: 'file-icon-123',
  ...overrides,
});

export const createUserBadgeAwardedEventMock = (
  payloadOverrides: Partial<IUserBadgeAwardedPayload> = {},
  eventOverrides: Partial<StreamEvent<IUserBadgeAwardedPayload>> = {},
): StreamEvent<IUserBadgeAwardedPayload> => ({
  id: 'test-event-id',
  type: UserEventMessagingType.USER_BADGE_AWARDED,
  payload: {
    after: {
      userId: 'test-user-id',
      badges: [createBadgePayloadMock()],
      ...payloadOverrides,
    },
  },
  emitter: 'post-processor-user',
  emitterId: 'test-user-id',
  correlationId: 'corr-123',
  traceId: 'trace-123',
  version: 1,
  createdAt: new Date().toISOString(),
  ...eventOverrides,
});

export const createBatchBadgeAwardedItemMock = (
  payloadOverrides: Partial<IUserBadgeAwardedPayload> = {},
  messageId = 'msg-123',
  eventOverrides: Partial<StreamEvent<IUserBadgeAwardedPayload>> = {},
): BatchEventItem<UserEventMessagingType.USER_BADGE_AWARDED> => ({
  messageId,
  event: createUserBadgeAwardedEventMock(payloadOverrides, eventOverrides),
});
