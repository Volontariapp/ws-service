import type {
  StreamEvent,
  IUserSocialCreatedPayload,
  IEventCreatedPayload,
} from '@volontariapp/messaging';
import { EventEventMessagingType, SocialEventMessagingType } from '@volontariapp/messaging';

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
  emitter: '',
  emitterId: '',
  correlationId: '',
  version: 0,
  createdAt: '',
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
