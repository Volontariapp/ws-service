import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UserCreatedPostProcessor } from '../../../post-processors/user-created.post-processor.js';
import type { SocketManagerService } from '../../../core/services/socket-manager.service.js';
import type { NotificationService } from '../../../gateways/notification.service.js';
import { createSocketManagerServiceMock } from '../../helpers/mocks/socket-manager.service.mock.js';
import { createNotificationServiceMock } from '../../helpers/mocks/notification.service.mock.js';
import { createUserCreatedEventMock } from '../../helpers/factories/stream-event.factory.js';
import { WebsocketEventMessagingType } from '@volontariapp/messaging';
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

  describe('processEvent', () => {
    it('should track user and notify user on WS_USER_CREATED event', async () => {
      const payloadOverrides = { id: 'test-user-123' };
      const event = createUserCreatedEventMock(payloadOverrides);
      const messageId = 'msg-123';

      const trackUserSpy = jest.spyOn(socketManagerMock, 'trackUser');
      const notifyUserSpy = jest.spyOn(notificationServiceMock, 'notifyUser');

      await postProcessor['processEvent'](event, messageId);

      expect(trackUserSpy).toHaveBeenCalledWith('test-user-123');
      expect(notifyUserSpy).toHaveBeenCalledWith(
        'test-user-123',
        WebsocketEventMessagingType.WS_USER_CREATED,
        event.payload.after,
      );
    });
  });

  describe('shouldProcess', () => {
    it('should return true for WS_USER_CREATED event type', () => {
      const result = postProcessor['shouldProcess'](
        WebsocketEventMessagingType.WS_USER_CREATED.toString(),
      );
      expect(result).toBe(true);
    });

    it('should return false for other event types', () => {
      const result = postProcessor['shouldProcess']('OTHER_EVENT_TYPE');
      expect(result).toBe(false);
    });
  });
});
