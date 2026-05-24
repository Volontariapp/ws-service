import type { NotificationService } from '../../../gateways/notification.service.js';
import { createMock } from '@volontariapp/testing';
import type { jest } from '@jest/globals';

export const createNotificationServiceMock = (): jest.Mocked<NotificationService> => {
  const mock = createMock<NotificationService>();
  mock.notifyUser.mockReturnValue(undefined);
  mock.broadcast.mockReturnValue(undefined);
  return mock;
};
