import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
  });

  it('generates a request id when none is supplied', () => {
    const req: any = { headers: {} };
    const setHeader = jest.fn();
    const res: any = { setHeader };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(typeof req.id).toBe('string');
    expect(req.id.length).toBeGreaterThan(0);
    expect(setHeader).toHaveBeenCalledWith('X-Request-ID', req.id);
    expect(next).toHaveBeenCalled();
  });

  it('reuses an incoming X-Request-ID header instead of generating one', () => {
    const req: any = { headers: { 'x-request-id': 'client-supplied-id' } };
    const setHeader = jest.fn();
    const res: any = { setHeader };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.id).toBe('client-supplied-id');
    expect(setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      'client-supplied-id',
    );
  });
});
