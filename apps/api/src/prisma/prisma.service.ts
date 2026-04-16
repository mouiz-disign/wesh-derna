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
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS channel_reads (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "channelId" TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
          "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("userId", "channelId")
        );
      `);
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS dm_reads (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          "otherUserId" TEXT NOT NULL,
          "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("userId", "otherUserId")
        );
      `);
      await this.$executeRawUnsafe(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS "parentId" TEXT REFERENCES messages(id) ON DELETE CASCADE;`);
      await this.$executeRawUnsafe(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS "readBy" JSONB DEFAULT '[]';`);
      await this.$executeRawUnsafe(`ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS "weight" INTEGER DEFAULT 0;`);
      await this.$executeRawUnsafe(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "assigneeIds" JSONB DEFAULT '[]';`);
      await this.$executeRawUnsafe(`ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS "assigneeId" TEXT;`);
      await this.$executeRawUnsafe(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);`);
      await this.$executeRawUnsafe(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "projectId" TEXT;`);
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS project_notif_settings (
          id TEXT PRIMARY KEY,
          "projectId" TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          enabled BOOLEAN NOT NULL DEFAULT true,
          UNIQUE("projectId", "userId")
        );
      `);
      await this.$executeRawUnsafe(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;`);
      await this.$executeRawUnsafe(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS "fileName" TEXT;`);
      await this.$executeRawUnsafe(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS "fileMimeType" TEXT;`);
      this.logger.log('Database migrations checked');
    } catch (err) {
      this.logger.warn('Migration check failed (non-critical): ' + err);
    }
  }
}
