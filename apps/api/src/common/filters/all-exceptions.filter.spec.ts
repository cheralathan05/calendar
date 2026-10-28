import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { AllExceptionsFilter } from './all-exceptions.filter';

jest.mock('@sentry/node', () => ({
  withScope: jest.fn((cb: (scope: any) => void) =>
    cb({ setTag: jest.fn(), setExtra: jest.fn() }),
  ),
  captureException: jest.fn(),
}));

function createHost(req: Partial<Record<string, unknown>>) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status };
  const fullReq = { id: 'req-123', url: '/v1/events', method: 'GET', ...req };
  const host = {
    switchToHttp: () => ({
      getRequest: () => fullReq,
      getResponse: () => res,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.clearAllMocks();
  });

  it('reports unhandled (5xx) errors to Sentry with the request id tagged', () => {
    const { host, status, json } = createHost({});
    const error = new Error('boom');

    filter.catch(error, host);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
        requestId: 'req-123',
      }),
    );
  });

  it('does not report client errors (4xx) to Sentry', () => {
    const { host, status, json } = createHost({});
    const error = new BadRequestException('endAt must be after startAt');

    filter.catch(error, host);

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'endAt must be after startAt',
        requestId: 'req-123',
      }),
    );
  });
});
