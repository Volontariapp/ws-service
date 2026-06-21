import { afterEach, beforeEach, beforeAll, afterAll, describe, expect, it, jest } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SocialEventCreatedPostProcessor } from '../../../post-processors/events/social-event-created.post-processor.js';
import type { NotificationService } from '../../../gateways/notification.service.js';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';
import { createEventCreatedEventMock } from '../../helpers/factories/stream-event.factory.js';
import { SocialEventMessagingType, WebsocketMessagingType, EventEventMessagingType } from '@volontariapp/messaging';
import { createMock } from '@volontariapp/testing';
import type { Redis } from 'ioredis';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import { AppDataSource } from '../../../config/data-source.js';
import { EventQueueModel } from '@volontariapp/database';

describe('SocialEventCreatedPostProcessor (Integration)', () => {
  let postProcessor: SocialEventCreatedPostProcessor;
  let notificationServiceMock: jest.Mocked<NotificationService>;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      const opts = AppDataSource.options as any;
      try {
        if (opts.type === 'postgres' && opts.host === 'localhost') {
          opts.host = '127.0.0.1';
        }
        await AppDataSource.initialize();
      } catch (firstErr) {
        if (opts.host === '127.0.0.1') {
          try {
            opts.host = 'localhost';
            await AppDataSource.initialize();
            return;
          } catch (secondErr) {
            console.error('Failed to connect to database:', {
              host: opts.host,
              port: opts.port,
              database: opts.database,
              username: opts.username,
            });
            throw secondErr;
          }
        }
        console.error('Failed to connect to database:', {
          host: opts.host,
          port: opts.port,
          database: opts.database,
          username: opts.username,
        });
        throw firstErr;
      }
    }
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  beforeEach(async () => {
    const repo = AppDataSource.getRepository(EventQueueModel);
    await repo.clear();

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
      const organizerId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const payloadOverrides = { eventId: 'test-event-123', organizerId };
      const event = createEventCreatedEventMock(payloadOverrides);
      event.emitterId = organizerId;
      event.correlationId = 'b0f0a0c0-9c0b-4ef8-bb6d-6bb9bd380a22';
      event.traceId = 'c0f0a0c0-9c0b-4ef8-bb6d-6bb9bd380a33';
      const messageId = 'msg-123';

      const broadcastExceptSpy = jest.spyOn(notificationServiceMock, 'broadcastExcept');
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([{ event, messageId } as never]);

      expect(broadcastExceptSpy).toHaveBeenCalledWith(
        organizerId,
        WebsocketMessagingType.EVENT_CREATED,
        event.payload.after,
      );
      expect(notifyUserSpy).toHaveBeenCalledWith(
        organizerId,
        WebsocketMessagingType.EVENT_CREATED,
        event.payload.after,
      );

      const repo = AppDataSource.getRepository(EventQueueModel);
      const events = await repo.find();
      expect(events).toHaveLength(1);
      const inserted = events[0];
      expect(inserted.type).toBe(EventEventMessagingType.EVENT_CREATION_SUCCESSFULL);
      expect(inserted.emitter).toBe('ws-service');
      expect(inserted.emitterId).toBe(organizerId);
      expect(inserted.version).toBe(1);
      expect(inserted.payload).toEqual({
        after: {
          eventId: 'test-event-123',
          userId: organizerId,
        },
      });
    });

    it('should broadcast but not notify if emitterId is missing, and reject due to database constraints', async () => {
      const payloadOverrides = { eventId: 'test-event-123' };
      const event = createEventCreatedEventMock(payloadOverrides);
      event.emitterId = undefined as unknown as string;
      event.correlationId = 'b0f0a0c0-9c0b-4ef8-bb6d-6bb9bd380a22';
      event.traceId = 'c0f0a0c0-9c0b-4ef8-bb6d-6bb9bd380a33';
      const messageId = 'msg-123';

      const broadcastSpy = jest.spyOn(notificationServiceMock, 'broadcast');
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await expect(
        postProcessor['processEvents']([{ event, messageId }]),
      ).rejects.toThrow();

      expect(broadcastSpy).toHaveBeenCalledWith(
        WebsocketMessagingType.EVENT_CREATED,
        event.payload.after,
      );
      expect(notifyUserSpy).not.toHaveBeenCalled();

      const repo = AppDataSource.getRepository(EventQueueModel);
      const events = await repo.find();
      expect(events).toHaveLength(0);
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
