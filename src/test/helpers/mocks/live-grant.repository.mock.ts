import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/testing';
import type { ILiveGrantRepository } from '../../../modules/live/repositories/interfaces/live-grant.repository.js';

export const createLiveGrantRepositoryMock = (): jest.Mocked<ILiveGrantRepository> => {
  const mock = createMock<ILiveGrantRepository>();
  mock.save.mockResolvedValue(undefined);
  mock.find.mockResolvedValue(null);
  mock.removeWithAssociatedData.mockResolvedValue(null);
  return mock;
};
