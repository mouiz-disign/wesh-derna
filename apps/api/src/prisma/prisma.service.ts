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
      // Add voiceNoteUrl column if it doesn't exist
      await this.$executeRawUnsafe(`
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "voiceNoteUrl" TEXT;
      `);
      this.logger.log('Database migrations checked');
    } catch (err) {
      this.logger.warn('Migration check failed (non-critical): ' + err);
    }
  }
}
