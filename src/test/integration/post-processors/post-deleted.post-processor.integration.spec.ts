import { beforeEach, beforeAll, afterAll, describe, expect, it, jest } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PostDeletedPostProcessor } from '../../../post-processors/posts/post-deleted.post-processor.js';
import { PostSocialDeletedPostProcessor } from '../../../post-processors/posts/post-social-deleted.post-processor.js';
import type { NotificationService } from '../../../gateways/notification.service.js';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';
import type {
  StreamEvent,
  IPostDeletedPayload,
  IPostSocialDeletedPayload,
} from '@volontariapp/messaging';
import {
  PostEventMessagingType,
  SocialEventMessagingType,
  WebsocketMessagingType,
} from '@volontariapp/messaging';
import { createMock } from '@volontariapp/testing';
import type { Redis } from 'ioredis';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import { AppDataSource } from '../../../config/data-source.js';
import { EventQueueModel, GatherStateModel, EventStatus } from '@volontariapp/database';
import { GatherStateService } from '../../../core/services/gather-state.service.js';
import type { AppConfigService } from '../../../config/app-config.service.js';
import { GatherStateRepository } from '../../../core/repositories/gather-state.repository.js';

describe('Post Deleted Scatter-Gather Flow (Integration)', () => {
  let postDeletedProcessor: PostDeletedPostProcessor;
  let postSocialDeletedProcessor: PostSocialDeletedPostProcessor;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let gatherStateRepository: GatherStateRepository;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      const opts = AppDataSource.options as {
        type?: string;
        host?: string;
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
    gatherStateRepository = new GatherStateRepository(
      AppDataSource.getRepository(GatherStateModel),
    );
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await AppDataSource.getRepository(EventQueueModel).clear();
    await AppDataSource.getRepository(GatherStateModel).clear();

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

    const appConfigMock = createMock<AppConfigService>();
    Object.defineProperty(appConfigMock, 'scatterGather', {
      get: () => ({
        aggregations: [
          {
            trigger: 'post.deleted',
            expects: ['POST_SOCIAL_DELETED'],
            successEvent: 'post.deletion_successfull',
            failureEvent: 'post.deletion_failed',
          },
        ],
      }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: GatherStateService,
          useFactory: () => new GatherStateService(gatherStateRepository, appConfigMock),
        },
        {
          provide: PostDeletedPostProcessor,
          useFactory: (gatherService: GatherStateService) =>
            new PostDeletedPostProcessor(redisMock, optionsMock, gatherService),
          inject: [GatherStateService],
        },
        {
          provide: PostSocialDeletedPostProcessor,
          useFactory: (gatherService: GatherStateService) =>
            new PostSocialDeletedPostProcessor(
              redisMock,
              optionsMock,
              notificationServiceMock,
              gatherService,
            ),
          inject: [GatherStateService],
        },
      ],
    }).compile();

    postDeletedProcessor = module.get(PostDeletedPostProcessor);
    postSocialDeletedProcessor = module.get(PostSocialDeletedPostProcessor);
  });

  it('should initialize gather state on post.deleted and complete on POST_SOCIAL_DELETED', async () => {
    const correlationId = '22222222-3333-4444-5555-666666666666';
    const traceId = 'c0f0a0c0-9c0b-4ef8-bb6d-6bb9bd380a44';
    const emitterId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    const postId = 'post-456';

    const broadcastExceptSpy = jest.spyOn(notificationServiceMock, 'broadcastExcept');
    const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

    // === STEP 1: Reception of POST_DELETED ===
    const postDeletedMsg: StreamEvent<IPostDeletedPayload> = {
      id: 'post-deleted-msg-id',
      type: PostEventMessagingType.POST_DELETED,
      emitter: 'post-service',
      emitterId,
      correlationId,
      traceId,
      version: 1,
      createdAt: new Date().toISOString(),
      payload: {
        before: undefined,
        after: {
          postId,
        },
      },
    };

    await postDeletedProcessor['processEvents']([{ event: postDeletedMsg, messageId: 'msg-1' }]);

    let gatherState = await gatherStateRepository.findOne({ correlationId });
    expect(gatherState).toBeDefined();
    expect(gatherState?.triggerEvent).toBe(PostEventMessagingType.POST_DELETED);
    expect(gatherState?.gatherEventsState['POST_SOCIAL_DELETED'].status).toBe(EventStatus.PENDING);
    expect(gatherState?.metadata?.emitterId).toBe(emitterId);

    expect(broadcastExceptSpy).not.toHaveBeenCalled();
    expect(notifyUserSpy).not.toHaveBeenCalled();

    // === STEP 2: Reception of POST_SOCIAL_DELETED ===
    const postSocialDeletedMsg: StreamEvent<IPostSocialDeletedPayload> = {
      id: 'post-social-deleted-msg-id',
      type: SocialEventMessagingType.POST_SOCIAL_DELETED,
      emitter: 'social-service',
      emitterId: '',
      correlationId,
      traceId,
      version: 1,
      createdAt: new Date().toISOString(),
      payload: {
        before: undefined,
        after: {
          postId,
        },
      },
    };

    await postSocialDeletedProcessor['processEvents']([
      { event: postSocialDeletedMsg, messageId: 'msg-2' },
    ]);

    // Gather state is deleted upon completion
    gatherState = await gatherStateRepository.findOne({ correlationId });
    expect(gatherState).toBeNull();

    // WebSocket sent to front
    expect(broadcastExceptSpy).toHaveBeenCalledWith(
      emitterId,
      WebsocketMessagingType.POST_DELETED,
      expect.objectContaining({ postId }),
    );
    expect(notifyUserSpy).toHaveBeenCalledWith(
      emitterId,
      WebsocketMessagingType.POST_DELETED,
      expect.objectContaining({ postId }),
    );

    // Outbox success event written
    const eventQueueRepo = AppDataSource.getRepository(EventQueueModel);
    const outboxEvents = await eventQueueRepo.find();
    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0].type).toBe(PostEventMessagingType.POST_DELETION_SUCCESSFULL);
    expect(outboxEvents[0].correlationId).toBe(correlationId);
  });
});
