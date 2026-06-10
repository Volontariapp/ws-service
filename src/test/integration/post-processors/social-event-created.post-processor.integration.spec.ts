import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SocialEventCreatedPostProcessor } from '../../../post-processors/events/social-event-created.post-processor.js';
import type { NotificationService } from '../../../gateways/notification.service.js';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';
import { createEventCreatedEventMock } from '../../helpers/factories/stream-event.factory.js';
import { SocialEventMessagingType, WebsocketMessagingType } from '@volontariapp/messaging';
import { createMock } from '@volontariapp/testing';
import type { Redis } from 'ioredis';
import type { PostProcessorOptions } from '@volontariapp/post-processors';

describe('SocialEventCreatedPostProcessor (Integration)', () => {
  let postProcessor: SocialEventCreatedPostProcessor;
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
          provide: SocialEventCreatedPostProcessor,
          useFactory: () =>
            new SocialEventCreatedPostProcessor(redisMock, optionsMock, notificationServiceMock),
        },
      ],
    }).compile();

    postProcessor = module.get<SocialEventCreatedPostProcessor>(SocialEventCreatedPostProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processEvents', () => {
    it('should broadcast and notify organizer on EVENT_SOCIAL_CREATED event', async () => {
      const payloadOverrides = { eventId: 'test-event-123', organizerId: 'organizer-456' };
      const event = createEventCreatedEventMock(payloadOverrides);
      event.emitterId = 'organizer-456';
      const messageId = 'msg-123';

      const broadcastExceptSpy = jest.spyOn(notificationServiceMock, 'broadcastExcept');
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([{ event, messageId } as never]);

      expect(broadcastExceptSpy).toHaveBeenCalledWith(
        'organizer-456',
        WebsocketMessagingType.EVENT_CREATED,
        event.payload.after,
      );
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'organizer-456',
        WebsocketMessagingType.EVENT_CREATED,
        event.payload.after,
      );
    });

    it('should broadcast but not notify if emitterId is missing', async () => {
      const payloadOverrides = { eventId: 'test-event-123' };
      const event = createEventCreatedEventMock(payloadOverrides);
      event.emitterId = undefined as unknown as string;
      const messageId = 'msg-123';

      const broadcastSpy = jest.spyOn(notificationServiceMock, 'broadcast');
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([{ event, messageId }]);

      expect(broadcastSpy).toHaveBeenCalledWith(
        WebsocketMessagingType.EVENT_CREATED,
        event.payload.after,
      );
      expect(notifyUserSpy).not.toHaveBeenCalled();
    });
  });

  describe('shouldProcess', () => {
    it('should return true for EVENT_SOCIAL_CREATED event type', () => {
      const result = postProcessor['shouldProcess'](
        SocialEventMessagingType.EVENT_SOCIAL_CREATED.toString(),
      );
      expect(result).toBe(true);
    });

    it('should return false for other event types', () => {
      const result = postProcessor['shouldProcess']('OTHER_EVENT_TYPE');
      expect(result).toBe(false);
    });
  });
});
