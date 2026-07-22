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
import { EventDeletedPostProcessor } from '../../../post-processors/events/event-deleted.post-processor.js';
import { SocialEventDeletedSuccessPostProcessor } from '../../../post-processors/events/social-event-deleted-success.post-processor.js';
import { SocialEventDeletedFailedPostProcessor } from '../../../post-processors/events/social-event-deleted-failed.post-processor.js';
import { PostEventDeletedSuccessPostProcessor } from '../../../post-processors/events/post-event-deleted-success.post-processor.js';
import { PostEventDeletedFailedPostProcessor } from '../../../post-processors/events/post-event-deleted-failed.post-processor.js';
import type { NotificationService } from '../../../gateways/notification.service.js';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';
import {
  SocialEventMessagingType,
  PostEventMessagingType,
  EventEventMessagingType,
  WebsocketMessagingType,
  StreamEvent,
  IEventDeletedPayload,
  ISocialEventDeletedSuccessPayload,
  ISocialEventDeletedFailedPayload,
  IPostEventDeletedSuccessPayload,
  IPostEventDeletedFailedPayload,
} from '@volontariapp/messaging';
import { createMock } from '@volontariapp/testing';
import type { Redis } from 'ioredis';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import { AppDataSource } from '../../../config/data-source.js';
import { EventQueueModel, GatherStateModel, EventStatus } from '@volontariapp/database';
import { GatherStateService } from '../../../core/services/gather-state.service.js';
import { AppConfigService } from '../../../config/app-config.service.js';
import { GatherStateRepository } from '../../../core/repositories/gather-state.repository.js';

describe('Event Deleted Scatter-Gather Flow (Integration)', () => {
  let eventDeletedProcessor: EventDeletedPostProcessor;
  let socialSuccessProcessor: SocialEventDeletedSuccessPostProcessor;
  let socialFailedProcessor: SocialEventDeletedFailedPostProcessor;
  let postSuccessProcessor: PostEventDeletedSuccessPostProcessor;
  let postFailedProcessor: PostEventDeletedFailedPostProcessor;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let gatherStateRepository: GatherStateRepository;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      const opts = AppDataSource.options as any;
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
    gatherStateRepository = new GatherStateRepository(AppDataSource.getRepository(GatherStateModel));
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
            trigger: 'event.deleted',
            expects: ['social_event.deleted_success', 'post_event.deleted_success'],
            successEvent: 'event.deletion_successfull',
            failureEvent: 'event.deletion_failed',
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
          provide: EventDeletedPostProcessor,
          useFactory: (gatherService: GatherStateService) =>
            new EventDeletedPostProcessor(redisMock, optionsMock, gatherService),
          inject: [GatherStateService],
        },
        {
          provide: SocialEventDeletedSuccessPostProcessor,
          useFactory: (gatherService: GatherStateService) =>
            new SocialEventDeletedSuccessPostProcessor(redisMock, optionsMock, notificationServiceMock, gatherService),
          inject: [GatherStateService],
        },
        {
          provide: SocialEventDeletedFailedPostProcessor,
          useFactory: (gatherService: GatherStateService) =>
            new SocialEventDeletedFailedPostProcessor(redisMock, optionsMock, notificationServiceMock, gatherService),
          inject: [GatherStateService],
        },
        {
          provide: PostEventDeletedSuccessPostProcessor,
          useFactory: (gatherService: GatherStateService) =>
            new PostEventDeletedSuccessPostProcessor(redisMock, optionsMock, notificationServiceMock, gatherService),
          inject: [GatherStateService],
        },
        {
          provide: PostEventDeletedFailedPostProcessor,
          useFactory: (gatherService: GatherStateService) =>
            new PostEventDeletedFailedPostProcessor(redisMock, optionsMock, notificationServiceMock, gatherService),
          inject: [GatherStateService],
        },
      ],
    }).compile();

    eventDeletedProcessor = module.get<EventDeletedPostProcessor>(EventDeletedPostProcessor);
    socialSuccessProcessor = module.get<SocialEventDeletedSuccessPostProcessor>(SocialEventDeletedSuccessPostProcessor);
    socialFailedProcessor = module.get<SocialEventDeletedFailedPostProcessor>(SocialEventDeletedFailedPostProcessor);
    postSuccessProcessor = module.get<PostEventDeletedSuccessPostProcessor>(PostEventDeletedSuccessPostProcessor);
    postFailedProcessor = module.get<PostEventDeletedFailedPostProcessor>(PostEventDeletedFailedPostProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should run the complete event deletion Scatter-Gather flow step by step successfully', async () => {
    const correlationId = '22222222-3333-4444-5555-666666666666';
    const traceId = 'd0f0a0c0-9c0b-4ef8-bb6d-6bb9bd380a44';
    const emitterId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    const eventId = 'event-456';

    const broadcastExceptSpy = jest.spyOn(notificationServiceMock, 'broadcastExcept');
    const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

    // === STEP 1: Reception of EVENT_DELETED (Initial Trigger) ===
    const eventDeletedMsg: StreamEvent<IEventDeletedPayload> = {
      id: 'event-deleted-msg-id',
      type: EventEventMessagingType.EVENT_DELETED.toString(),
      emitter: 'event-service',
      emitterId,
      correlationId,
      traceId,
      version: 1,
      createdAt: new Date().toISOString(),
      payload: {
        before: undefined,
        after: {
          eventId,
        },
      },
    };

    await eventDeletedProcessor['processEvents']([{ event: eventDeletedMsg, messageId: 'msg-1' } as any]);

    let gatherState = await gatherStateRepository.findOne({ correlationId });
    expect(gatherState).toBeDefined();
    expect(gatherState?.triggerEvent).toBe(EventEventMessagingType.EVENT_DELETED);
    expect(gatherState?.gatherEventsState['social_event.deleted_success'].status).toBe(EventStatus.PENDING);
    expect(gatherState?.gatherEventsState['post_event.deleted_success'].status).toBe(EventStatus.PENDING);
    expect(gatherState?.metadata?.emitterId).toBe(emitterId);

    expect(broadcastExceptSpy).not.toHaveBeenCalled();
    expect(notifyUserSpy).not.toHaveBeenCalled();

    // === STEP 2: Reception of SOCIAL_EVENT_DELETED_SUCCESS ===
    const socialDeletedMsg: StreamEvent<ISocialEventDeletedSuccessPayload> = {
      id: 'social-deleted-msg-id',
      type: SocialEventMessagingType.SOCIAL_EVENT_DELETED_SUCCESS.toString(),
      emitter: 'social-service',
      emitterId: '',
      correlationId,
      traceId,
      version: 1,
      createdAt: new Date().toISOString(),
      payload: {
        before: undefined,
        after: {
          eventId,
        },
      },
    };

    await socialSuccessProcessor['processEvents']([{ event: socialDeletedMsg, messageId: 'msg-2' } as any]);

    gatherState = await gatherStateRepository.findOne({ correlationId });
    expect(gatherState).toBeDefined();
    expect(gatherState?.gatherEventsState['social_event.deleted_success'].status).toBe(EventStatus.SUCCESS);
    expect(gatherState?.gatherEventsState['post_event.deleted_success'].status).toBe(EventStatus.PENDING);

    expect(broadcastExceptSpy).not.toHaveBeenCalled();
    expect(notifyUserSpy).not.toHaveBeenCalled();

    // === STEP 3: Reception of POST_EVENT_DELETED_SUCCESS ===
    const postDeletedMsg: StreamEvent<IPostEventDeletedSuccessPayload> = {
      id: 'post-deleted-msg-id',
      type: PostEventMessagingType.POST_EVENT_DELETED_SUCCESS.toString(),
      emitter: 'post-service',
      emitterId: '',
      correlationId,
      traceId,
      version: 1,
      createdAt: new Date().toISOString(),
      payload: {
        before: undefined,
        after: {
          eventId,
        },
      },
    };

    await postSuccessProcessor['processEvents']([{ event: postDeletedMsg, messageId: 'msg-3' } as any]);

    // State completed, so gathered state is deleted
    gatherState = await gatherStateRepository.findOne({ correlationId });
    expect(gatherState).toBeNull();

    // WebSocket sent
    expect(broadcastExceptSpy).toHaveBeenCalledWith(
      emitterId,
      WebsocketMessagingType.EVENT_DELETED,
      expect.objectContaining({ eventId }),
    );
    expect(notifyUserSpy).toHaveBeenCalledWith(
      emitterId,
      WebsocketMessagingType.EVENT_DELETED,
      expect.objectContaining({ eventId }),
    );

    // Final outbox success event written
    const eventQueueRepo = AppDataSource.getRepository(EventQueueModel);
    const outboxEvents = await eventQueueRepo.find();
    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0].type).toBe(EventEventMessagingType.EVENT_DELETION_SUCCESSFULL);
    expect(outboxEvents[0].correlationId).toBe(correlationId);
  });

  it('should abort and mark as failed if one sub-event fails', async () => {
    const correlationId = '33333333-4444-5555-6666-777777777777';
    const traceId = 'e0f0a0c0-9c0b-4ef8-bb6d-6bb9bd380a55';
    const emitterId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    const eventId = 'event-789';

    const broadcastSpy = jest.spyOn(notificationServiceMock, 'broadcast');
    const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

    // === STEP 1: EVENT_DELETED ===
    const eventDeletedMsg: StreamEvent<IEventDeletedPayload> = {
      id: 'event-deleted-msg-id-2',
      type: EventEventMessagingType.EVENT_DELETED.toString(),
      emitter: 'event-service',
      emitterId,
      correlationId,
      traceId,
      version: 1,
      createdAt: new Date().toISOString(),
      payload: {
        before: undefined,
        after: {
          eventId,
        },
      },
    };
    await eventDeletedProcessor['processEvents']([{ event: eventDeletedMsg, messageId: 'msg-1' } as any]);

    // === STEP 2: SOCIAL_EVENT_DELETED_FAILED ===
    const socialFailedMsg: StreamEvent<ISocialEventDeletedFailedPayload> = {
      id: 'social-failed-msg-id',
      type: SocialEventMessagingType.SOCIAL_EVENT_DELETED_FAILED.toString(),
      emitter: 'social-service',
      emitterId: '',
      correlationId,
      traceId,
      version: 1,
      createdAt: new Date().toISOString(),
      payload: {
        before: undefined,
        after: {
          eventId,
          errorReason: 'Neo4j connection timeout',
        },
      },
    };
    await socialFailedProcessor['processEvents']([{ event: socialFailedMsg, messageId: 'msg-2' } as any]);

    // Gather state is not deleted yet (still waiting for post deletion)
    let gatherState = await gatherStateRepository.findOne({ correlationId });
    expect(gatherState).toBeDefined();
    expect(gatherState?.gatherEventsState['social_event.deleted_success'].status).toBe(EventStatus.FAILED);
    expect(gatherState?.gatherEventsState['post_event.deleted_success'].status).toBe(EventStatus.PENDING);

    expect(notifyUserSpy).not.toHaveBeenCalled();

    // === STEP 3: POST_EVENT_DELETED_SUCCESS ===
    const postDeletedMsg: StreamEvent<IPostEventDeletedSuccessPayload> = {
      id: 'post-deleted-msg-id-2',
      type: PostEventMessagingType.POST_EVENT_DELETED_SUCCESS.toString(),
      emitter: 'post-service',
      emitterId: '',
      correlationId,
      traceId,
      version: 1,
      createdAt: new Date().toISOString(),
      payload: {
        before: undefined,
        after: {
          eventId,
        },
      },
    };
    // We expect the completion handler to throw an Error indicating completion failure
    await expect(
      postSuccessProcessor['processEvents']([{ event: postDeletedMsg, messageId: 'msg-3' } as any])
    ).rejects.toThrow('Gather state completion failed. Failed events: social_event.deleted_success');

    // Since the saga failed, the gather state is NOT deleted from the database
    gatherState = await gatherStateRepository.findOne({ correlationId });
    expect(gatherState).toBeDefined();
    expect(gatherState?.gatherEventsState['social_event.deleted_success'].status).toBe(EventStatus.FAILED);
    expect(gatherState?.gatherEventsState['post_event.deleted_success'].status).toBe(EventStatus.SUCCESS);

    // WS failure notified to emitter (dispatched before throwing the error)
    expect(notifyUserSpy).toHaveBeenCalledWith(
      emitterId,
      WebsocketMessagingType.EVENT_DELETION_FAILED,
      expect.objectContaining({ eventId, failedEvents: ['social_event.deleted_success'] }),
    );

    // No outbox event written for failures
    const eventQueueRepo = AppDataSource.getRepository(EventQueueModel);
    const outboxEvents = await eventQueueRepo.find();
    expect(outboxEvents).toHaveLength(0);
  });
});
