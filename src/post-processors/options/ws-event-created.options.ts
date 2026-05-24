import { CustomConfig } from '../../config/custom-config.js';
import { Streams } from '@volontariapp/shared';
import { getEventStreamName } from '@volontariapp/messaging';
import { WS_EVENT_CREATED_POST_PROCESSOR_OPTIONS } from './constants.js';

export const wsEventCreatedOptionsProvider = {
  provide: WS_EVENT_CREATED_POST_PROCESSOR_OPTIONS,
  useFactory: (customConfig: CustomConfig) => ({
    groupName: 'WsEventCreatedGroup',
    streamName: getEventStreamName(Streams.WS_EVENT),
    batchSize: customConfig.postProcessor.batchSize,
    blockTimeout: customConfig.postProcessor.blockTimeout,
    idempotencyTtlSeconds: customConfig.postProcessor.idempotencyTtlSeconds,
    maxRetries: customConfig.postProcessor.maxRetries,
    retryDelayMs: customConfig.postProcessor.retryDelayMs,
  }),
  inject: [CustomConfig],
};
