import { AppConfigService } from '../../../config/app-config.service.js';
import { Streams } from '@volontariapp/shared';
import { getEventStreamName } from '@volontariapp/messaging';
import { WS_POST_SOCIAL_DELETED_POST_PROCESSOR_OPTIONS } from '../../options/constants.js';

export const wsPostSocialDeletedOptionsProvider = {
  provide: WS_POST_SOCIAL_DELETED_POST_PROCESSOR_OPTIONS,
  useFactory: (appConfig: AppConfigService) => ({
    groupName: 'WsPostSocialDeletedGroup',
    streamName: getEventStreamName(Streams.WS_POST_DELETED_FEEDBACK),
    batchSize: appConfig.config.postProcessor.batchSize,
    blockTimeout: appConfig.config.postProcessor.blockTimeout,
    idempotencyTtlSeconds: appConfig.config.postProcessor.idempotencyTtlSeconds,
    maxRetries: appConfig.config.postProcessor.maxRetries,
    retryDelayMs: appConfig.config.postProcessor.retryDelayMs,
  }),
  inject: [AppConfigService],
};
