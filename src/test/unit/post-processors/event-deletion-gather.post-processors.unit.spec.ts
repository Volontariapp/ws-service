import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SocialEventDeletedSuccessPostProcessor } from '../../../post-processors/events/social-event-deleted-success.post-processor.js';
import { SocialEventDeletedFailedPostProcessor } from '../../../post-processors/events/social-event-deleted-failed.post-processor.js';
import {
  SocialEventMessagingType,
  EventEventMessagingType,
  WebsocketMessagingType,
} from '@volontariapp/messaging';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import type { NotificationService } from '../../../gateways/notification.service.js';
import type { GatherStateService } from '../../../core/services/gather-state.service.js';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import { EventStatus } from '@volontariapp/database';
import { AppDataSource } from '../../../config/data-source.js';
import { SOURCE_TRACEPARENT } from '../../helpers/factories/trace.factory.js';

interface AggregationConfigEntry {
  trigger: string;
  expects: string[];
}

interface DefaultConfigFile {
  scatterGather: { aggregations: AggregationConfigEntry[] };
}

describe('Event Deletion Gather Post-Processors (Unit)', () => {
  let redisMock: jest.Mocked<Redis>;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let gatherStateServiceMock: jest.Mocked<GatherStateService>;
  let optionsMock: PostProcessorOptions;

  beforeEach(() => {
    redisMock = createMock<Redis>();
    notificationServiceMock = createMock<NotificationService>();
    gatherStateServiceMock = createMock<GatherStateService>();
    optionsMock = {
      streamName: 'test-stream',
      groupName: 'test-group',
      consumerName: 'test-consumer',
      batchSize: 10,
      blockMs: 1000,
      idempotencyTtlSeconds: 86400,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('default config', () => {
    it('should expect only the feedback emitted by post-processor-social for event.deleted', () => {
      const raw = readFileSync(resolve(process.cwd(), 'config/default.config.json'), 'utf-8');
      const config = JSON.parse(raw) as DefaultConfigFile;
      const aggregation = config.scatterGather.aggregations.find(
        (entry) => entry.trigger === EventEventMessagingType.EVENT_DELETED.toString(),
      );

      expect(aggregation?.expects).toEqual(['EVENT_SOCIAL_DELETED']);
    });
  });

  describe('SocialEventDeletedSuccessPostProcessor', () => {
    let processor: SocialEventDeletedSuccessPostProcessor;

    beforeEach(() => {
      processor = new SocialEventDeletedSuccessPostProcessor(
        redisMock,
        optionsMock,
        notificationServiceMock,
        gatherStateServiceMock,
      );
    });

    it('should process the EVENT_SOCIAL_DELETED type emitted by post-processor-social', () => {
      expect(processor['shouldProcess'](SocialEventMessagingType.EVENT_SOCIAL_DELETED)).toBe(true);
      expect(processor['shouldProcess'](SocialEventMessagingType.SOCIAL_EVENT_DELETED_SUCCESS)).toBe(
        false,
      );
      expect(processor['shouldProcess'](SocialEventMessagingType.EVENT_SOCIAL_DELETION_FAILED)).toBe(
        false,
      );
    });

    it('should mark EVENT_SOCIAL_DELETED as SUCCESS and notify the organizer and the other users on completion', async () => {
      gatherStateServiceMock.updateEventState.mockResolvedValue({
        isComplete: true,
        isSuccess: true,
        gatherStateId: 'gather-event',
        metadata: {
          emitterId: 'organizer-1',
          traceId: 'trace-1',
          traceparent: SOURCE_TRACEPARENT,
          payload: { eventId: 'event-1' } as never,
        },
      });
      gatherStateServiceMock.getAggregationConfig.mockReturnValue({
        trigger: EventEventMessagingType.EVENT_DELETED,
        expects: ['EVENT_SOCIAL_DELETED'],
        successEvent: EventEventMessagingType.EVENT_DELETION_SUCCESSFULL,
        failureEvent: EventEventMessagingType.EVENT_DELETION_FAILED,
      });

      const mockEntityManager = {
        getRepository: jest.fn().mockReturnValue({
          metadata: {
            primaryColumns: [{ propertyName: 'id' }],
            name: 'MockModel',
          },
          create: jest.fn().mockImplementation((dto) => dto),
          delete: jest.fn().mockResolvedValue({ affected: 1 } as never),
          save: jest.fn().mockResolvedValue({} as never),
        }),
      };
      jest.spyOn(AppDataSource, 'transaction').mockImplementation(((
        cb: (em: unknown) => Promise<unknown>,
      ) => {
        return cb(mockEntityManager);
      }) as never);

      const eventItem = {
        messageId: 'msg-1',
        event: {
          id: 'evt-1',
          version: 1,
          type: SocialEventMessagingType.EVENT_SOCIAL_DELETED,
          emitter: 'ms-event',
          emitterId: 'organizer-1',
          correlationId: 'corr-1',
          traceId: 'trace-1',
          traceparent: SOURCE_TRACEPARENT,
          createdAt: new Date().toISOString(),
          payload: {
            before: undefined,
            after: { eventId: 'event-1' },
          },
        },
      };

      const updateEventStateSpy = jest.spyOn(gatherStateServiceMock, 'updateEventState');
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');
      const broadcastExceptSpy = jest.spyOn(notificationServiceMock, 'broadcastExcept');

      await processor['processEvents']([eventItem]);

      expect(updateEventStateSpy).toHaveBeenCalledWith(
        'corr-1',
        'EVENT_SOCIAL_DELETED',
        EventStatus.SUCCESS,
        undefined,
      );
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'organizer-1',
        WebsocketMessagingType.EVENT_DELETED,
        expect.objectContaining({ eventId: 'event-1' }),
      );
      expect(broadcastExceptSpy).toHaveBeenCalledWith(
        'organizer-1',
        WebsocketMessagingType.EVENT_DELETED,
        expect.objectContaining({ eventId: 'event-1' }),
      );
    });
  });

  describe('SocialEventDeletedFailedPostProcessor', () => {
    let processor: SocialEventDeletedFailedPostProcessor;

    beforeEach(() => {
      processor = new SocialEventDeletedFailedPostProcessor(
        redisMock,
        optionsMock,
        notificationServiceMock,
        gatherStateServiceMock,
      );
    });

    it('should process the EVENT_SOCIAL_DELETION_FAILED type emitted by post-processor-social', () => {
      expect(processor['shouldProcess'](SocialEventMessagingType.EVENT_SOCIAL_DELETION_FAILED)).toBe(
        true,
      );
      expect(processor['shouldProcess'](SocialEventMessagingType.SOCIAL_EVENT_DELETED_FAILED)).toBe(
        false,
      );
      expect(processor['shouldProcess'](SocialEventMessagingType.EVENT_SOCIAL_DELETED)).toBe(false);
    });

    it('should mark EVENT_SOCIAL_DELETED as FAILED with the default reason', async () => {
      gatherStateServiceMock.updateEventState.mockResolvedValue({ isComplete: false });

      const eventItem = {
        messageId: 'msg-2',
        event: {
          id: 'evt-2',
          version: 1,
          type: SocialEventMessagingType.EVENT_SOCIAL_DELETION_FAILED,
          emitter: 'ms-event',
          emitterId: 'organizer-1',
          correlationId: 'corr-2',
          traceId: 'trace-2',
          traceparent: SOURCE_TRACEPARENT,
          createdAt: new Date().toISOString(),
          payload: {
            before: undefined,
            after: { eventId: 'event-2' },
          },
        },
      };

      const updateEventStateSpy = jest.spyOn(gatherStateServiceMock, 'updateEventState');

      await processor['processEvents']([eventItem]);

      expect(updateEventStateSpy).toHaveBeenCalledWith(
        'corr-2',
        'EVENT_SOCIAL_DELETED',
        EventStatus.FAILED,
        'Sub-event execution failed',
      );
    });
  });
});
