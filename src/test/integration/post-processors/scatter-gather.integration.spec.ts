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
import { EventCreatedPostProcessor } from '../../../post-processors/events/event-created.post-processor.js';
import { GeocodedSuccessPostProcessor } from '../../../post-processors/events/geocoded-success.post-processor.js';
import { SocialEventCreatedPostProcessor } from '../../../post-processors/events/social-event-created.post-processor.js';
import type { NotificationService } from '../../../gateways/notification.service.js';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';
import type {
  StreamEvent,
  IEventCreatedPayload,
  IEventSocialCreatedPayload,
  IEventGeocodedPayload,
} from '@volontariapp/messaging';
import {
  SocialEventMessagingType,
  WebsocketMessagingType,
  EventEventMessagingType,
} from '@volontariapp/messaging';
import { createMock } from '@volontariapp/testing';
import type { Redis } from 'ioredis';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import { AppDataSource } from '../../../config/data-source.js';
import { EventQueueModel, GatherStateModel, EventStatus } from '@volontariapp/database';
import { GatherStateService } from '../../../core/services/gather-state.service.js';
import type { AppConfigService } from '../../../config/app-config.service.js';
import { GatherStateRepository } from '../../../core/repositories/gather-state.repository.js';

describe('Scatter-Gather Flow (Integration)', () => {
  let eventCreatedProcessor: EventCreatedPostProcessor;
  let geocodedProcessor: GeocodedSuccessPostProcessor;
  let socialCreatedProcessor: SocialEventCreatedPostProcessor;
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

    // Configuration mock pour le service config
    const appConfigMock = createMock<AppConfigService>();
    Object.defineProperty(appConfigMock, 'scatterGather', {
      get: () => ({
        aggregations: [
          {
            trigger: 'event.created',
            expects: ['GEOCODED_SUCCESS', 'SOCIAL_EVENT_CREATED'],
            successEvent: 'event.creation_successfull',
            failureEvent: 'event.creation_failed',
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
          provide: EventCreatedPostProcessor,
          useFactory: (gatherService: GatherStateService) =>
            new EventCreatedPostProcessor(redisMock, optionsMock, gatherService),
          inject: [GatherStateService],
        },
        {
          provide: GeocodedSuccessPostProcessor,
          useFactory: (gatherService: GatherStateService) =>
            new GeocodedSuccessPostProcessor(
              redisMock,
              optionsMock,
              notificationServiceMock,
              gatherService,
            ),
          inject: [GatherStateService],
        },
        {
          provide: SocialEventCreatedPostProcessor,
          useFactory: (gatherService: GatherStateService) =>
            new SocialEventCreatedPostProcessor(
              redisMock,
              optionsMock,
              notificationServiceMock,
              gatherService,
            ),
          inject: [GatherStateService],
        },
      ],
    }).compile();

    eventCreatedProcessor = module.get<EventCreatedPostProcessor>(EventCreatedPostProcessor);
    geocodedProcessor = module.get<GeocodedSuccessPostProcessor>(GeocodedSuccessPostProcessor);
    socialCreatedProcessor = module.get<SocialEventCreatedPostProcessor>(
      SocialEventCreatedPostProcessor,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should run the complete Scatter-Gather flow step by step successfully', async () => {
    const correlationId = '11111111-2222-3333-4444-555555555555';
    const traceId = 'c0f0a0c0-9c0b-4ef8-bb6d-6bb9bd380a33';
    const emitterId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const eventId = 'event-123';

    const broadcastExceptSpy = jest.spyOn(notificationServiceMock, 'broadcastExcept');
    const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

    // === STEP 1: Reception of EVENT_CREATED ===
    const eventCreatedMsg: StreamEvent<IEventCreatedPayload> = {
      id: 'event-created-msg-id',
      type: EventEventMessagingType.EVENT_CREATED,
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
          localisationName: 'Paris, France',
        },
      },
    };

    await eventCreatedProcessor['processEvents']([{ event: eventCreatedMsg, messageId: 'msg-1' }]);

    // Aggregation state must be initialized in the database
    let gatherState = await gatherStateRepository.findOne({ correlationId });
    expect(gatherState).toBeDefined();
    expect(gatherState?.triggerEvent).toBe(EventEventMessagingType.EVENT_CREATED);
    expect(gatherState?.gatherEventsState['GEOCODED_SUCCESS'].status).toBe(EventStatus.PENDING);
    expect(gatherState?.gatherEventsState['SOCIAL_EVENT_CREATED'].status).toBe(EventStatus.PENDING);
    expect(gatherState?.metadata?.emitterId).toBe(emitterId);
    expect(gatherState?.metadata?.traceId).toBe(traceId);
    const createdPayload = gatherState?.metadata?.payload as IEventCreatedPayload;
    expect(createdPayload.eventId).toBe(eventId);

    // No WebSocket or Outbox for now
    expect(broadcastExceptSpy).not.toHaveBeenCalled();
    expect(notifyUserSpy).not.toHaveBeenCalled();

    // === STEP 2: Reception of EVENT_GEOCODED ===
    const eventGeocodedMsg: StreamEvent<IEventGeocodedPayload> = {
      id: 'geocoded-msg-id',
      type: EventEventMessagingType.EVENT_GEOCODED,
      emitter: 'geocode-service',
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

    await geocodedProcessor['processEvents']([{ event: eventGeocodedMsg, messageId: 'msg-2' }]);

    // Aggregation state must be updated (GEOCODED_SUCCESS -> SUCCESS)
    gatherState = await gatherStateRepository.findOne({ correlationId });
    expect(gatherState).toBeDefined();
    expect(gatherState?.gatherEventsState['GEOCODED_SUCCESS'].status).toBe(EventStatus.SUCCESS);
    expect(gatherState?.gatherEventsState['SOCIAL_EVENT_CREATED'].status).toBe(EventStatus.PENDING);

    // Still no WebSocket or Outbox
    expect(broadcastExceptSpy).not.toHaveBeenCalled();
    expect(notifyUserSpy).not.toHaveBeenCalled();

    // === STEP 3: Reception of EVENT_SOCIAL_CREATED ===
    const eventSocialCreatedMsg: StreamEvent<IEventSocialCreatedPayload> = {
      id: 'social-created-msg-id',
      type: SocialEventMessagingType.EVENT_SOCIAL_CREATED,
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

    await socialCreatedProcessor['processEvents']([
      { event: eventSocialCreatedMsg, messageId: 'msg-3' },
    ]);

    // Aggregation state must be deleted from the database since it is completed
    gatherState = await gatherStateRepository.findOne({ correlationId });
    expect(gatherState).toBeNull();

    // WebSockets must be sent
    expect(broadcastExceptSpy).toHaveBeenCalledWith(
      emitterId,
      WebsocketMessagingType.EVENT_CREATED,
      expect.objectContaining({ eventId, localisationName: 'Paris, France' }),
    );
    expect(notifyUserSpy).toHaveBeenCalledWith(
      emitterId,
      WebsocketMessagingType.EVENT_CREATED,
      expect.objectContaining({ eventId, localisationName: 'Paris, France' }),
    );

    // The final success event must be saved in the Outbox
    const eventQueueRepo = AppDataSource.getRepository(EventQueueModel);
    const outboxEvents = await eventQueueRepo.find();
    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0].type).toBe(EventEventMessagingType.EVENT_CREATION_SUCCESSFULL);
    expect(outboxEvents[0].emitterId).toBe(emitterId);
    expect(outboxEvents[0].traceId).toBe(traceId);
    expect(outboxEvents[0].correlationId).toBe(correlationId);
  });

  it('should write failure event to outbox and cleanup gatherState when a sub-event fails', async () => {
    const correlationId = '22222222-3333-4444-5555-666666666666';
    const traceId = 'd0f0a0c0-9c0b-4ef8-bb6d-6bb9bd380a44';
    const emitterId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    const eventId = 'event-456';

    const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

    // === STEP 1: Reception of EVENT_CREATED ===
    const eventCreatedMsg: StreamEvent<IEventCreatedPayload> = {
      id: 'event-created-msg-id-2',
      type: EventEventMessagingType.EVENT_CREATED,
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
          localisationName: 'Lyon, France',
        },
      },
    };
    await eventCreatedProcessor['processEvents']([{ event: eventCreatedMsg, messageId: 'msg-1' }]);

    // === STEP 2: Reception of GEOCODED_SUCCESS ===
    const eventGeocodedMsg: StreamEvent<IEventGeocodedPayload> = {
      id: 'geocoded-msg-id-2',
      type: EventEventMessagingType.EVENT_GEOCODED,
      emitter: 'geocode-service',
      emitterId: '',
      correlationId,
      traceId,
      version: 1,
      createdAt: new Date().toISOString(),
      payload: {
        before: undefined,
        after: { eventId },
      },
    };
    await geocodedProcessor['processEvents']([{ event: eventGeocodedMsg, messageId: 'msg-2' }]);

    // === STEP 3: Reception of SOCIAL_EVENT_CREATED failure (by omitting social step or sending failed status) ===
    // Force status to FAILED for SOCIAL_EVENT_CREATED in gatherState
    const currentState = await gatherStateRepository.findOne({ correlationId });
    if (currentState) {
      await gatherStateRepository.update(currentState.id, {
        correlationId,
        gatherEventsState: {
          GEOCODED_SUCCESS: {
            eventType: 'GEOCODED_SUCCESS',
            status: EventStatus.SUCCESS,
            updatedAt: new Date().toISOString(),
          },
          SOCIAL_EVENT_CREATED: {
            eventType: 'SOCIAL_EVENT_CREATED',
            status: EventStatus.FAILED,
            updatedAt: new Date().toISOString(),
            errorReason: 'Neo4j fail',
          },
        },
      });
    }

    // Call processEvents to complete the gather state
    await geocodedProcessor['processEvents']([{ event: eventGeocodedMsg, messageId: 'msg-3' }]);

    // State is deleted from DB
    const gatherState = await gatherStateRepository.findOne({ correlationId });
    expect(gatherState).toBeNull();

    // WS failure notified
    expect(notifyUserSpy).toHaveBeenCalledWith(
      emitterId,
      WebsocketMessagingType.EVENT_CREATION_FAILED,
      expect.objectContaining({ eventId, failedEvents: ['SOCIAL_EVENT_CREATED'] }),
    );

    // Final outbox failure event written
    const eventQueueRepo = AppDataSource.getRepository(EventQueueModel);
    const outboxEvents = await eventQueueRepo.find();
    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0].type).toBe(EventEventMessagingType.EVENT_CREATION_FAILED);
    expect(outboxEvents[0].correlationId).toBe(correlationId);
  });
});
