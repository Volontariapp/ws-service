import { AppConfigService } from '../../../config/app-config.service.js';
import { Streams } from '@volontariapp/shared';
import { getEventStreamName } from '@volontariapp/messaging';
import { WS_ATTACHMENT_REJECTED_POST_PROCESSOR_OPTIONS } from '../../options/constants.js';

export const wsAttachmentRejectedOptionsProvider = {
  provide: WS_ATTACHMENT_REJECTED_POST_PROCESSOR_OPTIONS,
  useFactory: (appConfig: AppConfigService) => ({
    groupName: appConfig.config.postProcessor.groupName,
    streamName: getEventStreamName(Streams.STORAGE_ATTACHMENT_REJECTED),
    batchSize: appConfig.config.postProcessor.batchSize,
    blockTimeout: appConfig.config.postProcessor.blockTimeout,
    idempotencyTtlSeconds: appConfig.config.postProcessor.idempotencyTtlSeconds,
    maxRetries: appConfig.config.postProcessor.maxRetries,
    retryDelayMs: appConfig.config.postProcessor.retryDelayMs,
  }),
  inject: [AppConfigService],
};
