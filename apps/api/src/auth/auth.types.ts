import type { Request } from 'express';

export type AuthUser = {
  sub: string; // User.id
  email: string;
  name?: string;
  googleSub?: string;
};

export type RequestWithUser = Request & { user?: AuthUser };
