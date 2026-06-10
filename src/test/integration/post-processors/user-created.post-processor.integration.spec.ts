import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UserCreatedPostProcessor } from '../../../post-processors/users/user-created.post-processor.js';
import type { SocketManagerService } from '../../../core/services/socket-manager.service.js';
import type { NotificationService } from '../../../gateways/notification.service.js';
import { createSocketManagerServiceMock } from '../../helpers/mocks/socket-manager.service.mock.js';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';
import { createUserCreatedEventMock } from '../../helpers/factories/stream-event.factory.js';
import { SocialEventMessagingType, WebsocketMessagingType } from '@volontariapp/messaging';
import { createMock } from '@volontariapp/testing';
import type { Redis } from 'ioredis';
import type { PostProcessorOptions } from '@volontariapp/post-processors';

describe('UserCreatedPostProcessor (Integration)', () => {
  let postProcessor: UserCreatedPostProcessor;
  let socketManagerMock: jest.Mocked<SocketManagerService>;
  let notificationServiceMock: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    socketManagerMock = createSocketManagerServiceMock();
    notificationServiceMock = createNotificationServiceMock();

    const redisMock = createMock<Redis>();
    const optionsMock = {
      streamName: 'test-stream',
      groupName: 'test-group',
      consumerName: 'test-consumer',
      batchSize: 10,
      blockTime: 1000,
      checkFrequency: 1000,
    } as PostProcessorOptions;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UserCreatedPostProcessor,
          useFactory: () =>
            new UserCreatedPostProcessor(
              redisMock,
              optionsMock,
              socketManagerMock,
              notificationServiceMock,
            ),
        },
      ],
    }).compile();

    postProcessor = module.get<UserCreatedPostProcessor>(UserCreatedPostProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processEvents', () => {
    it('should track user and notify user on USER_SOCIAL_CREATED event', async () => {
      const payloadOverrides = { userId: 'test-user-123' };
      const event = createUserCreatedEventMock(payloadOverrides);
      event.emitterId = 'test-emitter-123';
      const messageId = 'msg-123';

      const trackUserSpy = jest.spyOn(socketManagerMock, 'trackUser');
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([{ event, messageId } as never]);

      expect(trackUserSpy).toHaveBeenCalledWith('test-emitter-123');
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'test-emitter-123',
        WebsocketMessagingType.USER_CREATED,
        event.payload.after,
      );
    });

    it('should also track and notify payload.userId if present (admin creation)', async () => {
      const payloadOverrides = { id: 'test-user-123', userId: 'created-user-123' };
      const event = createUserCreatedEventMock(payloadOverrides);
      event.emitterId = 'admin-emitter-123';
      const messageId = 'msg-123';

      const trackUserSpy = jest.spyOn(socketManagerMock, 'trackUser');
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvents']([{ event, messageId }]);

      expect(trackUserSpy).toHaveBeenCalledWith('created-user-123');
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'created-user-123',
        WebsocketMessagingType.USER_CREATED,
        event.payload.after,
      );
      expect(trackUserSpy).toHaveBeenCalledWith('admin-emitter-123');
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'admin-emitter-123',
        WebsocketMessagingType.USER_CREATED,
        event.payload.after,
      );
    });
  });

  describe('shouldProcess', () => {
    it('should return true for USER_SOCIAL_CREATED event type', () => {
      const result = postProcessor['shouldProcess'](
        SocialEventMessagingType.USER_SOCIAL_CREATED.toString(),
      );
      expect(result).toBe(true);
    });

    it('should return false for other event types', () => {
      const result = postProcessor['shouldProcess']('OTHER_EVENT_TYPE');
      expect(result).toBe(false);
    });
  });
});
