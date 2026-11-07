import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/testing';
import type { LiveNotifierService } from '../../../modules/live/services/live-notifier.service.js';

export const createLiveNotifierServiceMock = (): jest.Mocked<LiveNotifierService> => {
  const mock = createMock<LiveNotifierService>();
  mock.notifySharingStopped.mockResolvedValue(undefined);
  mock.notifyPositionUpdated.mockResolvedValue(undefined);
  return mock;
};
