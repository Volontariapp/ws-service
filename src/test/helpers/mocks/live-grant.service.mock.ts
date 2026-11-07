import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/testing';
import type { LiveGrantService } from '../../../live/live-grant.service.js';

export const createLiveGrantServiceMock = (): jest.Mocked<LiveGrantService> => {
  const mock = createMock<LiveGrantService>();
  mock.grant.mockResolvedValue(undefined);
  mock.revoke.mockResolvedValue(null);
  mock.getGrant.mockResolvedValue(null);
  mock.acquireCadenceSlot.mockResolvedValue(true);
  mock.storePosition.mockResolvedValue(undefined);
  return mock;
};
