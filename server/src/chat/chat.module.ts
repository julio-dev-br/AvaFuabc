import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller'; 
import { PrismaService } from '../prisma/prisma.service'; 
import { JwtService } from '@nestjs/jwt';      
         
@Module({
  controllers: [ChatController],
  providers: [
    ChatGateway, 
    ChatService, 
    PrismaService, 
    JwtService
  ],
  exports: [ChatService]
})
export class ChatModule {}
