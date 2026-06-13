import { AppConfigService } from '../../../config/app-config.service.js';

import { getEventStreamName } from '@volontariapp/messaging';
import { WS_JOB_OUTBOX_SUCCESS_POST_PROCESSOR_OPTIONS } from '../../options/constants.js';
import { Streams } from '@volontariapp/shared';

export const wsJobOutboxSuccessOptionsProvider = {
  provide: WS_JOB_OUTBOX_SUCCESS_POST_PROCESSOR_OPTIONS,
  useFactory: (appConfig: AppConfigService) => ({
    groupName: 'JobsConsumerOutboxSuccess',
    streamName: getEventStreamName(Streams.WS_JOBS_OUTBOX_SUCCESS),
    batchSize: appConfig.config.postProcessor.batchSize,
    blockTimeout: appConfig.config.postProcessor.blockTimeout,
    idempotencyTtlSeconds: appConfig.config.postProcessor.idempotencyTtlSeconds,
    maxRetries: appConfig.config.postProcessor.maxRetries,
    retryDelayMs: appConfig.config.postProcessor.retryDelayMs,
  }),
  inject: [AppConfigService],
};
