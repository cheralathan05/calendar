import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function resolveDatabaseUrl(): string | undefined {
  const dbUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;

  const isLocalhost = (url?: string) =>
    Boolean(url && (url.includes('localhost') || url.includes('127.0.0.1')));
  const isRemote = (url?: string) => Boolean(url && !isLocalhost(url));

  if (isLocalhost(dbUrl) && isRemote(directUrl)) {
    return directUrl;
  }
  return dbUrl || directUrl;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = resolveDatabaseUrl();
    super(
      url
        ? {
            datasources: {
              db: { url },
            },
          }
        : undefined,
    );
  }

  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

