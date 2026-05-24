import type { SocketManagerService } from '../../../core/services/socket-manager.service.js';
import { createMock } from '@volontariapp/testing';
import type { jest } from '@jest/globals';

export const createSocketManagerServiceMock = (): jest.Mocked<SocketManagerService> => {
  const mock = createMock<SocketManagerService>();
  mock.trackUser.mockResolvedValue();
  return mock;
};
