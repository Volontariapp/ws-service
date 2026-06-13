import { AppConfigService } from '../../../config/app-config.service.js';

import { getEventStreamName } from '@volontariapp/messaging';
import { WS_JOB_OUTBOX_FAILED_POST_PROCESSOR_OPTIONS } from '../../options/constants.js';
import { Streams } from '@volontariapp/shared';

export const wsJobOutboxFailedOptionsProvider = {
  provide: WS_JOB_OUTBOX_FAILED_POST_PROCESSOR_OPTIONS,
  useFactory: (appConfig: AppConfigService) => ({
    groupName: 'JobsConsumerOutboxSucessFailed',
    streamName: getEventStreamName(Streams.WS_JOBS_OUTBOX_FAILURE),
    batchSize: appConfig.config.postProcessor.batchSize,
    blockTimeout: appConfig.config.postProcessor.blockTimeout,
    idempotencyTtlSeconds: appConfig.config.postProcessor.idempotencyTtlSeconds,
    maxRetries: appConfig.config.postProcessor.maxRetries,
    retryDelayMs: appConfig.config.postProcessor.retryDelayMs,
  }),
  inject: [AppConfigService],
};
