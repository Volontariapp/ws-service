import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UserDeletedPostProcessor } from '../../../post-processors/users/user-deleted.post-processor.js';
import { createUserDeletedTriggerEventMock } from '../../helpers/factories/stream-event.factory.js';
import { UserEventMessagingType } from '@volontariapp/messaging';
import { createMock } from '@volontariapp/testing';
import type { Redis } from 'ioredis';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { GatherStateService } from '../../../core/services/gather-state.service.js';

describe('UserDeletedPostProcessor (Integration)', () => {
  let postProcessor: UserDeletedPostProcessor;
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
          provide: UserDeletedPostProcessor,
          useFactory: () =>
            new UserDeletedPostProcessor(redisMock, optionsMock, gatherStateServiceMock),
        },
      ],
    }).compile();

    postProcessor = module.get<UserDeletedPostProcessor>(UserDeletedPostProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processEvents', () => {
    it('should initialize gather state for USER_DELETED event', async () => {
      const event = createUserDeletedTriggerEventMock({ id: 'test-user-123' });
      event.emitterId = 'test-user-123';
      event.correlationId = 'corr-123';
      event.traceId = 'trace-123';
      const messageId = 'msg-123';

      const initializeSpy = jest.spyOn(gatherStateServiceMock, 'initializeGatherState');

      await postProcessor['processEvents']([{ event, messageId }]);

      expect(initializeSpy).toHaveBeenCalledWith('corr-123', UserEventMessagingType.USER_DELETED, {
        emitterId: 'test-user-123',
        traceId: 'trace-123',
        payload: event.payload.after,
      });
    });
  });

  describe('shouldProcess', () => {
    it('should return true for USER_DELETED event type', () => {
      const result = postProcessor['shouldProcess'](UserEventMessagingType.USER_DELETED.toString());
      expect(result).toBe(true);
    });

    it('should return false for other event types', () => {
      const result = postProcessor['shouldProcess']('OTHER_EVENT_TYPE');
      expect(result).toBe(false);
    });
  });
});
