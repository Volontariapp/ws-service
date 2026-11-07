import type { ExecutionContext } from '@nestjs/common';
import { createMock } from '@volontariapp/testing';

export interface LiveHttpRequestStub {
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  params: Record<string, string>;
}

export const createLiveHttpContext = (request: LiveHttpRequestStub): ExecutionContext => {
  const context = createMock<ExecutionContext>();
  const http = createMock<ReturnType<ExecutionContext['switchToHttp']>>();
  http.getRequest.mockReturnValue(request);
  context.switchToHttp.mockReturnValue(http);
  return context;
};
