import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { JobOutboxSuccessPostProcessor } from '../../../post-processors/jobs/job-outbox-success.post-processor.js';
import {
  EventEventMessagingType,
  EventWebsocketMessagingType,
  getEventForJob,
  getWsEventForEvent,
  RankingJobType,
} from '@volontariapp/messaging';
import type { PostProcessorOptions } from '@volontariapp/post-processors';
import type { Redis } from 'ioredis';
import { createMock } from '@volontariapp/testing';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';
import { createBatchRankingReadyItemMock } from '../../helpers/factories/ranking-ready-stream-event.factory.js';
import type { NotificationService } from '../../../gateways/notification.service.js';

describe('JobOutboxSuccessPostProcessor with RANKING_READY (Unit)', () => {
  let postProcessor: JobOutboxSuccessPostProcessor;
  let notificationServiceMock: jest.Mocked<NotificationService>;

  beforeEach(() => {
    notificationServiceMock = createNotificationServiceMock();
    const optionsMock: PostProcessorOptions = {
      streamName: 'stream:ws',
      groupName: 'ws-service',
      consumerName: 'test-consumer',
      batchSize: 10,
      blockMs: 1000,
      idempotencyTtlSeconds: 86400,
    };
    postProcessor = new JobOutboxSuccessPostProcessor(
      createMock<Redis>(),
      optionsMock,
      notificationServiceMock,
    );
    const mockLogger = {
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    Object.defineProperty(postProcessor, 'logger', { value: mockLogger, writable: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should map both ranking compute jobs to the ranking.ready websocket event', () => {
    expect(getEventForJob(RankingJobType.COMPUTE_USER_RANKING)).toBe(
      EventEventMessagingType.RANKING_READY,
    );
    expect(getEventForJob(RankingJobType.COMPUTE_USER_FEED)).toBe(
      EventEventMessagingType.RANKING_READY,
    );
    expect(getWsEventForEvent(EventEventMessagingType.RANKING_READY)).toBe(
      EventWebsocketMessagingType.RANKING_READY,
    );
  });

  it('should accept RANKING_READY', () => {
    expect(postProcessor['shouldProcess'](EventEventMessagingType.RANKING_READY)).toBe(true);
  });

  it('should push ranking.ready to the user of the computation with isEmitter true', async () => {
    const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

    await postProcessor['processEvents']([createBatchRankingReadyItemMock({ userId: 'user-9' })]);

    expect(notifyUserSpy).toHaveBeenCalledTimes(1);
    expect(notifyUserSpy).toHaveBeenCalledWith(
      'user-9',
      EventWebsocketMessagingType.RANKING_READY,
      expect.objectContaining({ isEmitter: true, userId: 'user-9' }),
    );
  });

  it('should not notify when the original payload has no user id', async () => {
    const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

    await postProcessor['processEvents']([createBatchRankingReadyItemMock({ userId: '' })]);

    expect(notifyUserSpy).not.toHaveBeenCalled();
  });
});
