import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { GeocodingFailedPostProcessor } from '../../../post-processors/events/geocoding-failed.post-processor.js';
import { GeocodedSuccessPostProcessor } from '../../../post-processors/events/geocoded-success.post-processor.js';
import { EventEventMessagingType } from '@volontariapp/messaging';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import type { NotificationService } from '../../../gateways/notification.service.js';
import type { GatherStateService } from '../../../core/services/gather-state.service.js';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import { EventStatus } from '@volontariapp/database';
import { SOURCE_TRACEPARENT } from '../../helpers/factories/trace.factory.js';

describe('Geocoding feedback Post-Processors (Unit)', () => {
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

  describe('GeocodingFailedPostProcessor', () => {
    let processor: GeocodingFailedPostProcessor;

    beforeEach(() => {
      processor = new GeocodingFailedPostProcessor(
        redisMock,
        optionsMock,
        notificationServiceMock,
        gatherStateServiceMock,
      );
    });

    it('should process only the event.geocoding_failed type', () => {
      expect(processor['shouldProcess'](EventEventMessagingType.EVENT_GEOCODING_FAILED)).toBe(true);
      expect(processor['shouldProcess'](EventEventMessagingType.EVENT_GEOCODED)).toBe(false);
      expect(processor['shouldProcess'](EventEventMessagingType.EVENT_CREATED)).toBe(false);
    });

    it('should mark GEOCODED_SUCCESS as FAILED with the default reason', async () => {
      gatherStateServiceMock.updateEventState.mockResolvedValue({ isComplete: false });

      const eventItem = {
        messageId: 'msg-1',
        event: {
          id: 'evt-1',
          version: 1,
          type: EventEventMessagingType.EVENT_GEOCODING_FAILED,
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

      await processor['processEvents']([eventItem]);

      expect(updateEventStateSpy).toHaveBeenCalledWith(
        'corr-1',
        'GEOCODED_SUCCESS',
        EventStatus.FAILED,
        'Sub-event execution failed',
      );
    });
  });

  describe('GeocodedSuccessPostProcessor', () => {
    it('should not process the event.geocoding_failed type', () => {
      const processor = new GeocodedSuccessPostProcessor(
        redisMock,
        optionsMock,
        notificationServiceMock,
        gatherStateServiceMock,
      );

      expect(processor['shouldProcess'](EventEventMessagingType.EVENT_GEOCODED)).toBe(true);
      expect(processor['shouldProcess'](EventEventMessagingType.EVENT_GEOCODING_FAILED)).toBe(
        false,
      );
    });
  });
});
