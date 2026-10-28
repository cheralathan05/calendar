import { BadRequestException } from '@nestjs/common';

export type RecurrenceScope = 'this' | 'following' | 'all';

export function parseScope(scope?: string): RecurrenceScope {
  if (!scope) return 'all';
  if (scope === 'this' || scope === 'following' || scope === 'all')
    return scope;
  throw new BadRequestException('Invalid scope');
}
