import { EventStatus, GatherStateEntity, type GatherEventState } from '@volontariapp/database';
import { UserEventMessagingType } from '@volontariapp/messaging';
import { SOURCE_TRACEPARENT } from './trace.factory.js';

export const USER_DELETION_EXPECTS = [
  'USER_SOCIAL_DELETED',
  'USER_POST_DELETED',
  'USER_EVENT_DELETED',
  'USER_STORAGE_DELETED',
  'USER_RANKING_DELETED',
] as const;

export const createGatherEventStates = (
  keys: readonly string[],
  status: EventStatus = EventStatus.PENDING,
): Record<string, GatherEventState> =>
  Object.fromEntries(
    keys.map((key): [string, GatherEventState] => [
      key,
      { eventType: key, status, updatedAt: '2026-11-05T12:00:00.000Z' },
    ]),
  );

export const createUserDeletionGatherState = (
  overrides: Partial<GatherStateEntity> = {},
): GatherStateEntity => {
  const entity = new GatherStateEntity();
  entity.id = '00000000-0000-4000-8000-000000000001';
  entity.createdAt = new Date('2026-11-05T12:00:00.000Z');
  entity.correlationId = '11111111-2222-4333-8444-555555555555';
  entity.triggerEvent = UserEventMessagingType.USER_DELETED;
  entity.gatherEventsState = createGatherEventStates(USER_DELETION_EXPECTS);
  entity.metadata = { traceparent: SOURCE_TRACEPARENT };
  return Object.assign(entity, overrides);
};
