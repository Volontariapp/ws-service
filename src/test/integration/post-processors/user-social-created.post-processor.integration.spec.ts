import {
  afterEach,
  beforeEach,
  beforeAll,
  afterAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UserSocialCreatedPostProcessor } from '../../../post-processors/users/user-social-created.post-processor.js';
import type { NotificationService } from '../../../gateways/notification.service.js';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';
import { createUserCreatedEventMock } from '../../helpers/factories/stream-event.factory.js';
import {
  SocialEventMessagingType,
  WebsocketMessagingType,
  UserEventMessagingType,
} from '@volontariapp/messaging';
import { createMock } from '@volontariapp/testing';
import type { Redis } from 'ioredis';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import { AppDataSource } from '../../../config/data-source.js';
import { EventQueueModel, EventStatus } from '@volontariapp/database';
import type { GatherStateService } from '../../../core/services/gather-state.service.js';

describe('UserSocialCreatedPostProcessor (Integration)', () => {
  let postProcessor: UserSocialCreatedPostProcessor;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let gatherStateServiceMock: jest.Mocked<GatherStateService>;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      const opts = AppDataSource.options as {
        type?: string;
        host?: string;
        port?: number;
        database?: string;
        username?: string;
        migrations?: unknown[];
      };
      opts.migrations = [];
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
            console.error('Failed to connect to database:', secondErr);
            throw secondErr;
          }
        }
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
    gatherStateServiceMock = createMock<GatherStateService>();
    gatherStateServiceMock.getAggregationConfig.mockReturnValue({
      trigger: UserEventMessagingType.USER_CREATED,
      expects: [SocialEventMessagingType.USER_SOCIAL_CREATED],
      successEvent: UserEventMessagingType.USER_CREATION_SUCCESSFULL,
      failureEvent: UserEventMessagingType.USER_CREATION_FAILED,
    });

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
          provide: UserSocialCreatedPostProcessor,
          useFactory: () =>
            new UserSocialCreatedPostProcessor(
              redisMock,
              optionsMock,
              notificationServiceMock,
              gatherStateServiceMock,
            ),
        },
      ],
    }).compile();

    postProcessor = module.get<UserSocialCreatedPostProcessor>(UserSocialCreatedPostProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processEvents', () => {
    it('should broadcast and notify user on USER_SOCIAL_CREATED event', async () => {
      const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const event = createUserCreatedEventMock({ userId });
      event.emitterId = userId;
      event.correlationId = 'b0f0a0c0-9c0b-4ef8-bb6d-6bb9bd380a22';
      event.traceId = 'c0f0a0c0-9c0b-4ef8-bb6d-6bb9bd380a33';
      const messageId = 'msg-123';

      gatherStateServiceMock.updateEventState.mockResolvedValue({
        isComplete: true,
        isSuccess: true,
        gatherStateId: 'b0f0a0c0-9c0b-4ef8-bb6d-6bb9bd380a22',
        metadata: {
          emitterId: userId,
          traceId: event.traceId,
          payload: event.payload.after,
        },
      });

      const broadcastExceptSpy = jest.spyOn(notificationServiceMock, 'broadcastExcept');
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');
      const updateStateSpy = jest.spyOn(gatherStateServiceMock, 'updateEventState');

      await postProcessor['processEvents']([{ event, messageId }]);

      expect(updateStateSpy).toHaveBeenCalledWith(
        event.correlationId,
        'USER_SOCIAL_CREATED',
        EventStatus.SUCCESS,
        undefined,
      );

      expect(broadcastExceptSpy).toHaveBeenCalledWith(
        userId,
        WebsocketMessagingType.USER_CREATED,
        event.payload.after,
      );
      expect(notifyUserSpy).toHaveBeenCalledWith(
        userId,
        WebsocketMessagingType.USER_CREATED,
        event.payload.after,
      );

      const repo = AppDataSource.getRepository(EventQueueModel);
      const events = await repo.find();
      expect(events).toHaveLength(1);
      const inserted = events[0];
      expect(inserted.type).toBe(UserEventMessagingType.USER_CREATION_SUCCESSFULL);
      expect(inserted.emitter).toBe('ws-service');
      expect(inserted.emitterId).toBe(userId);
      expect(inserted.version).toBe(1);
    });
  });

  describe('shouldProcess', () => {
    it('should return true for USER_SOCIAL_CREATED event type', () => {
      const result = postProcessor['shouldProcess'](
        SocialEventMessagingType.USER_SOCIAL_CREATED.toString(),
      );
      expect(result).toBe(true);
    });

    it('should return false for other event types', () => {
      const result = postProcessor['shouldProcess']('OTHER_EVENT_TYPE');
      expect(result).toBe(false);
    });
  });
});
