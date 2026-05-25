import type { jest } from '@jest/globals';
import type { Socket } from 'socket.io';
import { createMock } from '@volontariapp/testing';

export const createSocketMock = (
  id = 'test-socket-id',
  token: string | null = 'valid-token',
): jest.Mocked<Socket> => {
  const mock = createMock<Socket>();

  Object.defineProperty(mock, 'id', { value: id, writable: true });
  Object.defineProperty(mock, 'handshake', {
    value: {
      headers: token !== null ? { 'x-internal-token': token } : {},
      query: {},
    },
    writable: true,
  });

  Object.defineProperty(mock, 'data', {
    value: {},
    writable: true,
  });

  mock.join.mockImplementation(() => undefined);
  mock.emit.mockReturnValue(true);
  mock.disconnect.mockReturnValue(mock);

  return mock;
};
