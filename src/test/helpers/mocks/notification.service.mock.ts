import type { NotificationService } from '../../../gateways/notification.service.js';
import { createMock } from '@volontariapp/testing';
import { jest } from '@jest/globals';

export const createNotificationServiceMock = (): jest.Mocked<NotificationService> => {
  const mock = createMock<NotificationService>();
  mock.notifyUser.mockResolvedValue(undefined);
  mock.broadcast.mockReturnValue(undefined);
  mock.broadcastExcept = jest.fn();
  return mock;
};
