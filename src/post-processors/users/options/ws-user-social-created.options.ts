import { AppConfigService } from '../../../config/app-config.service.js';
import { Streams } from '@volontariapp/shared';
import { getEventStreamName } from '@volontariapp/messaging';
import { WS_USER_SOCIAL_CREATED_POST_PROCESSOR_OPTIONS } from '../../options/constants.js';

export const wsUserSocialCreatedOptionsProvider = {
  provide: WS_USER_SOCIAL_CREATED_POST_PROCESSOR_OPTIONS,
  useFactory: (appConfig: AppConfigService) => ({
    groupName: 'SocialConsumer',
    streamName: getEventStreamName(Streams.WS_USER_CREATED_FEEDBACK),
    batchSize: appConfig.config.postProcessor.batchSize,
    blockTimeout: appConfig.config.postProcessor.blockTimeout,
    idempotencyTtlSeconds: appConfig.config.postProcessor.idempotencyTtlSeconds,
    maxRetries: appConfig.config.postProcessor.maxRetries,
    retryDelayMs: appConfig.config.postProcessor.retryDelayMs,
  }),
  inject: [AppConfigService],
};
