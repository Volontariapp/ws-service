import type { jest } from '@jest/globals';
import { createMock } from '@volontariapp/testing';
import type { LivePositionService } from '../../../modules/live/services/live-position.service.js';

export const createLivePositionServiceMock = (): jest.Mocked<LivePositionService> => {
  const mock = createMock<LivePositionService>();
  mock.report.mockResolvedValue({ kind: 'FORWARDED' });
  return mock;
};
