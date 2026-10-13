import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UserCreatedPostProcessor } from '../../../post-processors/users/user-created.post-processor.js';
import { createUserCreatedTriggerEventMock } from '../../helpers/factories/stream-event.factory.js';
import { UserEventMessagingType } from '@volontariapp/messaging';
import { createMock } from '@volontariapp/testing';
import type { Redis } from 'ioredis';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { GatherStateService } from '../../../core/services/gather-state.service.js';

describe('UserCreatedPostProcessor (Integration)', () => {
  let postProcessor: UserCreatedPostProcessor;
  let gatherStateServiceMock: jest.Mocked<GatherStateService>;

  beforeEach(async () => {
    gatherStateServiceMock = createMock<GatherStateService>();
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
          provide: UserCreatedPostProcessor,
          useFactory: () =>
            new UserCreatedPostProcessor(redisMock, optionsMock, gatherStateServiceMock),
        },
      ],
    }).compile();

    postProcessor = module.get<UserCreatedPostProcessor>(UserCreatedPostProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processEvents', () => {
    it('should initialize gather state for USER_CREATED event', async () => {
      const event = createUserCreatedTriggerEventMock({ id: 'test-user-123' });
      event.emitterId = 'test-user-123';
      event.correlationId = 'corr-123';
      event.traceId = 'trace-123';
      const messageId = 'msg-123';

      const initializeSpy = jest.spyOn(gatherStateServiceMock, 'initializeGatherState');

      await postProcessor['processEvents']([{ event, messageId }]);

      expect(initializeSpy).toHaveBeenCalledWith('corr-123', UserEventMessagingType.USER_CREATED, {
        emitterId: 'test-user-123',
        traceId: 'trace-123',
        traceparent: event.traceparent,
        payload: event.payload.after,
      });
    });
  });

  describe('shouldProcess', () => {
    it('should return true for USER_CREATED event type', () => {
      const result = postProcessor['shouldProcess'](UserEventMessagingType.USER_CREATED.toString());
      expect(result).toBe(true);
    });

    it('should return false for other event types', () => {
      const result = postProcessor['shouldProcess']('OTHER_EVENT_TYPE');
      expect(result).toBe(false);
    });
  });
});
