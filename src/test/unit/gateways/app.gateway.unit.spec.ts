import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AppGateway } from '../../../gateways/app.gateway.js';
import type { SocketManagerService } from '../../../core/services/socket-manager.service.js';
import type { JwtService } from '@volontariapp/auth';
import type { Logger } from '@nestjs/common';
import { createSocketManagerServiceMock } from '../../helpers/mocks/socket-manager.service.mock.js';
import { createJwtServiceMock } from '../../helpers/mocks/jwt.service.mock.js';
import type { LoggerMock } from '@volontariapp/testing';
import { createMockLogger, createMock } from '@volontariapp/testing';
import { createSocketMock } from '../../helpers/factories/socket.factory.js';
import type { Server, BroadcastOperator } from 'socket.io';
import { createJwtPayloadMock } from '../../helpers/factories/jwt-payload.factory.js';
import { setupNestLoggerMock } from '../../helpers/mocks/nest-logger.mock.js';

describe('AppGateway (Unit)', () => {
  let gateway: AppGateway;
  let socketManagerMock: jest.Mocked<SocketManagerService>;
  let jwtServiceMock: jest.Mocked<JwtService>;
  let loggerMock: LoggerMock<Logger>;

  beforeEach(() => {
    socketManagerMock = createSocketManagerServiceMock();
    jwtServiceMock = createJwtServiceMock();
    loggerMock = createMockLogger<Logger>();

    setupNestLoggerMock(loggerMock);

    gateway = new AppGateway(socketManagerMock, jwtServiceMock);
    const serverMock = createMock<Server>();
    const broadcastOperatorMock = createMock<BroadcastOperator<any, any>>();
    broadcastOperatorMock.fetchSockets.mockResolvedValue([]);
    serverMock.in.mockReturnValue(broadcastOperatorMock);
    serverMock.fetchSockets.mockResolvedValue([]);
    Object.defineProperty(gateway, 'server', { value: serverMock, writable: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handleConnection', () => {
    it('should disconnect client if internal token is missing', async () => {
      const mockSocket = createSocketMock('socket-1', null);
      const emitSpy = jest.spyOn(mockSocket, 'emit');
      const disconnectSpy = jest.spyOn(mockSocket, 'disconnect');
      const jwtVerifyInternalSpy = jest.spyOn(jwtServiceMock, 'verifyInternal');

      await gateway.handleConnection(mockSocket);

      expect(emitSpy).toHaveBeenCalledWith('unauthorized', { message: 'Missing internal token' });
      expect(disconnectSpy).toHaveBeenCalledWith(true);
      expect(jwtVerifyInternalSpy).not.toHaveBeenCalled();
    });

    it('should disconnect client if token verification fails', async () => {
      const mockSocket = createSocketMock('socket-1', 'invalid-token');
      const emitSpy = jest.spyOn(mockSocket, 'emit');
      const disconnectSpy = jest.spyOn(mockSocket, 'disconnect');
      const jwtVerifyInternalSpy = jest.spyOn(jwtServiceMock, 'verifyInternal');

      jwtVerifyInternalSpy.mockRejectedValueOnce(new Error('Invalid token'));

      await gateway.handleConnection(mockSocket);

      expect(jwtVerifyInternalSpy).toHaveBeenCalledWith('invalid-token');
      expect(emitSpy).toHaveBeenCalledWith('unauthorized', {
        message: 'Invalid or expired internal token',
      });
      expect(disconnectSpy).toHaveBeenCalledWith(true);
    });

    it('should join user to room and track user if token is valid', async () => {
      const mockSocket = createSocketMock('socket-1', 'valid-token');
      const joinSpy = jest.spyOn(mockSocket, 'join');
      const mockPayload = createJwtPayloadMock({ id: 'user-123' });
      const jwtVerifyInternalSpy = jest.spyOn(jwtServiceMock, 'verifyInternal');
      const trackUserSpy = jest.spyOn(socketManagerMock, 'trackUser');

      jwtVerifyInternalSpy.mockResolvedValueOnce(mockPayload);

      await gateway.handleConnection(mockSocket);

      expect(jwtVerifyInternalSpy).toHaveBeenCalledWith('valid-token');
      expect(joinSpy).toHaveBeenCalledWith('user-123');
      expect(trackUserSpy).toHaveBeenCalledWith('user-123');
    });
  });

  describe('handleDisconnect', () => {
    it('should log on client disconnect', async () => {
      const mockSocket = createSocketMock('socket-1');
      const logSpy = jest.spyOn(loggerMock, 'log');

      await gateway.handleDisconnect(mockSocket);

      expect(logSpy).toHaveBeenCalled();
    });
  });
});
