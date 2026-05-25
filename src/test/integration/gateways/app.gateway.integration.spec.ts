import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppGateway } from '../../../gateways/app.gateway.js';
import { SocketManagerService } from '../../../core/services/socket-manager.service.js';
import { JwtService } from '@volontariapp/auth';
import { createSocketManagerServiceMock } from '../../helpers/mocks/socket-manager.service.mock.js';
import { createJwtServiceMock } from '../../helpers/mocks/jwt.service.mock.js';
import { createSocketMock } from '../../helpers/factories/socket.factory.js';
import { createJwtPayloadMock } from '../../helpers/factories/jwt-payload.factory.js';
import { createMock } from '@volontariapp/testing';
import type { Server, BroadcastOperator } from 'socket.io';

describe('AppGateway (Integration)', () => {
  let gateway: AppGateway;
  let socketManagerMock: jest.Mocked<SocketManagerService>;
  let jwtServiceMock: jest.Mocked<JwtService>;

  beforeEach(async () => {
    socketManagerMock = createSocketManagerServiceMock();
    jwtServiceMock = createJwtServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppGateway,
        {
          provide: SocketManagerService,
          useValue: socketManagerMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    gateway = module.get<AppGateway>(AppGateway);
    const serverMock = createMock<Server>();
    const broadcastOperatorMock = createMock<BroadcastOperator<any, any>>();
    broadcastOperatorMock.fetchSockets.mockResolvedValue([]);
    serverMock.in.mockReturnValue(broadcastOperatorMock);
    serverMock.fetchSockets.mockResolvedValue([]);
    Object.defineProperty(gateway, 'server', { value: serverMock, writable: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Connection Flow', () => {
    it('should successfully authenticate and track a valid socket connection', async () => {
      const mockSocket = createSocketMock('test-socket', 'integration-token');
      const joinSpy = jest.spyOn(mockSocket, 'join');
      const jwtVerifyInternalSpy = jest.spyOn(jwtServiceMock, 'verifyInternal');
      const trackUserSpy = jest.spyOn(socketManagerMock, 'trackUser');

      const payload = createJwtPayloadMock({ id: 'integration-user' });
      jwtVerifyInternalSpy.mockResolvedValueOnce(payload);

      await gateway.handleConnection(mockSocket);

      expect(jwtVerifyInternalSpy).toHaveBeenCalledWith('integration-token');
      expect(joinSpy).toHaveBeenCalledWith('integration-user');
      expect(trackUserSpy).toHaveBeenCalledWith('integration-user');
    });

    it('should reject and disconnect an invalid socket connection', async () => {
      const mockSocket = createSocketMock('test-socket', 'invalid-token');
      const emitSpy = jest.spyOn(mockSocket, 'emit');
      const disconnectSpy = jest.spyOn(mockSocket, 'disconnect');
      const jwtVerifyInternalSpy = jest.spyOn(jwtServiceMock, 'verifyInternal');
      const trackUserSpy = jest.spyOn(socketManagerMock, 'trackUser');

      jwtVerifyInternalSpy.mockRejectedValueOnce(new Error('Signature invalid'));

      await gateway.handleConnection(mockSocket);

      expect(jwtVerifyInternalSpy).toHaveBeenCalledWith('invalid-token');
      expect(emitSpy).toHaveBeenCalledWith('unauthorized', {
        message: 'Invalid or expired internal token',
      });
      expect(disconnectSpy).toHaveBeenCalledWith(true);
      expect(trackUserSpy).not.toHaveBeenCalled();
    });
  });
});
