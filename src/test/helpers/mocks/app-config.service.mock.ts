import { createMock } from '@volontariapp/testing';
import type { AppConfigService } from '../../../config/app-config.service.js';
import { UserEventMessagingType } from '@volontariapp/messaging';
import { USER_DELETION_EXPECTS } from '../factories/gather-state.factory.js';

export const createScatterGatherConfigMock = (): AppConfigService => {
  const mock = createMock<AppConfigService>();
  Object.defineProperty(mock, 'scatterGather', {
    get: () => ({
      aggregations: [
        {
          trigger: UserEventMessagingType.USER_DELETED,
          expects: [...USER_DELETION_EXPECTS],
          successEvent: 'user.deletion_successfull',
          failureEvent: 'user.deletion_failed',
        },
      ],
    }),
  });
  return mock;
};
