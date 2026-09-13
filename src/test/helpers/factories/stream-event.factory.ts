import type {
  StreamEvent,
  IUserSocialCreatedPayload,
  IUserSocialDeletedPayload,
  IEventCreatedPayload,
  IUserCreatedPayload,
  IUserDeleledPayload,
} from '@volontariapp/messaging';
import {
  EventEventMessagingType,
  SocialEventMessagingType,
  UserEventMessagingType,
} from '@volontariapp/messaging';
import { UserRoles } from '@volontariapp/shared';

export const createUserCreatedTriggerEventMock = (
  payloadOverrides: Partial<IUserCreatedPayload> = {},
): StreamEvent<IUserCreatedPayload> => ({
  id: 'test-event-id',
  type: UserEventMessagingType.USER_CREATED.toString(),
  payload: {
    after: {
      id: 'test-user-id',
      role: UserRoles.VOLUNTEER,
      ...payloadOverrides,
    },
  },
  emitter: 'ms-user',
  emitterId: 'test-user-id',
  correlationId: 'corr-123',
  traceId: 'trace-123',
  version: 1,
  createdAt: new Date().toISOString(),
});

export const createUserDeletedTriggerEventMock = (
  payloadOverrides: Partial<IUserDeleledPayload> = {},
): StreamEvent<IUserDeleledPayload> => ({
  id: 'test-event-id',
  type: UserEventMessagingType.USER_DELETED.toString(),
  payload: {
    after: {
      id: 'test-user-id',
      role: UserRoles.VOLUNTEER,
      ...payloadOverrides,
    },
  },
  emitter: 'ms-user',
  emitterId: 'test-user-id',
  correlationId: 'corr-123',
  traceId: 'trace-123',
  version: 1,
  createdAt: new Date().toISOString(),
});

export const createUserCreatedEventMock = (
  payloadOverrides: Partial<IUserSocialCreatedPayload> = {},
): StreamEvent<IUserSocialCreatedPayload> => ({
  id: 'test-event-id',
  type: SocialEventMessagingType.USER_SOCIAL_CREATED.toString(),
  payload: {
    after: {
      ...payloadOverrides,
    },
  },
  emitter: 'ms-social',
  emitterId: 'test-user-id',
  correlationId: 'corr-123',
  traceId: 'trace-123',
  version: 1,
  createdAt: new Date().toISOString(),
});

export const createUserSocialDeletedEventMock = (
  payloadOverrides: Partial<IUserSocialDeletedPayload> = {},
): StreamEvent<IUserSocialDeletedPayload> => ({
  id: 'test-event-id',
  type: SocialEventMessagingType.USER_SOCIAL_DELETED.toString(),
  payload: {
    after: {
      ...payloadOverrides,
    },
  },
  emitter: 'ms-social',
  emitterId: 'test-user-id',
  correlationId: 'corr-123',
  traceId: 'trace-123',
  version: 1,
  createdAt: new Date().toISOString(),
});

export const createEventCreatedEventMock = (
  payloadOverrides: Partial<IEventCreatedPayload> = {},
): StreamEvent<IEventCreatedPayload> => ({
  id: 'test-event-id',
  type: EventEventMessagingType.EVENT_CREATED.toString(),
  payload: {
    before: undefined,
    after: {
      ...payloadOverrides,
    } as IEventCreatedPayload,
  },
  emitter: '',
  emitterId: '',
  correlationId: '',
  version: 0,
  createdAt: '',
});
