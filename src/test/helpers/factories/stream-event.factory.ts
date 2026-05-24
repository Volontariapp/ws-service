import type {
  StreamEvent,
  IUserCreatedWebsocketPayload,
  IEventCreatedWebsocketPayload,
} from '@volontariapp/messaging';
import { WebsocketEventMessagingType } from '@volontariapp/messaging';

export const createUserCreatedEventMock = (
  payloadOverrides: Partial<IUserCreatedWebsocketPayload> = {},
): StreamEvent<IUserCreatedWebsocketPayload> => ({
  id: 'test-event-id',
  type: WebsocketEventMessagingType.WS_USER_CREATED.toString(),
  payload: {
    after: {
      id: 'user-123',
      ...payloadOverrides,
    } as IUserCreatedWebsocketPayload,
  },
  emitter: '',
  emitterId: '',
  version: 0,
  createdAt: '',
});

export const createEventCreatedEventMock = (
  payloadOverrides: Partial<IEventCreatedWebsocketPayload> = {},
): StreamEvent<IEventCreatedWebsocketPayload> => ({
  id: 'test-event-id',
  type: WebsocketEventMessagingType.WS_EVENT_CREATED.toString(),
  payload: {
    before: undefined,
    after: {
      id: 'event-123',
      organizerId: 'organizer-123',
      ...payloadOverrides,
    } as IEventCreatedWebsocketPayload,
  },
  emitter: '',
  emitterId: '',
  version: 0,
  createdAt: '',
});
