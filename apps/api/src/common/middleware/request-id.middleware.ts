import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * Attaches a unique request ID to every inbound HTTP request.
 *
 * Priority: honours a caller-supplied X-Request-ID header so that
 * distributed tracing IDs propagated by an upstream API gateway or
 * load balancer are preserved end-to-end.
 *
 * The ID is exposed on:
 *   - req.id       — consumed by the exception filter and log interceptor
 *   - X-Request-ID response header — returned to the client for correlation
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { id?: string }, res: Response, next: NextFunction) {
    const id =
      (Array.isArray(req.headers['x-request-id'])
        ? req.headers['x-request-id'][0]
        : req.headers['x-request-id']) ?? randomUUID();

    req.id = id;
    res.setHeader('X-Request-ID', id);
    next();
  }
}
