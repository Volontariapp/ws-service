import { AppConfigService } from '../../../config/app-config.service.js';
import { Streams } from '@volontariapp/shared';
import { getEventStreamName } from '@volontariapp/messaging';
import { WS_EVENT_ATTENDANCE_SET_POST_PROCESSOR_OPTIONS } from '../../options/constants.js';

export const wsEventAttendanceSetOptionsProvider = {
  provide: WS_EVENT_ATTENDANCE_SET_POST_PROCESSOR_OPTIONS,
  useFactory: (appConfig: AppConfigService) => ({
    groupName: appConfig.config.postProcessor.groupName,
    streamName: getEventStreamName(Streams.EVENT_SOCIAL_ATTENDANCE_SET),
    batchSize: appConfig.config.postProcessor.batchSize,
    blockTimeout: appConfig.config.postProcessor.blockTimeout,
    idempotencyTtlSeconds: appConfig.config.postProcessor.idempotencyTtlSeconds,
    maxRetries: appConfig.config.postProcessor.maxRetries,
    retryDelayMs: appConfig.config.postProcessor.retryDelayMs,
  }),
  inject: [AppConfigService],
};
