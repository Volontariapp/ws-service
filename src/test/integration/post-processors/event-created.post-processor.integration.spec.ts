import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EventCreatedPostProcessor } from '../../../post-processors/event-created.post-processor.js';
import type { NotificationService } from '../../../gateways/notification.service.js';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';
import { createEventCreatedEventMock } from '../../helpers/factories/stream-event.factory.js';
import { WebsocketEventMessagingType } from '@volontariapp/messaging';
import { createMock } from '@volontariapp/testing';
import type { Redis } from 'ioredis';
import type { PostProcessorOptions } from '@volontariapp/post-processors';

describe('EventCreatedPostProcessor (Integration)', () => {
  let postProcessor: EventCreatedPostProcessor;
  let notificationServiceMock: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    notificationServiceMock = createNotificationServiceMock();

    const redisMock = createMock<Redis>();
    const optionsMock = {
      streamName: 'test-stream',
      groupName: 'test-group',
      consumerName: 'test-consumer',
      batchSize: 10,
      blockTime: 1000,
      checkFrequency: 1000,
    } as PostProcessorOptions;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EventCreatedPostProcessor,
          useFactory: () =>
            new EventCreatedPostProcessor(redisMock, optionsMock, notificationServiceMock),
        },
      ],
    }).compile();

    postProcessor = module.get<EventCreatedPostProcessor>(EventCreatedPostProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processEvent', () => {
    it('should broadcast and notify organizer on WS_EVENT_CREATED event', async () => {
      const payloadOverrides = { id: 'test-event-123', organizerId: 'organizer-456' };
      const event = createEventCreatedEventMock(payloadOverrides);
      const messageId = 'msg-123';

      const broadcastExceptSpy = jest.spyOn(notificationServiceMock, 'broadcastExcept');
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvent'](event, messageId);

      expect(broadcastExceptSpy).toHaveBeenCalledWith(
        'organizer-456',
        WebsocketEventMessagingType.WS_EVENT_CREATED,
        event.payload.after,
      );
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'organizer-456',
        WebsocketEventMessagingType.WS_EVENT_CREATED,
        event.payload.after,
      );
    });

    it('should broadcast but not notify if organizerId is missing', async () => {
      const payloadOverrides = { id: 'test-event-123', organizerId: undefined };
      const event = createEventCreatedEventMock(payloadOverrides);
      const messageId = 'msg-123';

      const broadcastSpy = jest.spyOn(notificationServiceMock, 'broadcast');
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvent'](event, messageId);

      expect(broadcastSpy).toHaveBeenCalledWith(
        WebsocketEventMessagingType.WS_EVENT_CREATED,
        event.payload.after,
      );
      expect(notifyUserSpy).not.toHaveBeenCalled();
    });
  });

  describe('shouldProcess', () => {
    it('should return true for WS_EVENT_CREATED event type', () => {
      const result = postProcessor['shouldProcess'](
        WebsocketEventMessagingType.WS_EVENT_CREATED.toString(),
      );
      expect(result).toBe(true);
    });

    it('should return false for other event types', () => {
      const result = postProcessor['shouldProcess']('OTHER_EVENT_TYPE');
      expect(result).toBe(false);
    });
  });
});
