import { Logger } from '@nestjs/common';
import type { LoggerMock } from '@volontariapp/testing';
import { jest } from '@jest/globals';

export const setupNestLoggerMock = (loggerMock: LoggerMock<Logger>): void => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation((...args: Parameters<Logger['log']>) => {
    loggerMock.log(...args);
  });
  jest.spyOn(Logger.prototype, 'warn').mockImplementation((...args: Parameters<Logger['warn']>) => {
    loggerMock.warn(...args);
  });
  jest
    .spyOn(Logger.prototype, 'error')
    .mockImplementation((...args: Parameters<Logger['error']>) => {
      loggerMock.error(...args);
    });
  jest
    .spyOn(Logger.prototype, 'debug')
    .mockImplementation((...args: Parameters<Logger['debug']>) => {
      loggerMock.debug(...args);
    });
  jest
    .spyOn(Logger.prototype, 'verbose')
    .mockImplementation((...args: Parameters<Logger['verbose']>) => {
      loggerMock.verbose(...args);
    });
  jest
    .spyOn(Logger.prototype, 'fatal')
    .mockImplementation((...args: Parameters<Logger['fatal']>) => {
      loggerMock.fatal(...args);
    });
};
