import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { STATUS_CODES } from 'http';

/**
 * Catches every exception (HTTP and non-HTTP) and returns a consistent
 * JSON error envelope so clients always get the same shape regardless
 * of where the error originated.
 *
 * Response shape:
 * {
 *   "statusCode": 400,
 *   "error":      "Bad Request",
 *   "message":    "endAt must be after startAt",
 *   "requestId":  "c3b4d5e6-...",
 *   "timestamp":  "2026-06-03T00:00:00.000Z",
 *   "path":       "/v1/events"
 * }
 *
 * 5xx errors are logged at ERROR level with the full stack trace.
 * 4xx errors are logged at WARN so they're visible but not alarming.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string }>();
    const res = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Resolve the human-readable error name from the status code
    const error = STATUS_CODES[statusCode] ?? 'Internal Server Error';

    // Extract the message from NestJS HttpException or fall back to a safe default.
    // HttpException.getResponse() can return a string or an object with a `message` field.
    let message: string | string[] = 'An unexpected error occurred';
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object' && 'message' in body) {
        const raw = (body as Record<string, unknown>).message;
        message = Array.isArray(raw)
          ? (raw as string[])
          : typeof raw === 'string'
            ? raw
            : message;
      }
    }

    const requestId = req.id ?? 'unknown';
    const path = req.url;
    const method = req.method;
    const timestamp = new Date().toISOString();

    // Log 5xx as errors with stack; 4xx as warnings (expected, actionable by client)
    if (statusCode >= 500) {
      this.logger.error(
        `[${requestId}] ${method} ${path} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      // Capture unexpected server errors in Sentry with request context
      Sentry.withScope((scope) => {
        scope.setTag('requestId', requestId);
        scope.setExtra('path', path);
        scope.setExtra('method', method);
        Sentry.captureException(exception);
      });
    } else {
      this.logger.warn(
        `[${requestId}] ${method} ${path} → ${statusCode}: ${
          Array.isArray(message) ? message.join(', ') : message
        }`,
      );
    }

    res.status(statusCode).json({
      statusCode,
      error,
      message,
      requestId,
      timestamp,
      path,
    });
  }
}
