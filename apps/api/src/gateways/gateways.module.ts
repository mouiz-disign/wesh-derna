import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'wesh-derna-dev-secret',
    }),
    ChannelsModule,
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class GatewaysModule {}
