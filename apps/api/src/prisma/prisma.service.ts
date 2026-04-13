import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.runMigrations();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async runMigrations() {
    try {
      await this.$executeRawUnsafe(`
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "voiceNoteUrl" TEXT;
      `);
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS attachments (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          url TEXT NOT NULL,
          "mimeType" TEXT NOT NULL,
          size INTEGER NOT NULL,
          "taskId" TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      this.logger.log('Database migrations checked');
    } catch (err) {
      this.logger.warn('Migration check failed (non-critical): ' + err);
    }
  }
}
